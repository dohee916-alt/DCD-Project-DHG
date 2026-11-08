/* Present only recent cutouts, with the source frame for face/hand tracking. */
(() => {
'use strict';
const MAX_FRAME_AGE=125, MAX_VISIBLE_AGE=200;
const workerURL=new URL('ar-matte-worker.js?v=synced-portrait-2',document.currentScript.src);
function create(root,video,canvas,onFrame){
 if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined')return null;
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)return null;
 let worker,live=true,ready=false,visible=false,pending=null,frameHandle=0,timer=0,watchdog=0;
 let lastVideoTime=-1,lastCapture=0,misses=0,failures=0,firstFrame=true;
 const modes=navigator.maxTouchPoints>0?['small','mediapipe']:['large','small','mediapipe'];
 function hide(){
  visible=false;canvas.style.visibility='hidden';root.dataset.arMatte='camera';
 }
 function closeWorker(){
  clearTimeout(watchdog);watchdog=0;
  ready=false;pending=null;worker?.terminate();worker=null;
 }
 function stop(){
  live=false;closeWorker();clearInterval(timer);
  if(frameHandle)video.cancelVideoFrameCallback?.(frameHandle);
  hide();
 }
 function next(reason){
  if(reason)console.info('[DCD AR] Changing portrait engine:',reason);
  closeWorker();hide();misses=0;failures=0;firstFrame=true;
  const mode=modes.shift();
  if(!mode){stop();return;}
  let current;
  try{current=new Worker(workerURL)}catch(error){stop();return;}
  worker=current;
  watchdog=setTimeout(()=>next(mode+' initialization timeout'),18000);
  current.onerror=event=>next(event.message||'Worker error');
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
    if(age>MAX_FRAME_AGE){
     if(!warmingUp&&++misses>=3)next(data.engine+' frame age '+Math.round(age)+' ms');
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
    lastCapture=request.started;visible=true;
    canvas.style.visibility='visible';canvas.style.opacity='1';
    root.dataset.arMatte=data.engine;
    onFrame(data.source,width,height);
   }catch(error){next(String(error));}
   finally{data.source.close();data.cutout.close();}
  };
  current.postMessage({type:'init',mode});
 }
 async function submit(now,metadata){
  if(!live)return;
  if(visible&&now-lastCapture>MAX_VISIBLE_AGE)hide();
  if(pending&&now-pending.started>(firstFrame?3500:500)){next('Frame processing timed out');return;}
  if(!ready||pending||video.readyState<2||!video.videoWidth)return;
  const time=metadata?.mediaTime??video.currentTime;
  if(time<=lastVideoTime)return;
  lastVideoTime=time;
  const current=worker;
  const request={started:now};pending=request;
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
