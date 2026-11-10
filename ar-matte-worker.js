/* Classic worker: MediaPipe 0.10.21 initializes WASM via importScripts. */
const KATANA='https://cdn.jsdelivr.net/npm/@katana-video/web-bg-removal@0.1.1/+esm';
const SDK='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
const SELFIE='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';
let processor,segmenter,engine,portrait,portraitCtx,matte,matteCtx,pixels,input,inputCtx;
async function init(mode){
 if(mode==='mediapipe'){
  const {ImageSegmenter,FilesetResolver}=await import(SDK+'/+esm');
  const vision=await FilesetResolver.forVisionTasks(SDK+'/wasm');
  segmenter=await ImageSegmenter.createFromOptions(vision,{
   baseOptions:{modelAssetPath:SELFIE,delegate:'CPU'},runningMode:'VIDEO',
   outputCategoryMask:false,outputConfidenceMasks:true
  });
  portrait=new OffscreenCanvas(1,1);portraitCtx=portrait.getContext('2d');
  matte=new OffscreenCanvas(1,1);matteCtx=matte.getContext('2d');
  input=new OffscreenCanvas(1,1);inputCtx=input.getContext('2d');
  engine='mediapipe-worker';
 }else{
  const {BackgroundRemover}=await import(KATANA);
  processor=await BackgroundRemover.load('longpipe-'+mode,{backend:'auto',temporal:true});
  engine='longpipe-'+mode+'-'+processor.backend;
 }
 postMessage({type:'ready',engine});
}
function segment(source,timestamp){
 const width=source.displayWidth||source.width,height=source.displayHeight||source.height;
 if(portrait.width!==width||portrait.height!==height){portrait.width=width;portrait.height=height;}
 // The SDK's ImageSource supports ImageBitmap/canvas. Use a reusable canvas
 // here because VideoFrame dimensions are exposed as displayWidth/Height.
 portraitCtx.globalCompositeOperation='copy';
 portraitCtx.drawImage(source,0,0,width,height);
 const scale=Math.min(1,512/Math.max(width,height));
 const iw=Math.max(1,Math.round(width*scale)),ih=Math.max(1,Math.round(height*scale));
 if(input.width!==iw||input.height!==ih){input.width=iw;input.height=ih;}
 inputCtx.globalCompositeOperation='copy';
 inputCtx.drawImage(source,0,0,iw,ih);
 segmenter.segmentForVideo(input,timestamp/1000,result=>{
  // The pinned SelfieSegmenter model metadata contains one label, "selfie".
  const mask=(result.confidenceMasks?.[1] ?? result.confidenceMasks?.[0]);
  if(!mask)throw Error('Missing foreground confidence mask');
  if(!pixels||matte.width!==mask.width||matte.height!==mask.height){
   matte.width=mask.width;matte.height=mask.height;
   pixels=matteCtx.createImageData(mask.width,mask.height);
  }
  const values=mask.getAsFloat32Array();
  for(let i=0;i<values.length;i++){
   const a=values[i];pixels.data[i*4+3]=Math.round(255*Math.max(0,Math.min(1,a)));
  }
  matteCtx.putImageData(pixels,0,0);
 });
 portraitCtx.globalCompositeOperation='destination-in';
 portraitCtx.drawImage(matte,0,0,width,height);
 return portrait.transferToImageBitmap();
}
async function processFrame(source,timestamp){
 let cutout,frame;
 try{
  if(!processor)cutout=segment(source,timestamp);
  else if(typeof VideoFrame==='function'){
   frame=source instanceof VideoFrame?source:new VideoFrame(source,{timestamp});
   cutout=await processor.process(frame);
  }else cutout=await processor.removeBackground(source);
  postMessage({type:'frame',source,cutout,engine},[source,cutout]);
  cutout=null;
 }catch(error){
  source.close();throw error;
 }finally{
  if(frame&&frame!==source)frame.close();
  cutout?.close();
 }
}
self.onmessage=async({data})=>{
 try{
  if(data.type==='init')await init(data.mode);
  else if(data.type==='frame')await processFrame(data.source,data.timestamp);
 }catch(error){postMessage({type:'error',message:String(error)});}
};
