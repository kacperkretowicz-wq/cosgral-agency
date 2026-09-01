/**
 * Leniwy start scen 3D.
 *
 * Wczesniej kazda strona z tagiem <script type="module"> sciagala three.js
 * (~600 kB) juz przy wejsciu — takze wtedy, gdy scena i tak sie nie uruchomi:
 * przy wlaczonym "ogranicz ruch" w systemie albo gdy na stronie po prostu nie
 * ma odpowiedniego canvasa. Statyczny import wykonuje sie ZANIM modul zdazy
 * sprawdzic swoje warunki wejscia, wiec transfer szedl na marne.
 *
 * Ten plik sprawdza te same warunki co same moduly i dopiero potem robi
 * dynamiczny import. Wazy okolo kilobajta, wiec dodatkowy skok sieciowy jest
 * nieporownywalnie tanszy niz biblioteka, ktorej nikt nie uzyje.
 */
const V = "?v=20260901b";
const root = document.documentElement;

if (!root.classList.contains("reduce-motion")) {
  const start = (name) =>
    import(`./${name}.js${V}`).catch((err) => {
      console.warn(`[three-lazy] nie udalo sie zaladowac ${name}:`, err);
    });

  if (document.getElementById("hero-3d")) start("home-hero-3d");
  if (document.getElementById("subpage-cube")) start("subpage-cube");
  if (
    document.getElementById("portfolio-sand-back") &&
    document.getElementById("portfolio-sand-front")
  ) {
    start("portfolio-hero-sand");
  }
}
