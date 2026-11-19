/* Present only recent cutouts, with the source frame for face/hand tracking. */
(() => {
'use strict';
const MAX_FRAME_AGE=3200, MAX_VISIBLE_AGE=5000;
const scriptURL=document.currentScript.src;
const workerURL=new URL('ar-matte-worker.js?v=restore-xl-webgl-20261116-26',scriptURL);
const SDK='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const SELFIE='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';
function create(root,video,canvas,onFrame){
 // Transparency is essential: do NOT request an opaque canvas.
 const ratio=Math.min(1.5,window.devicePixelRatio||1);
 const designWidth=Number(canvas.dataset.matteWidth||canvas.width);
 const designHeight=Number(canvas.dataset.matteHeight||canvas.height);
 canvas.dataset.matteWidth=designWidth;canvas.dataset.matteHeight=designHeight;
 canvas.width=Math.round(designWidth*ratio);canvas.height=Math.round(designHeight*ratio);
 const ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx)return null;
 let worker,live=true,ready=false,visible=false,pending=null,frameHandle=0,timer=0,watchdog=0;
 let lastVideoTime=-1,lastCapture=0,misses=0,failures=0,firstFrame=true;
 let fallback=null,fallbackStarting=false;
 // Semantic segmentation vetoes only confidently non-human background.
 // Longpipe remains the sole source of fine hair and skin alpha.
 let semantic=null,semanticReady=false,semanticBusy=false,semanticDisabled=false;
 let semanticLast=0,semanticTime=0,semanticGate=null,semanticSlow=0;
 // Derive the crown from the actual HD portrait alpha, independent of the
 // optional 256px semantic worker. Scan only above the tracked forehead.
 let crownLast=0;
 function measureVisibleHairCrown(now){
   const face=root.__dcdFaceRegion;
   if(!face||now-face.at>1800||now-crownLast<340||!canvas.width||!canvas.height)return;
   crownLast=now;
   const w=canvas.width,h=canvas.height;
   const vw=video.videoWidth,vh=video.videoHeight;
   if(!vw||!vh)return;
   const scale=Math.max(w/vw,h/vh),dw=vw*scale,dh=vh*scale;
   const ox=(w-dw)/2,oy=(h-dh)/2;
   const cx=w-(ox+face.cx*dw);
   const forehead=oy+face.top*dh;
   const faceWidth=Math.max(24,face.width*dw);
   const x0=Math.max(0,Math.floor(cx-faceWidth*.72));
   const x1=Math.min(w,Math.ceil(cx+faceWidth*.72));
   const y0=Math.max(0,Math.floor(forehead-faceWidth*1.30));
   const y1=Math.min(h,Math.ceil(forehead+faceWidth*.12));
   if(x1-x0<14||y1-y0<12)return;
   let data;
   try{data=ctx.getImageData(x0,y0,x1-x0,y1-y0).data;}catch{return;}
   const sw=x1-x0,sh=y1-y0,threshold=Math.max(6,Math.floor(sw*.12)),candidates=[];
   for(let y=0;y<sh;y++){
     let run=0,best=0,total=0,weighted=0;
     for(let x=0;x<sw;x++){
       const a=data[(y*sw+x)*4+3];
       if(a>145){run++;total++;weighted+=x;best=Math.max(best,run);}
       else run=0;
     }
     if(best>=threshold&&total>=threshold*1.5)candidates.push({y:y+y0,x:x0+weighted/Math.max(1,total)});
   }
   if(candidates.length<4)return;
   const first=candidates.slice(0,Math.min(5,candidates.length));
   const px=first.reduce((sum,p)=>sum+p.x,0)/first.length;
   const py=first.reduce((sum,p)=>sum+p.y,0)/first.length;
   // Measure the upper hair outline on both sides, rather than correcting
   // the single highest crown point only. This prevents exposed side hair.
   const outline=[];
   const samples=9;
   for(let i=0;i<samples;i++){
     const yy=Math.min(y1-1,Math.round(py+(forehead-py)*i/(samples-1)));
     const localY=yy-y0;
     if(localY<0||localY>=sh)continue;
     let left=-1,right=-1;
     for(let x=0;x<sw;x++){
       if(data[(localY*sw+x)*4+3]>145){
         if(left<0)left=x;right=x;
       }
     }
     if(left>=0&&right-left>=threshold)outline.push({y:yy/h,left:(x0+left)/w,right:(x0+right)/w});
   }
   // Sample the full hair crown from left to right in the actual matte.
   // Each column finds its first connected foreground pixel near the head,
   // producing a curved SUPPORT LINE rather than a single forehead anchor.
   const crownCurve=[];
   for(let sample=0;sample<=20;sample++){
     const x=Math.round(x0+(x1-x0-1)*sample/20),localX=x-x0;
     let hit=-1;
     for(let y=0;y<sh-4;y++){
       let support=0;
       for(let yy=y;yy<Math.min(sh,y+5);yy++){
         const alpha=data[(yy*sw+localX)*4+3];
         if(alpha>145)support++;
       }
       if(support>=4){hit=y+y0;break;}
     }
     // Sparse flyaway strands are excluded; absent samples are interpolated.
     if(hit>=0&&hit<forehead+faceWidth*.1)
       crownCurve.push({x:x/w,y:hit/h});
   }
   if(crownCurve.length>=8){
     const ys=crownCurve.map(p=>p.y).sort((a,b)=>a-b);
     const median=ys[Math.floor(ys.length/2)];
     const stable=crownCurve.filter(p=>Math.abs(p.y-median)<faceWidth/h*.48);
     if(stable.length>=8){
       root.__dcdHairCrown={x:px/w,y:py/h,outline,curve:stable,at:now,source:'portrait-alpha'};
       return;
     }
   }
   root.__dcdHairCrown={x:px/w,y:py/h,outline,at:now,source:'portrait-alpha'};
 }

 const subject=document.createElement('canvas');
 subject.width=canvas.width;subject.height=canvas.height;
 const subjectCtx=subject.getContext('2d',{alpha:true});
 // Worker frames update only the foreground alpha. Render the newest LIVE
 // video through that mask instead of freezing the entire camera frame until
 // the next (potentially seconds-late) model result.
 const alphaCanvas=document.createElement('canvas');
 // Preserve the uncropped segmentation mask at the model's native full-frame size.
 // Cropping it to 428x926 BEFORE tracking causes straight cut lines when moving.
 alphaCanvas.width=1;alphaCanvas.height=1;
 const alphaCtx=alphaCanvas.getContext('2d',{alpha:true});
 let hasAlpha=false,latestMaskAt=0,paintFrame=0,lastPaint=0,maskAnchor=null;
 let alphaPlacement=null,lastMaskDx=0,lastMaskDy=0;
 // Ending uses a stable live alpha: only accept a fresh mask after checking its coverage.
 let finalCoverage=null;
 const ending=()=>['AR9','AR10'].includes(root.dataset.arFrame);
 const candidate=document.createElement('canvas');candidate.width=48;candidate.height=80;
 const candidateCtx=candidate.getContext('2d',{willReadFrequently:true});
 function usableEndingMask(image){
   if(!ending()||!candidateCtx)return true;
   candidateCtx.clearRect(0,0,48,80);candidateCtx.drawImage(image,0,0,48,80);
   const pixels=candidateCtx.getImageData(0,0,48,80).data;let total=0;
   for(let i=3;i<pixels.length;i+=4)total+=pixels[i]/255;
   const coverage=total/(48*80);
   if(coverage<.015||coverage>.97)return false;
   if(finalCoverage!==null&&(coverage<finalCoverage*.60||coverage>finalCoverage*1.65))return false;
   finalCoverage=coverage;return true;
 }
 function paintLive(now){
   if(!live)return;
   paintFrame=requestAnimationFrame(paintLive);
   paintLiveOnce(now);
 }
 function paintLiveOnce(now=performance.now()){
   const portraitVisible=['AR5-1','AR9','AR10'].includes(root.dataset.arFrame);
   if(portraitVisible)return; // these pages use the raw live camera
   // In camera/veil scenes the matte is hidden and only supplies scalp data.
   // Do not composite the full HD video thirty times a second behind it.
   if(!hasAlpha||!visible||video.readyState<2||now-lastPaint<(portraitVisible?33:100))return;
   lastPaint=now;
   const w=canvas.width,h=canvas.height,vw=video.videoWidth,vh=video.videoHeight;
   if(!vw||!vh)return;
   const scale=Math.max(w/vw,h/vh),dw=vw*scale,dh=vh*scale;
   try{
     subjectCtx.globalCompositeOperation='source-over';
     subjectCtx.clearRect(0,0,w,h);
     subjectCtx.drawImage(video,(w-dw)/2,(h-dh)/2,dw,dh);
     subjectCtx.globalCompositeOperation='destination-in';
     // Translate the cached alpha with CURRENT face landmarks. A portrait
     // inference can take many frames; leaving its alpha at old coordinates
     // clips moving hair/cheeks even when the live camera image is fresh.
     const face=root.__dcdFaceRegion;
     const aligned=face&&maskAnchor&&now-face.at<650;
     // The landmark coordinates refer to the UNMIRRORED source video.
     // Keep the last tracked offset while a turned/occluded face is briefly lost.
     if(aligned){
       lastMaskDx=(face.cx-maskAnchor.cx)*dw;
       lastMaskDy=(face.top-maskAnchor.top)*dh;
     }
     if(alphaPlacement){
       subjectCtx.drawImage(alphaCanvas,
         alphaPlacement.x+lastMaskDx,alphaPlacement.y+lastMaskDy,
         alphaPlacement.width,alphaPlacement.height);
     }
     subjectCtx.globalCompositeOperation='source-over';
     // Replace the displayed canvas in one draw, without an intermediate blank.
     ctx.save();ctx.globalCompositeOperation='copy';ctx.translate(w,0);ctx.scale(-1,1);
     ctx.drawImage(subject,0,0);ctx.restore();
   }catch(error){if(!root.dataset.arMattePaintError)console.warn('[DCD AR] Live video paint:',error);root.dataset.arMattePaintError='1';}
 }
 paintFrame=requestAnimationFrame(paintLive);
 function disableSemantic(reason){
  semanticDisabled=true;semanticReady=false;semanticBusy=false;
  semanticGate?.close?.();semanticGate=null;
  semantic?.terminate();semantic=null;
  if(reason)console.info('[DCD AR] Semantic refinement off:',reason);
 }
 function initSemantic(){
  if(semantic||semanticDisabled||typeof Worker==='undefined'||!subjectCtx)return;
  try{
   semantic=new Worker(new URL('ar-semantic-matte-worker.js?v=hair-crown-v2',scriptURL));
   semantic.onerror=e=>disableSemantic(e.message||'Semantic worker failure');
   semantic.onmessage=({data})=>{
    if(!live){data?.bitmap?.close?.();return}
    if(data.type==='ready'){semanticReady=true;return}
    if(data.type==='error'){disableSemantic(data.message);return}
    if(data.type==='gate'){
     if(data.crown&&Number.isFinite(data.crown.y)&&
        (!root.__dcdHairCrown||performance.now()-root.__dcdHairCrown.at>1500)){
       // Semantic hair is a backup. The HD cutout alpha is the primary source.
       root.__dcdHairCrown={x:1-data.crown.x,y:data.crown.y,at:performance.now(),source:'hair-class'};
     }
     semanticBusy=false;
     if(data.latency>290)semanticSlow++;else semanticSlow=Math.max(0,semanticSlow-1);
     // Run this semantic helper at reduced cadence on slow devices, but retain
     // periodic hair measurements rather than permanently disabling it.
     if(semanticSlow>=3)semanticLast=performance.now()+450;
     semanticGate?.close?.();semanticGate=data.bitmap;semanticTime=data.time;
    }
   };
   semantic.postMessage({type:'init'});
  }catch(error){disableSemantic(error)}
 }
 function offerSemanticFrame(source,sourceTime){
  const now=performance.now();
  if(!semanticReady||semanticBusy||!semantic||now-semanticLast<300)return false;
  semanticLast=now;semanticBusy=true;
  // Copy the original, unmasked frame before closing the VideoFrame.
  Promise.resolve().then(()=>createImageBitmap(source)).then(bitmap=>{
   if(!live||!semanticReady){bitmap.close();semanticBusy=false;return}
   const face=root.__dcdFaceRegion;
   const faceRegion=face&&performance.now()-face.at<1800?face:null;
   semantic.postMessage({type:'frame',bitmap,time:sourceTime,faceRegion},[bitmap]);
  }).catch(error=>{semanticBusy=false;console.warn('[DCD AR] Semantic capture:',error)})
  .finally(()=>source.close?.());
  return true;
 }

 // Longpipe's temporal portrait matting is the primary engine.
 // Start with XL on BOTH WebGPU and WebGL; preserve 1280x768 detail.
 // Switch models only after actual initialization or repeated processing failures.
 // HD camera resolution alone does not guarantee HD matting.
 
 const modes=['xl','large','small','mediapipe'];
 function hide(){
  visible=false;canvas.style.visibility='hidden';root.dataset.arMatte='camera';
  root.classList.remove('ar-matting-active');
 }
 function closeWorker(){
  clearTimeout(watchdog);watchdog=0;
  ready=false;pending=null;worker?.terminate();worker=null;
 }
 async function startFallback(reason){
  if(!live||fallback||fallbackStarting)return;
  closeWorker();fallbackStarting=true;
  console.warn('[DCD AR] Portrait worker unavailable; restoring live cutout:',reason);
  try{
   const {ImageSegmenter,FilesetResolver}=await import(SDK);
   const vision=await FilesetResolver.forVisionTasks(WASM);
   const create=delegate=>ImageSegmenter.createFromOptions(vision,{
    baseOptions:{modelAssetPath:SELFIE,delegate},runningMode:'VIDEO',
    outputCategoryMask:false,outputConfidenceMasks:true
   });
   const segmenter=await create('GPU').catch(()=>create('CPU'));
   if(!live){segmenter.close();return;}
   const foreground=document.createElement('canvas');
   foreground.width=canvas.width;foreground.height=canvas.height;
   fallback={segmenter,foreground,fg:foreground.getContext('2d',{alpha:true}),
    mask:document.createElement('canvas'),source:document.createElement('canvas'),lastSegment:0,hasMask:false};
   fallback.maskCtx=fallback.mask.getContext('2d',{willReadFrequently:true});
   fallback.sourceCtx=fallback.source.getContext('2d');
   root.dataset.arMatte='mediapipe-main';
   root.dataset.arMatteEngine='mediapipe-main';
  }catch(error){console.warn('[DCD AR] Portrait fallback unavailable:',error);}
  finally{fallbackStarting=false;}
 }
 function drawFallback(now){
  const f=fallback;
  if(!f||video.readyState<2||!video.videoWidth)return;
  const w=canvas.width,h=canvas.height,vw=video.videoWidth,vh=video.videoHeight;
  if(ending()&&hasAlpha&&visible)return; // keep live video through the last valid alpha during engine handover
  if(now-f.lastSegment>=(ending()?175:80)){
   f.source.width=vw;f.source.height=vh;
   f.sourceCtx.drawImage(video,0,0,vw,vh);
   f.lastSegment=now;
   try{
    f.segmenter.segmentForVideo(f.source,now,result=>{
     const mask=(result.confidenceMasks?.[1] ?? result.confidenceMasks?.[0]);
     if(!mask)return;
     if(f.mask.width!==mask.width||f.mask.height!==mask.height){
      f.mask.width=mask.width;f.mask.height=mask.height;
     }
     const pixels=f.maskCtx.createImageData(mask.width,mask.height);
     const values=mask.getAsFloat32Array();
     for(let i=0;i<values.length;i++){
      const k=i*4,a=Math.max(0,Math.min(1,values[i]));
      pixels.data[k]=pixels.data[k+1]=pixels.data[k+2]=255;
      pixels.data[k+3]=Math.round(255*a);
     }
     f.maskCtx.putImageData(pixels,0,0);
     f.hasMask=true;
     result.confidenceMasks?.forEach(value=>value.close?.());
    });
   }catch(error){console.warn('[DCD AR] Portrait fallback frame:',error);}
  }
  if(!f.hasMask)return;
  const scale=Math.max(w/vw,h/vh),dw=vw*scale,dh=vh*scale;
  const x=(w-dw)/2,y=(h-dh)/2;
  f.fg.clearRect(0,0,w,h);
  f.fg.save();f.fg.translate(w,0);f.fg.scale(-1,1);
  f.fg.drawImage(f.source,x,y,dw,dh);
  f.fg.globalCompositeOperation='destination-in';
  f.fg.drawImage(f.mask,x,y,dw,dh);
  f.fg.restore();
  ctx.save();ctx.globalCompositeOperation='copy';ctx.drawImage(f.foreground,0,0);ctx.restore();
  visible=true;lastCapture=now;
  root.__dcdMatteStatus||={engine:'mediapipe-main',frames:0};
  root.__dcdMatteStatus.frames++;root.__dcdMatteStatus.lastFrameAt=now;
  measureVisibleHairCrown(now);
  root.classList.add('ar-matting-active');
  canvas.style.visibility='visible';canvas.style.opacity='1';
  try{onFrame?.(f.source,vw,vh);}catch(error){console.warn('[DCD AR] Portrait tracking:',error);}
 }
 function stop(){
  live=false;cancelAnimationFrame(paintFrame);closeWorker();clearInterval(timer);
  if(frameHandle)video.cancelVideoFrameCallback?.(frameHandle);
  fallback?.segmenter.close();fallback=null;
  disableSemantic();
  hide();
 }
 function next(reason){
  if(reason){
    if(root.__dcdMatteStatus)root.__dcdMatteStatus.lastFailure=String(reason);
    root.dataset.arMatteLastFailure=String(reason).slice(0,180);
    console.warn('[DCD AR] Changing portrait engine:',reason);
  }
  closeWorker();misses=0;failures=0;firstFrame=true;
  // Preserve the most recent valid image during model transitions.
  const mode=modes.shift();
  root.dataset.arMatteRequested=mode||'mediapipe-main';
  if(!mode||typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'){
   startFallback(reason||'Worker API unavailable');return;
  }
  let current;
  try{current=new Worker(workerURL,{type:'module'})}catch(error){startFallback(error);return;}
  worker=current;
  watchdog=setTimeout(()=>next(mode+' initialization timeout'),40000);
  current.onerror=event=>{if(worker===current)next(event.message||'Worker error');};
  current.onmessage=({data})=>{
   if(worker!==current||!live){
    data.source?.close();data.cutout?.close();return;
   }
   if(data.type==='ready'){
    root.dataset.arMatteEngine=data.engine||mode;
    root.__dcdMatteStatus={engine:data.engine||mode,mode,ready:true,frames:0,latencyMs:null,
      inputWidth:video.videoWidth,inputHeight:video.videoHeight,cutoutWidth:null,cutoutHeight:null};
    console.info('[DCD AR] Portrait engine ready:',root.dataset.arMatteEngine);
    clearTimeout(watchdog);watchdog=0;ready=true;
    // The HD Longpipe alpha directly supplies crown geometry. Do not run
    // an extra 256px semantic worker in parallel with video and the veil.
    return;
   }
   if(data.type==='error'){next(data.message);return;}
   if(data.type!=='frame')return;
   const request=pending;pending=null;
   const warmingUp=firstFrame;firstFrame=false;
   let semanticOffered=false;
   try{
    const age=request?performance.now()-request.started:Infinity;
    if(root.__dcdMatteStatus){
      root.__dcdMatteStatus.latencyMs=Math.round(age);
      root.__dcdMatteStatus.inputWidth=video.videoWidth;
      root.__dcdMatteStatus.inputHeight=video.videoHeight;
      root.__dcdMatteStatus.cutoutWidth=data.cutout?.displayWidth||data.cutout?.width||null;
      root.__dcdMatteStatus.cutoutHeight=data.cutout?.displayHeight||data.cutout?.height||null;
    }
    if(age>MAX_FRAME_AGE){
     if(!warmingUp&&++misses>=6)next(data.engine+' frame age '+Math.round(age)+' ms');
     return;
    }
    misses=0;failures=0;
    const w=canvas.width,h=canvas.height;
    const width=data.cutout.displayWidth||data.cutout.width;
    const height=data.cutout.displayHeight||data.cutout.height;
    const scale=Math.max(w/width,h/height),dw=width*scale,dh=height*scale;
    // Preserve the finest alpha from the model. The video pixels themselves
    // are drawn continuously in paintLive(), independent of inference FPS.
    // Retain the ENTIRE camera-space alpha, including the left/right overscan.
    // The portrait viewport crops ONLY the final tracked composite, never
    // this reusable mask. Otherwise shifting the head exposes a hard edge.
    if(!usableEndingMask(data.cutout))return;
    if(alphaCanvas.width!==width||alphaCanvas.height!==height){
      alphaCanvas.width=width;alphaCanvas.height=height;
    }
    alphaCtx.clearRect(0,0,width,height);
    alphaCtx.drawImage(data.cutout,0,0,width,height);
    alphaPlacement={x:(w-dw)/2,y:(h-dh)/2,width:dw,height:dh};
    hasAlpha=true;latestMaskAt=performance.now();
    maskAnchor=request?.faceRegion||root.__dcdFaceRegion||null;
    lastMaskDx=0;lastMaskDy=0;
    lastCapture=performance.now();
    // Paint the first real frame before flipping the visibility class.
    if(!visible){visible=true;lastPaint=-Infinity;paintLiveOnce();}
    visible=true;
    if(root.__dcdMatteStatus){root.__dcdMatteStatus.frames++;root.__dcdMatteStatus.lastFrameAt=lastCapture;}
    measureVisibleHairCrown(lastCapture);
    root.classList.add('ar-matting-active');
    canvas.style.visibility='visible';canvas.style.opacity='1';
    root.dataset.arMatte=data.engine;
    root.dataset.arMatteCutoutSize=width+'x'+height;
    root.dataset.arMatteFrameAge=Math.round(age)+'ms';
    // A landmark tracking error must not turn off a working cutout.
    try{onFrame?.(data.source,width,height);}
    catch(error){console.warn('[DCD AR] Portrait tracking:',error);}
    // The HD crown is derived from the painted matte; no separate segmentation.
   }catch(error){next(String(error));}
   finally{
    if(!semanticOffered)data.source.close?.();
    data.cutout.close?.();
   }
  };
  current.postMessage({type:'init',mode});
 }
 async function submit(now,metadata){
  if(!live)return;
  if(['AR5-1','AR9','AR10'].includes(root.dataset.arFrame))return;
  if(fallback){drawFallback(now);return;}
  if(visible&&performance.now()-lastCapture>MAX_VISIBLE_AGE*2.2&&ready){next('Portrait frame stalled');return;}
  if(pending&&performance.now()-pending.started>(firstFrame?9000:MAX_VISIBLE_AGE)){next('Frame processing timed out');return;}
  if(!ready||pending||video.readyState<2||!video.videoWidth)return;
  const portraitVisible=['AR5-1','AR9','AR10'].includes(root.dataset.arFrame);
  if(lastCapture&&now-lastCapture<(portraitVisible?80:175))return;
  const time=metadata?.mediaTime??video.currentTime;
  if(time<=lastVideoTime)return;
  lastVideoTime=time;
  const current=worker;
  const request={started:performance.now(),faceRegion:root.__dcdFaceRegion?{...root.__dcdFaceRegion}:null};pending=request;
  let source;
  try{
   const timestamp=Math.round(time*1e6);
   if(typeof VideoFrame==='function'){
    try{source=new VideoFrame(video,{timestamp});}catch{}
   }
   if(!source)source=await createImageBitmap(video);
   if(!live||worker!==current||pending!==request)return;
   current.postMessage({type:'frame',source,timestamp},[source]);
   source=null;
  }catch(error){
   if(worker===current&&pending===request){
    pending=null;
    if(++failures>=3)next(String(error));
   }
  }finally{source?.close();}
 }
 function pump(now,metadata){
  if(!live)return;
  frameHandle=video.requestVideoFrameCallback(pump);
  submit(now,metadata);
 }
 hide();
 next();
 if(live&&typeof video.requestVideoFrameCallback==='function')frameHandle=video.requestVideoFrameCallback(pump);
 else if(live)timer=setInterval(()=>submit(performance.now()),33);
 return {get visible(){return visible},stop};
}
window.DCD_AR_MATTE={create};
})();
