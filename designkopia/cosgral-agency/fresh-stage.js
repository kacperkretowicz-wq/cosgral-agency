import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function extrude(shape, depth) {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.22,
    bevelSize: depth * 0.18,
    bevelSegments: 3,
    curveSegments: 12,
  });
}

export async function createStage(canvas, base) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 40);
  camera.position.set(0, 0, 7.2);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xf2f1ee, 0.35));
  const key = new THREE.DirectionalLight(0xff5a1f, 6.5);
  key.position.set(4.2, 3.4, 5);
  const rim = new THREE.DirectionalLight(0x3a7bd5, 5.2);
  rim.position.set(-4.5, -1.4, -2.2);
  const gold = new THREE.DirectionalLight(0xffb300, 2.2);
  gold.position.set(-1.5, 4.5, 2);
  const kick = new THREE.PointLight(0xff5a1f, 18, 10);
  kick.position.set(1.4, 0.4, 2.2);
  scene.add(key, rim, gold, kick);

  let glassSpec = {
    color: "#ffffff",
    metalness: 0,
    roughness: 0.04,
    transmission: 1,
    ior: 1.5,
    thickness: 1.15,
    dispersion: 0.35,
    attenuationColor: "#f6f9ff",
    attenuationDistance: 12,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    specularIntensity: 1,
    envMapIntensity: 1.8,
    iridescence: 1,
    iridescenceIOR: 1.45,
    iridescenceThicknessRange: [140, 380],
  };
  try {
    const res = await fetch(base + "assets/cube/web_glass.json");
    const json = await res.json();
    glassSpec = Object.assign(glassSpec, json);
    glassSpec.roughness = Math.max(0.035, json.roughness || 0);
    glassSpec.iridescenceThicknessRange = [160, 420];
    glassSpec.iridescenceIOR = 1.4;
  } catch (err) {
    console.warn("web_glass.json", err);
  }

  function makeGlass() {
    const params = {
      color: new THREE.Color(glassSpec.color || "#ffffff"),
      metalness: glassSpec.metalness,
      roughness: glassSpec.roughness,
      transmission: glassSpec.transmission,
      ior: glassSpec.ior,
      thickness: glassSpec.thickness,
      attenuationColor: new THREE.Color(glassSpec.attenuationColor || "#f6f9ff"),
      attenuationDistance: glassSpec.attenuationDistance,
      clearcoat: glassSpec.clearcoat,
      clearcoatRoughness: glassSpec.clearcoatRoughness,
      specularIntensity: glassSpec.specularIntensity ?? 1,
      envMapIntensity: glassSpec.envMapIntensity ?? 1.6,
      iridescence: glassSpec.iridescence,
      iridescenceIOR: glassSpec.iridescenceIOR,
      iridescenceThicknessRange: glassSpec.iridescenceThicknessRange,
      side: THREE.DoubleSide,
    };
    const mat = new THREE.MeshPhysicalMaterial(params);
    if ("dispersion" in mat && glassSpec.dispersion) mat.dispersion = Math.min(0.4, glassSpec.dispersion);
    return mat;
  }

  const glass = makeGlass();
  const root = new THREE.Group();
  scene.add(root);

  const cube = new THREE.Group();
  root.add(cube);
  try {
    const gltf = await new GLTFLoader().loadAsync(base + "assets/cube/cube_web.glb");
    const model = gltf.scene;
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.material = glass;
        obj.castShadow = false;
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    model.scale.setScalar(1.7 / maxDim);
    cube.add(model);
  } catch (err) {
    console.warn("cube_web.glb", err);
    cube.add(new THREE.Mesh(new RoundedBoxGeometry(1.45, 1.45, 1.45, 6, 0.12), glass));
  }

  function mesh(geo) {
    const m = new THREE.Mesh(geo, glass);
    geo.computeVertexNormals();
    return m;
  }
  function center(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    obj.position.sub(c);
    const s = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(s.x, s.y, s.z) || 1;
    obj.scale.multiplyScalar(1.7 / maxDim);
    return obj;
  }

  const builders = {
    prism() {
      const g = new THREE.Group();
      g.add(mesh(extrude(roundedRect(1.15, 1.35, 0.08), 0.7)));
      g.rotation.z = 0.5;
      g.rotation.x = 0.4;
      return center(g);
    },
    cart() {
      const g = new THREE.Group();
      g.add(mesh(extrude(roundedRect(1.3, 0.85, 0.08), 0.7)));
      const wheel = new THREE.TorusGeometry(0.16, 0.05, 12, 20);
      const w1 = mesh(wheel);
      w1.position.set(-0.4, -0.55, 0.2);
      const w2 = mesh(wheel.clone());
      w2.position.set(0.4, -0.55, 0.2);
      const handle = mesh(new THREE.TorusGeometry(0.34, 0.045, 10, 18, Math.PI));
      handle.position.set(0.15, 0.45, 0);
      handle.rotation.z = -0.6;
      g.add(w1, w2, handle);
      return center(g);
    },
    phone() {
      const g = new THREE.Group();
      const body = mesh(extrude(roundedRect(0.78, 1.5, 0.12), 0.12));
      const screen = mesh(extrude(roundedRect(0.62, 1.28, 0.06), 0.02));
      screen.position.z = 0.12;
      const mat2 = glass.clone();
      mat2.color = new THREE.Color("#d7e6ff");
      mat2.attenuationColor = new THREE.Color("#9eb6de");
      screen.material = mat2;
      g.add(body, screen);
      return center(g);
    },
    arch() {
      const g = new THREE.Group();
      const arch = mesh(new THREE.TorusGeometry(0.72, 0.16, 28, 48, Math.PI));
      arch.rotation.z = Math.PI;
      const slab = mesh(extrude(roundedRect(1.7, 0.18, 0.06), 0.28));
      slab.position.y = -0.72;
      g.add(arch, slab);
      return center(g);
    },
    lens() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.SphereGeometry(0.48, 48, 32)));
      const ring = mesh(new THREE.TorusGeometry(0.62, 0.07, 16, 40));
      g.add(ring);
      const handle = mesh(new THREE.CapsuleGeometry(0.07, 0.55, 6, 12));
      handle.position.set(0.55, -0.55, 0);
      handle.rotation.z = -0.8;
      g.add(handle);
      return center(g);
    },
    shards() {
      const g = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const s = mesh(new THREE.TetrahedronGeometry(0.28 + (i % 3) * 0.06, 0));
        s.position.set(Math.cos(i) * 0.38, Math.sin(i * 1.7) * 0.32, Math.cos(i * 0.6) * 0.2);
        s.rotation.set(i, i * 0.7, i * 0.3);
        g.add(s);
      }
      return center(g);
    },
    knot() {
      return center(mesh(new THREE.TorusKnotGeometry(0.48, 0.16, 180, 18)));
    },
    chart() {
      const g = new THREE.Group();
      [0.45, 0.9, 0.62].forEach((h, i) => {
        const bar = mesh(extrude(roundedRect(0.28, h, 0.06), 0.22));
        bar.position.x = (i - 1) * 0.42;
        g.add(bar);
      });
      return center(g);
    },
    bubble() {
      const g = new THREE.Group();
      g.add(mesh(extrude(roundedRect(1.35, 0.9, 0.28), 0.28)));
      const tail = mesh(new THREE.ConeGeometry(0.18, 0.34, 4));
      tail.position.set(-0.42, -0.58, 0.05);
      tail.rotation.z = 0.4;
      g.add(tail);
      return center(g);
    },
    ribbon() {
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        pts.push(new THREE.Vector3(Math.sin(t * Math.PI * 2) * 0.7, (t - 0.5) * 1.6, Math.cos(t * Math.PI * 3) * 0.35));
      }
      return center(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.1, 12, false)));
    },
    clapper() {
      const g = new THREE.Group();
      g.add(mesh(extrude(roundedRect(1.4, 0.85, 0.06), 0.12)));
      const top = mesh(extrude(roundedRect(1.4, 0.22, 0.04), 0.1));
      top.position.set(0, 0.58, 0.05);
      top.rotation.z = -0.35;
      g.add(top);
      return center(g);
    },
    pill() {
      return center(mesh(new THREE.CapsuleGeometry(0.38, 1.05, 12, 24)));
    },
    fan() {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const card = mesh(extrude(roundedRect(0.85, 1.15, 0.08), 0.04));
        card.position.set((i - 1) * 0.18, (i - 1) * 0.05, i * 0.08);
        card.rotation.z = (i - 1) * 0.18;
        g.add(card);
      }
      return center(g);
    },
    gamepad() {
      const g = new THREE.Group();
      g.add(mesh(extrude(roundedRect(1.7, 0.85, 0.32), 0.22)));
      const stick = new THREE.SphereGeometry(0.1, 16, 12);
      const s1 = mesh(stick);
      s1.position.set(-0.38, 0.12, 0.2);
      const s2 = mesh(stick.clone());
      s2.position.set(0.28, -0.05, 0.2);
      g.add(s1, s2);
      return center(g);
    },
  };

  const objects = {};
  Object.keys(builders).forEach((id) => {
    const obj = builders[id]();
    obj.visible = false;
    obj.userData.spin = 0.35 + (id.length % 5) * 0.05;
    root.add(obj);
    objects[id] = obj;
  });

  const cluster = new THREE.Group();
  cluster.visible = false;
  for (let i = 0; i < 4; i++) {
    const c = cube.clone(true);
    const ang = (i / 4) * Math.PI * 2;
    c.position.set(Math.cos(ang) * 0.85, Math.sin(ang) * 0.45, Math.sin(ang * 2) * 0.3);
    c.scale.setScalar(0.42);
    c.rotation.set(i, i * 0.6, 0.2);
    cluster.add(c);
  }
  root.add(cluster);

  const textCanvas = document.createElement("canvas");
  textCanvas.width = 4096;
  textCanvas.height = 1800;
  const textMap = new THREE.CanvasTexture(textCanvas);
  textMap.colorSpace = THREE.SRGBColorSpace;
  const textMat = new THREE.MeshBasicMaterial({ map: textMap, transparent: true, depthWrite: false });
  const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(15.2, 6.68), textMat);
  textPlane.position.set(0, -0.15, -0.2);
  scene.add(textPlane);

  const plasmaGeo = new THREE.PlaneGeometry(2, 2);
  const plasmaMat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    uniforms: { uTime: { value: 0 }, uAmt: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }",
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uAmt;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i=floor(p); vec2 f=fract(p);
        float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
        vec2 u=f*f*(3.0-2.0*f);
        return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
      }
      void main(){
        vec2 uv=vUv;
        float n=noise(uv*3.2+vec2(uTime*0.12,-uTime*0.08));
        n+=0.55*noise(uv*6.5+vec2(-uTime*0.18,uTime*0.1));
        vec3 navy=vec3(0.043,0.102,0.227);
        vec3 orange=vec3(1.0,0.353,0.122);
        vec3 gold=vec3(1.0,0.702,0.0);
        vec3 col=mix(navy, orange, smoothstep(0.25,0.72,n));
        col=mix(col, gold, smoothstep(0.62,0.95,n));
        float a=smoothstep(0.05,0.28,uAmt);
        if(a<0.01) discard;
        gl_FragColor=vec4(col, a);
      }
    `,
  });
  const plasma = new THREE.Mesh(plasmaGeo, plasmaMat);
  plasma.frustumCulled = false;
  plasma.renderOrder = 10;
  plasma.visible = false;
  scene.add(plasma);

  const sandGeo = new THREE.BufferGeometry();
  const N = REDUCED ? 200 : 900;
  const sandPos = new Float32Array(N * 3);
  const sandHome = new Float32Array(N * 3);
  const sandGoal = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    sandHome[i * 3] = (Math.random() - 0.5) * 8;
    sandHome[i * 3 + 1] = (Math.random() - 0.5) * 5;
    sandHome[i * 3 + 2] = (Math.random() - 0.5) * 3;
    const u = Math.random();
    const v = Math.random();
    const w = Math.random();
    const face = i % 6;
    const s = 0.72;
    let x = (u - 0.5) * s;
    let y = (v - 0.5) * s;
    let z = (w - 0.5) * s;
    if (face === 0) x = s / 2;
    if (face === 1) x = -s / 2;
    if (face === 2) y = s / 2;
    if (face === 3) y = -s / 2;
    if (face === 4) z = s / 2;
    if (face === 5) z = -s / 2;
    sandGoal[i * 3] = x;
    sandGoal[i * 3 + 1] = y;
    sandGoal[i * 3 + 2] = z;
    sandPos[i * 3] = sandHome[i * 3];
    sandPos[i * 3 + 1] = sandHome[i * 3 + 1];
    sandPos[i * 3 + 2] = sandHome[i * 3 + 2];
  }
  sandGeo.setAttribute("position", new THREE.BufferAttribute(sandPos, 3));
  const sand = new THREE.Points(
    sandGeo,
    new THREE.PointsMaterial({ color: 0xe6e1d8, size: 0.028, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  scene.add(sand);

  const state = {
    mode: "hero",
    objectId: "cube",
    plasma: 0,
    sand: 1,
    lines: ["KREUJEMY", "KODUJEMY", "SKALUJEMY"],
    tiltX: 0,
    tiltY: 0,
    target: null,
    running: true,
  };

  function drawText() {
    const ctx = textCanvas.getContext("2d");
    ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = "#F2F1EE";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const size = 520;
    ctx.font = `800 ${size}px "Big Shoulders Display", Impact, sans-serif`;
    ctx.letterSpacing = "210px";
    const lh = size * 0.85;
    let y = textCanvas.height / 2 - lh;
    state.lines.forEach((line) => {
      ctx.fillText(line, -260, y);
      y += lh;
    });
    textMap.needsUpdate = true;
  }
  document.fonts.ready.then(drawText);
  drawText();

  function place(group, ndcX, ndcY, depth, scl) {
    const vFov = (camera.fov * Math.PI) / 180;
    const h = 2 * Math.tan(vFov / 2) * depth;
    const w = h * camera.aspect;
    group.position.set((ndcX * w) / 2, (ndcY * h) / 2, camera.position.z - depth);
    const s = scl;
    group.scale.setScalar(s);
  }

  let sandT = 0;
  const clock = new THREE.Clock();

  function frame() {
    if (!state.running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.033, clock.getDelta());
    const t = clock.elapsedTime;
    plasmaMat.uniforms.uTime.value = t;
    plasmaMat.uniforms.uAmt.value = state.plasma;
    plasma.visible = state.plasma > 0.02;

    if (state.sand > 0.01) {
      sand.visible = true;
      sandT = Math.min(1, sandT + dt * 0.45);
      const attr = sand.geometry.attributes.position;
      for (let i = 0; i < N; i++) {
        const e = sandT * sandT * (3 - 2 * sandT);
        attr.array[i * 3] = sandHome[i * 3] + (sandGoal[i * 3] - sandHome[i * 3]) * e;
        attr.array[i * 3 + 1] = sandHome[i * 3 + 1] + (sandGoal[i * 3 + 1] - sandHome[i * 3 + 1]) * e;
        attr.array[i * 3 + 2] = sandHome[i * 3 + 2] + (sandGoal[i * 3 + 2] - sandHome[i * 3 + 2]) * e;
      }
      attr.needsUpdate = true;
      sand.material.opacity = state.sand;
    } else {
      sand.visible = false;
    }

    textPlane.visible = state.mode === "hero" && state.sand < 0.25;
    const showCube = state.objectId === "cube" && state.sand < 0.45;
    cube.visible = showCube;
    cluster.visible = state.objectId === "cluster";
    Object.keys(objects).forEach((id) => {
      objects[id].visible = id === state.objectId;
    });

    const focus =
      state.objectId === "cube" ? cube : state.objectId === "cluster" ? cluster : objects[state.objectId];
    if (focus) {
      const spin = REDUCED ? 0 : dt * 0.35;
      focus.rotation.y += spin;
      focus.rotation.x = state.tiltY * 0.35;
      focus.rotation.z = state.tiltX * -0.25;
    }

    let ndcX = 0;
    let ndcY = 0;
    let depth = 6.2;
    let scl = 1;
    if (state.mode === "dock") {
      ndcX = 0.78;
      ndcY = -0.78;
      depth = 5.2;
      scl = 0.28;
    } else if (state.mode === "menu") {
      ndcX = 0.46;
      ndcY = 0.05;
      depth = 6.4;
      scl = 0.85;
    } else if (state.mode === "slot" && state.target) {
      ndcX = state.target.x;
      ndcY = state.target.y;
      depth = 5.4;
      scl = 0.72;
    } else if (state.mode === "aside") {
      ndcX = 0.42;
      ndcY = 0.05;
      depth = 6;
      scl = 0.95;
    } else if (state.mode === "center") {
      ndcX = 0;
      ndcY = -0.02;
      depth = 6.1;
      scl = 1.15;
    }
    if (state.mode === "hero") scl = 1.28;
    const current = state.objectId === "cluster" ? cluster : state.objectId === "cube" ? cube : objects[state.objectId];
    if (current) {
      const dest = new THREE.Vector3();
      const vFov = (camera.fov * Math.PI) / 180;
      const h = 2 * Math.tan(vFov / 2) * depth;
      const w = h * camera.aspect;
      dest.set((ndcX * w) / 2, (ndcY * h) / 2, camera.position.z - depth);
      current.position.lerp(dest, 1 - Math.pow(0.001, dt));
      const cs = current.scale.x;
      const ns = cs + (scl - cs) * (1 - Math.pow(0.001, dt));
      if (state.objectId !== "cluster") current.scale.setScalar(ns);
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
  }
  window.addEventListener("resize", resize);

  return {
    setLines(lines) {
      state.lines = lines;
      drawText();
    },
    setMode(mode) {
      state.mode = mode;
    },
    setObject(id) {
      state.objectId = id === "cube" || id === "cluster" || objects[id] ? id : "cube";
    },
    setTarget(ndc) {
      state.target = ndc;
    },
    setPlasma(v) {
      state.plasma = v;
    },
    setSand(v) {
      state.sand = v;
      if (v <= 0) sandT = 1;
    },
    setTilt(x, y) {
      state.tiltX = x;
      state.tiltY = y;
    },
    resize,
  };
}
