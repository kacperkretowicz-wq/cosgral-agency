/** One elastic sheet, shared by the page background and glass transmission. */
(function(){
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const idleElastic=new Float32Array(2);
  const glsl=`
    uniform vec2 uChromeFunnelElastic;
    float cgFunnelHermite(float x,float a,float b,float y0,float y1,float m0,float m1){
      float t=clamp((x-a)/(b-a),0.,1.),t2=t*t,t3=t2*t;
      return (2.*t3-3.*t2+1.)*y0+(t3-2.*t2+t)*(b-a)*m0+(-2.*t3+3.*t2)*y1+(t3-t2)*(b-a)*m1;
    }
    float cgFunnelPhase(float p){
      if(p<.50)return cgFunnelHermite(p,0.,.50,0.,.59,1.2,.35);
      if(p<.76)return cgFunnelHermite(p,.50,.76,.59,.67,.35,.35);
      return cgFunnelHermite(p,.76,1.,.67,1.,.35,1.4);
    }
    float cgFunnelDistance(vec2 point,vec4 frame,float boundary,float aspect){
      float raw=clamp(frame.w,0.,1.),p=cgFunnelPhase(raw);
      float dx=point.x-frame.x*aspect;
      float base=boundary+.86*(raw-p)-.18-.80*smoothstep(.36,.92,p);
      float belly=.095*sin(p*3.14159265)*(1.-smoothstep(.48,.68,raw));
      float bellyWidth=mix(.26,.18,smoothstep(.34,.67,p));
      // A taut narrow tip opens into a broad wave as its stored force releases.
      float strain=smoothstep(0.,.27,abs(uChromeFunnelElastic.x));
      float tipWidth=mix(.21,.052,strain)*clamp(frame.z/.20,.8,1.3);
      float tip=uChromeFunnelElastic.x-uChromeFunnelElastic.y;
      float shoulder=uChromeFunnelElastic.y;
      float a=exp(-dx*dx/(bellyWidth*bellyWidth));
      float b=exp(-dx*dx/(tipWidth*tipWidth));
      float c=exp(-dx*dx/(.29*.29));
      float sweep=.016*sin(p*3.14159265);
      float surface=base+belly*a+tip*b+shoulder*c+sweep*sin(dx*4.1+.4);
      float slope=-2.*dx*(belly*a/(bellyWidth*bellyWidth)+tip*b/(tipWidth*tipWidth)+shoulder*c/(.29*.29))
        +sweep*4.1*cos(dx*4.1+.4);
      // A heightfield always has one connected edge: no detached cap or dot.
      return (point.y-surface)/sqrt(1.+slope*slope);
    }
    vec4 cgFunnelOptics(vec2 uv,vec2 resolution,vec4 frame,float boundary){
      float aspect=resolution.x/resolution.y;
      vec2 point=vec2(uv.x*aspect,1.-uv.y);
      float pixel=1./resolution.y;
      float distance=cgFunnelDistance(point,frame,boundary,aspect);
      vec2 normal=vec2(0.);
      float footprint=pixel;
      if(abs(distance)<pixel*12.){
        vec2 e=vec2(pixel,0.);
        vec2 gradient=vec2(
          cgFunnelDistance(point+e.xy,frame,boundary,aspect)-cgFunnelDistance(point-e.xy,frame,boundary,aspect),
          cgFunnelDistance(point+e.yx,frame,boundary,aspect)-cgFunnelDistance(point-e.yx,frame,boundary,aspect)
        )/(2.*pixel);
        float magnitude=max(length(gradient),.25);
        normal=gradient/magnitude;footprint=pixel*magnitude;
      }
      float mask=1.-smoothstep(-footprint,footprint,distance);
      return vec4(normal,distance,mask);
    }
    vec2 cgFunnelWarp(vec2 uv,vec4 optics,vec2 resolution,vec4 frame){
      float pixel=1./resolution.y;
      float edge=exp(-abs(optics.z)/(pixel*3.2));
      float presence=smoothstep(.12,.36,frame.w)*(1.-smoothstep(.84,.97,frame.w));
      vec2 offset=optics.xy*.004*edge*presence;
      offset.x/=resolution.x/resolution.y;offset.y=-offset.y;
      return uv+offset;
    }
    vec3 cgFunnelPaint(vec3 ambient,vec2 uv,vec2 resolution,vec4 frame,float boundary,float paper,vec4 optics){
      float shade=.6+.4*paper;
      vec3 carbon=vec3(.03137255,.03529412,.03529412)/shade;
      vec3 light=vec3(.91,.905,.88)-smoothstep(.05,1.25,uv.x+uv.y*.25)*.055;
      vec3 color=mix(carbon,mix(ambient,light,paper),optics.w);
      float pixel=1./resolution.y;
      float presence=smoothstep(.12,.36,frame.w)*(1.-smoothstep(.84,.97,frame.w));
      float edge=exp(-abs(optics.z)/(pixel*1.5));
      float rolloff=exp(-abs(optics.z-pixel*2.4)/(pixel*2.2));
      float specular=pow(max(0.,dot(optics.xy,normalize(vec2(-.7,-.45)))),2.);
      vec3 meniscus=vec3(.12)+vec3(.70,.73,.72)*specular;
      color*=1.-rolloff*.12*presence;
      color=mix(color,meniscus,edge*.68*presence);
      // The entire irregular silhouette finishes above the real DOM section.
      float guard=smoothstep(boundary-.06,boundary-.012,1.-uv.y);
      return mix(color,carbon,guard);
    }
  `;
  function hermite(x,a,b,y0,y1,m0,m1){
    const t=clamp((x-a)/(b-a)),t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*y0+(t3-2*t2+t)*(b-a)*m0+(-2*t3+3*t2)*y1+(t3-t2)*(b-a)*m1;
  }
  function phase(p){
    return p<.50?hermite(p,0,.50,0,.59,1.2,.35):p<.76?hermite(p,.50,.76,.59,.67,.35,.35):hermite(p,.76,1,.67,1,.35,1.4);
  }
  function profile(frame,boundary){
    const raw=clamp(frame[3]),p=phase(raw);
    return {raw,p,base:boundary+.86*(raw-p)-.18-.80*smooth(.36,.92,p),
      belly:.095*Math.sin(p*Math.PI)*(1-smooth(.48,.68,raw)),
      bellyWidth:mix(.26,.18,smooth(.34,.67,p)),sweep:.016*Math.sin(p*Math.PI)};
  }
  function distance(x,y,aspect,frame,boundary,elastic=idleElastic){
    const {base,belly,bellyWidth,sweep}=profile(frame,boundary);
    const dx=(x-frame[0])*aspect;
    const tipWidth=mix(.21,.052,smooth(0,.27,Math.abs(elastic[0])))*Math.max(.8,Math.min(1.3,frame[2]/.20));
    const tip=elastic[0]-elastic[1],shoulder=elastic[1];
    const a=Math.exp(-dx*dx/(bellyWidth*bellyWidth)),b=Math.exp(-dx*dx/(tipWidth*tipWidth)),c=Math.exp(-dx*dx/(.29*.29));
    const surface=base+belly*a+tip*b+shoulder*c+sweep*Math.sin(dx*4.1+.4);
    const slope=-2*dx*(belly*a/(bellyWidth*bellyWidth)+tip*b/(tipWidth*tipWidth)+shoulder*c/(.29*.29))+sweep*4.1*Math.cos(dx*4.1+.4);
    return (y-surface)/Math.sqrt(1+slope*slope);
  }
  // Exact integration of an underdamped spring. It keeps its momentum when
  // scroll stops and behaves consistently at 30, 60 and 120Hz.
  function advance(s,target,stiffness,damping,dt){
    const decay=damping*.5,omega=Math.sqrt(stiffness-decay*decay);
    const e=Math.exp(-decay*dt),c=Math.cos(omega*dt),sn=Math.sin(omega*dt)/omega;
    const displacement=s.x-target,v=s.v;
    s.x=target+e*(displacement*c+(v+decay*displacement)*sn);
    s.v=e*(v*c-(decay*v+stiffness*displacement)*sn);
    if(Math.abs(s.x-target)<.00006&&Math.abs(s.v)<.0004){s.x=target;s.v=0;}
  }
  function createSpring(reduced=false){
    const tip={x:0,v:0},shoulder={x:0,v:0},value=new Float32Array(2);
    let initialized=false,released=false,moving=false;
    function reset(){tip.x=tip.v=shoulder.x=shoulder.v=0;value.fill(0);moving=false;}
    return {
      value,
      get moving(){return moving;},
      update(frame,boundary,dt=1/60,menu=0,inputProgress=frame[3]){
        const {raw,base,belly,sweep}=profile(frame,boundary);
        // Restored scroll may already be below the hero while the cube's
        // smoothed progress is still catching up. Do not replay that snap.
        if(!initialized){released=inputProgress>=.635;initialized=true;}
        // A small hysteresis prevents repeated snaps around the release point.
        if(raw<.56&&inputProgress<.56)released=false;
        else if(raw>=.635)released=true;
        if(raw<.26||raw>.985||menu>.98){reset();return value;}
        const gap=Math.max(0,Math.min(.34,frame[1]-.018-base-belly-sweep*Math.sin(.4)));
        const pull=gap*smooth(.28,.48,raw);
        const target=reduced?pull*(1-smooth(.60,.72,raw)):released?0:pull;
        const step=Math.max(.001,Math.min(.05,dt));
        if(reduced){tip.x=target;tip.v=0;shoulder.x=target*.22;shoulder.v=0;}
        else {
          advance(tip,target,released?100:640,released?6.2:42,step);
          // The wider sheet follows late, carrying the rebound out from the tip.
          advance(shoulder,tip.x*.22,80,12,step);
        }
        value[0]=tip.x*(1-menu);value[1]=shoulder.x*(1-menu);
        moving=Math.abs(tip.v)+Math.abs(shoulder.v)>.001||Math.abs(tip.x-target)>.00015;
        return value;
      },
      reset
    };
  }
  window.cosgralChromeFunnel={glsl,distance,createSpring};
})();
