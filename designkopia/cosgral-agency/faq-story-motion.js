/** Deterministic choreography, shared by every frame and reversible with scroll. */
export const clamp=v=>Math.max(0,Math.min(1,v));
export const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*t*(t*(t*6-15)+10);};
const mix=(a,b,t)=>a+(b-a)*t;
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export function storyOrbit(entry,leave,answer,height){
 const angle=-(1-entry)*1.25+leave*1.3;
 return {x:Math.sin(angle)*height*.045,y:Math.sin(angle)*height*.77+answer*height*.245,z:-.95+(1-Math.cos(angle))*height*.25,rx:-angle*.72,ry:Math.sin(angle)*.16,rz:Math.sin(angle)*-.045,scale:1-answer*.56};
}
export function prismPath(spec,i,flight,release,w,h,cx,cy,unit,time,px,py,charge){
 const arrival=smooth(.08+spec.delay*.15,.78+spec.delay*.18,flight);
 const disperse=smooth(.02+spec.delay*.13,.80+spec.delay*.15,release);
 const outside=1-arrival+arrival*disperse;
 // No global rotation is applied after this conversion: every start and end
 // is beyond its chosen edge in camera space, including the object's radius.
 const edge=spec.edge,n=noise(i+2),margin=Math.max(w,h)*.40;
 const edgeX=edge===0?-w*.5-margin:edge===1?w*.5+margin:(n-.5)*w*1.7;
 const edgeY=edge===2?h*.5+margin:edge===3?-h*.5-margin:(noise(i+40)-.5)*h*1.7;
 const homeX=cx+spec.home[0]*unit,homeY=cy+spec.home[1]*unit,homeZ=spec.home[2]*unit;
 const arc=Math.sin(outside*Math.PI),bend=(noise(i+70)-.5)*unit*1.4;
 let x=mix(homeX,edgeX,outside)+arc*bend,y=mix(homeY,edgeY,outside)+arc*unit*.45,z=mix(homeZ,-1.2,outside);
 const dx=x-px*w*.5,dy=y+py*h*.5,d=Math.sqrt(dx*dx+dy*dy+unit*unit*.25);
 const response=Math.exp(-d*d/(unit*unit*3))*unit*.12*(1-outside);
 x+=dx/d*response+Math.sin(time*.19+i)*unit*.018*(1-outside);y+=dy/d*response+Math.sin(time*.16+i*.7)*unit*.026*(1-outside);
 x+=(homeX-cx)*charge*.035*(1-outside);y+=(homeY-cy)*charge*.035*(1-outside);
 const spin=outside*(.9+n*1.4);
 return {x,y,z,rx:spec.rotation[0]+spin+py*.10*(1-outside)+Math.sin(time*.1+i)*.035,ry:spec.rotation[1]+spin*(i%2?1:-1)+px*.13*(1-outside),rz:spec.rotation[2]+spin*.6,visible:outside<.99999};
}
