/* DCD doll morph: the same saved body value drives the paired front/back images.
   Transform complete image rows around a fixed center, without slicing limbs. */
window.DCDMorph = (() => {
  const W=346,H=873,CX=W/2,cache=new Map(),pending=new WeakMap();
  const ROWS=[0,58,109,148,173,202,237,269,307,344,380,417,460,504,557,622,690,755,820,872];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;

  // Produce smooth width landmarks from each supplied silhouette.
  function median(values){
    values.sort((a,b)=>a-b);
    return values[Math.floor(values.length/2)] || 1;
  }
  function widthProfile(edges){
    return ROWS.map(y=>{
      const widths=[];
      for(let j=Math.max(0,y-8);j<=Math.min(H-1,y+8);j++){
        const [left,right]=edges[j];
        if(right>left+5)widths.push((right-left)/2);
      }
      return median(widths);
    });
  }
  function widthAt(profile,y){
    let i=0;
    while(i<ROWS.length-2 && y>ROWS[i+1])i++;
    const t=clamp((y-ROWS[i])/(ROWS[i+1]-ROWS[i]),0,1);
    return mix(profile[i],profile[i+1],t);
  }
  function source(kind,state,view){
    const key=`${kind}-${state}-${view}`;
    if(cache.has(key))return cache.get(key);
    const promise=new Promise(resolve=>{
      const image=new Image();
      image.onload=()=>{
        const c=document.createElement('canvas');c.width=W;c.height=H;
        const ctx=c.getContext('2d',{willReadFrequently:true});
        const scale=Math.min(W/image.width,H/image.height);
        const w=image.width*scale,h=image.height*scale;
        ctx.drawImage(image,(W-w)/2,(H-h)/2,w,h);
        const packed=window.DCD_FIGURE_BOUNDS?.[key];
        if(!packed){console.warn('[DCD] Missing figure outline',key);resolve(null);return;}
        const bytes=atob(packed),edges=new Array(H);
        for(let y=0;y<H;y++){
          const i=y*4;
          edges[y]=[bytes.charCodeAt(i)|(bytes.charCodeAt(i+1)<<8),
            bytes.charCodeAt(i+2)|(bytes.charCodeAt(i+3)<<8)];
        }
        resolve({canvas:c,profile:widthProfile(edges)});
      };
      image.onerror=()=>{console.warn('[DCD] Figure image missing',key);resolve(null);};
      image.src=window.DCD_ASSETS.figure(kind,state,view);
    });
    cache.set(key,promise);
    return promise;
  }
  async function draw(canvas,kind,value,view='front'){
    if(!canvas)return;
    const request=(pending.get(canvas)||0)+1;
    pending.set(canvas,request);
    const p=clamp(value,0,100)*3/100,lo=Math.floor(p),
      hi=Math.min(3,Math.ceil(p)),t=p-lo,nearest=Math.round(p);
    const [a,b,from]=await Promise.all([
      source(kind,lo,view),source(kind,hi,view),source(kind,nearest,view)
    ]);
    if(!a||!b||!from||!canvas.isConnected||pending.get(canvas)!==request)return;
    if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,W,H);
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';

    // At reference states show the reference image pixel-for-pixel.
    if(Math.abs(p-nearest)<.00001){
      ctx.drawImage(from.canvas,0,0);
      return;
    }
    for(let y=0;y<H;y++){
      const baseline=widthAt(from.profile,y);
      const target=mix(widthAt(a.profile,y),widthAt(b.profile,y),t);
      const ratio=clamp(target/Math.max(1,baseline),.78,1.22);
      // Protect face, jaw and neck from width-based silhouette distortion.
      const feather=clamp((y-165)/95,0,1);
      const smooth=feather*feather*(3-2*feather);
      const stretch=1+(ratio-1)*smooth;
      // Approved technique: scale the COMPLETE image row, not a cropped
      // silhouette segment. The center stays fixed, so edges cannot tear.
      ctx.drawImage(from.canvas,0,y,W,1,CX*(1-stretch),y,W*stretch,1);
    }
  }
  function drawVisible(root=document){
    root.querySelectorAll('canvas[data-figure]').forEach(c=>
      draw(c,Number(c.dataset.figure),Number(c.dataset.value),c.dataset.view||'front'));
  }
  return {draw,drawVisible};
})();
