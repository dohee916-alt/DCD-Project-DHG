/* DCD worker-owned portrait matting. One in-flight frame, no backlog.
   The alpha and pixels belong to the SAME captured frame. */
(()=>{'use strict';
function create(root,video,canvas,onFailure){
 if(!root||!video||!canvas||typeof Worker==='undefined'||typeof createImageBitmap!=='function')return null;
 let live=true,ready=false,busy=false,seq=0,shown=0,frameHandle=0,interval=0,lastSubmitted=0;
 let fallbackSent=false,lastOutputAt=0,slowFrames=0,errors=0,engine='';
 const initWatchdog=setTimeout(()=>{if(live&&!ready)fail('Matting engine initialization timed out')},22000);
 const ctx=canvas.getContext('2d',{alpha:false});
 let worker;
 const stop=()=>{
  if(!live)return;live=false;
  if(frameHandle&&typeof video.cancelVideoFrameCallback==='function')video.cancelVideoFrameCallback(frameHandle);
  if(interval)clearInterval(interval);
  clearTimeout(initWatchdog);
  try{worker?.postMessage({type:'stop'})}catch{}
  worker?.terminate();
 };
 const fail=(reason)=>{
  if(fallbackSent)return;
  fallbackSent=true;console.warn('[DCD AR] Worker matte fallback:',reason);
  stop();onFailure?.(reason);
 };
 try{worker=new Worker('ar-matte-worker.js?v=longpipe-worker-20261108-1',{type:'module'})}
 catch(e){return null}
 worker.onerror=e=>fail('Worker initialization failed: '+(e.message||e.type));
 const draw=(bitmap)=>{
  const w=canvas.width,h=canvas.height,vw=bitmap.width,vh=bitmap.height;
  const z=Math.max(w/vw,h/vh),dw=vw*z,dh=vh*z,dx=(w-dw)/2,dy=(h-dh)/2;
  // Paint matching captured RGB and alpha together, not an old alpha on
  // the live video. Thus a fast head movement cannot detach from its matte.
  ctx.save();ctx.fillStyle='#e5edf6';ctx.fillRect(0,0,w,h);
  ctx.translate(w,0);ctx.scale(-1,1);
  ctx.drawImage(bitmap,dx,dy,dw,dh);
  ctx.restore();
  canvas.style.opacity='1';
 };
 worker.onmessage=({data})=>{
  if(!live){data?.bitmap?.close?.();return}
  if(data.type==='ready'){ready=true;busy=false;engine=data.engine;errors=0;clearTimeout(initWatchdog);return}
  if(data.type==='notice'){console.info('[DCD AR] matte:',data.message);return}
  if(data.type==='error'){fail(data.message);return}
  if(data.type==='frame-error'){
   busy=false;errors++;if(errors>3)fail(data.message);return;
  }
  if(data.type==='frame'){
   busy=false;errors=0;
   const age=performance.now()-data.sentAt;
   if(data.seq>shown){
    shown=data.seq;
    if(age<420){
     draw(data.bitmap);lastOutputAt=performance.now();
    }
   }
   data.bitmap?.close?.();
   if(age>220)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
   if(slowFrames>=4)fail('Portrait matting latency too high ('+Math.round(age)+'ms)');
  }
 };
 const submit=async(now,meta)=>{
  if(!live||!ready||busy||video.readyState<2)return;
  if(now-lastSubmitted<45)return;
  lastSubmitted=now;busy=true;
  const id=++seq;
  try{
   const vw=video.videoWidth,vh=video.videoHeight;
   if(!vw||!vh){busy=false;return}
   const ratio=Math.min(1,768/Math.max(vw,vh));
   let bitmap;
   try{
    bitmap=await createImageBitmap(video,0,0,vw,vh,{
     resizeWidth:Math.max(1,Math.round(vw*ratio)),resizeHeight:Math.max(1,Math.round(vh*ratio)),resizeQuality:'high'
    });
   }catch{bitmap=await createImageBitmap(video)}
   if(!live){bitmap.close();return}
   const timestamp=meta?.mediaTime!==undefined?meta.mediaTime*1000:video.currentTime*1000;
   worker.postMessage({type:'frame',bitmap,seq:id,time:Math.max(0,timestamp),sentAt:performance.now()},[bitmap]);
  }catch(e){busy=false;errors++;if(errors>3)fail(e)}
 };
 const pump=(now,metadata)=>{
  if(!live)return;
  frameHandle=video.requestVideoFrameCallback(pump);
  submit(now,metadata);
 };
 worker.postMessage({type:'init'});
 if(typeof video.requestVideoFrameCallback==='function')frameHandle=video.requestVideoFrameCallback(pump);
 else interval=setInterval(()=>submit(performance.now(),null),45);
 return {get active(){return live},get ready(){return ready},get engine(){return engine},stop};
}
window.DCD_AR_MATTE={create};
})();