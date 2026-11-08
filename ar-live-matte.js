/* Present only recent cutouts, with the source frame for face/hand tracking. */
(() => {
'use strict';
const MAX_FRAME_AGE=6500, MAX_VISIBLE_AGE=20000;
const workerURL=new URL('ar-matte-worker.js?v=verified-longpipe-20261109-2',document.currentScript.src);
const SDK='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const SELFIE='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';
function create(root,video,canvas,onFrame){
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)return null;
 let worker,live=true,ready=false,visible=false,pending=null,frameHandle=0,timer=0,watchdog=0;
 let lastVideoTime=-1,lastCapture=0,misses=0,failures=0,firstFrame=true;
 let fallback=null,fallbackStarting=false;
 // Longpipe's temporal portrait matting is the primary engine.
 // Prefer large on WebGPU; use its faster small tier on WebGL/mobile.
 // SelfieSegmenter is a last-resort compatibility fallback only.
 const modes=['large'];
 let processedFrames=0,firstRenderedAt=0;
 let lastSubmitWall=0;
 const mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;
 const maskCtx=mask.getContext('2d',{alpha:true});
 const person=document.createElement('canvas');person.width=canvas.width;person.height=canvas.height;
 const personCtx=person.getContext('2d',{alpha:true});
 let renderFrame=0,hasMask=false,lastCompositedTime=-1;
 function hide(){
  visible=false;canvas.style.visibility='hidden';root.dataset.arMatte='camera';
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
    mask:document.createElement('canvas'),lastSegment:0,hasMask:false};
   fallback.maskCtx=fallback.mask.getContext('2d',{willReadFrequently:true});
   root.dataset.arMatte='mediapipe-main';
  }catch(error){console.warn('[DCD AR] Portrait fallback unavailable:',error);}
  finally{fallbackStarting=false;}
 }
 function drawFallback(now){
  const f=fallback;
  if(!f||video.readyState<2||!video.videoWidth)return;
  const w=canvas.width,h=canvas.height,vw=video.videoWidth,vh=video.videoHeight;
  if(now-f.lastSegment>=115){
   f.lastSegment=now;
   try{
    f.segmenter.segmentForVideo(video,now,result=>{
     const mask=result.confidenceMasks?.[0];
     if(!mask)return;
     if(f.mask.width!==mask.width||f.mask.height!==mask.height){
      f.mask.width=mask.width;f.mask.height=mask.height;
     }
     const pixels=f.maskCtx.createImageData(mask.width,mask.height);
     const values=mask.getAsFloat32Array();
     for(let i=0;i<values.length;i++){
      const k=i*4,a=Math.max(0,Math.min(1,values[i]));
      pixels.data[k]=pixels.data[k+1]=pixels.data[k+2]=255;
      pixels.data[k+3]=Math.round(255*a*a*(3-2*a));
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
  f.fg.drawImage(video,x,y,dw,dh);
  f.fg.globalCompositeOperation='destination-in';
  f.fg.drawImage(f.mask,x,y,dw,dh);
  f.fg.restore();
  ctx.fillStyle='#e5edf6';ctx.fillRect(0,0,w,h);
  ctx.drawImage(f.foreground,0,0);
  visible=true;lastCapture=now;
  canvas.style.visibility='visible';canvas.style.opacity='1';
  try{onFrame?.(video,vw,vh);}catch(error){console.warn('[DCD AR] Portrait tracking:',error);}
 }
 function stop(){
  live=false;closeWorker();clearInterval(timer);
  if(frameHandle)video.cancelVideoFrameCallback?.(frameHandle);
  cancelAnimationFrame(renderFrame);
  fallback?.segmenter.close();fallback=null;
  hide();
 }
 function next(reason){
  if(reason)console.info('[DCD AR] Changing portrait engine:',reason);
  closeWorker();misses=0;failures=0;firstFrame=true;
  // Preserve the most recent valid image during model transitions.
  const mode=modes.shift();
  if(!mode||typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'){
   root.dataset.arMatte='large-failed';
   console.error('[DCD AR] Large portrait unavailable; refusing Small fallback:',reason);
   return;
  }
  let current;
  try{current=new Worker(workerURL)}catch(error){root.dataset.arMatte='large-failed';console.error('[DCD AR] Large worker failed:',error);return;}
  worker=current;
  watchdog=setTimeout(()=>next(mode+' initialization timeout'),18000);
  current.onerror=event=>{if(worker===current)next(event.message||'Worker error');};
  current.onmessage=({data})=>{
   if(worker!==current||!live){
    data.source?.close();data.cutout?.close();return;
   }
   if(data.type==='ready'){clearTimeout(watchdog);watchdog=0;ready=true;return;}
   if(data.type==='error'){next(data.message);return;}
   if(data.type!=='frame')return;
   const request=pending;pending=null;
   const warmingUp=firstFrame;firstFrame=false;
   try{
    const age=request?performance.now()-request.started:Infinity;
    if(age>MAX_FRAME_AGE&&processedFrames>0){
     console.warn('[DCD AR] Large matte frame slow:',Math.round(age));
    }
    misses=0;failures=0;
    const w=canvas.width,h=canvas.height;
    const width=data.cutout.displayWidth||data.cutout.width;
    const height=data.cutout.displayHeight||data.cutout.height;
    const scale=Math.max(w/width,h/height),dw=width*scale,dh=height*scale;
    // Retain only the segmentation ALPHA, never the processed RGB frame.
    // The live original camera is drawn independently every animation frame.
    maskCtx.clearRect(0,0,w,h);
    maskCtx.save();maskCtx.translate(w,0);maskCtx.scale(-1,1);
    maskCtx.drawImage(data.cutout,(w-dw)/2,(h-dh)/2,dw,dh);
    maskCtx.restore();
    hasMask=true;
    lastCapture=performance.now();processedFrames++;
    if(!firstRenderedAt)firstRenderedAt=lastCapture;
    root.dataset.arMatte=data.engine;
    // A landmark tracking error must not turn off a working cutout.
    try{onFrame?.(data.source,width,height);}
    catch(error){console.warn('[DCD AR] Portrait tracking:',error);}
   }catch(error){next(String(error));}
   finally{data.source.close();data.cutout.close();}
  };
  current.postMessage({type:'init',mode});
 }
 async function submit(now,metadata){
  if(!live)return;
  if(fallback){drawFallback(now);return;}
  // Do not hide the last valid cutout merely because model processing is slow.
  // The live camera remains behind it until a newer matte is available.
  if(pending&&performance.now()-pending.started>20000){next('Frame processing timed out');return;}
  if(!ready||pending||video.readyState<2||!video.videoWidth)return;
  const time=metadata?.mediaTime??video.currentTime;
  if(time<=lastVideoTime)return;
  lastVideoTime=time;
  const current=worker;
  if(performance.now()-lastSubmitWall<800)return;
  lastSubmitWall=performance.now();
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
 function paintLive(){
  if(!live)return;
  renderFrame=requestAnimationFrame(paintLive);
  if(!hasMask||video.readyState<2||!video.videoWidth)return;
  const time=video.currentTime;
  if(time===lastCompositedTime)return;
  lastCompositedTime=time;
  const w=canvas.width,h=canvas.height;
  const vw=video.videoWidth,vh=video.videoHeight;
  const sc=Math.max(w/vw,h/vh),dw=vw*sc,dh=vh*sc;
  personCtx.clearRect(0,0,w,h);
  personCtx.save();personCtx.translate(w,0);personCtx.scale(-1,1);
  personCtx.drawImage(video,(w-dw)/2,(h-dh)/2,dw,dh);
  personCtx.restore();
  personCtx.globalCompositeOperation='destination-in';
  personCtx.drawImage(mask,0,0);
  personCtx.globalCompositeOperation='source-over';
  ctx.fillStyle='#e5edf6';ctx.fillRect(0,0,w,h);
  ctx.drawImage(person,0,0);
  if(!visible){visible=true;canvas.style.visibility='visible';canvas.style.opacity='1';}
 }
 function pump(now,metadata){
  if(!live)return;
  frameHandle=video.requestVideoFrameCallback(pump);
  submit(now,metadata);
 }
 hide();
 renderFrame=requestAnimationFrame(paintLive);
 next();
 if(live&&typeof video.requestVideoFrameCallback==='function')frameHandle=video.requestVideoFrameCallback(pump);
 else if(live)timer=setInterval(()=>submit(performance.now()),33);
 return {
  get visible(){return visible},
  get readyForExperience(){return visible&&hasMask&&processedFrames>=1&&video.readyState>=2},
  stop
 };
}
window.DCD_AR_MATTE={create};
})();
