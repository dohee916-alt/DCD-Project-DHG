/* DCD doll morph: the same saved body value drives the paired front/back images.
   Transform complete image rows around a fixed center, without slicing limbs. */
window.DCDMorph = (() => {
  const W=346,H=873,CX=W/2,cache=new Map(),pending=new WeakMap();
  // Blend facial pixels continuously between the two adjacent body references.
  // Keep the face intact to the jaw, then feather into the existing body morph.
  const FACE_SOLID_END=174,FACE_BLEND_END=264;
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
  // Approximate Figma Temperature -0.20 for ALL four dolls, front and back.
  // Process cached source imagery only once; keep alpha, morphology and geometry untouched.
  function coolDollPixels(ctx){
    const image=ctx.getImageData(0,0,W,H);
    const d=image.data;
    for(let i=0;i<d.length;i+=4){
      if(!d[i+3])continue;
      d[i]=Math.round(d[i]*0.96);
      d[i+1]=Math.min(255,Math.round(d[i+1]*1.01));
      d[i+2]=Math.min(255,Math.round(d[i+2]*1.043));
    }
    ctx.putImageData(image,0,0);
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
        coolDollPixels(ctx);
        const packed=window.DCD_FIGURE_BOUNDS?.[key];
        if(!packed){console.warn('[DCD] Missing figure outline',key);resolve(null);return;}
        const bytes=atob(packed),edges=new Array(H);
        for(let y=0;y<H;y++){
          const i=y*4;
          edges[y]=[bytes.charCodeAt(i)|(bytes.charCodeAt(i+1)<<8),
            bytes.charCodeAt(i+2)|(bytes.charCodeAt(i+3)<<8)];
        }
        resolve({
          canvas:c,
          profile:widthProfile(edges),
          facePixels:ctx.getImageData(0,0,W,FACE_BLEND_END).data
        });
      };
      image.onerror=()=>{console.warn('[DCD] Figure image missing',key);resolve(null);};
      image.src=window.DCD_ASSETS.figure(kind,state,view);
    });
    cache.set(key,promise);
    return promise;
  }
  function blendFace(ctx,a,b,t){
    // At a reference frame the existing full-size source should remain exact.
    if(t<=0||t>=1)return;
    const out=ctx.getImageData(0,0,W,FACE_BLEND_END);
    const dst=out.data,low=a.facePixels,high=b.facePixels;
    for(let y=0;y<FACE_BLEND_END;y++){
      const fade=clamp((FACE_BLEND_END-y)/(FACE_BLEND_END-FACE_SOLID_END),0,1);
      const mask=fade*fade*(3-2*fade);
      if(mask<=0)continue;
      const begin=y*W*4,end=begin+W*4;
      for(let i=begin;i<end;i+=4){
        const a0=low[i+3]/255,a1=high[i+3]/255,body=dst[i+3]/255;
        const faceAlpha=mix(a0,a1,t),newAlpha=mix(body,faceAlpha,mask);
        if(newAlpha<1/255){
          dst[i]=dst[i+1]=dst[i+2]=dst[i+3]=0;
          continue;
        }
        for(let c=0;c<3;c++){
          const facePremul=mix(low[i+c]*a0,high[i+c]*a1,t);
          const bodyPremul=dst[i+c]*body;
          dst[i+c]=Math.round(mix(bodyPremul,facePremul,mask)/newAlpha);
        }
        dst[i+3]=Math.round(newAlpha*255);
      }
    }
    ctx.putImageData(out,0,0);
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
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
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
    // The body still uses the approved row-width morph. Unlike the previous
    // nearest-reference snap, facial pixels blend smoothly over each interval,
    // including the 16.7/50/83.3 changeover points.
    blendFace(ctx,a,b,t);
  }
  function drawVisible(root=document){
    root.querySelectorAll('canvas[data-figure]').forEach(c=>
      draw(c,Number(c.dataset.figure),Number(c.dataset.value),c.dataset.view||'front'));
  }
  async function preload(kind,value,view='back'){
    const p=clamp(value,0,100)*3/100;
    await Promise.all([source(kind,Math.floor(p),view),source(kind,Math.min(3,Math.ceil(p)),view),source(kind,Math.round(p),view)]);
  }
  return {draw,drawVisible,preload};
})();
