/* Scroll-driven thermal horizon, studied from the saved Superpower reference.
 * No idle render loop: redraw only when scrolling or resizing changes the field.
 */
export function createHorizon(section, reduced) {
  const surface = section.querySelector('.tone-wipe__surface');
  const copy = section.querySelector('.tone-wipe__copy');
  const reverse = section.classList.contains('tone-wipe--dark');
  const clamp = v => Math.max(0, Math.min(1, v));
  let progress = reduced ? 1 : 0, gl, program, buffer, uniforms, canvas, lost = false;
  function fallback() {
    section.classList.add('is-static');
    surface.style.backgroundColor = reverse ? '#080909' : '#eeede8';
    if (canvas) canvas.hidden = true;
    copy.style.opacity = '1'; copy.style.transform = 'none';
    window.dispatchEvent(new Event('cosgral:horizon-layout'));
  }
  if (reduced) { fallback(); return { update() {}, destroy() {}, isLightAt() { return !reverse; } }; }
  canvas = document.createElement('canvas');
  canvas.className = 'tone-wipe__field'; canvas.setAttribute('aria-hidden', 'true');
  surface.prepend(canvas);
  gl = canvas.getContext('webgl', { alpha:false, antialias:false, depth:false, stencil:false, powerPreference:'low-power' });
  if (!gl) { fallback(); return { update() {}, destroy() {}, isLightAt() { return !reverse; } }; }
  const vertex = `attribute vec2 position; varying vec2 uv;
    void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment = `precision highp float; varying vec2 uv;
    uniform float progress; uniform float reverse; uniform vec2 viewport; uniform vec2 resolution;
    void main(){
      float p=mix(progress,1.-progress,reverse);p=p*p*(3.-2.*p);
      float y=mix(1.-uv.y,uv.y,reverse);
      float aspect=viewport.x/viewport.y;
      float amplitude=.44*pow(min(aspect,1.7)/1.7,.28);
      float x=(uv.x-.5)/.36;
      float arch=exp(-x*x)*amplitude;
      float edge=mix(1.48,-.84,p)+arch;
      float slope=-2.*x/.36*arch/aspect;
      float distance=(y-edge)*viewport.y/sqrt(1.+slope*slope);
      float q=distance/clamp(min(viewport.x,viewport.y)*.092,38.,96.);
      vec3 ink=vec3(.03137,.03529,.03529),paper=vec3(.93333,.92941,.90980);
      vec3 color=mix(ink,vec3(.64,.065,.025),smoothstep(-.36,.2,q));
      color=mix(color,vec3(1.,.28,.025),smoothstep(.05,.68,q));
      color=mix(color,vec3(1.,.83,.12),smoothstep(.48,1.08,q));
      color=mix(color,paper,smoothstep(.94,1.94,q));
      float grain=fract(sin(dot(floor(uv*resolution),vec2(12.9898,78.233)))*43758.5453)-.5;
      float band=smoothstep(-.45,.05,q)*(1.-smoothstep(1.55,2.,q));
      gl_FragColor=vec4(color+grain*.009*band,1.);
    }`;
  function initialize(){
    function compile(type,source){
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw new Error('Horizon shader unavailable');}
      return shader;
    }
    const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
    program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Horizon unavailable');
    gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const attribute=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
    uniforms=Object.fromEntries(['progress','reverse','viewport','resolution'].map(n=>[n,gl.getUniformLocation(program,n)]));
    gl.uniform1f(uniforms.reverse,reverse?1:0);
  }
  function draw(){
    if(lost||section.classList.contains('is-static'))return;
    const endpoint=progress<=.001||progress>=.999,end=progress>=.999;
    canvas.hidden=endpoint;
    surface.style.backgroundColor=(reverse?!end:end)?'#eeede8':'#080909';
    let reveal=clamp((progress-.68)/.2);reveal=reveal*reveal*(3-2*reveal);
    copy.style.opacity=reveal.toFixed(4);copy.style.transform=`translate3d(0,${((1-reveal)*22).toFixed(2)}px,0)`;
    if(endpoint)return;
    gl.useProgram(program);gl.uniform1f(uniforms.progress,progress);
    gl.uniform2f(uniforms.viewport,surface.clientWidth,surface.clientHeight);
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function resize(){
    if(lost||section.classList.contains('is-static'))return;
    const ratio=Math.min(devicePixelRatio||1,matchMedia('(max-width:700px)').matches?1.5:1.25);
    canvas.width=Math.max(1,Math.round(surface.clientWidth*ratio));canvas.height=Math.max(1,Math.round(surface.clientHeight*ratio));
    gl.viewport(0,0,canvas.width,canvas.height);draw();
  }
  try{initialize();resize();}catch(_){fallback();}
  const observer=new ResizeObserver(resize);observer.observe(surface);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;fallback();});
  canvas.addEventListener('webglcontextrestored',()=>{
    lost=false;section.classList.remove('is-static');try{initialize();resize();window.dispatchEvent(new Event('cosgral:horizon-layout'));}catch(_){fallback();}
  });
  return {
    update(value){progress=clamp(value);section.style.setProperty('--wipe-progress',progress.toFixed(4));draw();},
    isLightAt(x,y){
      if(section.classList.contains('is-static'))return !reverse;
      let p=reverse?1-progress:progress;p=p*p*(3-2*p);
      const aspect=surface.clientWidth/surface.clientHeight;
      const nx=(x-.5)/.36,arch=Math.exp(-nx*nx)*.44*Math.pow(Math.min(aspect,1.7)/1.7,.28);
      const edge=1.48-2.32*p+arch,slope=-2*nx/.36*arch/aspect;
      const distance=((reverse?1-y:y)-edge)*surface.clientHeight/Math.sqrt(1+slope*slope);
      const band=Math.max(38,Math.min(96,Math.min(surface.clientWidth,surface.clientHeight)*.092));
      return distance/band>1.4;
    },
    destroy(){observer.disconnect();if(!lost){gl.deleteBuffer(buffer);gl.deleteProgram(program);}canvas.remove();fallback();}
  };
}
