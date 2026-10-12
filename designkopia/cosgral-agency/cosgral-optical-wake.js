/** Instanced, camera-facing optical dust. No box fragments or square sprites. */
export function createOpticalWake(THREE,scene,count){
  const plane=new THREE.PlaneGeometry(2,2),geometry=new THREE.InstancedBufferGeometry();
  geometry.index=plane.index;geometry.attributes.position=plane.attributes.position;geometry.attributes.uv=plane.attributes.uv;
  const seeds=new Float32Array(count*4),scatter=new Float32Array(count*4);let seed=813;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function gaussian(){return Math.max(-2.4,Math.min(2.4,Math.sqrt(-2*Math.log(Math.max(0.0001,random())))*Math.cos(random()*Math.PI*2)));}
  for(let i=0;i<count;i++){
    seeds[i*4]=random();seeds[i*4+1]=random();seeds[i*4+2]=random();seeds[i*4+3]=random();
    scatter[i*4]=gaussian();scatter[i*4+1]=gaussian();scatter[i*4+2]=(i%7)/7;scatter[i*4+3]=random();
  }
  geometry.setAttribute('aSeed',new THREE.InstancedBufferAttribute(seeds,4));geometry.instanceCount=count;
  geometry.setAttribute('aScatter',new THREE.InstancedBufferAttribute(scatter,4));
  const uniforms={uTime:{value:0},uProgress:{value:0},uFade:{value:1},uMenu:{value:0},uScale:{value:1},
    uPointer:{value:new THREE.Vector2()},uP0:{value:new THREE.Vector3()},uP1:{value:new THREE.Vector3()},
    uP2:{value:new THREE.Vector3()},uP3:{value:new THREE.Vector3()}};
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:false,
    blending:THREE.AdditiveBlending,toneMapped:false,
    vertexShader:`
      attribute vec4 aSeed;
      attribute vec4 aScatter;
      uniform vec3 uP0,uP1,uP2,uP3;
      uniform float uTime,uProgress,uFade,uMenu,uScale;
      uniform vec2 uPointer;
      varying vec2 vUv;
      varying float vAlpha,vSeed,vCore;
      vec3 path(float t){float u=1.0-t;return uP0*u*u*u+uP1*3.0*u*u*t+uP2*3.0*u*t*t+uP3*t*t*t;}
      void main(){
        float tail=aSeed.x;
        float cluster=aScatter.z*7.0;
        float history=(0.035+tail*0.34)*(0.78+0.22*sin(cluster*1.73));
        float t=max(0.0,uProgress-history);
        float ribbon=smoothstep(0.76,1.0,uProgress);
        vec3 center=path(t);
        vec3 tangent=normalize(path(min(1.0,t+0.01))-path(max(0.0,t-0.01))+vec3(0.0001));
        center-=tangent*uScale*1.2;
        vec3 side=normalize(cross(tangent,vec3(0,0,1))+vec3(0.0001));
        float spread=(0.13+tail*0.38)*uScale;
        float puff=0.55+0.45*sin(cluster*2.17+tail*7.0);
        float drift=sin(uTime*0.16+cluster*1.43)*0.12;
        center+=side*(aScatter.x*spread+drift*uScale);
        center+=tangent*aScatter.y*spread*0.38;
        center.z+=(aScatter.w-0.5)*spread*0.8;
        center.xy+=vec2(sin(uTime*0.24+aSeed.y*11.0),cos(uTime*0.19+aSeed.z*9.0))*spread*0.14;
        vec3 line=mix(uP3*0.58,uP0-vec3(0.0,2.5,0.6),tail);
        line+=side*sin(tail*10.0+uTime*0.20)*0.13;
        line+=side*aScatter.x*(0.10+puff*0.36);
        line+=tangent*aScatter.y*0.13;
        line.z+=(aSeed.z-0.5)*0.18;
        center=mix(center,line,ribbon);
        center.xy+=uPointer*0.045*sin(aSeed.y*6.283185);
        vec4 mv=modelViewMatrix*vec4(center,1.0);
        float halo=step(0.90,aSeed.w);
        float radius=mix(0.009,0.045,pow(aSeed.z,3.0))*max(0.7,uScale);
        radius=mix(radius,0.11+tail*0.10,halo);
        vec2 screenDir=normalize(tangent.xy+vec2(0.0001)),across=vec2(-screenDir.y,screenDir.x);
        vec2 offset=position.xy*radius;
        offset.x*=mix(1.0,2.3,smoothstep(0.72,0.98,aSeed.z));
        mv.xy+=screenDir*offset.x+across*offset.y;
        gl_Position=projectionMatrix*mv;vUv=uv*2.0-1.0;
        float head=smoothstep(0.01,0.16,uProgress);
        float lengthFade=smoothstep(0.0,0.06,uProgress-history);
        float density=mix(0.18+0.38*puff,0.28+0.22*puff,ribbon);
        float gaps=0.24+0.76*smoothstep(0.20,0.82,aScatter.w);
        vAlpha=head*lengthFade*density*gaps*uFade*(1.0-uMenu)*mix(0.28,0.038,halo);
        vCore=1.0-halo;vSeed=aSeed.w;
      }
    `,
    fragmentShader:`
      varying vec2 vUv;
      varying float vAlpha,vSeed,vCore;
      void main(){
        float r2=dot(vUv,vUv);if(r2>1.0)discard;
        float halo=exp(-r2*5.5)*(1.0-smoothstep(0.60,1.0,r2));
        float core=exp(-r2*40.0)*0.65*vCore;
        vec3 color=mix(vec3(0.66,0.81,1.0),vec3(0.93,0.81,1.0),vSeed);
        color=mix(color,vec3(1.0),core);
        gl_FragColor=vec4(color,(halo+core)*vAlpha);
      }
    `});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='CosgralOpticalWake';
  mesh.frustumCulled=false;mesh.renderOrder=20;scene.add(mesh);
  return{
    get visible(){return mesh.visible;},
    setPath(points){for(let i=0;i<4;i++)uniforms['uP'+i].value.copy(points[i]);},
    update({time,progress,menuBlend,scale,pointerX,pointerY,fade}){
      mesh.visible=progress>0.008&&fade>0&&menuBlend<0.99;
      uniforms.uTime.value=time;uniforms.uProgress.value=progress;uniforms.uMenu.value=menuBlend;
      uniforms.uScale.value=scale;uniforms.uFade.value=fade;uniforms.uPointer.value.set(pointerX,pointerY);
    }
  };
}
