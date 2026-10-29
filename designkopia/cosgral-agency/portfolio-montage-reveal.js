/* A damped height field: light and refraction follow the water's actual slope.
   The only sampled artwork is our own title canvas, so no poster can taint it. */
(function () {
  'use strict';
  const chapter=document.getElementById('montaz'), scroller=document.querySelector('[data-chapters-scroller]');
  if(!chapter||!scroller)return;
  const surface=document.createElement('div');surface.className='pf-montage-reveal';surface.hidden=true;surface.setAttribute('aria-hidden','true');
  const title=document.createElement('strong');title.className='pf-montage-word';
  const canvas=document.createElement('canvas');surface.append(title,canvas);document.body.append(surface);
  const artwork=document.createElement('canvas'), ink=artwork.getContext('2d');
  let gl=null,ctx=null,program,uniforms,textures=[];
  let W=1,H=1,GW=1,GH=1,height,previous,next,exposure,pixels;
  let visible=false,raf=0,last=0,moved=0,oldPointer=null,accumulator=0;
  const points=[];
  const reduced=document.documentElement.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
  function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('water shader');return sh;}
  function initialize(){
    gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
    if(!gl)return false;
    const vertex='attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
    const fragment=`precision highp float;varying vec2 uv;
      uniform sampler2D field;uniform sampler2D title;uniform vec2 texel;uniform float motion;
      float h(vec2 p){return (texture2D(field,p).r-.5)*2.;}
      void main(){
        vec2 p=vec2(uv.x,1.-uv.y);
        vec2 slope=vec2(h(p+vec2(texel.x,0.))-h(p-vec2(texel.x,0.)),h(p+vec2(0.,texel.y))-h(p-vec2(0.,texel.y)));
        vec3 normal=normalize(vec3(-slope.x*9.,slope.y*9.,1.));
        float coverage=smoothstep(.055,.67,texture2D(field,p).g);
        vec2 refracted=clamp(p+slope*vec2(.11,.085)*motion,0.,1.);
        vec3 paper=texture2D(title,refracted).rgb;
        float depth=clamp(normal.z,.2,1.);
        vec3 water=vec3(.002,.004,.007);
        vec3 light=normalize(vec3(-.5,.65,1.3));
        vec3 halfLight=normalize(light+vec3(0.,0.,1.));
        float crest=pow(max(0.,dot(normal,halfLight)),95.)*min(1.,length(slope)*14.);
        float rim=pow(1.-normal.z,2.2);
        float edge=smoothstep(.015,.2,length(slope));
        vec3 color=mix(water,paper*(.77+.23*depth),coverage);
        color+=vec3(.7,.84,1.)*(crest*.88+rim*.26)*edge*motion;
        color+=vec3(.035,.047,.065)*edge*(1.-coverage);
        gl_FragColor=vec4(clamp(color,0.,1.),1.);
      }`;
    program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('water program');gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    uniforms=Object.fromEntries(['field','title','texel','motion'].map(n=>[n,gl.getUniformLocation(program,n)]));
    for(let i=0;i<2;i++){const t=gl.createTexture();textures.push(t);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
    gl.uniform1i(uniforms.field,0);gl.uniform1i(uniforms.title,1);gl.uniform1f(uniforms.motion,reduced?0:1);
    surface.dataset.renderer='webgl-water';title.style.visibility='hidden';return true;
  }
  try{initialize();}catch(_){gl=null;canvas.remove();const fallback=document.createElement('canvas');surface.append(fallback);ctx=fallback.getContext('2d');surface.dataset.renderer='canvas-fallback';}
  if(!gl&&!ctx){ctx=canvas.getContext('2d');surface.dataset.renderer='canvas-fallback';}
  function language(){
    const word=document.documentElement.lang==='en'?'EDITS':'MONTAŻ';title.textContent=word;
    artwork.width=Math.max(1,Math.min(1600,innerWidth));artwork.height=Math.max(1,Math.round(innerHeight*artwork.width/innerWidth));
    const scale=artwork.width/innerWidth,size=Math.min(270,Math.max(78,innerWidth*.17))*scale;
    ink.fillStyle='#fff';ink.fillRect(0,0,artwork.width,artwork.height);ink.fillStyle='#000';ink.font='700 '+size+'px Arial, Helvetica, sans-serif';ink.textAlign='center';ink.textBaseline='middle';if('letterSpacing'in ink)ink.letterSpacing=(-size*.075)+'px';ink.fillText(word,artwork.width/2,artwork.height/2);
    if(gl){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,textures[1]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,artwork);}
    draw();
  }
  function reset(){height.fill(0);previous.fill(0);next.fill(0);exposure.fill(0);oldPointer=null;accumulator=0;draw();}
  function resize(){
    const ratio=Math.min(1,1150/innerWidth);W=Math.max(1,Math.round(innerWidth*ratio));H=Math.max(1,Math.round(innerHeight*ratio));
    const target=gl?canvas:surface.querySelector('canvas');target.width=W;target.height=H;
    GW=192;GH=Math.max(64,Math.round(GW*innerHeight/innerWidth));
    height=new Float32Array(GW*GH);previous=new Float32Array(GW*GH);next=new Float32Array(GW*GH);exposure=new Float32Array(GW*GH);pixels=new Uint8Array(GW*GH*4);
    if(gl){gl.viewport(0,0,W,H);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[0]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,GW,GH,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);gl.uniform2f(uniforms.texel,1/GW,1/GH);}
    language();reset();sync();
  }
  function disturb(x,y){
    const radius=GW*.07,wr=GW*.022;
    for(let j=Math.max(1,Math.floor(y-radius));j<Math.min(GH-1,y+radius);j++)for(let i=Math.max(1,Math.floor(x-radius));i<Math.min(GW-1,x+radius);i++){
      const d2=(i-x)*(i-x)+(j-y)*(j-y),k=j*GW+i;
      exposure[k]=Math.max(exposure[k],Math.exp(-d2/(radius*radius*.32)));
      if(!reduced)height[k]=Math.max(-.9,height[k]-.22*Math.exp(-d2/(wr*wr*.5)));
    }
  }
  function simulate(){
    for(let y=1;y<GH-1;y++)for(let x=1;x<GW-1;x++){
      const i=y*GW+x;
      next[i]=Math.max(-1,Math.min(1,((height[i-1]+height[i+1]+height[i-GW]+height[i+GW])*.5-previous[i])*.983));
      exposure[i]=(exposure[i]*.94+(exposure[i-1]+exposure[i+1]+exposure[i-GW]+exposure[i+GW])*.015)*.989;
    }
    const swap=previous;previous=height;height=next;next=swap;
  }
  function draw(){
    if(!height)return;
    if(gl){
      for(let i=0;i<height.length;i++){pixels[i*4]=Math.max(0,Math.min(255,128+height[i]*110));pixels[i*4+1]=Math.round(exposure[i]*255);pixels[i*4+3]=255;}
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[0]);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,GW,GH,gl.RGBA,gl.UNSIGNED_BYTE,pixels);gl.drawArrays(gl.TRIANGLES,0,6);
    }else if(ctx){
      ctx.globalCompositeOperation='source-over';ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='destination-out';
      for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){const v=exposure[y*GW+x];if(v>.01){ctx.fillStyle='rgba(0,0,0,'+v.toFixed(3)+')';ctx.fillRect(x/GW*W,y/GH*H,W/GW+1,H/GH+1);}}
    }
  }
  function frame(now){
    raf=0;if(!visible)return;
    const dt=last?Math.min(50,now-last):16;last=now;
    for(const p of points.splice(0)){
      if(oldPointer){const n=Math.max(1,Math.min(35,Math.ceil(Math.hypot(p.x-oldPointer.x,p.y-oldPointer.y)/2)));for(let k=1;k<=n;k++)disturb(oldPointer.x+(p.x-oldPointer.x)*k/n,oldPointer.y+(p.y-oldPointer.y)*k/n);}else disturb(p.x,p.y);
      oldPointer=p;
    }
    accumulator+=dt;while(accumulator>=16.666){simulate();accumulator-=16.666;}
    draw();
    if(now-moved<7500)raf=requestAnimationFrame(frame);else{last=0;reset();}
  }
  function sync(){
    const index=[...scroller.querySelectorAll('[data-portfolio-tile]')].indexOf(chapter);
    const settled=Math.abs(scroller.scrollLeft/Math.max(1,scroller.clientWidth)-index)<.025;
    const value=settled&&!document.hidden&&!document.body.classList.contains('pf-wall-open')&&!document.documentElement.classList.contains('is-nav-menu-open');
    if(value!==visible){visible=value;surface.hidden=!value;points.length=0;oldPointer=null;if(!value){cancelAnimationFrame(raf);raf=0;last=0;reset();}}
  }
  window.addEventListener('pointermove',e=>{if(!visible||e.pointerType==='touch')return;points.push({x:e.clientX/innerWidth*GW,y:e.clientY/innerHeight*GH});if(points.length>8)points.shift();moved=performance.now();if(!raf)raf=requestAnimationFrame(frame);},{passive:true});
  window.addEventListener('pointerout',e=>{if(!e.relatedTarget)oldPointer=null;});
  scroller.addEventListener('scroll',sync,{passive:true});window.addEventListener('resize',resize,{passive:true});window.addEventListener('cosgral:langchange',language);window.addEventListener('pageshow',sync);document.addEventListener('visibilitychange',sync);
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);raf=0;surface.hidden=true;});
  canvas.addEventListener('webglcontextrestored',()=>{textures=[];try{initialize();resize();surface.hidden=!visible;}catch(_){surface.hidden=true;}});
  resize();
})();
