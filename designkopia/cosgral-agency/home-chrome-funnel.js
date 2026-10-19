/** A broad viscous sheet. CPU coefficients and one analytic GPU contour. */
(function(){
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const idleElastic=new Float32Array(2);
  const glsl=`
    uniform vec2 uChromeFunnelElastic;
    uniform vec4 uChromeFunnelShape;
    vec4 cgFunnelOptics(vec2 uv,vec2 resolution,vec4 frame,float boundary){
      float aspect=resolution.x/resolution.y;
      vec2 point=vec2(uv.x*aspect,1.-uv.y);
      float pixel=1./resolution.y;
      float tip=uChromeFunnelElastic.x-uChromeFunnelElastic.y;
      float shoulder=uChromeFunnelElastic.y;
      float reach=abs(tip)+abs(shoulder)+uChromeFunnelShape.y+abs(uChromeFunnelShape.w)+pixel*14.;
      if(point.y>uChromeFunnelShape.x+reach)return vec4(0.,1.,1.,0.);
      if(point.y<uChromeFunnelShape.x-reach)return vec4(0.,1.,-1.,1.);
      float dx=point.x-frame.x*aspect;
      float strain=smoothstep(0.,.28,abs(uChromeFunnelElastic.x));
      float tipWidth=max(.055,frame.z*mix(1.35,.55,strain));
      float a=exp(-dx*dx/(uChromeFunnelShape.z*uChromeFunnelShape.z));
      float b=exp(-dx*dx/(tipWidth*tipWidth));
      float c=exp(-dx*dx/(.38*.38));
      float surface=uChromeFunnelShape.x+uChromeFunnelShape.y*a+tip*b+shoulder*c+uChromeFunnelShape.w*sin(dx*3.2+.4);
      float slope=-2.*dx*(uChromeFunnelShape.y*a/(uChromeFunnelShape.z*uChromeFunnelShape.z)+tip*b/(tipWidth*tipWidth)+shoulder*c/(.38*.38))
        +uChromeFunnelShape.w*3.2*cos(dx*3.2+.4);
      float invLength=inversesqrt(1.+slope*slope);
      float distance=(point.y-surface)*invLength;
      // One analytic normal replaces four extra contour evaluations.
      vec2 normal=vec2(-slope,1.)*invLength;
      return vec4(normal,distance,1.-smoothstep(-pixel,pixel,distance));
    }
    vec2 cgFunnelWarp(vec2 uv,vec4 optics,vec2 resolution,vec4 frame){
      float edge=exp(-abs(optics.z)*resolution.y/3.2);
      float presence=smoothstep(.24,.50,frame.w)*(1.-smoothstep(.94,1.,frame.w));
      vec2 offset=optics.xy*.004*edge*presence;
      offset.x/=resolution.x/resolution.y;offset.y=-offset.y;
      return uv+offset;
    }
    vec3 cgFunnelLight(vec2 uv){
      return vec3(.91,.905,.88)-smoothstep(.05,1.25,uv.x+uv.y*.25)*.055;
    }
    vec3 cgFunnelPaint(vec3 ambient,vec2 uv,vec2 resolution,vec4 frame,float boundary,float paper,vec4 optics){
      float shade=.6+.4*paper;
      vec3 carbon=vec3(.03137255,.03529412,.03529412)/shade;
      vec3 color=mix(carbon,mix(ambient,cgFunnelLight(uv),paper),optics.w);
      float pixel=1./resolution.y;
      float presence=smoothstep(.24,.50,frame.w)*(1.-smoothstep(.94,1.,frame.w));
      float edge=exp(-abs(optics.z)/(pixel*1.5));
      float rolloff=exp(-abs(optics.z-pixel*2.4)/(pixel*2.2));
      float specular=max(0.,dot(optics.xy,vec2(-.841178,-.540758)));
      vec3 meniscus=vec3(.12)+vec3(.70,.73,.72)*specular*specular;
      color*=1.-rolloff*.12*presence;
      color=mix(color,meniscus,edge*.68*presence);
      // Guard the first content line, allowing liquid across the section seam.
      float guard=smoothstep(boundary-.035,boundary-.008,1.-uv.y);
      return mix(color,carbon,guard);
    }
  `;
  function profile(frame,boundary,out=new Float32Array(4),guard=boundary+.12,finish=0){
    const raw=clamp(frame[3]);
    out[0]=Math.min(mix(boundary-.10,.45,smooth(.22,.56,raw)),guard-.14)-finish*.40;
    out[1]=.045*Math.sin(raw*Math.PI)*(1-smooth(.78,1,raw))*(1-finish);
    out[2]=.30;out[3]=.015*Math.sin(raw*Math.PI);
    return out;
  }
  function surface(x,aspect,frame,shape,elastic=idleElastic){
    const dx=(x-frame[0])*aspect;
    const width=Math.max(.055,frame[2]*mix(1.35,.55,smooth(0,.28,Math.abs(elastic[0]))));
    const a=Math.exp(-dx*dx/(shape[2]*shape[2])),b=Math.exp(-dx*dx/(width*width)),c=Math.exp(-dx*dx/(.38*.38));
    return shape[0]+shape[1]*a+(elastic[0]-elastic[1])*b+elastic[1]*c+shape[3]*Math.sin(dx*3.2+.4);
  }
  function advance(s,target,stiffness,damping,dt){
    const decay=damping*.5,omega=Math.sqrt(stiffness-decay*decay);
    const e=Math.exp(-decay*dt),c=Math.cos(omega*dt),sn=Math.sin(omega*dt)/omega;
    const displacement=s.x-target,v=s.v;
    s.x=target+e*(displacement*c+(v+decay*displacement)*sn);
    s.v=e*(v*c-(decay*v+stiffness*displacement)*sn);
    if(Math.abs(s.x-target)<.00006&&Math.abs(s.v)<.0004){s.x=target;s.v=0;}
  }
  function createSpring(reduced=false,initialProgress){
    const shoulder={x:0,v:0},body={x:0,v:0},value=new Float32Array(2);
    let initialized=Number.isFinite(initialProgress),released=initialized&&initialProgress>=.76,moving=false,menuAmount=0;
    let finish=0;
    body.x=released?1:0;
    function reset(){shoulder.x=shoulder.v=body.x=body.v=finish=0;value.fill(0);moving=false;}
    return {
      value,
      get moving(){return moving;},
      get lift(){return Math.max(0,Math.min(1.055,body.x))*(1-menuAmount);},
      get finish(){return finish;},
      update(frame,shape,guard,dt=1/60,menu=0,inputProgress=frame[3]){
        const raw=clamp(frame[3]),step=Math.max(.001,Math.min(.05,dt));
        menuAmount=menu;
        if(!initialized){released=inputProgress>=.76;body.x=released?1:0;initialized=true;}
        if(raw<.64&&inputProgress<.64)released=false;
        else if(raw>=.76)released=true;
        // One response moves the cube; the surface is then constrained to
        // its actual projected support point, throughout the complete rise.
        if(reduced){body.x=released?1:0;body.v=0;}
        else advance(body,released?1:0,36,8.4,step);
        const finishTarget=raw>.95&&frame[1]<-.015?1:0;
        finish+=(finishTarget-finish)*(1-Math.exp(-step*7));
        if(Math.abs(finishTarget-finish)<.0001)finish=finishTarget;
        if(raw<.32||menu>.98){
          shoulder.x=shoulder.v=0;value.fill(0);
          moving=Math.abs(body.v)>.002;return value;
        }
        const rest=shape[0]+shape[1]+shape[3]*Math.sin(.4);
        const bind=smooth(.42,.64,raw)*(1-finish);
        const target=(frame[1]-.006-rest)*bind;
        // At the anchor, tip + shoulder is exactly target. The lagged wider
        // shoulder changes the curvature without introducing an air gap.
        if(reduced){shoulder.x=target*.24;shoulder.v=0;}
        else advance(shoulder,target*.24,56,12,step);
        value[0]=target*(1-menu);
        value[1]=shoulder.x*(1-menu);
        moving=Math.abs(shoulder.v)+Math.abs(body.v)>.001||Math.abs(finishTarget-finish)>.0005;
        return value;
      },
      reset
    };
  }
  window.cosgralChromeFunnel={glsl,profile,surface,createSpring};
})();
