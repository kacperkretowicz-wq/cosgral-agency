#!/usr/bin/env python3
"""run-pipeline.py — SĘDZIA (referee) wykonywalnego pipeline'u.

To jest "silnik", którego brakowało: deterministyczny program, który egzekwuje
kolejność faz, obecność artefaktów, bramki i pętlę sprzężenia zwrotnego (retry).
NIE uruchamia agentów-LLM (te żyją w Cursorze) — jest sędzią, który:
  * mówi DOKŁADNIE co zrobić dalej (który agent, jaki artefakt),
  * NIE pozwala domknąć fazy, dopóki jej `produces` nie istnieją i `gates` nie przejdą,
  * przy FAIL wskazuje fazę do ponowienia i zlicza iteracje (twardy STOP po max).

Źródło prawdy przepływu: profiles/pipeline.yaml

Komendy:
  python scripts/run-pipeline.py init <job> [--job-type T] [--prompt "..."]
  python scripts/run-pipeline.py status <job>
  python scripts/run-pipeline.py next <job>
  python scripts/run-pipeline.py check <job>      # waliduj bieżącą fazę -> advance lub FAIL
  python scripts/run-pipeline.py audit-all        # macierz pokrycia bramkami wszystkich jobów

Kody wyjścia (check):
  0 = faza zaliczona i przesunięta dalej (albo cały pipeline DONE)
  1 = gate FAIL (zapisano retry; zobacz komunikat)
  2 = faza niekompletna/zablokowana (brak requires lub produces) — nie błąd, akcja po stronie agenta
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. pip install pyyaml")
    sys.exit(1)

# Windows: konsola bywa cp1250 — wymuś UTF-8 by ✔/✗/→ nie wywalały skryptu.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "outputs" / "pages"
IMAGES = ROOT / "outputs" / "images"
SPEC_PATH = ROOT / "profiles" / "pipeline.yaml"

C_RED = "\033[31m"
C_GRN = "\033[32m"
C_YEL = "\033[33m"
C_DIM = "\033[2m"
C_BOLD = "\033[1m"
C_END = "\033[0m"


USE_COLOR = sys.stdout.isatty()


def _c(text: str, color: str) -> str:
    if not USE_COLOR:
        return text
    return f"{color}{text}{C_END}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def load_spec() -> dict:
    return yaml.safe_load(SPEC_PATH.read_text(encoding="utf-8")) or {}


def page_dir(job: str) -> Path:
    return PAGES / job


def state_path(job: str) -> Path:
    return page_dir(job) / "pipeline-state.json"


def load_state(job: str) -> dict | None:
    p = state_path(job)
    if not p.is_file():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def save_state(job: str, state: dict) -> None:
    state["updated_at"] = now_iso()
    state_path(job).write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")


def pipeline_for_job_type(spec: dict, job_type: str) -> tuple[str, list[str]]:
    mapping = spec.get("job_type_pipeline") or {}
    name = mapping.get(job_type, "standard_full_v3")
    order = (spec.get("pipelines") or {}).get(name) or []
    return name, list(order)


def new_state(job: str, job_type: str, spec: dict) -> dict:
    pname, order = pipeline_for_job_type(spec, job_type)
    phases = {
        pid: {"status": "pending", "iterations": 0, "last_errors": []}
        for pid in order
    }
    return {
        "job": job,
        "job_type": job_type,
        "pipeline": pname,
        "phase_order": order,
        "current_phase": order[0] if order else None,
        "phases": phases,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }


# ── artefakty ────────────────────────────────────────────────────────────

def artifact_exists(job: str, name: str) -> bool:
    return (page_dir(job) / name).is_file()


def image_count(job: str) -> int:
    d = IMAGES / job
    if not d.is_dir():
        return 0
    return len(list(d.glob("*.png")))


def read_json_safe(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


# ── bramki ───────────────────────────────────────────────────────────────

def run_script_gate(job: str, script: str, args: list[str], job_type: str, when: list[str] | None) -> tuple[bool, str]:
    if when and job_type not in when:
        return True, f"skip ({job_type} ∉ {when})"
    script_path = ROOT / script
    if not script_path.is_file():
        return False, f"BRAK SKRYPTU: {script}"
    # Podstaw <job>; jeśli token nieobecny -> dołącz slug pozycyjnie.
    sub = [a.replace("<job>", job) for a in (args or [])]
    if not any("<job>" in a for a in (args or [])):
        cmd = [sys.executable, str(script_path), job, *sub]
    else:
        cmd = [sys.executable, str(script_path), *sub]
    proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(ROOT))
    ok = proc.returncode == 0
    tail = (proc.stdout or proc.stderr or "").strip().splitlines()
    msg = tail[0] if tail else f"exit {proc.returncode}"
    if not ok and len(tail) > 1:
        msg = "; ".join(tail[:4])
    return ok, msg


def eval_gates(job: str, phase: dict, job_type: str) -> list[tuple[bool, str, str]]:
    """Zwraca listę (ok, label, detail)."""
    results: list[tuple[bool, str, str]] = []
    for gate in phase.get("gates") or []:
        if "script" in gate:
            ok, msg = run_script_gate(
                job, gate["script"], gate.get("args") or [], job_type, gate.get("when_job_type")
            )
            results.append((ok, gate["script"], msg))
        elif "json_pass" in gate:
            f = page_dir(job) / gate["json_pass"]
            data = read_json_safe(f) if f.is_file() else None
            if data is None:
                results.append((False, gate["json_pass"], "brak/niepoprawny JSON"))
            elif data.get("pass") is False:
                note = data.get("retry_agent") or data.get("notes") or "pass=false"
                results.append((False, gate["json_pass"], f"pass=false ({note})"))
            else:
                results.append((True, gate["json_pass"], "pass"))
        elif "images_min" in gate:
            n = image_count(job)
            need = int(gate["images_min"])
            results.append((n >= need, f"images>={need}", f"{n} obrazów w outputs/images/{job}/"))
    return results


def requires_status(job: str, phase: dict) -> list[tuple[str, bool]]:
    return [(r, artifact_exists(job, r)) for r in (phase.get("requires") or [])]


def produces_status(job: str, phase: dict) -> tuple[list[tuple[str, bool]], bool]:
    """Zwraca (lista (artefakt, istnieje), produces_ok)."""
    items = [(p, artifact_exists(job, p)) for p in (phase.get("produces") or [])]
    ok = all(exist for _, exist in items)
    any_group = phase.get("produces_any") or []
    if any_group:
        any_ok = any(artifact_exists(job, p) for p in any_group)
        items.append(("(" + " | ".join(any_group) + ")", any_ok))
        ok = ok and any_ok
    if phase.get("optional") and not phase.get("produces") and not any_group:
        ok = True
    return items, ok


# ── komendy ────────────────────────────────────────────────────────────────

def cmd_init(args) -> int:
    spec = load_spec()
    job = args.job
    page_dir(job).mkdir(parents=True, exist_ok=True)

    job_type = args.job_type
    if not job_type:
        text = args.prompt or ""
        prod = ROOT / "products" / job / "product.yaml"
        classify = ROOT / "scripts" / "classify-job.py"
        if classify.is_file() and (text or prod.is_file()):
            cmd = [sys.executable, str(classify), "--json"]
            if text:
                cmd.append(text)
            if prod.is_file():
                cmd += ["--product", job]
            proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(ROOT))
            data = read_json_safe_text(proc.stdout)
            if data and data.get("job_type"):
                job_type = data["job_type"]
        if not job_type:
            job_type = "product_brand"
            print(_c(f"  (brak --job-type i klasyfikacji — fallback: {job_type})", C_YEL))

    state = new_state(job, job_type, spec)

    # intake: zapisz job-type-lock.json (legalny output fazy intake)
    lock = page_dir(job) / "job-type-lock.json"
    if not lock.is_file():
        lock.write_text(json.dumps({"job": job, "job_type": job_type, "pipeline": state["pipeline"]}, indent=2) + "\n", encoding="utf-8")

    save_state(job, state)
    print(_c(f"OK init: {job}", C_GRN) + f"  job_type={job_type}  pipeline={state['pipeline']}")
    print(f"  fazy: {' → '.join(state['phase_order'])}")
    print(f"  następny krok: python scripts/run-pipeline.py next {job}")
    return 0


def read_json_safe_text(text: str) -> dict | None:
    try:
        return json.loads(text)
    except Exception:
        return None


def _ensure_state(job: str) -> dict | None:
    state = load_state(job)
    if state is None:
        if not page_dir(job).is_dir():
            print(_c(f"ERROR: brak joba '{job}' w outputs/pages/", C_RED))
            return None
        # job istnieje bez state -> odtwórz (retrofit istniejących jobów)
        spec = load_spec()
        prod = ROOT / "products" / job / "product.yaml"
        jt = "product_brand"
        lock = read_json_safe(page_dir(job) / "job-type-lock.json")
        if lock and lock.get("job_type"):
            jt = lock["job_type"]
        state = new_state(job, jt, spec)
        save_state(job, state)
        print(_c(f"  (odtworzono pipeline-state.json dla istniejącego joba, job_type={jt})", C_DIM))
    return state


def current_phase_id(state: dict) -> str | None:
    for pid in state["phase_order"]:
        if state["phases"][pid]["status"] != "done":
            return pid
    return None


def cmd_status(args) -> int:
    state = _ensure_state(args.job)
    if state is None:
        return 1
    spec = load_spec()
    phases_spec = spec.get("phases") or {}
    cur = current_phase_id(state)
    print(_c(f"\n  {state['job']}", C_BOLD) + _c(f"   [{state['job_type']} / {state['pipeline']}]", C_DIM))
    for pid in state["phase_order"]:
        st = state["phases"][pid]
        mark = {"done": _c("✔", C_GRN), "failed": _c("✗", C_RED), "pending": _c("·", C_DIM)}.get(st["status"], "?")
        cur_tag = _c("  ← bieżąca", C_YEL) if pid == cur else ""
        it = f"  (retry {st['iterations']})" if st["iterations"] else ""
        agents = ", ".join((phases_spec.get(pid) or {}).get("agents") or [])
        print(f"   {mark} {pid:<16}{cur_tag}{it}")
        if st["status"] == "failed" and st["last_errors"]:
            for e in st["last_errors"][:3]:
                print(_c(f"        - {e}", C_RED))
        if pid == cur:
            print(_c(f"        agenci: {agents}", C_DIM))
    if cur is None:
        print(_c("\n  ✔ PIPELINE DONE — wszystkie fazy zaliczone\n", C_GRN))
    print()
    return 0


def cmd_next(args) -> int:
    state = _ensure_state(args.job)
    if state is None:
        return 1
    spec = load_spec()
    phases_spec = spec.get("phases") or {}
    cur = current_phase_id(state)
    if cur is None:
        print(_c(f"✔ {state['job']}: pipeline DONE — nie ma kolejnego kroku.", C_GRN))
        return 0
    phase = phases_spec.get(cur) or {}
    print(_c(f"\n  Następna faza: {cur}", C_BOLD))
    print(f"  Agenci do uruchomienia: {_c(', '.join(phase.get('agents') or []), C_YEL)}")

    reqs = requires_status(args.job, phase)
    missing_req = [r for r, ok in reqs if not ok]
    if missing_req:
        print(_c(f"  ⛔ ZABLOKOWANE — brak wymaganych wejść:", C_RED))
        for r in missing_req:
            print(_c(f"       - {r}", C_RED))
        print(_c("     Dokończ wcześniejszą fazę zanim ruszysz dalej.", C_DIM))
        return 2

    prod_items, _ = produces_status(args.job, phase)
    print("  Artefakty do wytworzenia (produces):")
    if not prod_items:
        print(_c("       (brak — faza opcjonalna)", C_DIM))
    for name, exist in prod_items:
        m = _c("✔", C_GRN) if exist else _c("·", C_DIM)
        print(f"       {m} {name}")
    gates = phase.get("gates") or []
    if gates:
        labels = [g.get("script") or g.get("json_pass") or (f"images_min={g.get('images_min')}") for g in gates]
        print(f"  Bramki po wytworzeniu: {_c(', '.join(labels), C_DIM)}")
    print(_c(f"\n  Gdy gotowe: python scripts/run-pipeline.py check {args.job}\n", C_DIM))
    return 0


def cmd_check(args) -> int:
    job = args.job
    state = _ensure_state(job)
    if state is None:
        return 1
    spec = load_spec()
    phases_spec = spec.get("phases") or {}
    max_iter = int(spec.get("max_iterations", 2))
    cur = current_phase_id(state)
    if cur is None:
        print(_c(f"✔ {job}: pipeline już DONE.", C_GRN))
        return 0
    phase = phases_spec.get(cur) or {}
    job_type = state["job_type"]

    # 0) twardy STOP — po max iteracjach nie zliczaj w nieskończoność; wymuś reset
    st0 = state["phases"][cur]
    if st0["status"] == "failed" and st0["iterations"] >= max_iter:
        print(_c(f"⛔ {job} / {cur}: TWARDY STOP (iteracje {st0['iterations']}/{max_iter}).", C_RED))
        if st0["last_errors"]:
            for e in st0["last_errors"][:3]:
                print(_c(f"     - {e}", C_RED))
        print(_c(f"   Po poprawieniu artefaktów: python scripts/run-pipeline.py reset {job}", C_YEL))
        return 1

    # 1) requires
    reqs = requires_status(job, phase)
    missing_req = [r for r, ok in reqs if not ok]
    if missing_req:
        print(_c(f"⛔ {job} / {cur}: ZABLOKOWANE — brak wejść: {', '.join(missing_req)}", C_RED))
        return 2

    # 2) produces
    prod_items, prod_ok = produces_status(job, phase)
    if not prod_ok:
        missing = [n for n, ok in prod_items if not ok]
        print(_c(f"⛔ {job} / {cur}: NIEKOMPLETNE — brak artefaktów: {', '.join(missing)}", C_YEL))
        print(_c(f"   Uruchom agentów: {', '.join(phase.get('agents') or [])}", C_DIM))
        return 2

    # 3) gates
    results = eval_gates(job, phase, job_type)
    failed = [(label, detail) for ok, label, detail in results if not ok]
    for ok, label, detail in results:
        m = _c("PASS", C_GRN) if ok else _c("FAIL", C_RED)
        print(f"   [{m}] {label}: {detail}")

    if failed:
        st = state["phases"][cur]
        st["iterations"] += 1
        st["status"] = "failed"
        st["last_errors"] = [f"{lbl}: {d}" for lbl, d in failed]
        # pętla retry: cel z on_fail; coherence może nadpisać retry_agent z raportu
        retry_to = phase.get("on_fail", cur)
        if cur == "coherence":
            rep = read_json_safe(page_dir(job) / "coherence-report.json") or {}
            ra = rep.get("retry_agent")
            if ra:
                # zmapuj agenta na fazę
                agent_to_phase = {}
                for pid, pdef in phases_spec.items():
                    for a in (pdef.get("agents") or []):
                        agent_to_phase[a] = pid
                retry_to = agent_to_phase.get(ra, retry_to)
        save_state(job, state)
        print(_c(f"\n✗ {job} / {cur}: GATE FAIL (iteracja {st['iterations']}/{max_iter})", C_RED))
        if st["iterations"] >= max_iter:
            print(_c(f"⛔ TWARDY STOP — osiągnięto max {max_iter} iteracji fazy '{cur}'. Wymagana interwencja człowieka.", C_RED))
        else:
            print(_c(f"↩ Wróć do fazy: {retry_to}  (popraw artefakty i odpal check ponownie)", C_YEL))
        return 1

    # 4) PASS -> domknij fazę, przesuń
    state["phases"][cur]["status"] = "done"
    state["phases"][cur]["last_errors"] = []
    nxt = None
    for pid in state["phase_order"]:
        if state["phases"][pid]["status"] != "done":
            nxt = pid
            break
    state["current_phase"] = nxt
    save_state(job, state)
    print(_c(f"\n✔ {job} / {cur}: PASS", C_GRN))
    if nxt:
        nagents = ", ".join((phases_spec.get(nxt) or {}).get("agents") or [])
        print(f"   → następna faza: {_c(nxt, C_BOLD)}  (agenci: {nagents})")
        print(_c(f"   python scripts/run-pipeline.py next {job}", C_DIM))
    else:
        print(_c("   ✔ PIPELINE DONE — job gotowy do delivery.", C_GRN))
    return 0


def cmd_reset(args) -> int:
    job = args.job
    state = _ensure_state(job)
    if state is None:
        return 1
    target = args.phase or current_phase_id(state)
    if target not in state["phases"]:
        print(_c(f"ERROR: faza '{target}' nie istnieje w pipeline tego joba", C_RED))
        return 1
    state["phases"][target] = {"status": "pending", "iterations": 0, "last_errors": []}
    state["current_phase"] = current_phase_id(state)
    save_state(job, state)
    print(_c(f"↻ reset fazy '{target}' dla {job} — licznik iteracji wyzerowany.", C_GRN))
    print(_c(f"   python scripts/run-pipeline.py check {job}", C_DIM))
    return 0


GUARDIAN_SET = ["coherence-report.json", "concept-guardian-report.md", "variability-report.json"]


def cmd_audit_all(args) -> int:
    """Macierz pokrycia bramkami wszystkich jobów (operacjonalizacja ORCH-06)."""
    if not PAGES.is_dir():
        print("brak outputs/pages/")
        return 1
    jobs = sorted([d.name for d in PAGES.iterdir() if d.is_dir() and not d.name.startswith("_")])
    full = 0
    rows = []
    for job in jobs:
        has_plan = artifact_exists(job, "layout-plan.json")
        has_html = artifact_exists(job, "index.html")
        guardians = [artifact_exists(job, g) for g in GUARDIAN_SET]
        n_guard = sum(guardians)
        # twarda bramka delivery
        gp = ROOT / "scripts" / "check-guardian-reports.py"
        delivery_ok = False
        if gp.is_file():
            proc = subprocess.run([sys.executable, str(gp), job], capture_output=True, text=True, cwd=str(ROOT))
            delivery_ok = proc.returncode == 0
        if delivery_ok:
            full += 1
        rows.append((job, has_plan, has_html, n_guard, delivery_ok))

    print(_c(f"\n  POKRYCIE BRAMKAMI — {len(jobs)} jobów\n", C_BOLD))
    print(f"   {'job':<22}{'plan':<6}{'html':<6}{'guard':<7}{'delivery-gate'}")
    print(_c("   " + "-" * 52, C_DIM))
    for job, p, h, g, d in rows:
        # padding na czystym tekście (bez ANSI), kolor tylko na ostatniej kolumnie
        pm = "  ✔  " if p else "  ·  "
        hm = "  ✔  " if h else "  ·  "
        gm = f"{g}/3  "
        dm = _c("OK", C_GRN) if d else _c("FAIL", C_RED)
        print(f"   {job:<22}{pm:<6}{hm:<6}{gm:<7}{dm}")
    pct = round(100 * full / len(jobs)) if jobs else 0
    print(_c("   " + "-" * 52, C_DIM))
    print(f"\n   Pełną bramkę delivery przechodzi: {_c(f'{full}/{len(jobs)} ({pct}%)', C_BOLD)}\n")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="run-pipeline.py — sędzia wykonywalnego pipeline'u")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_init = sub.add_parser("init")
    p_init.add_argument("job")
    p_init.add_argument("--job-type", default="")
    p_init.add_argument("--prompt", default="")
    p_init.set_defaults(func=cmd_init)

    for name, fn in [("status", cmd_status), ("next", cmd_next), ("check", cmd_check)]:
        p = sub.add_parser(name)
        p.add_argument("job")
        p.set_defaults(func=fn)

    p_reset = sub.add_parser("reset")
    p_reset.add_argument("job")
    p_reset.add_argument("--phase", default="")
    p_reset.set_defaults(func=cmd_reset)

    p_audit = sub.add_parser("audit-all")
    p_audit.set_defaults(func=cmd_audit_all)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
