/* DCD morph renderer: continuous crossfade between adjacent registered body states,
   preserving each source's own alpha-width profile and discarding obsolete async paints. */
window.DCDMorph = (() => {
  const W=346,H=873,cache=new Map(),pending=new WeakMap();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  function source(kind,state){
    const key=`${kind}-${state}`;
    if(cache.has(key))return cache.get(key);
    const promise=new Promise(resolve=>{
      const image=new Image();
      image.onload=()=>{
        const c=document.createElement('canvas');c.width=W;c.height=H;
        const ctx=c.getContext('2d',{willReadFrequently:true});
        const scale=Math.min(W/image.width,H/image.height),w=image.width*scale,h=image.height*scale;
        ctx.drawImage(image,(W-w)/2,(H-h)/2,w,h);
        const packed=window.DCD_FIGURE_BOUNDS?.[key];
        if(!packed){console.warn('[DCD] Figure edge profile missing',key);resolve(null);return;}
        const bytes=atob(packed),edges=new Array(H);
        for(let y=0;y<H;y++){
          const i=y*4;
          edges[y]=[bytes.charCodeAt(i)|(bytes.charCodeAt(i+1)<<8),bytes.charCodeAt(i+2)|(bytes.charCodeAt(i+3)<<8)];
        }
        resolve({canvas:c,edges});
      };
      image.onerror=()=>{console.warn('[DCD] Figure image missing',key);resolve(null);};
      image.src=window.DCD_ASSETS.figure(kind,state);
    });
    cache.set(key,promise);return promise;
  }
  async function draw(canvas,kind,value){
    if(!canvas)return;
    const request=(pending.get(canvas)||0)+1;pending.set(canvas,request);
    const p=clamp(value,0,100)/25,lo=Math.floor(p),hi=Math.min(4,Math.ceil(p)),t=p-lo;
    // Original approved technique: warp ONE image at a time. No crossfade/ghosting.
    const nearest=Math.round(p),[a,b,from]=await Promise.all([source(kind,lo),source(kind,hi),source(kind,nearest)]);
    if(!a||!b||!from||!canvas.isConnected||pending.get(canvas)!==request)return;
    if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,W,H);
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    for(let y=0;y<H;y++){
      const [fl,fr]=from.edges[y];if(fr<=fl)continue;
      const left=mix(a.edges[y][0],b.edges[y][0],t);
      const right=mix(a.edges[y][1],b.edges[y][1],t);
      if(right>left)ctx.drawImage(from.canvas,fl,y,fr-fl,1,left,y,right-left,1);
    }
    ctx.globalAlpha=1;
  }
  function drawVisible(root=document){root.querySelectorAll('canvas[data-figure]').forEach(c=>draw(c,Number(c.dataset.figure),Number(c.dataset.value)));}
  return {draw,drawVisible};
})();
