/* DCD single-frame portrait matting worker.
   Longpipe's temporal person matting on WebGPU, with MediaPipe worker fallback.
   Input/output always represent the SAME video frame. Never queue frames. */
let processor=null,segmenter=null,engine='',alive=true,failed=0;
const postError=(message)=>self.postMessage({type:'error',message:String(message)});
async function init(){
 try{
  if(self.navigator?.gpu&&typeof OffscreenCanvas!=='undefined'){
   const {BackgroundRemover}=await import('https://cdn.jsdelivr.net/npm/@katana-video/web-bg-removal@0.1.1/+esm');
   processor=await BackgroundRemover.load('longpipe-large',{backend:'webgpu',temporal:true});
   engine='longpipe';
   self.postMessage({type:'ready',engine});return;
  }
 }catch(error){self.postMessage({type:'notice',message:'WebGPU Longpipe unavailable: '+String(error)})}
 try{
  const m=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm');
  const wasm=await m.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');
  const path='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';
  segmenter=await m.ImageSegmenter.createFromOptions(wasm,{baseOptions:{modelAssetPath:path,delegate:'CPU'},runningMode:'VIDEO',outputConfidenceMasks:true});
  engine='mediapipe-worker';self.postMessage({type:'ready',engine});
 }catch(e){postError('No supported worker matting engine: '+String(e))}
}
function fallbackMask(bitmap,time){
 const w=bitmap.width,h=bitmap.height;
 const result=segmenter.segmentForVideo(bitmap,time);
 try{
  const mask=result.confidenceMasks?.[1]||result.confidenceMasks?.[0];
  if(!mask)throw Error('No person confidence mask');
  const mw=mask.width,mh=mask.height,values=mask.getAsFloat32Array();
  const off=new OffscreenCanvas(w,h),c=off.getContext('2d',{alpha:true});
  const matte=new OffscreenCanvas(mw,mh),m=matte.getContext('2d',{willReadFrequently:true});
  const rgba=m.createImageData(mw,mh);
  for(let k=0;k<values.length;k++){
   const p=k*4,v=Math.max(0,Math.min(1,values[k]));
   const alpha=v*v*(3-2*v);
   rgba.data[p]=rgba.data[p+1]=rgba.data[p+2]=255;
   rgba.data[p+3]=Math.round(alpha*255);
  }
  m.putImageData(rgba,0,0);
  c.drawImage(bitmap,0,0,w,h);
  c.globalCompositeOperation='destination-in';
  c.imageSmoothingEnabled=true;
  c.drawImage(matte,0,0,w,h);
  return off.transferToImageBitmap();
 }finally{result.confidenceMasks?.forEach(x=>x.close?.())}
}
self.onmessage=async({data})=>{
 if(data?.type==='stop'){alive=false;processor?.reset?.();segmenter?.close?.();self.close();return}
 if(data?.type==='init'){await init();return}
 if(data?.type!=='frame'||!data.bitmap)return;
 const {bitmap,time,seq,sentAt}=data;
 if(!alive){bitmap.close();return}
 const start=performance.now();
 try{
  let cutout;
  if(engine==='longpipe'){
   // VideoFrame preserves temporal model state and exact capture timestamp.
   if(typeof VideoFrame!=='undefined'&&typeof processor.process==='function'){
    const vf=new VideoFrame(bitmap,{timestamp:Math.round(time*1000)});
    try{
     const out=await processor.process(vf);
     try{cutout=await createImageBitmap(out)}finally{out.close?.()}
    }finally{vf.close()}
   }else{cutout=await processor.removeBackground(bitmap)}
  }else if(engine==='mediapipe-worker'){cutout=fallbackMask(bitmap,time)}
  else throw Error('Matting engine not ready');
  failed=0;
  const latency=performance.now()-start;
  self.postMessage({type:'frame',seq,time,sentAt,latency,engine,bitmap:cutout},[cutout]);
 }catch(e){
  failed++;
  self.postMessage({type:'frame-error',seq,message:String(e),failed});
  if(engine==='longpipe'&&failed>=2){
   processor?.reset?.();processor=null;engine='';
   await initFallback();
  }
 }finally{bitmap.close()}
};
async function initFallback(){
 try{
  const m=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm');
  const wasm=await m.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');
  segmenter=await m.ImageSegmenter.createFromOptions(wasm,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite',delegate:'CPU'},runningMode:'VIDEO',outputConfidenceMasks:true});
  engine='mediapipe-worker';failed=0;self.postMessage({type:'ready',engine});
 }catch(e){postError(e)}
}