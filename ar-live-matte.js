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
 let medium=null,mediumStarting=false;
 let mediumFrameTime=-1,mediumUpdatedAt=0,mediumRenderedAt=-1;
 let mediumFirstVisibleAt=0,mediumLastFreshAt=0;
 let contiguousMatteFrames=0,previousMatteDraw=0;
 const isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||
  (navigator.maxTouchPoints>1&&/Macintosh/i.test(navigator.userAgent));
 // The user requires large-quality hair matte; NEVER silently downshift
 // to small or MediaPipe. One retry handles transient GPU initialization.
 const modes=['large'];
 let activeEngine='initializing';
 // Official Longpipe SDK supports a real Medium preset which is absent
 // from the Katana wrapper. This stream-based backup never uses Small.
 async function startMedium(reason){
  if(!live||medium||mediumStarting)return;
  mediumStarting=true;closeWorker();
  root.dataset.arMatte='loading-longpipe-medium';
  console.warn('[DCD AR] Trying original Longpipe Medium:',reason);
  let pipeline=null,output=null;
  try{
   const stream=video.srcObject;
   if(!(stream instanceof MediaStream))throw Error('Camera MediaStream unavailable');
   const {EffectsPipeline}=await import('https://cdn.jsdelivr.net/npm/longpipe@0.0.14/+esm');
   if(!live)return;
   pipeline=new EffectsPipeline(stream,{
    background:{color:'#e5edf6'},preset:'medium',adaptive:false
   });
   output=document.createElement('video');
   output.className='ar-medium-live-video';
   output.autoplay=true;output.muted=true;output.playsInline=true;
   output.srcObject=pipeline.stream;
   // Keep the processed stream attached to the DOM. An off-DOM video
   // may be throttled on mobile browsers even while play() is resolved.
   root.appendChild(output);
   await Promise.all([pipeline.ready,output.play()]);
   if(!live)return;
   medium={pipeline,output};
   mediumFrameTime=-1;mediumUpdatedAt=0;mediumRenderedAt=-1;
   contiguousMatteFrames=0;previousMatteDraw=0;
   pipeline=null;output=null;
   root.dataset.arMatte='longpipe-medium-stream';
   console.info('[DCD AR] Actual portrait engine: longpipe-medium-stream');
  }catch(error){
   root.dataset.arMatte='longpipe-unavailable';
   console.error('[DCD AR] Medium stream failed; Small remains disabled:',error);
  }finally{
   if(pipeline)try{pipeline.destroy()}catch{}
   if(output){output.pause();output.srcObject=null;output.remove();}
   mediumStarting=false;
  }
 }
 function drawMedium(now){
  const output=medium?.output;
  if(!output||output.readyState<2||!output.videoWidth)return;
  // Display the native, continuously playing processed MediaStream.
  // Do not re-rasterize it into a low-resolution canvas or hide it
  // after a brief GPU scheduling delay.
  const time=output.currentTime;
  if(time!==mediumFrameTime){
   mediumFrameTime=time;mediumUpdatedAt=now;mediumLastFreshAt=now;
   if(previousMatteDraw&&now-previousMatteDraw<1600)contiguousMatteFrames++;
   else contiguousMatteFrames=1;
   previousMatteDraw=now;
   if(contiguousMatteFrames>=3){
    if(!mediumFirstVisibleAt)mediumFirstVisibleAt=now;
    output.classList.add('ar-medium-ready');
    canvas.style.visibility='hidden';
    visible=true;lastCapture=now;
    root.dataset.arMatte='longpipe-medium-live';
   }
  }else if(now-mediumUpdatedAt>3500){
   // A genuinely dead output is NOT a valid matte for progression.
   // Preserve the displayed image rather than flashing the background.
   root.dataset.arMatte='medium-stream-stalled';
   contiguousMatteFrames=0;mediumFirstVisibleAt=0;
  }
 }
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
  if(medium){
   medium.output.pause();medium.output.srcObject=null;medium.output.remove();
   try{medium.pipeline.destroy()}catch{}
   medium=null;
  }
  hide();
 }
 function next(reason){
  if(reason)console.info('[DCD AR] Changing portrait engine:',reason);
  closeWorker();misses=0;failures=0;firstFrame=true;validFrames=0;
  // Preserve the most recent valid image during model transitions.
  const mode=modes.shift();
  if(!mode||typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'){
   // A native Medium stream is preferable to dead-ending with raw camera.
   // This uses a different, officially supported SDK and preserves quality.
   startMedium(reason||'Large GPU worker unavailable');
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
    const rendered=performance.now();
    if(previousMatteDraw&&rendered-previousMatteDraw<1550)contiguousMatteFrames++;
    else contiguousMatteFrames=1;
    previousMatteDraw=rendered;
    lastCapture=rendered;visible=true;validFrames++;
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
  if(medium){drawMedium(now);return;}
  if(mediumStarting)return;
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
 // Never start the large GPU worker on mobile: it can starve camera frames.
 // Start the supported Medium stream directly, without any Small tier.
 if(isMobile)startMedium('Mobile stream quality preset');
 else next();
 // An independent watchdog prevents indefinite still-frame overlays even
 // if the source video stops firing requestVideoFrameCallback.
 timer=setInterval(()=>{
  if(!live)return;
  const now=performance.now();
  if(medium){drawMedium(now);return;}
  if(visible&&now-lastCapture>1200){
   canvas.style.visibility='hidden';visible=false;
   contiguousMatteFrames=0;previousMatteDraw=0;
   root.dataset.arMatte='frame-stalled';
  }
  if(typeof video.requestVideoFrameCallback!=='function')submit(now);
 },100);
 if(live&&typeof video.requestVideoFrameCallback==='function')
  frameHandle=video.requestVideoFrameCallback(pump);
 return {
  get visible(){return visible},
  // The output stream must be initialized and actually rendering;
  // do not interpret the raw input's camera frames as a valid matte.
  get readyForExperience(){
   if(medium)return live&&mediumFirstVisibleAt>0&&
    contiguousMatteFrames>=3&&performance.now()-mediumLastFreshAt<1600;
   return live&&visible&&contiguousMatteFrames>=3&&performance.now()-lastCapture<1600;
  },
  get engine(){return root.dataset.arMatte},
  stop
 };
}
window.DCD_AR_MATTE={create};
})();
