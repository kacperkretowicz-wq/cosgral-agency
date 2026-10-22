/** Capture the real DOM behind the lens in the same frame as transmission.
 * Only the small region around the cube is uploaded, at native text detail. */
export function createHeroLensText(THREE) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2;
  const texture=new THREE.CanvasTexture(canvas);
  texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;
  const rect=new THREE.Vector4(0,0,1,1),ctx=canvas.getContext('2d');
  const title=document.querySelector('.home-hero__title');
  const targets=Array.from(document.querySelectorAll('.home-hero__title,.home-hero__tagline,.hero-notes span,.hero-scroll span,.hero-caption__right,#rozpad .runway-word'));
  const layouts=new WeakMap();
  let active=false,revision=0,lastKey='',hasInk=false,uploads=0;
  const invalidate=()=>{revision++;lastKey='';};
  window.addEventListener('resize',invalidate,{passive:true});
  window.visualViewport?.addEventListener('resize',invalidate,{passive:true});
  window.addEventListener('cosgral:langchange',invalidate);
  window.addEventListener('cosgral:i18n-ready',invalidate);
  window.addEventListener('cosgral:chrome-tone',invalidate);
  document.fonts?.ready.then(invalidate);

  function words(element,box){
    let cached=layouts.get(element);
    if(cached&&cached.revision===revision&&cached.width===box.width&&cached.height===box.height)return cached.words;
    const list=[],walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
    for(let node=walker.nextNode();node;node=walker.nextNode()){
      const style=getComputedStyle(node.parentElement);
      if(style.visibility==='hidden'||style.display==='none')continue;
      const font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.font=font;
      const metrics=ctx.measureText('Hg');
      const ascent=metrics.fontBoundingBoxAscent??parseFloat(style.fontSize)*.8;
      const descent=metrics.fontBoundingBoxDescent??parseFloat(style.fontSize)*.2;
      const range=document.createRange();
      for(const match of node.textContent.matchAll(/\S+/g)){
        range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
        const word=range.getBoundingClientRect();
        if(!word.width||!word.height)continue;
        let text=match[0];
        if(style.textTransform==='uppercase')text=text.toLocaleUpperCase('pl');
        else if(style.textTransform==='lowercase')text=text.toLocaleLowerCase('pl');
        list.push({text,font,color:style.color,spacing:style.letterSpacing,
          x:word.left-box.left,y:word.top-box.top,width:word.width,height:word.height,
          baseline:(word.height-ascent-descent)*.5+ascent});
      }
    }
    layouts.set(element,{revision,width:box.width,height:box.height,words:list});
    return list;
  }
  function opacity(element,cache){
    if(!element||element===document.body)return 1;
    if(cache.has(element))return cache.get(element);
    const style=getComputedStyle(element);
    const alpha=style.visibility==='hidden'||style.display==='none'?0:Number(style.opacity)*opacity(element.parentElement,cache);
    cache.set(element,alpha);return alpha;
  }
  return {
    texture,rect,redraw:invalidate,
    setActive(value){active=value;},
    headlineClearance(bounds){
      if(!title)return 1;
      const box=title.getBoundingClientRect();
      if(!box.width)return 1;
      const dx=Math.max(0,box.left-bounds.right,bounds.left-box.right);
      const dy=Math.max(0,box.top-bounds.bottom,bounds.top-box.bottom);
      return THREE.MathUtils.smoothstep(Math.hypot(dx,dy),24,Math.max(72,innerHeight*.14));
    },
    sync({x,y,width,height,viewportWidth,viewportHeight}){
      if(!active||!ctx)return;
      const left=Math.max(0,Math.floor(x-32)),top=Math.max(0,Math.floor(y-32));
      const right=Math.min(viewportWidth,Math.ceil(x+width+32)),bottom=Math.min(viewportHeight,Math.ceil(y+height+32));
      const w=Math.max(1,right-left),h=Math.max(1,bottom-top);
      rect.set(left/viewportWidth,1-(top+h)/viewportHeight,w/viewportWidth,h/viewportHeight);
      const visible=[],alphas=new Map();
      for(const element of targets){
        const box=element.getBoundingClientRect();
        if(box.right<=left||box.left>=right||box.bottom<=top||box.top>=bottom)continue;
        const alpha=opacity(element,alphas);
        if(alpha<.004)continue;
        visible.push({box,alpha,words:words(element,box)});
      }
      if(!visible.length){
        if(hasInk){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);texture.needsUpdate=true;uploads++;hasInk=false;}
        lastKey='';return;
      }
      const scale=Math.min(window.devicePixelRatio||1,2,1280/Math.max(w,h));
      const key=[revision,left,top,w,h,scale,...visible.flatMap(v=>[v.box.left.toFixed(2),v.box.top.toFixed(2),v.alpha.toFixed(3)])].join('|');
      if(key===lastKey)return;
      lastKey=key;
      const pw=Math.max(1,Math.round(w*scale)),ph=Math.max(1,Math.round(h*scale));
      if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,pw,ph);
      ctx.setTransform(scale,0,0,scale,-left*scale,-top*scale);
      ctx.textAlign='left';ctx.textBaseline='alphabetic';
      for(const entry of visible){
        ctx.globalAlpha=entry.alpha;
        for(const word of entry.words){
          const px=entry.box.left+word.x,py=entry.box.top+word.y;
          if(px+word.width<left||px>right||py+word.height<top||py>bottom)continue;
          ctx.font=word.font;ctx.fillStyle=word.color;
          if('letterSpacing' in ctx)ctx.letterSpacing=word.spacing==='normal'?'0px':word.spacing;
          ctx.fillText(word.text,px,py+word.baseline);
        }
      }
      ctx.globalAlpha=1;texture.needsUpdate=true;uploads++;hasInk=true;
    },
    get debug(){return {active,uploads,buffer:[canvas.width,canvas.height]};}
  };
}
