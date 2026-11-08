/* Present only recent cutouts, with the source frame for face/hand tracking. */
(() => {
'use strict';
const MAX_FRAME_AGE=1200, MAX_VISIBLE_AGE=3500;
const workerURL=new URL('ar-matte-worker.js?v=verified-longpipe-20261109-2',document.currentScript.src);
const SDK='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const SELFIE='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';
function create(root,video,canvas,onFrame){
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)return null;
 let worker,live=true,ready=false,visible=false,pending=null,frameHandle=0,timer=0,watchdog=0;
 let lastVideoTime=-1,lastCapture=0,misses=0,failures=0,firstFrame=true,validFrames=0;
 let fallback=null,fallbackStarting=false;
 // The user requires large-quality hair matte; NEVER silently downshift
 // to small or MediaPipe. One retry handles transient GPU initialization.
 const modes=['large','large'];
 let activeEngine='initializing';
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
  fallback?.segmenter.close();fallback=null;
  hide();
 }
 function next(reason){
  if(reason)console.info('[DCD AR] Changing portrait engine:',reason);
  closeWorker();misses=0;failures=0;firstFrame=true;validFrames=0;
  // Preserve the most recent valid image during model transitions.
  const mode=modes.shift();
  if(!mode||typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'){
   activeEngine='large-unavailable';
   root.dataset.arMatte='large-unavailable';
   console.error('[DCD AR] Longpipe Large unavailable; Small is disabled:',reason);
   return;
  }
  let current;
  try{current=new Worker(workerURL)}catch(error){
   console.error('[DCD AR] Large worker creation failed:',error);
   next(String(error));return;
  }
  worker=current;
  watchdog=setTimeout(()=>next(mode+' initialization timeout'),18000);
  current.onerror=event=>{if(worker===current)next(event.message||'Worker error');};
  current.onmessage=({data})=>{
   if(worker!==current||!live){
    data.source?.close();data.cutout?.close();return;
   }
   if(data.type==='ready'){
    clearTimeout(watchdog);watchdog=0;ready=true;
    activeEngine=data.engine;
    root.dataset.arMatte='loading-'+data.engine;
    console.info('[DCD AR] Actual portrait engine initialized:',data.engine);
    return;
   }
   if(data.type==='error'){next(data.message);return;}
   if(data.type!=='frame')return;
   const request=pending;pending=null;
   const warmingUp=firstFrame;firstFrame=false;
   try{
    const age=request?performance.now()-request.started:Infinity;
    // Do not throw away the very first processed frame on slower phones.
    if(!warmingUp&&validFrames>0&&age>MAX_FRAME_AGE){
     if(++misses>=6)next(data.engine+' frame age '+Math.round(age)+' ms');
     return;
    }
    misses=0;failures=0;
    const w=canvas.width,h=canvas.height;
    const width=data.cutout.displayWidth||data.cutout.width;
    const height=data.cutout.displayHeight||data.cutout.height;
    const scale=Math.max(w/width,h/height),dw=width*scale,dh=height*scale;
    ctx.fillStyle='#e5edf6';ctx.fillRect(0,0,w,h);
    ctx.save();ctx.translate(w,0);ctx.scale(-1,1);
    ctx.drawImage(data.cutout,(w-dw)/2,(h-dh)/2,dw,dh);
    ctx.restore();
    lastCapture=performance.now();visible=true;validFrames++;
    canvas.style.visibility='visible';canvas.style.opacity='1';
    root.dataset.arMatte=data.engine;
    if(validFrames===1)console.info('[DCD AR] First displayed portrait frame:',data.engine);
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
  if(visible&&performance.now()-lastCapture>MAX_VISIBLE_AGE&&ready){next('Portrait frame stalled');return;}
  if(pending&&performance.now()-pending.started>(firstFrame?9000:5500)){next('Frame processing timed out');return;}
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
 return {
  get visible(){return visible},
  get engine(){return root.dataset.arMatte},
  stop
 };
}
window.DCD_AR_MATTE={create};
})();
