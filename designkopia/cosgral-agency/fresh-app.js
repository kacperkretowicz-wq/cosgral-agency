import { createStage } from "./fresh-stage.js";

const body = document.body;
const base = body.dataset.base || "";
const isHome = body.dataset.page === "home";
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = window.matchMedia("(pointer: coarse)").matches;
if (coarse) body.classList.add("is-touch");

const canvas = document.querySelector("[data-stage]");
const stage = await createStage(canvas, base);
await document.fonts.ready;
document.documentElement.classList.add("is-gl");

let lang = localStorage.getItem("cg-lang") === "en" ? "en" : "pl";
let menuOpen = false;
let soundOn = localStorage.getItem("cg-sound") === "1";
let audioCtx = null;

function blip() {
  if (!soundOn) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!audioCtx) audioCtx = new AC();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "sine";
  o.frequency.value = 640;
  g.gain.setValueAtTime(0.03, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.07);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.08);
}

function applyLang(next) {
  lang = next === "en" ? "en" : "pl";
  document.documentElement.lang = lang;
  localStorage.setItem("cg-lang", lang);
  document.querySelectorAll("[data-pl]").forEach((el) => {
    const val = lang === "en" ? el.dataset.en : el.dataset.pl;
    if (val != null) el.textContent = val;
  });
  document.querySelectorAll("[data-pl-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", lang === "en" ? el.dataset.enPlaceholder : el.dataset.plPlaceholder);
  });
  const toggle = document.querySelector("[data-lang]");
  if (toggle) toggle.textContent = lang === "en" ? "PL" : "EN";
  stage.setLines(lang === "en" ? ["CREATE", "CODE", "SCALE"] : ["KREUJEMY", "KODUJEMY", "SKALUJEMY"]);
  const soundBtn = document.querySelector("[data-sound]");
  if (soundBtn) soundBtn.textContent = soundOn ? (lang === "en" ? "Sound on" : "Dźwięk włączony") : (lang === "en" ? "Sound off" : "Dźwięk");
}

function setMenu(open) {
  menuOpen = open;
  document.documentElement.classList.toggle("is-menu", open);
  const btn = document.querySelector("[data-menu]");
  if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) blip();
}

document.querySelector("[data-menu]")?.addEventListener("click", () => setMenu(!menuOpen));
document.querySelector("[data-menu-close]")?.addEventListener("click", () => setMenu(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

document.querySelector("[data-lang]")?.addEventListener("click", () => {
  applyLang(lang === "pl" ? "en" : "pl");
  blip();
});

document.querySelector("[data-sound]")?.addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem("cg-sound", soundOn ? "1" : "0");
  applyLang(lang);
  blip();
});

const preview = document.querySelector("[data-menu-preview]");
const serviceList = document.querySelector("[data-menu-services]");
document.querySelectorAll("[data-preview]").forEach((link) => {
  const show = () => {
    if (preview && link.dataset.preview) {
      preview.src = link.dataset.preview;
      preview.classList.add("is-on");
    }
    if (serviceList) serviceList.classList.toggle("is-on", link.dataset.services === "1");
    document.querySelectorAll(".menu__links a").forEach((a) => a.classList.toggle("is-hot", a === link));
  };
  link.addEventListener("mouseenter", show);
  link.addEventListener("focus", show);
});

const cursor = document.querySelector("[data-cursor]");
let mx = window.innerWidth / 2;
let my = window.innerHeight / 2;
let cx = mx;
let cy = my;
if (!coarse && cursor) {
  window.addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
  });
}

document.querySelector("[data-gyro]")?.addEventListener("click", async () => {
  try {
    const Doe = window.DeviceOrientationEvent;
    if (Doe && typeof Doe.requestPermission === "function") {
      const res = await Doe.requestPermission();
      if (res !== "granted") return;
    }
  } catch (err) {
    return;
  }
  window.addEventListener("deviceorientation", (e) => {
    const x = Math.max(-1, Math.min(1, (e.gamma || 0) / 28));
    const y = Math.max(-1, Math.min(1, ((e.beta || 0) - 40) / 35));
    stage.setTilt(x, y);
  });
  const gyro = document.querySelector("[data-gyro]");
  if (gyro) gyro.hidden = true;
});

function ndcOf(el) {
  if (!el) return { x: 0, y: 0 };
  const r = el.getBoundingClientRect();
  return {
    x: ((r.left + r.width / 2) / window.innerWidth) * 2 - 1,
    y: -(((r.top + r.height / 2) / window.innerHeight) * 2 - 1),
  };
}

function syncStage() {
  if (menuOpen) {
    stage.setMode("menu");
    stage.setObject("cube");
    stage.setPlasma(0);
    return;
  }
  const plasmaEl = document.querySelector("[data-plasma]");
  if (plasmaEl) {
    const r = plasmaEl.getBoundingClientRect();
    const mid = r.top + r.height / 2 - window.innerHeight / 2;
    const amt = Math.max(0, 1 - Math.abs(mid) / (window.innerHeight * 0.65));
    stage.setPlasma(amt);
  } else {
    stage.setPlasma(0);
  }

  const hero = document.querySelector("[data-hero]");
  const rail = document.querySelector("[data-rail]");
  const process = document.querySelector("[data-process]");
  const cta = document.querySelector("[data-cta]");
  const sub = document.querySelector("[data-subhero]");
  const viewMid = window.innerHeight * 0.5;

  const hit = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top < viewMid && r.bottom > viewMid;
  };

  if (hit(rail)) {
    const active = rail.querySelector(".svc.is-active") || rail.querySelector(".svc");
    stage.setMode("slot");
    stage.setObject(active ? active.dataset.object : "prism");
    stage.setTarget(ndcOf(active && active.querySelector("[data-object-slot]")));
    return;
  }
  if (hit(process)) {
    stage.setMode("slot");
    stage.setObject("cluster");
    stage.setTarget(ndcOf(process.querySelector("[data-object-slot]")));
    return;
  }
  if (hit(cta)) {
    stage.setMode("center");
    stage.setObject("cube");
    return;
  }
  if (hero) {
    const r = hero.getBoundingClientRect();
    if (r.bottom > window.innerHeight * 0.55) {
      stage.setMode("hero");
      stage.setObject("cube");
      return;
    }
  }
  if (sub) {
    const r = sub.getBoundingClientRect();
    if (r.bottom > window.innerHeight * 0.4) {
      stage.setMode("aside");
      stage.setObject(body.dataset.object || "cube");
      return;
    }
  }
  stage.setMode("dock");
  stage.setObject("cube");
}

if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
}
if (window.Lenis) {
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  window.lenis = lenis;
  if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.on("scroll", syncStage);
} else {
  window.addEventListener("scroll", syncStage, { passive: true });
}
gsap.ticker.add(() => {
  if (cursor && !coarse) {
    const el = document.elementFromPoint(mx, my);
    const hit = el && el.closest("a, button");
    let x = mx;
    let y = my;
    if (hit) {
      const r = hit.getBoundingClientRect();
      x = mx + (r.left + r.width / 2 - mx) * 0.28;
      y = my + (r.top + r.height / 2 - my) * 0.28;
      cursor.classList.add("is-mag");
    } else cursor.classList.remove("is-mag");
    cx += (x - cx) * 0.22;
    cy += (y - cy) * 0.22;
    cursor.style.left = cx + "px";
    cursor.style.top = cy + "px";
  }
  syncStage();
});

function setupRail() {
  const pin = document.querySelector("[data-rail]");
  const track = document.querySelector("[data-rail-track]");
  if (!pin || !track) return;
  const cards = Array.from(track.querySelectorAll(".svc"));
  const mark = () => {
    if (!cards.length) return;
    const center = window.innerWidth / 2;
    let best = 0;
    let dist = Infinity;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - center);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    cards.forEach((card, i) => card.classList.toggle("is-active", i === best));
  };
  const mobile = window.matchMedia("(max-width: 800px)").matches || reduced;
  if (!mobile && window.ScrollTrigger) {
    const setH = () => {
      pin.style.height = track.scrollWidth - window.innerWidth + window.innerHeight + "px";
    };
    setH();
    gsap.to(track, {
      x: () => -(track.scrollWidth - window.innerWidth + 32),
      ease: "none",
      scrollTrigger: {
        trigger: pin,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.7,
        invalidateOnRefresh: true,
        onUpdate: mark,
      },
    });
    window.addEventListener("resize", () => {
      setH();
      ScrollTrigger.refresh();
    });
  } else {
    track.addEventListener("scroll", mark, { passive: true });
  }
  mark();
}

function setupWork() {
  const rows = Array.from(document.querySelectorAll("[data-work]"));
  const open = (row) => {
    rows.forEach((other) => {
      const frame = other.querySelector(".work-row__frame");
      if (!frame) return;
      if (other === row) {
        other.classList.add("is-open");
        const h = Math.round(window.innerHeight * 0.78);
        if (window.gsap) {
          gsap.to(frame, { height: h, duration: 0.9, ease: "expo.inOut" });
          const media = frame.querySelector("img, video");
          if (media) gsap.fromTo(media, { scale: 1.14 }, { scale: 1, duration: 0.9, ease: "expo.inOut" });
        } else frame.style.height = h + "px";
        const video = frame.querySelector("video");
        if (video) {
          if (!video.src && video.dataset.src) video.src = video.dataset.src;
          video.play().catch(() => {});
        }
      } else if (other.classList.contains("is-open")) {
        other.classList.remove("is-open");
        if (window.gsap) gsap.to(frame, { height: 0, duration: 0.9, ease: "expo.inOut" });
        else frame.style.height = "0px";
        other.querySelector("video")?.pause();
      }
    });
  };
  rows.forEach((row, i) => {
    row.querySelector(".work-row__bar")?.addEventListener("click", () => {
      blip();
      open(row);
    });
    if (window.ScrollTrigger) {
      ScrollTrigger.create({
        trigger: row,
        start: "top 68%",
        onEnter: () => open(row),
        onEnterBack: () => open(row),
      });
    } else if (i === 0) open(row);
  });
}

function setupSplit() {
  const el = document.querySelector("[data-split]");
  if (!el || reduced || !window.gsap) return;
  const run = () => {
    if (el.dataset.splitReady) return;
    let chars = [];
    if (window.SplitText) {
      const split = new SplitText(el, { type: "chars", charsClass: "char" });
      chars = split.chars;
    } else {
      const text = el.textContent;
      el.textContent = "";
      chars = Array.from(text).map((ch) => {
        const s = document.createElement("span");
        s.className = "char";
        s.textContent = ch === " " ? "\u00a0" : ch;
        el.appendChild(s);
        return s;
      });
    }
    gsap.from(chars, {
      yPercent: 120,
      opacity: 0,
      stagger: 0.015,
      duration: 0.85,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 78%" },
    });
    el.dataset.splitReady = "1";
  };
  run();
}

function setupReveals() {
  if (!window.gsap || reduced) return;
  const manifesto = document.querySelector(".act-manifesto");
  if (manifesto) {
    gsap.from(manifesto, {
      clipPath: "inset(100% 0% 0% 0%)",
      duration: 1.05,
      ease: "expo.inOut",
      scrollTrigger: { trigger: manifesto, start: "top 85%" },
    });
  }
  const reels = document.querySelector(".reel-row");
  if (reels) {
    gsap.from(reels, {
      clipPath: "circle(0% at 50% 50%)",
      duration: 1.1,
      ease: "power4.out",
      scrollTrigger: { trigger: ".act-reels", start: "top 70%" },
    });
  }
  gsap.utils.toArray(".case").forEach((el) => {
    gsap.from(el, {
      clipPath: "inset(0% 100% 0% 0%)",
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 82%" },
    });
  });
  gsap.utils.toArray(".term p").forEach((el, i) => {
    gsap.from(el, {
      opacity: 0,
      y: 16,
      duration: 0.45,
      delay: i * 0.12,
      scrollTrigger: { trigger: ".term", start: "top 72%" },
    });
  });
  const imgs = gsap.utils.toArray(".cloud img");
  const cta = document.querySelector("[data-cta]");
  if (cta && imgs.length) {
    imgs.forEach((img, i) => {
      const ang = (i / imgs.length) * Math.PI * 2 - Math.PI / 2;
      const radius = Math.min(window.innerWidth, window.innerHeight) * 0.28;
      gsap.fromTo(
        img,
        { xPercent: -50, yPercent: -50, x: Number(img.dataset.x || 0), y: Number(img.dataset.y || 0), rotation: Number(img.dataset.r || 0) },
        {
          xPercent: -50,
          yPercent: -50,
          x: Math.cos(ang) * radius,
          y: Math.sin(ang) * radius,
          rotation: 0,
          ease: "none",
          scrollTrigger: { trigger: cta, start: "top top", end: "bottom bottom", scrub: 0.8 },
        },
      );
    });
  }
}

function setupFaq() {
  document.querySelectorAll(".faq button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq");
      item.parentElement.querySelectorAll(".faq").forEach((other) => {
        if (other !== item) other.classList.remove("is-open");
      });
      item.classList.toggle("is-open");
      blip();
    });
  });
}

function setupMedia() {
  const nodes = document.querySelectorAll("video[data-src]");
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        const v = en.target;
        if (en.isIntersecting) {
          if (!v.getAttribute("src")) v.src = v.dataset.src;
          v.play().catch(() => {});
        } else v.pause();
      });
    },
    { rootMargin: "240px" },
  );
  nodes.forEach((v) => io.observe(v));
}

function setupChat() {
  const root = document.querySelector("[data-cg-chat]");
  if (!root) return;
  const API = (window.COSGRAL_CHAT_API || "https://cosgralhub.netlify.app/api/site-chat").replace(/\/$/, "");
  const KEY = "cg_chat_visitor_key";
  const panel = root.querySelector(".cg-chat-panel");
  const launcher = root.querySelector(".cg-chat-launcher");
  const form = root.querySelector("form");
  const input = form.querySelector("input");
  const msgs = root.querySelector(".cg-chat-msgs");
  const empty = root.querySelector(".cg-chat-empty");
  const badge = root.querySelector(".cg-chat-badge");
  let visitor = localStorage.getItem(KEY);
  if (!visitor) {
    visitor = crypto.randomUUID ? crypto.randomUUID() : "v-" + Date.now();
    localStorage.setItem(KEY, visitor);
  }
  const known = {};
  let open = false;
  let unread = 0;
  let sending = false;
  let polling = false;

  function scrollBottom() {
    msgs.scrollTop = msgs.scrollHeight;
  }
  function badgeSet() {
    badge.hidden = !(unread > 0 && !open);
    badge.textContent = unread > 9 ? "9+" : String(unread);
  }
  function render(m) {
    if (!m || known[m.id]) return;
    known[m.id] = 1;
    if (empty) empty.remove();
    const bubble = document.createElement("div");
    bubble.className = "cg-chat-bubble cg-chat-bubble--" + (m.role === "agent" ? "agent" : "visitor");
    bubble.textContent = m.body || "";
    msgs.appendChild(bubble);
    if (m.role === "agent" && !open) unread += 1;
    badgeSet();
    scrollBottom();
  }
  function poll() {
    if (document.hidden || polling) return;
    polling = true;
    fetch(API + "?visitor_key=" + encodeURIComponent(visitor) + "&_=" + Date.now(), { cache: "no-store", credentials: "omit" })
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.messages)) data.messages.forEach(render);
      })
      .catch(() => {})
      .finally(() => {
        polling = false;
      });
  }
  function setOpen(next) {
    open = next;
    panel.classList.toggle("is-open", open);
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      unread = 0;
      badgeSet();
      input.focus();
      poll();
    }
  }
  launcher.addEventListener("click", () => {
    blip();
    setOpen(!open);
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || sending) return;
    sending = true;
    fetch(API, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor_key: visitor, body: text, page_url: location.href.slice(0, 500) }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then((res) => {
        if (!res.ok) throw new Error("send");
        input.value = "";
        if (res.data && res.data.message) render(res.data.message);
        else poll();
      })
      .catch(() => {
        input.value = text;
      })
      .finally(() => {
        sending = false;
      });
  });
  function chatVisibility() {
    const hero = document.querySelector("[data-hero], [data-subhero]");
    const stop = document.querySelector("[data-chat-stop]");
    const past = hero ? hero.getBoundingClientRect().bottom < window.innerHeight * 0.35 : window.scrollY > 200;
    const before = stop ? stop.getBoundingClientRect().top > window.innerHeight * 0.7 : true;
    const show = past && before && !menuOpen;
    root.classList.toggle("is-chat-visible", show);
    if (!show && open) setOpen(false);
  }
  window.addEventListener("scroll", chatVisibility, { passive: true });
  gsap.ticker.add(chatVisibility);
  poll();
  setInterval(poll, 1800);
}

function setupForm() {
  const form = document.querySelector("[data-contact]");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = form.querySelector("[data-note]");
    const data = new FormData(form);
    data.set("lang", lang);
    try {
      const res = await fetch(base + "contact.php", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error("fail");
      form.reset();
      if (note) note.textContent = lang === "en" ? "Message sent. We reply within one business day." : "Wiadomość wysłana. Wracamy w ciągu jednego dnia roboczego.";
    } catch (err) {
      if (note) note.textContent = lang === "en" ? "Could not send. Write to kontakt@cosgral.pl." : "Nie udało się wysłać. Napisz na kontakt@cosgral.pl.";
    }
  });
}

document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a || a.target === "_blank" || a.hasAttribute("data-no-transition")) return;
  const href = a.getAttribute("href") || "";
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
  let url;
  try { url = new URL(a.href, location.href); } catch (err) { return; }
  if (url.origin !== location.origin) return;
  if (url.pathname === location.pathname) {
    if (url.hash) {
      e.preventDefault();
      setMenu(false);
      const target = document.querySelector(url.hash);
      if (target && window.lenis) window.lenis.scrollTo(target, { offset: -20 });
      else if (target) target.scrollIntoView();
    }
    return;
  }
  e.preventDefault();
  blip();
  document.documentElement.classList.add("is-leaving");
  setTimeout(() => {
    location.href = a.href;
  }, 600);
});

if (!isHome) {
  document.documentElement.classList.add("is-enter");
  requestAnimationFrame(() => document.documentElement.classList.add("is-in"));
  stage.setSand(0);
  stage.setMode("aside");
  stage.setObject(body.dataset.object || "cube");
} else {
  const pre = document.querySelector("[data-preloader]");
  stage.setSand(1);
  stage.setMode("hero");
  stage.setObject("cube");
  setTimeout(() => stage.setSand(0), reduced ? 200 : 1700);
  setTimeout(() => pre && pre.classList.add("is-done"), reduced ? 300 : 2300);
}

applyLang(lang);
setupRail();
setupWork();
setupSplit();
setupReveals();
setupFaq();
setupMedia();
setupChat();
setupForm();
syncStage();
