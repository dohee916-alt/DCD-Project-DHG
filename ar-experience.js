/* DCD AR3–AR10 foundation. Provisional fabric visuals; final organza artwork/text
   remains user-authored. Camera processing stays entirely on the device. */
(() => {
'use strict';
const MODEL_ROOT='https://storage.googleapis.com/mediapipe-models/';
const SDK='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const frameNames=['AR3','AR4','AR5','AR5-1','AR5-2','AR6','AR7','AR8','AR9','AR10'];
const state={root:null,video:null,canvas:null,ctx:null,stage:null,frame:'AR3',
  maskCount:0,variant:'first',model:null,face:null,hand:null,
  pending:false,playing:false,requestId:0,lastAnalyzed:0,guideSince:0,
  pinchStart:null,pinchReady:true,stepTimer:[],segmented:false,ready:false,tulle:null,sheets:[]};
const delay=(fn,ms)=>{const timer=setTimeout(()=>{state.stepTimer=state.stepTimer.filter(t=>t!==timer);fn();},ms);state.stepTimer.push(timer);return timer};
const stopTimers=()=>{state.stepTimer.forEach(clearTimeout);state.stepTimer=[]};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function markup(){
 return '<div class="ar-immersive" data-ar-frame="AR3">'+
 '<video class="ar-camera-video ar-portrait-camera" autoplay muted playsinline aria-label="Front camera"></video>'+
 '<canvas class="ar-person-segment" width="320" height="692" aria-hidden="true"></canvas>'+
 '<div class="ar-organza-stack" aria-hidden="true"></div>'+
 '<div class="ar-final-color" aria-hidden="true"></div>'+
 '<div class="ar-flash" aria-hidden="true"></div>'+
 '<div class="ar-copy" aria-live="polite"></div>'+
 '<div class="ar-face-guide" aria-hidden="true"></div>'+
 '<div class="ar-gesture-guide" aria-hidden="true"></div>'+
 '<div class="ar-flow-choices"></div></div>';
}
function clearScene(){
 if(!state.root)return;
 state.root.querySelector('.ar-copy').textContent='';
 state.root.querySelector('.ar-flow-choices').innerHTML='';
 state.root.classList.toggle('ar-final-mode',state.frame==='AR9'||state.frame==='AR10');
 state.root.classList.toggle('ar-moment',state.frame==='AR8');
 state.root.classList.toggle('ar-first-gesture',state.frame==='AR6');
 state.root.classList.toggle('ar-peel-gesture',state.frame==='AR7');
 state.root.classList.toggle('ar-align-gesture',state.frame==='AR3');
}
function caption(value){const e=state.root?.querySelector('.ar-copy');if(e)e.textContent=value;}
function typeCaption(value,duration=1200){
 const element=state.root?.querySelector('.ar-copy');if(!element)return;
 const letters=[...value];let i=0;const period=duration/Math.max(1,letters.length);
 function write(){if(!state.root||!frameNames.includes(state.frame))return;element.textContent=letters.slice(0,++i).join('');if(i<letters.length)delay(write,period);}
 write();
}
const ORGANZA_TEXT={
 first:["THAT’S CHEATING.","YOU DIDN’T EARN THAT BODY.","IS THAT EVEN THE REAL YOU?","DID YOU REALLY NEED MEDICATION?","YOU’LL JUST GAIN IT ALL BACK."],
 replacement:["WHY DON’T YOU JUST TAKE GLP-1?","WHAT’S YOUR EXCUSE NOW?","EVERYONE ELSE IS LOSING WEIGHT.","DON’T YOU CARE ABOUT YOUR HEALTH?","YOU’RE NOT EVEN TRYING."]
};
function fabric(){
 const root=state.root?.querySelector('.ar-organza-stack');if(!root)return;
 while(state.sheets.length<state.maskCount){
   const i=state.sheets.length,layer=document.createElement('div');
   layer.className='ar-organza-sheet';
   layer.style.setProperty('--sheet',i);
   layer.dataset.variant=state.variant;
   const copy=document.createElement('span');
   copy.className='ar-organza-printed-copy';
   copy.textContent=ORGANZA_TEXT[state.variant][i];
   layer.appendChild(copy);root.appendChild(layer);
   const surface=state.tulle?.add(state.variant,i)||null;
   state.sheets.push({layer,surface});
   requestAnimationFrame(()=>layer.classList.add('shown'));
 }
}
function addFabric(){
 if(!state.root||state.maskCount>=5)return;
 state.maskCount++;fabric();
}
function removeFabric(){
 if(state.maskCount===0)return;
 state.maskCount--;
 const sheet=state.sheets.pop();
 if(!sheet)return;
 sheet.layer.classList.add('peeling');
 state.tulle?.remove(sheet.surface);
 delay(()=>sheet.layer.remove(),720);
}
function buttons(yes,no){
 const area=state.root?.querySelector('.ar-flow-choices');if(!area)return;
 area.innerHTML='<button type="button" data-ar-choice="yes" class="ar-choice yes">YES</button>'+
 '<button type="button" data-ar-choice="no" class="ar-choice no">NO</button>';
 area.querySelector('[data-ar-choice=yes]').addEventListener('click',e=>{e.stopPropagation();yes();});
 area.querySelector('[data-ar-choice=no]').addEventListener('click',e=>{e.stopPropagation();no();});
}
function enter(frame){
 if(!state.root||!frameNames.includes(frame))return;
 stopTimers();state.frame=frame;state.guideSince=0;state.pinchStart=null;state.pinchReady=true;
 state.root.dataset.arFrame=frame;clearScene();
 switch(frame){
 case 'AR3':caption('POSITION YOUR FACE HERE');break;
 case 'AR4':
   caption('YOU AGREED TO THESE');
   state.variant='first';state.maskCount=0;state.sheets.forEach(e=>e.layer.remove());state.sheets=[];
   for(let i=1;i<=5;i++)delay(addFabric,i*680);
   delay(()=>enter('AR5'),5*680+1000);break;
 case 'AR5':
   caption('DO YOU WANT TO\nCHANGE YOUR CHOICE?');
   buttons(()=>enter('AR5-1'),()=>enter('AR6'));break;
 case 'AR5-1':
   caption('DO YOU AGREE TO\nTEST IT ON YOU?');
   buttons(()=>enter('AR6'),()=>enter('AR5-2'));break;
 case 'AR5-2':
   caption('YOU AGREED TO THESE');
   for(let i=0;i<5;i++)delay(removeFabric,500+i*490);
   delay(()=>{
     state.variant='replacement';for(let i=1;i<=5;i++)delay(addFabric,i*680);
     delay(()=>enter('AR6'),5*680+950);
   },5*490+520);break;
 case 'AR6':caption('REACH YOUR HANDS TOWARD YOUR FACE\n(NOT THE CAMERA!)');break;
 case 'AR7':caption('PINCH AND PULL THE MASKS OFF');break;
 case 'AR8':
   caption('FINALLY!');
   delay(()=>enter('AR9'),1800);break;
 case 'AR9':
   typeCaption('GLP-1 IS JUST\nONE MORE OPTION',1400);
   delay(()=>enter('AR10'),3400);break;
 case 'AR10':typeCaption('NOT\nA REASON TO\nPRESCRIBE\nOTHERS',1500);break;
 }
}
function observeFace(points,now){
 if(state.frame!=='AR3'||!points?.length)return;
 const xs=points.map(p=>1-p.x),ys=points.map(p=>p.y);
 const x=(Math.min(...xs)+Math.max(...xs))/2,y=(Math.min(...ys)+Math.max(...ys))/2;
 const width=Math.max(...xs)-Math.min(...xs);
 const aligned=x>.28&&x<.72&&y>.30&&y<.68&&width>.18;
 if(!aligned){state.guideSince=0;return;}
 if(!state.guideSince)state.guideSince=now;
 if(now-state.guideSince>1350)enter('AR4');
}
function observeHands(hands,now){
 if(!['AR6','AR7'].includes(state.frame))return;
 const one=hands?.[0];if(!one?.length){state.guideSince=0;state.pinchStart=null;state.pinchReady=true;return;}
 const palm={x:1-one[9].x,y:one[9].y};
 const onFace=palm.x>.23&&palm.x<.77&&palm.y>.26&&palm.y<.70;
 const thumb=one[4],index=one[8],wrist=one[0],knuckle=one[5];
 const pinch=distance(thumb,index)<distance(wrist,knuckle)*.48;
 if(state.frame==='AR6'){
   if(!onFace){state.guideSince=0;return;}
   if(!state.guideSince)state.guideSince=now;
   if(now-state.guideSince>650)enter('AR7');
   return;
 }
 if(!pinch){state.pinchStart=null;state.pinchReady=true;return;}
 if(!state.pinchReady)return;
 if(!state.pinchStart){if(onFace)state.pinchStart={...palm};return;}
 if(distance(palm,state.pinchStart)>.16){
   state.pinchReady=false;state.pinchStart=null;
   removeFabric();
   if(state.maskCount===0)delay(()=>enter('AR8'),420);
 }
}
async function initModels(){
 if(state.pending||state.model)return;
 state.pending=true;
 try{
   const m=await import(SDK);
   const vision=await m.FilesetResolver.forVisionTasks(WASM);
   if(!state.root)return;
   const load=async(Ctor,path,extra={})=>{
     try{return await Ctor.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL_ROOT+path,delegate:'GPU'},runningMode:'VIDEO',...extra});}
     catch{return await Ctor.createFromOptions(vision,{baseOptions:{modelAssetPath:MODEL_ROOT+path,delegate:'CPU'},runningMode:'VIDEO',...extra});}
   };
   // Segmentation, facial geometry and hand tracking must be independent.
   // A network/GPU failure in one model must not block the other two.
   try{state.model=await load(m.ImageSegmenter,'image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite',{outputConfidenceMasks:true,outputCategoryMask:false});}
   catch(error){console.warn('[DCD AR] Segmentation model:',error);}
   if(!state.root)return;
   try{state.face=await load(m.FaceLandmarker,'face_landmarker/face_landmarker/float16/1/face_landmarker.task',{numFaces:1});}
   catch(error){console.warn('[DCD AR] Face tracker:',error);}
   if(!state.root)return;
   try{state.hand=await load(m.HandLandmarker,'hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',{numHands:2});}
   catch(error){console.warn('[DCD AR] Hand tracker:',error);}
 }catch(error){console.warn('[DCD AR] Vision model unavailable; raw camera remains:',error);}
 finally{state.pending=false;}
}
function paintPerson(segment){
 const canvas=state.canvas,video=state.video;
 if(!canvas||!video||!segment?.confidenceMasks?.length)return;
 const mask=segment.confidenceMasks[segment.confidenceMasks.length-1];
 const values=mask.getAsFloat32Array();
 const w=mask.width,h=mask.height;
 if(!w||!h||!values?.length)return;
 if(!state.maskCanvas||state.maskCanvas.width!==w||state.maskCanvas.height!==h){
   state.maskCanvas=document.createElement('canvas');state.maskCanvas.width=w;state.maskCanvas.height=h;
 }
 const maskContext=state.maskCanvas.getContext('2d',{willReadFrequently:true});
 const pixels=maskContext.createImageData(w,h);
 for(let i=0;i<w*h;i++){
   pixels.data[i*4]=255;pixels.data[i*4+1]=255;pixels.data[i*4+2]=255;
   pixels.data[i*4+3]=Math.round(Math.max(0,Math.min(1,values[i]))*255);
 }
 maskContext.putImageData(pixels,0,0);
 const ctx=state.ctx,W=canvas.width,H=canvas.height;
 const vw=video.videoWidth,vh=video.videoHeight;
 const factor=Math.max(W/vw,H/vh),drawW=vw*factor,drawH=vh*factor;
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#e5edf6';ctx.fillRect(0,0,W,H);
 // Render the segmented subject into a separate transparent surface,
 // then composite it over the pale-blue background. Do not paint the
 // unmasked camera into this canvas first (it would leak the real room).

 if(!state.subjectCanvas){state.subjectCanvas=document.createElement('canvas');state.subjectCanvas.width=W;state.subjectCanvas.height=H;}
 const sc=state.subjectCanvas.getContext('2d');
 sc.clearRect(0,0,W,H);sc.save();sc.translate(W,0);sc.scale(-1,1);
 sc.drawImage(video,(W-drawW)/2,(H-drawH)/2,drawW,drawH);
 sc.globalCompositeOperation='destination-in';
 sc.drawImage(state.maskCanvas,(W-drawW)/2,(H-drawH)/2,drawW,drawH);
 sc.restore();sc.globalCompositeOperation='source-over';
 ctx.globalCompositeOperation='source-over';
 ctx.drawImage(state.subjectCanvas,0,0);
 canvas.style.opacity='1';state.segmented=true;
}
function tick(now){
 if(!state.playing||!state.root)return;
 state.requestId=requestAnimationFrame(tick);
 const video=state.video;if(!video||video.readyState<2||now-state.lastAnalyzed<95)return;
 state.lastAnalyzed=now;
 try{
   if(state.model){const result=state.model.segmentForVideo(video,now);paintPerson(result);result?.confidenceMasks?.forEach(m=>m.close?.());}
   if(state.face&&['AR3','AR4','AR5','AR5-1','AR5-2','AR6','AR7'].includes(state.frame)){
     const points=state.face.detectForVideo(video,now).faceLandmarks?.[0];
     if(points?.length)state.tulle?.update(points,video);
     if(state.frame==='AR3')observeFace(points,now);
   }
   if(state.hand&&['AR6','AR7'].includes(state.frame)){observeHands(state.hand.detectForVideo(video,now).landmarks,now);}
 }catch(error){if(!state.analysisError){console.warn('[DCD AR] Camera inference:',error);state.analysisError=true;}}
}
function mount(stage,video){
 const root=stage?.querySelector('.ar-immersive');
 if(!root)return;
 if(state.root===root){state.video=video||state.video;return;}
 stop();
 state.root=root;state.stage=stage;state.video=video||root.querySelector('video');
 state.canvas=root.querySelector('.ar-person-segment');state.ctx=state.canvas.getContext('2d');
 state.tulle=window.DCD_TULLE?.create(root.querySelector('.ar-organza-stack'))||null;
 state.sheets=[];state.variant='first';state.maskCount=0;state.segmented=false;state.analysisError=false;
 enter('AR3');
}
function start(video){
 if(!state.root)return;
 if(video)state.video=video;
 if(state.playing)return;
 state.playing=true;state.requestId=requestAnimationFrame(tick);initModels();
}
function stop(){
 state.playing=false;cancelAnimationFrame(state.requestId);stopTimers();
 state.tulle?.destroy();state.tulle=null;state.sheets=[];
 state.root=null;state.stage=null;state.video=null;state.canvas=null;state.ctx=null;
}
window.DCD_AR_FLOW={markup,mount,start,stop,frame:()=>state.frame,debugNext:()=>{
 const pos=frameNames.indexOf(state.frame);
 if(state.frame==='AR4'){for(let i=state.maskCount;i<5;i++)addFabric();enter('AR5');}
 else if(state.frame==='AR5'){enter('AR5-1');}
 else if(state.frame==='AR5-1'){enter('AR6');}
 else if(state.frame==='AR6'){enter('AR7');}
 else if(state.frame==='AR7'){removeFabric();if(!state.maskCount)enter('AR8');}
 else enter(frameNames[Math.min(frameNames.length-1,pos+1)]);
}};
})();