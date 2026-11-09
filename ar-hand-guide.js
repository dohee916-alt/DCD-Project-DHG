/* AR gesture guide: use the same transparent 2D Figma hand artwork
   already used in the WEB syringe / packing guides. This avoids the
   old low-resolution double-sided GLB render, whose transparent front
   and back faces overpainted one another into jagged wrinkles.
   The position/timing of AR6 and AR7 guidance is preserved.
   Gesture recognition stays in ar-experience.js, unchanged. */
(()=>{'use strict';
const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
const mix=(a,b,t)=>a+(b-a)*t;
const SRC='assets/figma-current/hd/guide-hand-figma-new05-2x.png';
function create(root){
 const el=root.querySelector('.ar-gesture-guide');
 let active=true,frame='',since=performance.now(),hiddenUntil=0,raf=0,last=0;
 const image=document.createElement('img');
 image.className='ar-web-hand-motion';
 image.src=SRC;
 image.alt='';
 image.setAttribute('aria-hidden','true');
 image.draggable=false;
 image.style.cssText=[
  'position:absolute','left:132px','top:370px',
  'width:164px','height:185px','object-fit:contain',
  'pointer-events:none','user-select:none','will-change:transform,opacity',
  'transform-origin:50% 55%','opacity:0'
 ].join(';');
 el.replaceChildren(image);
 const setFrame=f=>{
  frame=f;since=performance.now();hiddenUntil=0;
  el.style.display=['AR6','AR7'].includes(f)?'block':'none';
  image.style.opacity='0';
 };
 const hideOnce=(ms=900)=>{hiddenUntil=performance.now()+ms;image.style.opacity='0'};
 function render(now){
  if(!active)return;
  raf=requestAnimationFrame(render);
  if(!['AR6','AR7'].includes(frame)||now<hiddenUntil){
   image.style.opacity='0';return;
  }
  if(now-last<33)return;
  last=now;el.style.opacity='1';el.style.display='block';
  const t=(now-since)/1000;
  let x=0,y=0,z=1,ry=0,opacity=1;
  if(frame==='AR6'){
   const u=t%4.6;
   const pull=ease((u-1.35)/.84)*(1-ease((u-2.85)/.38));
   x=mix(-16,78,pull);
   y=mix(-135,-38,pull);
   z=mix(.87,1.23,pull);
   opacity=(1-ease((u-3.8)/.42))*(.85+.15*ease(u/.65));
  }else{
   const turn=ease(t/.62);
   ry=180*turn;
   const u=Math.max(0,t-.62)%4.65;
   const reach=ease(u/.78);
   const pull=ease((u-1.47)/.78)*(1-ease((u-2.9)/.52));
   const back=ease((u-3.58)/.7);
   x=mix(mix(90,22,reach)+108*pull,90,back);
   y=mix(mix(-188,22,reach)+105*pull,-188,back);
   z=mix(mix(.79,.94,reach)+.34*pull,.79,back);
   opacity=.95*(1-ease((u-4.04)/.38));
  }
  image.style.transform='translate3d('+x.toFixed(2)+'px,'+(-y).toFixed(2)+'px,0) rotateY('+ry.toFixed(1)+'deg) scale('+z.toFixed(3)+')';
  image.style.opacity=String(Math.max(0,Math.min(1,opacity)));
 }
 raf=requestAnimationFrame(render);
 return {
  setFrame,hideOnce,
  destroy(){
   active=false;cancelAnimationFrame(raf);
   image.remove();el.replaceChildren();el.style.display='none';
  }
 };
}
window.DCD_AR_HAND_GUIDE={create};
})();
