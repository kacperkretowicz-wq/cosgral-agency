/** Shared contour: one surface for the DOM background and glass transmission. */
(function(){
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const glsl=`
    float cgFunnelHermite(float x,float a,float b,float y0,float y1,float m0,float m1){
      float t=clamp((x-a)/(b-a),0.,1.),t2=t*t,t3=t2*t;
      return (2.*t3-3.*t2+1.)*y0+(t3-2.*t2+t)*(b-a)*m0+(-2.*t3+3.*t2)*y1+(t3-t2)*(b-a)*m1;
    }
    float cgFunnelPhase(float p){
      if(p<.50)return cgFunnelHermite(p,0.,.50,0.,.59,1.2,.35);
      if(p<.76)return cgFunnelHermite(p,.50,.76,.59,.67,.35,.35);
      return cgFunnelHermite(p,.76,1.,.67,1.,.35,1.4);
    }
    float cgFunnelSmoothUnion(float a,float b,float k){
      float h=clamp(.5+.5*(b-a)/k,0.,1.);
      return mix(b,a,h)-k*h*(1.-h);
    }
    float cgFunnelDistance(vec2 point,vec4 frame,float boundary,float aspect){
      float raw=clamp(frame.w,0.,1.),p=cgFunnelPhase(raw);
      float release=smoothstep(.70,.87,raw);
      float recoil=sin(smoothstep(.635,.79,p)*3.14159265);
      float dx=point.x-frame.x*aspect;
      float width=mix(.23,.055,smoothstep(.34,.67,p));
      float depth=.145*sin(p*3.14159265)*(1.-smoothstep(.60,.73,p));
      float bell=exp(-dx*dx/(width*width));
      float base=boundary+.86*(raw-p)-.18-.80*smoothstep(.36,.92,p)-.016*recoil;
      float shoulder=.022*sin(p*3.14159265)*sin(dx*4.1+.4);
      float dTop=point.y-base-depth*bell-shoulder;
      float slope=-2.*depth*dx/(width*width)*bell;
      dTop/=sqrt(1.+slope*slope);
      vec2 radius=vec2(clamp(frame.z*.36,.045,.105),.090)*(1.-release)+vec2(.0008);
      vec2 center=vec2(frame.x*aspect+.014*release,frame.y-.035-.038*release);
      float dCap=(length((point-center)/radius)-1.)*min(radius.x,radius.y);
      dCap+=.003*smoothstep(.92,1.,release);
      float tension=mix(.135,.035,smoothstep(.52,.68,p));
      return cgFunnelSmoothUnion(dTop,dCap,tension);
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
  function distance(x,y,aspect,frame,boundary){
    const raw=clamp(frame[3]),p=phase(raw),release=smooth(.70,.87,raw),recoil=Math.sin(smooth(.635,.79,p)*Math.PI);
    const dx=(x-frame[0])*aspect,width=mix(.23,.055,smooth(.34,.67,p));
    const depth=.145*Math.sin(p*Math.PI)*(1-smooth(.60,.73,p)),bell=Math.exp(-dx*dx/(width*width));
    const base=boundary+.86*(raw-p)-.18-.80*smooth(.36,.92,p)-.016*recoil;
    const shoulder=.022*Math.sin(p*Math.PI)*Math.sin(dx*4.1+.4);
    const slope=-2*depth*dx/(width*width)*bell;
    const top=(y-base-depth*bell-shoulder)/Math.sqrt(1+slope*slope);
    const rx=Math.max(.045,Math.min(.105,frame[2]*.36))*(1-release)+.0008;
    const ry=.090*(1-release)+.0008;
    const cx=frame[0]*aspect+.014*release,cy=frame[1]-.035-.038*release;
    const cap=(Math.hypot((x*aspect-cx)/rx,(y-cy)/ry)-1)*Math.min(rx,ry)+.003*smooth(.92,1,release);
    const tension=mix(.135,.035,smooth(.52,.68,p)),h=clamp(.5+.5*(cap-top)/tension);
    return mix(cap,top,h)-tension*h*(1-h);
  }
  window.cosgralChromeFunnel={glsl,distance};
})();
