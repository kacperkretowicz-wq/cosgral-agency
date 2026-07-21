"use client";

// effects-stack.yaml → technique: webgl-image-distortion (OGL)
// Obraz reaguje na kursor: ripple displacement + RGB-split. Sygnatura parhouse.
import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Texture } from "ogl";
import { usePrefersReducedMotion } from "@/lib/motion";

const VERT = `attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
void main(){ vUv=uv; gl_Position=vec4(position,0.,1.); }`;

const FRAG = `
precision highp float;
uniform sampler2D tMap;
uniform vec2 uRes; uniform vec2 uImg; uniform vec2 uMouse; uniform float uHover; uniform float uTime;
varying vec2 vUv;
void main(){
  // object-fit: cover
  vec2 ratio = vec2(
    min((uRes.x/uRes.y)/(uImg.x/uImg.y),1.0),
    min((uRes.y/uRes.x)/(uImg.y/uImg.x),1.0)
  );
  vec2 uv = vec2(vUv.x*ratio.x+(1.-ratio.x)*.5, vUv.y*ratio.y+(1.-ratio.y)*.5);

  float d = distance(vUv, uMouse);
  float ripple = sin(d*18.0 - uTime*3.0) * 0.012 * uHover * smoothstep(0.45,0.0,d);
  vec2 dir = normalize(vUv - uMouse + 0.0001);
  vec2 disp = dir * ripple;
  float split = 0.012 * uHover * smoothstep(0.5,0.0,d);

  float r = texture2D(tMap, uv + disp + vec2(split,0.0)).r;
  float g = texture2D(tMap, uv + disp).g;
  float b = texture2D(tMap, uv + disp - vec2(split,0.0)).b;
  vec3 col = vec3(r,g,b);
  col *= 1.0 + 0.06*uHover; // lekki lift na hover
  gl_FragColor = vec4(col,1.0);
}`;

export function WebGLImageDistortion({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const host = ref.current;
    if (!host || reduced) return;
    const renderer = new Renderer({ alpha: true, dpr: Math.min(window.devicePixelRatio, 1.5) });
    const gl = renderer.gl;
    host.appendChild(gl.canvas);
    Object.assign(gl.canvas.style, { width: "100%", height: "100%", display: "block" });

    const texture = new Texture(gl, { generateMipmaps: false });
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        tMap: { value: texture },
        uRes: { value: [1, 1] },
        uImg: { value: [1, 1] },
        uMouse: { value: [0.5, 0.5] },
        uHover: { value: 0 },
        uTime: { value: 0 },
      },
    });
    img.onload = () => {
      texture.image = img;
      program.uniforms.uImg.value = [img.naturalWidth, img.naturalHeight];
    };
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      const r = host.getBoundingClientRect();
      renderer.setSize(r.width, r.height);
      program.uniforms.uRes.value = [r.width, r.height];
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let targetHover = 0;
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      program.uniforms.uMouse.value = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
    };
    const onEnter = () => (targetHover = 1);
    const onLeave = () => (targetHover = 0);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const start = performance.now();
    const loop = () => {
      program.uniforms.uTime.value = (performance.now() - start) / 1000;
      const h = program.uniforms.uHover as { value: number };
      h.value += (targetHover - h.value) * 0.08;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      gl.canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [src, reduced]);

  // SSR/reduced fallback: zwykły obraz
  return (
    <div ref={ref} className={className} role="img" aria-label={alt}>
      {reduced && <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
    </div>
  );
}
