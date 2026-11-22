/* DCD doll morph: the same saved body value drives the paired front/back images.
   Transform complete image rows around a fixed center, without slicing limbs. */
window.DCDMorph = (() => {
  const W=346,H=873,CX=W/2,cache=new Map(),pending=new WeakMap();
  // Facial states 0–3 all participate. Warp landmark texture alignment
  // before blending, to avoid the doubled eyes/hair of a raw crossfade.
  const FACE_SOLID_END=165,FACE_BLEND_END=244;
  const faceFlows=new Map();
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
  // Estimate a smooth local correspondence grid once for each adjacent
  // face-state pair. In particular, eye, jaw and hair edges are matched in
  // actual source pixels instead of aligning only the outer body silhouette.
  function faceFlow(kind,lo,hi,view,a,b){
    const key=kind+'-'+lo+'-'+hi+'-'+view;
    if(faceFlows.has(key))return faceFlows.get(key);
    const S=2,fw=Math.ceil(W/S),fh=Math.ceil(FACE_BLEND_END/S);
    const step=6,nx=Math.ceil((fw-1)/step)+1,ny=Math.ceil((fh-1)/step)+1;
    const greyA=new Float32Array(fw*fh),greyB=new Float32Array(fw*fh);
    const alphaA=new Float32Array(fw*fh),alphaB=new Float32Array(fw*fh);
    function downsample(src,greys,alphas){
      for(let y=0;y<fh;y++)for(let x=0;x<fw;x++){
        let total=0,alpha=0,brightness=0;
        for(let yy=0;yy<S;yy++)for(let xx=0;xx<S;xx++){
          const sy=Math.min(FACE_BLEND_END-1,y*S+yy),sx=Math.min(W-1,x*S+xx);
          const i=(sy*W+sx)*4,al=src[i+3]/255;
          brightness+=(src[i]*.299+src[i+1]*.587+src[i+2]*.114)*al;
          alpha+=al;total++;
        }
        const k=y*fw+x;greys[k]=alpha>0?brightness/alpha:0;alphas[k]=alpha/total;
      }
    }
    downsample(a.facePixels,greyA,alphaA);
    downsample(b.facePixels,greyB,alphaB);
    const dx=new Float32Array(nx*ny),dy=new Float32Array(nx*ny);
    const samples=[[-2,-2],[-2,0],[-2,2],[0,-2],[0,0],[0,2],[2,-2],[2,0],[2,2]];
    for(let gy=0;gy<ny;gy++)for(let gx=0;gx<nx;gx++){
      const x=Math.min(fw-1,gx*step),y=Math.min(fh-1,gy*step),pos=gy*nx+gx;
      if(x<3||x>=fw-4||y<3||y>=fh-4)continue;
      if(alphaA[y*fw+x]<.02&&alphaB[y*fw+x]<.02)continue;
      let best=Infinity,bx=0,by=0;
      for(let oy=-8;oy<=8;oy++)for(let ox=-8;ox<=8;ox++){
        if(x+ox<3||x+ox>=fw-3||y+oy<3||y+oy>=fh-3)continue;
        let cost=(ox*ox+oy*oy)*6;
        for(const [sx,sy] of samples){
          const ia=(y+sy)*fw+x+sx,ib=(y+sy+oy)*fw+x+sx+ox;
          const aa=alphaA[ia],bb=alphaB[ib],weight=Math.min(aa,bb);
          const d=greyA[ia]-greyB[ib],alphaDiff=aa-bb;
          cost+=d*d*weight+alphaDiff*alphaDiff*14500;
        }
        if(cost<best){best=cost;bx=ox;by=oy;}
      }
      dx[pos]=bx*S;dy[pos]=by*S;
    }
    // Spatially regularize ambiguous flat skin areas and avoid abrupt
    // per-cell jumps during the dynamic morph.
    for(let pass=0;pass<2;pass++){
      const smoothX=dx.slice(),smoothY=dy.slice();
      for(let y=1;y<ny-1;y++)for(let x=1;x<nx-1;x++){
        const p=y*nx+x;
        smoothX[p]=dx[p]*.55+(dx[p-1]+dx[p+1]+dx[p-nx]+dx[p+nx])*.1125;
        smoothY[p]=dy[p]*.55+(dy[p-1]+dy[p+1]+dy[p-nx]+dy[p+nx])*.1125;
      }
      dx.set(smoothX);dy.set(smoothY);
    }
    const flow={dx,dy,nx,ny,step:step*S};
    faceFlows.set(key,flow);
    return flow;
  }
  function sampleFace(src,x,y,out){
    x=clamp(x,0,W-1);y=clamp(y,0,FACE_BLEND_END-1);
    const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(W-1,x0+1),y1=Math.min(FACE_BLEND_END-1,y0+1);
    const fx=x-x0,fy=y-y0;
    const ids=[(y0*W+x0)*4,(y0*W+x1)*4,(y1*W+x0)*4,(y1*W+x1)*4];
    const weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
    let al=0,red=0,green=0,blue=0;
    for(let k=0;k<4;k++){
      const idx=ids[k],v=src[idx+3]/255*weights[k];
      al+=v;red+=src[idx]*v;green+=src[idx+1]*v;blue+=src[idx+2]*v;
    }
    out[0]=red;out[1]=green;out[2]=blue;out[3]=al;
  }
  function morphFace(ctx,kind,lo,hi,view,a,b,t){
    if(t<=0||t>=1||lo===hi)return; // exact original at references
    const field=faceFlow(kind,lo,hi,view,a,b);
    const body=ctx.getImageData(0,0,W,FACE_BLEND_END);
    const dst=body.data,A=[0,0,0,0],B=[0,0,0,0];
    const {dx,dy,nx,ny,step}=field;
    for(let y=0;y<FACE_BLEND_END;y++){
      const u=clamp((FACE_BLEND_END-y)/(FACE_BLEND_END-FACE_SOLID_END),0,1);
      const mask=u*u*(3-2*u);
      if(mask<=0)continue;
      const gy=Math.min(ny-1,y/step),y0=Math.floor(gy),y1=Math.min(ny-1,y0+1),wy=gy-y0;
      for(let x=0;x<W;x++){
        const gx=Math.min(nx-1,x/step),x0=Math.floor(gx),x1=Math.min(nx-1,x0+1),wx=gx-x0;
        const p00=y0*nx+x0,p01=y0*nx+x1,p10=y1*nx+x0,p11=y1*nx+x1;
        const w00=(1-wx)*(1-wy),w01=wx*(1-wy),w10=(1-wx)*wy,w11=wx*wy;
        const vx=dx[p00]*w00+dx[p01]*w01+dx[p10]*w10+dx[p11]*w11;
        const vy=dy[p00]*w00+dy[p01]*w01+dy[p10]*w10+dy[p11]*w11;
        sampleFace(a.facePixels,x-vx*t,y-vy*t,A);
        sampleFace(b.facePixels,x+vx*(1-t),y+vy*(1-t),B);
        const i=(y*W+x)*4,bodyAlpha=dst[i+3]/255;
        const morphedAlpha=mix(A[3],B[3],t);
        const alpha=mix(bodyAlpha,morphedAlpha,mask);
        if(alpha<1/255){dst[i]=dst[i+1]=dst[i+2]=dst[i+3]=0;continue;}
        for(let k=0;k<3;k++){
          const facial=mix(A[k],B[k],t);
          dst[i+k]=Math.round(mix(dst[i+k]*bodyAlpha,facial,mask)/alpha);
        }
        dst[i+3]=Math.round(alpha*255);
      }
    }
    ctx.putImageData(body,0,0);
  }
  async function draw(canvas,kind,value,view='front'){
    if(!canvas)return;
    const request=(pending.get(canvas)||0)+1;
    pending.set(canvas,request);
    const p=clamp(value,0,100)*3/100,lo=Math.floor(p),
      hi=Math.min(3,Math.ceil(p)),t=p-lo,nearest=Math.round(p);
    const [a,b,from]=await Promise.all([
      source(kind,lo,view),source(kind,hi,view),
      source(kind,nearest,view)
    ]);
    if(!a||!b||!from||!canvas.isConnected||pending.get(canvas)!==request)return;
    if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.clearRect(0,0,W,H);
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';

    // Every exact reference shows its authentic body AND face without override.
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
    // Warp both original facial textures toward their intermediate position
    // before merging, instead of snapping or stacking unaligned faces.
    morphFace(ctx,kind,lo,hi,view,a,b,t);
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
