/* Figma GLASS on actual glyph contours, not on text bounding rectangles.
   Figma settings read from 03_MOBILE_WEB / try-OOD:
   refraction=0, dispersion=0, splay=0, depth=1,
   lightAngle=-45deg, lightIntensity=.8.
   Rebuilds edge-normal lighting from each SVG's alpha at 4x resolution.
   Background remains independent and fully replaceable. */
(function(){
  const samples=4;
  const blueprints={
    come:{src:'assets/figma-current/hd/poster-cta.svg',base:'assets/figma-current/hd/poster-cta-base.svg',color:[255,255,255],fill:.22},
    easiest:{src:'assets/figma-current/hd/poster-tagline.svg',base:'assets/figma-current/hd/poster-tagline-base.svg',color:[228,107,62],fill:.26}
  };
  const maskCache=new Map();
  function load(url){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error('Glass source failed: '+url));
      img.src=url;
    });
  }
  function glyphMask(image,w,h){
    const sheet=document.createElement('canvas');
    sheet.width=w;sheet.height=h;
    const ctx=sheet.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0,w,h);
    const data=ctx.getImageData(0,0,w,h).data;
    const alpha=new Float32Array(w*h);
    let max=0;
    for(let i=0;i<alpha.length;i++){const a=data[i*4+3];alpha[i]=a;if(a>max)max=a;}
    const inv=max?1/max:0;
    for(let i=0;i<alpha.length;i++)alpha[i]*=inv;
    return alpha;
  }
  function lightMap(canvas,alpha,base,w,h,rgb,fill){
    const ctx=canvas.getContext('2d',{alpha:true});
    const pixels=ctx.createImageData(w,h);
    const out=pixels.data;
    const sample=(x,y)=>alpha[Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x))];
    // A finite-difference surface gradient approximates glyph signed-distance
    // field normals at the 1px depth defined in Figma's Glass layer.
    const rayX=Math.SQRT1_2,rayY=-Math.SQRT1_2;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const index=y*w+x,coverage=alpha[index];
      if(coverage<.012)continue;
      const step=2;
      const gx=(sample(x-step,y)-sample(x+step,y))*.5;
      const gy=(sample(x,y-step)-sample(x,y+step))*.5;
      const length=Math.hypot(gx,gy);
      const nx=length>.002?gx/length:0,ny=length>.002?gy/length:0;
      const toward=nx*rayX+ny*rayY;
      const edge=Math.min(1,length*1.8);
      const specular=Math.pow(Math.abs(toward),1.5)*edge*.8;
      const highlight=Math.max(0,-toward)*edge*.38;
      const shadow=Math.max(0,toward)*edge*.20;
      const glint=Math.min(1,specular*.72+highlight);
      const opacity=Math.max(.04,Math.min(.90,(fill+glint-shadow)*coverage));
      const colorBlend=Math.min(1,glint*1.4);
      const k=index*4;
      out[k]=Math.round(rgb[0]*(1-colorBlend)+255*colorBlend);
      out[k+1]=Math.round(rgb[1]*(1-colorBlend)+247*colorBlend);
      out[k+2]=Math.round(rgb[2]*(1-colorBlend)+237*colorBlend);
      out[k+3]=Math.round(opacity*255);
    }
    ctx.putImageData(pixels,0,0);
  }
  function renderCanvas(el){
    const kind=el.dataset.figmaGlass;
    const blueprint=blueprints[kind];
    if(!blueprint)return;
    const w=Math.round(Number(el.dataset.w)*samples);
    const h=Math.round(Number(el.dataset.h)*samples);
    if(!(w>0&&h>0))return;
    const key=kind+':'+w+'x'+h;
    const source=maskCache.get(key)||load(blueprint.src).then(img=>glyphMask(img,w,h));
    maskCache.set(key,source);
    source.then(alpha=>{
      if(!el.isConnected)return;
      el.width=w;el.height=h;
      lightMap(el,alpha,null,w,h,blueprint.color,blueprint.fill);
      el.classList.add('figma-glass-ready');
      el.parentElement?.classList.add('figma-glass-ready');
    }).catch(error=>console.warn('[DCD] Figma glass:',error));
  }
  window.DCDFigmaGlass={render(root){
    root.querySelectorAll('canvas[data-figma-glass]').forEach(renderCanvas);
  }};
})();
