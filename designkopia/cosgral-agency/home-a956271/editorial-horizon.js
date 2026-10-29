/* Scroll-driven warm horizon. One draw per display frame, and no idle work. */
export function sampleHorizonProgress(value){
  // The shader already eases its boundary. An extra early acceleration here
  // used to reveal half the white surface while the services were still visible.
  return Math.max(0,Math.min(1,value));
}

export function createHorizon(section, reduced) {
  const surface=section.querySelector('.tone-wipe__surface');
  const copy=section.querySelector('.tone-wipe__copy');
  const reverse=section.classList.contains('tone-wipe--dark');
  const clamp=v=>Math.max(0,Math.min(1,v));
  let progress=reduced?1:0,gl,program,buffer,uniforms,canvas,lost=false;
  let width=1,height=1,near=false,raf=0,last=0,bend=0,speed=0,dirty=true,destroyed=false;
  function fallback(){
    section.classList.add('is-static');
    surface.style.backgroundColor=reverse?'#080909':'#eeede8';
    if(canvas)canvas.hidden=true;
    copy.style.opacity='1';copy.style.transform='none';
    window.dispatchEvent(new Event('cosgral:horizon-layout'));
  }
  if(reduced){fallback();return {update(){},destroy(){},isLightAt(){return !reverse;}};}
  canvas=document.createElement('canvas');canvas.className='tone-wipe__field';
  canvas.setAttribute('aria-hidden','true');surface.prepend(canvas);
  const vertex=`attribute vec2 position;varying vec2 uv;
    void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
  const fragment=`precision highp float;varying vec2 uv;
    uniform float progress;uniform float reverse;uniform float bend;
    uniform vec2 viewport;uniform vec2 resolution;
    void main(){
      float p=mix(progress,1.-progress,reverse);p=p*p*(3.-2.*p);
      float y=mix(1.-uv.y,uv.y,reverse),aspect=viewport.x/viewport.y;
      float amplitude=(.53+bend)*pow(min(aspect,1.7)/1.7,.28);
      float x=(uv.x-.5)/.38,arch=exp(-x*x)*amplitude;
      float edge=mix(1.48,-.84,p)+arch;
      float slope=-2.*x/.38*arch/aspect;
      float distance=(y-edge)*viewport.y/sqrt(1.+slope*slope);
      float q=distance/clamp(min(viewport.x,viewport.y)*.12,45.,125.);
      vec3 ink=vec3(.03137,.03529,.03529),paper=vec3(.93333,.92941,.90980);
      vec3 color=mix(ink,paper,smoothstep(-.45,1.9,q));
      float rose=exp(-pow((q+.12)/.72,2.));
      float ember=exp(-pow((q-.48)/.8,2.));
      color=mix(color,vec3(.54,.10,.14),rose*.52);
      color=mix(color,vec3(1.,.43,.26),ember*.62);
      float gold=exp(-pow((q-1.08)/.72,2.));
      color=mix(color,vec3(1.,.87,.36),gold*.56);
      float grain=fract(sin(dot(floor(uv*resolution),vec2(12.9898,78.233)))*43758.5453)-.5;
      float band=smoothstep(-.8,-.1,q)*(1.-smoothstep(1.5,2.3,q));
      float coverage=reverse>.5?1.:smoothstep(-.85,.75,q);
      gl_FragColor=vec4(color+grain*.007*band,coverage);
    }`;
  function initialize(){
    gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
    if(!gl)throw new Error('Horizon unavailable');
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
    uniforms=Object.fromEntries(['progress','reverse','bend','viewport','resolution'].map(n=>[n,gl.getUniformLocation(program,n)]));
    gl.uniform1f(uniforms.reverse,reverse?1:0);resizeBuffer();
  }
  function resizeBuffer(){
    if(!gl||lost)return;
    // Preserve pixel density; only defer allocation until the section is nearby.
    const ratio=Math.min(devicePixelRatio||1,matchMedia('(max-width:700px)').matches?1.5:1.25);
    const w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
    dirty=true;
  }
  function draw(){
    if(lost||destroyed||section.classList.contains('is-static'))return;
    const endpoint=progress<=.001||progress>=.999,end=progress>=.999;
    canvas.hidden=endpoint;
    surface.style.backgroundColor=reverse?(end?'#080909':'#eeede8'):(end?'#eeede8':'transparent');
    let reveal=clamp((progress-.70)/.2);reveal=reveal*reveal*(3-2*reveal);
    copy.style.opacity=reveal.toFixed(4);copy.style.transform=`translate3d(0,${((1-reveal)*22).toFixed(2)}px,0)`;
    if(endpoint)return;
    if(!gl){try{initialize();}catch(_){fallback();return;}}
    gl.useProgram(program);gl.uniform1f(uniforms.progress,progress);gl.uniform1f(uniforms.bend,bend);
    gl.uniform2f(uniforms.viewport,width,height);gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function frame(now){
    raf=0;if(!near||document.hidden||destroyed)return;
    const dt=Math.min(.032,Math.max(.001,(now-(last||now-16.7))/1000));last=now;
    speed+=(-95*bend-12*speed)*dt;
    bend=Math.max(-.045,Math.min(.045,bend+speed*dt));
    const moving=Math.abs(bend)+Math.abs(speed)>.0003;
    if(!moving){bend=0;speed=0;}
    if(dirty||moving){dirty=false;draw();}
    if(moving)raf=requestAnimationFrame(frame);else last=0;
  }
  function schedule(){if(near&&!raf&&!destroyed)raf=requestAnimationFrame(frame);}
  const observer=new ResizeObserver(entries=>{
    const rect=entries[0].contentRect;width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    resizeBuffer();dirty=true;schedule();
  });observer.observe(surface);
  const visibility=new IntersectionObserver(entries=>{
    near=entries[0].isIntersecting;
    if(near){
      if(!gl&&!lost&&!section.classList.contains('is-static')){try{initialize();}catch(_){fallback();}}
      dirty=true;schedule();
    }else{cancelAnimationFrame(raf);raf=0;last=0;bend=0;speed=0;}
  },{rootMargin:'100% 0px'});visibility.observe(section);
  const resume=()=>{if(!document.hidden){dirty=true;schedule();}};
  document.addEventListener('visibilitychange',resume);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;fallback();});
  canvas.addEventListener('webglcontextrestored',()=>{
    lost=false;section.classList.remove('is-static');
    try{initialize();dirty=true;schedule();window.dispatchEvent(new Event('cosgral:horizon-layout'));}catch(_){fallback();}
  });
  draw();
  return {
    update(value){
      const next=clamp(value),delta=next-progress;
      if(Math.abs(delta)<.000001)return;
      speed+=Math.max(-.18,Math.min(.18,delta*7));progress=next;dirty=true;schedule();
    },
    isLightAt(x,y){
      if(section.classList.contains('is-static'))return !reverse;
      let p=reverse?1-progress:progress;p=p*p*(3-2*p);
      const aspect=width/height,nx=(x-.5)/.38;
      const arch=Math.exp(-nx*nx)*(.53+bend)*Math.pow(Math.min(aspect,1.7)/1.7,.28);
      const edge=1.48-2.32*p+arch,slope=-2*nx/.38*arch/aspect;
      const distance=((reverse?1-y:y)-edge)*height/Math.sqrt(1+slope*slope);
      const band=Math.max(45,Math.min(125,Math.min(width,height)*.12));
      return distance/band>1.2;
    },
    destroy(){
      destroyed=true;cancelAnimationFrame(raf);observer.disconnect();visibility.disconnect();
      document.removeEventListener('visibilitychange',resume);
      if(gl&&!lost){gl.deleteBuffer(buffer);gl.deleteProgram(program);}
      canvas.remove();fallback();
    }
  };
}
