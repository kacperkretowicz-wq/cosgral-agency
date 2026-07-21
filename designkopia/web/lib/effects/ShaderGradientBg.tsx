"use client";

// effects-stack.yaml → technique: shader-gradient-bg (PRAWDZIWY WebGL, OGL)
// Płynący fbm-noise mesh mieszający kolory z tokenów joba (--bg/--accent/--surface).
import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Color } from "ogl";
import { usePrefersReducedMotion } from "@/lib/motion";

const FRAG = `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
varying vec2 vUv;

vec2 hash(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return -1.+2.*fract(sin(p)*43758.5453123); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(dot(hash(i+vec2(0,0)),f-vec2(0,0)),dot(hash(i+vec2(1,0)),f-vec2(1,0)),u.x),
             mix(dot(hash(i+vec2(0,1)),f-vec2(0,1)),dot(hash(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=.5; } return v; }

void main(){
  vec2 uv=vUv; uv.x*=uRes.x/uRes.y;
  float t=uTime*0.06;
  vec2 q=vec2(fbm(uv+t), fbm(uv-t+5.2));
  float n=fbm(uv*1.6 + q*1.8 + t);
  n=smoothstep(-0.4,0.9,n);
  vec3 col=mix(uA,uB,n);
  col=mix(col,uC,smoothstep(0.5,1.0,fbm(uv*2.2 - q)));
  // delikatna winieta
  col*=0.85+0.15*smoothstep(1.2,0.2,length(vUv-0.5));
  gl_FragColor=vec4(col,1.0);
}`;

const VERT = `
attribute vec2 uv; attribute vec2 position; varying vec2 vUv;
void main(){ vUv=uv; gl_Position=vec4(position,0.,1.); }`;

function cssColor(el: HTMLElement, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim() || fallback;
  try {
    return new Color(v);
  } catch {
    return new Color(fallback);
  }
}

export function ShaderGradientBg({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const renderer = new Renderer({ alpha: false, dpr: Math.min(window.devicePixelRatio, 1.5) });
    const gl = renderer.gl;
    host.appendChild(gl.canvas);
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: [1, 1] },
        uA: { value: cssColor(host, "--bg", "#0b0b0c") },
        uB: { value: cssColor(host, "--accent", "#e8482a") },
        uC: { value: cssColor(host, "--surface", "#141416") },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      const r = host.getBoundingClientRect();
      renderer.setSize(r.width, r.height);
      program.uniforms.uRes.value = [r.width, r.height];
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    const start = performance.now();
    const loop = () => {
      program.uniforms.uTime.value = (performance.now() - start) / 1000;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    if (reduced) {
      renderer.render({ scene: mesh }); // jedna klatka
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.canvas.remove();
      const ext = gl.getExtension("WEBGL_lose_context");
      ext?.loseContext();
    };
  }, [reduced]);

  return <div ref={ref} aria-hidden className={`absolute inset-0 ${className ?? ""}`} />;
}
