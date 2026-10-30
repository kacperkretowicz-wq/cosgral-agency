/* Scroll-driven graphite horizon. A composited SVG works with or without WebGL. */
export function sampleHorizonProgress(value){return Math.max(0,Math.min(1,value))}
let sequence=0;
export function createHorizon(section,reduced){
  const surface=section.querySelector('.tone-wipe__surface');
  const copy=section.querySelector('.tone-wipe__copy');
  const reverse=section.classList.contains('tone-wipe--dark');
  const ink='#080909',paper='#ededed',base=reverse?paper:ink,fill=reverse?ink:paper;
  let progress=reduced?1:0;
  surface.style.backgroundColor=base;
  if(reduced){
    section.classList.add('is-static');surface.style.backgroundColor=fill;
    return {update(){},destroy(){},isLightAt(){return !reverse}};
  }
  const id='horizon-'+(++sequence);
  const field=document.createElementNS('http://www.w3.org/2000/svg','svg');
  field.classList.add('tone-wipe__field');field.setAttribute('viewBox','0 0 1000 1000');
  field.setAttribute('preserveAspectRatio','none');field.setAttribute('aria-hidden','true');
  const path='M-200 0C100 0 270 350 500 350S900 0 1200 0V2000H-200Z';
  field.innerHTML=`<defs><filter id="${id}-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter></defs>
    <path d="${path}" fill="${fill}" stroke="#82878b" stroke-width="100" filter="url(#${id}-soft)"/>
    <path d="${path}" fill="${fill}" stroke="${reverse?'#42474b':'#c6c9cc'}" stroke-width="22"/>
    <path d="${path}" fill="${fill}"/>`;
  surface.prepend(field);
  function update(value){
    progress=sampleHorizonProgress(value);
    const eased=progress*progress*(3-2*progress);
    // Move one cached surface. No extra GPU context or render loop is needed.
    field.style.transform=`translate3d(0,${(148-260*eased).toFixed(4)}%,0)`;
    field.style.visibility=progress<=0||progress>=1?'hidden':'visible';
    surface.style.backgroundColor=progress>=1?fill:base;
    const reveal=sampleHorizonProgress((progress-.55)/.3);
    copy.style.opacity=String(reveal);
    copy.style.transform=`translate3d(0,${((1-reveal)*18).toFixed(2)}px,0)`;
    section.dataset.horizonProgress=progress.toFixed(4);
  }
  update(0);
  return {
    update,
    isLightAt(x,y){
      const eased=progress*progress*(3-2*progress);
      // Invert the actual symmetric cubic edge, rather than checking the
      // center of the viewport (which can still be dark while the logo is white).
      const target=Math.min(x,1-x)*1000;
      let low=0,high=1;
      for(let i=0;i<12;i++){
        const t=(low+high)/2,u=1-t;
        const px=-200*u*u*u+300*u*u*t+810*u*t*t+500*t*t*t;
        if(px<target)low=t;else high=t;
      }
      const t=(low+high)/2;
      const edge=1.48-2.6*eased+.35*t*t*(3-2*t);
      return reverse?y<edge:y>edge;
    },
    destroy(){field.remove();section.classList.add('is-static');surface.style.backgroundColor=fill}
  };
}
