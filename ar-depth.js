/* Depth Anything V2 Small — local, on-device, RELATIVE inverse depth.
   It runs only while the AR overlay scenes require depth. No camera frames
   are uploaded; the model weights are fetched and cached by the browser.
   Depth is relative per frame, not a metric distance sensor.
   Gracefully declines if the model fails, with no impact on face tracking. */
(() => {
'use strict';
const CDN='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm';
const MODEL='onnx-community/depth-anything-v2-small';
function create(video,onDepth){
 let running=false,disposed=false,inference=false,pipe=null,loopTimer=0;
 let loading=null,failed=false,lastFrame=-1,first=true;
 const capture=document.createElement('canvas');
 capture.width=160;capture.height=346;
 const ctx=capture.getContext('2d',{alpha:false,willReadFrequently:true});
 async function init(){
  if(pipe||failed||disposed)return pipe;
  if(loading)return loading;
  loading=(async()=>{
   try{
    const {pipeline}=await import(CDN);
    // WebGPU on capable browsers; CPU/WASM q8 as a compatibility fallback.
    // Loading is deferred until the first overlay step; never on AR3.
    if(navigator.gpu){
     try{
      pipe=await pipeline('depth-estimation',MODEL,
        {device:'webgpu',dtype:'fp16'});
     }catch(e){console.info('[DCD AR depth] WebGPU fallback:',e);}
    }
    if(!pipe)pipe=await pipeline('depth-estimation',MODEL,
      {device:'wasm',dtype:'q8'});
    return pipe;
   }catch(err){
    failed=true;
    console.warn('[DCD AR depth] Model unavailable; no depth claims:',err);
    return null;
   }
  })();
  return loading;
 }
 function captureFrame(){
  if(!ctx||video.readyState<2||!video.videoWidth)return false;
  const w=capture.width,h=capture.height;
  const vw=video.videoWidth,vh=video.videoHeight;
  const scale=Math.max(w/vw,h/vh);
  const dw=vw*scale,dh=vh*scale;
  ctx.save();ctx.clearRect(0,0,w,h);
  // Mirrors the live matte's displayed camera coordinates.
  ctx.translate(w,0);ctx.scale(-1,1);
  ctx.drawImage(video,(w-dw)/2,(h-dh)/2,dw,dh);
  ctx.restore();
  return true;
 }
 async function frame(){
  if(!running||disposed||failed||inference||!video)return;
  if(!pipe||!captureFrame())return;
  if(video.currentTime===lastFrame)return;
  lastFrame=video.currentTime;
  inference=true;
  try{
   const result=await pipe(capture);
   const d=result?.depth;
   if(d&&d.data&&d.width&&d.height&&running&&!disposed){
    const channels=d.channels||1,depth=new Uint8Array(d.width*d.height);
    for(let i=0;i<depth.length;i++)depth[i]=d.data[i*channels];
    onDepth?.({data:depth,width:d.width,height:d.height,nearIsHigh:true,
      time:performance.now()});
   }
  }catch(e){
   console.warn('[DCD AR depth] Inference failed:',e);
   failed=true;
  }finally{inference=false;}
 }
 function schedule(){
  if(!running||disposed)return;
  loopTimer=setTimeout(async()=>{
   if(!running||disposed)return;
   await frame();
   schedule();
  },first?60:640);
  first=false;
 }
 function start(){
  if(disposed||running)return;
  running=true;first=true;
  init().then(p=>{if(running&&!disposed&&p)schedule();});
 }
 function stop(){running=false;clearTimeout(loopTimer);loopTimer=0;}
 function destroy(){
  stop();disposed=true;onDepth=null;
  // Nonblocking cleanup: do not wait on a GPU session during AR teardown.
  try{pipe?.dispose?.()}catch{}
  pipe=null;
 }
 return {start,stop,destroy,get ready(){return!!pipe&&!failed},get failed(){return failed}};
}
window.DCD_AR_DEPTH={create};
})();
