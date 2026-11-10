/* Present only recent cutouts, with the source frame for face/hand tracking. */
(() => {
'use strict';
const MAX_FRAME_AGE=380, MAX_VISIBLE_AGE=1100;
const scriptURL=document.currentScript.src;
const workerURL=new URL('ar-matte-worker.js?v=cloth-contact-matte-20261110-156',scriptURL);
const SDK='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const SELFIE='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';
function create(root,video,canvas,onFrame){
 // Transparency is essential: do NOT request an opaque canvas.
 const ratio=Math.min(2,window.devicePixelRatio||1);
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
 const subject=document.createElement('canvas');
 subject.width=canvas.width;subject.height=canvas.height;
 const subjectCtx=subject.getContext('2d',{alpha:true});
 function disableSemantic(reason){
  semanticDisabled=true;semanticReady=false;semanticBusy=false;
  semanticGate?.close?.();semanticGate=null;
  semantic?.terminate();semantic=null;
  if(reason)console.info('[DCD AR] Semantic refinement off:',reason);
 }
 function initSemantic(){
  if(semantic||semanticDisabled||typeof Worker==='undefined'||!subjectCtx)return;
  try{
   semantic=new Worker(new URL('ar-semantic-matte-worker.js?v=human-background-v1',scriptURL));
   semantic.onerror=e=>disableSemantic(e.message||'Semantic worker failure');
   semantic.onmessage=({data})=>{
    if(!live){data?.bitmap?.close?.();return}
    if(data.type==='ready'){semanticReady=true;return}
    if(data.type==='error'){disableSemantic(data.message);return}
    if(data.type==='gate'){
     semanticBusy=false;
     if(data.latency>290)semanticSlow++;else semanticSlow=Math.max(0,semanticSlow-1);
     if(semanticSlow>=3){data.bitmap?.close?.();disableSemantic('Processing too slow');return}
     semanticGate?.close?.();semanticGate=data.bitmap;semanticTime=data.time;
    }
   };
   semantic.postMessage({type:'init'});
  }catch(error){disableSemantic(error)}
 }
 function offerSemanticFrame(source,sourceTime){
  const now=performance.now();
  if(!semanticReady||semanticBusy||!semantic||now-semanticLast<100)return false;
  semanticLast=now;semanticBusy=true;
  // Copy the original, unmasked frame before closing the VideoFrame.
  Promise.resolve().then(()=>createImageBitmap(source)).then(bitmap=>{
   if(!live||!semanticReady){bitmap.close();semanticBusy=false;return}
   semantic.postMessage({type:'frame',bitmap,time:sourceTime},[bitmap]);
  }).catch(error=>{semanticBusy=false;console.warn('[DCD AR] Semantic capture:',error)})
  .finally(()=>source.close?.());
  return true;
 }

 // Longpipe's temporal portrait matting is the primary engine.
 // Try the large temporal model on both WebGPU and WebGL.
 // SelfieSegmenter is a last-resort compatibility fallback only.
 
 const modes=['large','small','mediapipe'];
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
  }catch(error){console.warn('[DCD AR] Portrait fallback unavailable:',error);}
  finally{fallbackStarting=false;}
 }
 function drawFallback(now){
  const f=fallback;
  if(!f||video.readyState<2||!video.videoWidth)return;
  const w=canvas.width,h=canvas.height,vw=video.videoWidth,vh=video.videoHeight;
  if(now-f.lastSegment>=33){
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
  ctx.clearRect(0,0,w,h);
  ctx.drawImage(f.foreground,0,0);
  visible=true;lastCapture=now;
  root.classList.add('ar-matting-active');
  canvas.style.visibility='visible';canvas.style.opacity='1';
  try{onFrame?.(f.source,vw,vh);}catch(error){console.warn('[DCD AR] Portrait tracking:',error);}
 }
 function stop(){
  live=false;closeWorker();clearInterval(timer);
  if(frameHandle)video.cancelVideoFrameCallback?.(frameHandle);
  fallback?.segmenter.close();fallback=null;
  disableSemantic();
  hide();
 }
 function next(reason){
  if(reason)console.info('[DCD AR] Changing portrait engine:',reason);
  closeWorker();misses=0;failures=0;firstFrame=true;
  // Preserve the most recent valid image during model transitions.
  const mode=modes.shift();
  if(!mode||typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'){
   startFallback(reason||'Worker API unavailable');return;
  }
  let current;
  try{current=new Worker(workerURL)}catch(error){startFallback(error);return;}
  worker=current;
  watchdog=setTimeout(()=>next(mode+' initialization timeout'),18000);
  current.onerror=event=>{if(worker===current)next(event.message||'Worker error');};
  current.onmessage=({data})=>{
   if(worker!==current||!live){
    data.source?.close();data.cutout?.close();return;
   }
   if(data.type==='ready'){
    clearTimeout(watchdog);watchdog=0;ready=true;
    if(data.engine?.startsWith('longpipe'))initSemantic();
    return;
   }
   if(data.type==='error'){next(data.message);return;}
   if(data.type!=='frame')return;
   const request=pending;pending=null;
   const warmingUp=firstFrame;firstFrame=false;
   let semanticOffered=false;
   try{
    const age=request?performance.now()-request.started:Infinity;
    if(age>MAX_FRAME_AGE){
     if(!warmingUp&&++misses>=3)next(data.engine+' frame age '+Math.round(age)+' ms');
     return;
    }
    misses=0;failures=0;
    const w=canvas.width,h=canvas.height;
    const width=data.cutout.displayWidth||data.cutout.width;
    const height=data.cutout.displayHeight||data.cutout.height;
    const scale=Math.max(w/width,h/height),dw=width*scale,dh=height*scale;
    ctx.clearRect(0,0,w,h);
    ctx.save();ctx.translate(w,0);ctx.scale(-1,1);
    // Composite in source orientation, then mirror as a whole.
    // Only confirmed background beyond a wide hair-protection margin
    // is attenuated; no trimap edge is substituted for Longpipe's edge.
    if(data.engine?.startsWith('longpipe')&&semanticGate&&
       request&&Math.abs(request.started-semanticTime)<100&&subjectCtx){
      subjectCtx.clearRect(0,0,w,h);
      subjectCtx.globalCompositeOperation='source-over';
      subjectCtx.drawImage(data.cutout,(w-dw)/2,(h-dh)/2,dw,dh);
      subjectCtx.globalCompositeOperation='destination-in';
      subjectCtx.imageSmoothingEnabled=true;
      subjectCtx.imageSmoothingQuality='high';
      subjectCtx.drawImage(semanticGate,(w-dw)/2,(h-dh)/2,dw,dh);
      subjectCtx.globalCompositeOperation='source-over';
      ctx.drawImage(subject,0,0);
    }else{
      ctx.drawImage(data.cutout,(w-dw)/2,(h-dh)/2,dw,dh);
    }
    ctx.restore();
    lastCapture=performance.now();visible=true;
    root.classList.add('ar-matting-active');
    canvas.style.visibility='visible';canvas.style.opacity='1';
    root.dataset.arMatte=data.engine;
    // A landmark tracking error must not turn off a working cutout.
    try{onFrame?.(data.source,width,height);}
    catch(error){console.warn('[DCD AR] Portrait tracking:',error);}
    if(data.engine?.startsWith('longpipe'))semanticOffered=offerSemanticFrame(data.source,request.started);
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
  if(fallback){drawFallback(now);return;}
  if(visible&&performance.now()-lastCapture>MAX_VISIBLE_AGE&&ready){next('Portrait frame stalled');return;}
  if(pending&&performance.now()-pending.started>(firstFrame?3500:MAX_VISIBLE_AGE)){next('Frame processing timed out');return;}
  if(!ready||pending||video.readyState<2||!video.videoWidth)return;
  const time=metadata?.mediaTime??video.currentTime;
  if(time<=lastVideoTime)return;
  lastVideoTime=time;
  const current=worker;
  const request={started:performance.now()};pending=request;
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
