import { mountObject } from "./pins4-objects.js?v=20261010p4";

var canvas = document.querySelector("[data-p4-rail-canvas]");
if (canvas) {
  var api = mountObject(canvas, "phone");
  window.cosgralP4Rail = api;
}
