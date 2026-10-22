/** One reversible arc: right, down, then out through the left edge. */
const clamp=v=>Math.max(0,Math.min(1,v));
const ease=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*t*(t*(t*6-15)+10);};

export function sampleCubeOrbit(progress,reach,exitX,out={}) {
  // The Bezier curve is smooth already. Re-easing its parameter held the cube
  // almost still through the first scroll gestures, then rushed the middle.
  const p=clamp(progress),t=p,s=1-t;
  const a=s*s*s*s*s,b=5*s*s*s*s*t,c=10*s*s*s*t*t;
  const d=10*s*s*t*t*t,e=5*s*t*t*t*t,f=t*t*t*t*t;
  out.x=.5*a+(.5+reach*.9)*b+(.5+reach*1.6)*c+
    (.5+reach*1.3)*d+.15*e+exitX*f;
  out.y=.30*a+.245*b+.33*c+.73*d+.71*e+.40*f;
  out.scale=1-.16*ease(.04,.55,p)-.06*ease(.64,1,p);
  out.phase=t;
  return out;
}
