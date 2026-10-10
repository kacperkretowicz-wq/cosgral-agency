import { mountObject } from "./pins4-objects.js?v=20261010p4";

var canvas = document.querySelector("[data-p4-object]");
if (canvas) mountObject(canvas, canvas.getAttribute("data-p4-object"));
