/* DCD doll morph: preserve authentic front/back reference images and
   interpolate silhouette widths with premultiplied-alpha pixels, not strips. */
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
  // Auto-calibrate from the exact Figma PNG export of "당장확인해"
  // and its byte-identical unadjusted web original, doll-02-level-01-front.
  // A single measured transform applies to all 4 dolls x 4 stages x 2 sides.
  let gradePromise;
  function imageLoad(url){
    return new Promise((resolve,reject)=>{
      const im=new Image();im.onload=()=>resolve(im);
      im.onerror=()=>reject(Error("Unable to load "+url));im.src=url;
    });
  }
  function solve4(M,v){
    const a=M.map((row,i)=>[...row,v[i]]);
    for(let c=0;c<4;c++){
      let pivot=c;
      for(let i=c+1;i<4;i++)if(Math.abs(a[i][c])>Math.abs(a[pivot][c]))pivot=i;
      if(Math.abs(a[pivot][c])<1e-8)return null;
      [a[c],a[pivot]]=[a[pivot],a[c]];
      const t=a[c][c];for(let j=c;j<=4;j++)a[c][j]/=t;
      for(let i=0;i<4;i++)if(i!==c){
        const n=a[i][c];for(let j=c;j<=4;j++)a[i][j]-=n*a[c][j];
      }
    }
    return a.map(row=>row[4]);
  }
  async function figmaGrade(){
    if(!gradePromise)gradePromise=(async()=>{
      const [source,reference]=await Promise.all([
        imageLoad('assets/figures-v2/doll-02-level-01-front.png'),
        imageLoad('assets/figma-reference/doll-02-level-01-front-figma.png')
      ]);
      const w=reference.naturalWidth,h=reference.naturalHeight;
      const pixels=im=>{
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
        const context=canvas.getContext('2d',{willReadFrequently:true});
        context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
        context.drawImage(im,0,0,w,h);
        return context.getImageData(0,0,w,h).data;
      };
      const x=pixels(source),y=pixels(reference);
      const xx=Array.from({length:4},()=>[0,0,0,0]);
      const xy=Array.from({length:3},()=>[0,0,0,0]);
      let count=0;
      for(let p=0;p<x.length;p+=4){
        if(x[p+3]<248||y[p+3]<248)continue;
        const v=[x[p]/255,x[p+1]/255,x[p+2]/255,1];
        for(let i=0;i<4;i++){
          for(let j=0;j<4;j++)xx[i][j]+=v[i]*v[j];
          for(let k=0;k<3;k++)xy[k][i]+=v[i]*y[p+k]/255;
        }
        count++;
      }
      if(count<200)throw Error('Not enough matched Figma pixels');
      // Regularize to the identity matrix to keep unseen skin/body colors
      // stable when fitting a small reference export.
      const regularizer=4;
      for(let i=0;i<4;i++)xx[i][i]+=regularizer;
      const matrix=xy.map((row,k)=>{
        const vector=[...row];vector[k]+=regularizer;
        return solve4(xx,vector);
      });
      if(matrix.some(row=>!row||row.some(v=>!Number.isFinite(v))))
        throw Error('Invalid Figma color transform');
      let error=0;
      for(let p=0;p<x.length;p+=4){
        if(x[p+3]<248||y[p+3]<248)continue;
        const v=[x[p]/255,x[p+1]/255,x[p+2]/255,1];
        for(let k=0;k<3;k++){
          const predicted=Math.min(255,Math.max(0,255*matrix[k].reduce((s,a,j)=>s+a*v[j],0)));
          error+=(predicted-y[p+k])**2;
        }
      }
      console.info('[DCD] Matched Figma doll reference', {samples:count,rmse:Math.sqrt(error/(count*3))});
      return matrix;
    })().catch(e=>{
      console.warn('[DCD] Calibration failed; leaving original doll colors untouched',e);
      return null;
    });
    return gradePromise;
  }
  function coolDollPixels(ctx,matrix){
    if(!matrix)return;
    const image=ctx.getImageData(0,0,W,H),data=image.data;
    for(let i=0;i<data.length;i+=4){
      if(data[i+3]===0)continue;
      const src=[data[i]/255,data[i+1]/255,data[i+2]/255,1];
      for(let k=0;k<3;k++){
        const v=matrix[k].reduce((s,a,j)=>s+a*src[j],0);
        data[i+k]=Math.max(0,Math.min(255,Math.round(255*v)));
      }
    }
    ctx.putImageData(image,0,0);
  }
  function source(kind,state,view){
    const key=`${kind}-${state}-${view}`;
    if(cache.has(key))return cache.get(key);
    const promise=new Promise(resolve=>{
      const image=new Image();
      image.onload=async()=>{
        try{
        const c=document.createElement('canvas');c.width=W;c.height=H;
        const ctx=c.getContext('2d',{willReadFrequently:true});
        const scale=Math.min(W/image.width,H/image.height);
        const w=image.width*scale,h=image.height*scale;
        ctx.drawImage(image,(W-w)/2,(H-h)/2,w,h);
        coolDollPixels(ctx,await figmaGrade());
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
          pixels:ctx.getImageData(0,0,W,H).data,
          facePixels:ctx.getImageData(0,0,W,FACE_BLEND_END).data
        });
        }catch(error){console.error('[DCD] Figure processing failed',key,error);resolve(null);}
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
  // Draw morph by blending BOTH adjacent source states on the 2D canvas.
  // This avoids the previous 300k-pixel JavaScript redraw per animation frame,
  // and, crucially, removes the midpoint jump from round(p).
  async function draw(canvas,kind,value,view='front'){
    if(!canvas)return;
    const request=(pending.get(canvas)||0)+1;
    pending.set(canvas,request);
    const p=clamp(value,0,100)*3/100;
    const lo=Math.floor(p),hi=Math.min(3,Math.ceil(p)),t=p-lo;
    const [a,b]=await Promise.all([source(kind,lo,view),source(kind,hi,view)]);
    if(!a||!b||!canvas.isConnected||pending.get(canvas)!==request)return;
    if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,W,H);
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    if(lo===hi||t<.000001){ctx.drawImage(a.canvas,0,0);return;}
    if(t>.999999){ctx.drawImage(b.canvas,0,0);return;}
    // Continuous target silhouette; each endpoint's image is warped to that
    // same target at every stage. Draw grouped 4px rows via the native
    // canvas rasterizer rather than a per-pixel JavaScript loop.
    // The head region remains geometrically stable; its textures cross-fade
    // continuously instead of snapping at the midpoint.
    const stripHeight=4;
    function paint(src,alpha){
      ctx.globalAlpha=alpha;
      for(let y=0;y<H;y+=stripHeight){
        const height=Math.min(stripHeight,H-y);
        const center=y+(height-1)*.5;
        const base=widthAt(src.profile,center);
        const target=mix(widthAt(a.profile,center),widthAt(b.profile,center),t);
        const feather=clamp((center-165)/95,0,1);
        const ease=feather*feather*(3-2*feather);
        const ratio=clamp(target/Math.max(1,base),.78,1.22);
        const stretch=1+(ratio-1)*ease;
        const destW=W*stretch;
        ctx.drawImage(src.canvas,0,y,W,height,(W-destW)*.5,y,destW,height);
      }
    }
    paint(a,1);
    paint(b,t);
    ctx.globalAlpha=1;
  }
  function drawVisible(root=document){
    root.querySelectorAll('canvas[data-figure]').forEach(c=>
      draw(c,Number(c.dataset.figure),Number(c.dataset.value),c.dataset.view||'front'));
  }
  async function preload(kind,value,view='back'){
    const p=clamp(value,0,100)*3/100;
    await Promise.all([source(kind,Math.floor(p),view),source(kind,Math.min(3,Math.ceil(p)),view)]);
  }
  async function preloadAll(kind,view='front'){
    await Promise.all([0,1,2,3].map(i=>source(kind,i,view)));
  }
  return {draw,drawVisible,preload,preloadAll};
})();
