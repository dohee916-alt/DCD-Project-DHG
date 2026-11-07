/* DCD AR3–AR10 foundation. Provisional fabric visuals; final organza artwork/text
   remains user-authored. Camera processing stays entirely on the device. */
(() => {
'use strict';
const MODEL_ROOT='https://storage.googleapis.com/mediapipe-models/';
const SDK='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const frameNames=['AR3','AR4','AR5','AR5-1','AR5-2','AR6','AR7','AR8','AR9','AR10'];
const state={root:null,video:null,canvas:null,ctx:null,stage:null,frame:'AR3',
  maskCount:0,variant:'first',model:null,face:null,hand:null,hair:null,hairData:null,lastHairFrame:0,hairEnabled:false,hairSlowFrames:0,personMaskCache:null,faceAnchor:null,maskAnchor:null,maskMotionAt:0,lastSegmentationVideoTime:-1,lastFaceVideoTime:-1,lastHandVideoTime:-1,
  topology:null,pending:false,playing:false,requestId:0,lastInference:0,lastDrawn:0,lastFace:0,lastMask:0,lastHand:0,inferSlot:0,guideSince:0,
  pinchStart:null,pinchReady:true,handGuide:null,stepTimer:[],segmented:false,ready:false,tulle:null,sheets:[],faceBox:null,alphaHistory:null,matting:null};
const delay=(fn,ms)=>{const timer=setTimeout(()=>{state.stepTimer=state.stepTimer.filter(t=>t!==timer);fn();},ms);state.stepTimer.push(timer);return timer};
const stopTimers=()=>{state.stepTimer.forEach(clearTimeout);state.stepTimer=[]};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function markup(){
 return '<div class="ar-immersive" data-ar-frame="AR3">'+
 '<video class="ar-camera-video ar-portrait-camera" autoplay muted playsinline aria-label="Front camera"></video>'+
 '<canvas class="ar-person-segment" width="428" height="926" aria-hidden="true"></canvas>'+
 '<video class="ar-matting-video" autoplay muted playsinline aria-label="Camera with portrait background removed"></video>'+
 '<div class="ar-organza-stack" aria-hidden="true"></div>'+
 '<div class="ar-choice-gradient" aria-hidden="true"></div>'+
 '<div class="ar-choice-pack" aria-hidden="true"></div>'+
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
 state.root.querySelector('.ar-choice-pack').innerHTML='';
 state.root.classList.toggle('ar-final-mode',state.frame==='AR9'||state.frame==='AR10');
 state.root.classList.toggle('ar-moment',state.frame==='AR8');
 state.root.classList.toggle('ar-align-gesture',state.frame==='AR3');
 state.handGuide?.setFrame(state.frame);
 state.root.classList.toggle('ar-choice-phase',state.frame==='AR5-1');
 state.root.classList.toggle('ar-plain-choice',state.frame==='AR5');
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
   requestAnimationFrame(()=>requestAnimationFrame(()=>layer.classList.add('shown')));
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
   state.variant='first';state.maskCount=0;state.sheets.forEach(e=>e.layer.remove());
   state.sheets=[];state.tulle?.clear();
   // Each sheet takes 3s to travel: slow drifting approach, then sharp
   // near-face acceleration. Hold 1.6s to read the previous printed phrase.
   const firstAt=650,between=4600;
   for(let i=0;i<5;i++)delay(addFabric,firstAt+i*between);
   delay(()=>enter('AR5'),firstAt+4*between+3000+2000);break;
 case 'AR5':
   caption('DO YOU WANT TO\nCHANGE YOUR CHOICE?');
   buttons(()=>enter('AR5-1'),()=>enter('AR6'));break;
 case 'AR5-1':
   caption('DO YOU AGREE TO\nTEST IT ON YOU?');
   // The original Figma AR5-1 contains the full approved blister pack, not
   // merely the red gradient. Reuse the very same AR pack markup and dolls.
   const preview=state.root.querySelector('.ar-choice-pack');
   if(preview&&window.DCD_AR_PACK_PREVIEW){
     preview.innerHTML=window.DCD_AR_PACK_PREVIEW();
     window.DCD_RENDER_FIGURES?.();
   }
   buttons(()=>enter('AR6'),()=>enter('AR5-2'));break;
 case 'AR5-2':
   caption('YOU AGREED TO THESE');
   // Remove the original five fabrics with time to see them separate.
   for(let i=0;i<5;i++)delay(removeFabric,400+i*1450);
   delay(()=>{
     state.variant='replacement';
     for(let i=0;i<5;i++)delay(addFabric,650+i*4600);
     delay(()=>enter('AR6'),650+4*4600+3000+2000);
   },400+4*1450+1300);break;
 case 'AR6':caption('WATCH AND FOLLOW THE HAND MOVEMENT');break;
 case 'AR7':caption('NOW REACH TOWARD YOUR FACE\nAND PULL THE MASKS OFF');break;
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
 const hand=hands?.[0];
 if(!hand?.length){state.guideSince=0;state.pinchStart=null;state.pinchReady=true;return;}
 const display=p=>({x:1-p.x,y:p.y});
 const index=display(hand[8]),thumb=display(hand[4]),palm=display(hand[9]);
 const pick={x:(index.x+thumb.x)/2,y:(index.y+thumb.y)/2};
 const width=Math.max(.045,distance(hand[5],hand[17]));
 // Palm-size relative threshold works for frontal hands as well as rotated
 // hands, without requiring users to turn a pinching hand sideways.
 const pinch=distance(hand[4],hand[8])<Math.max(.045,width*.66);
 const box=state.faceBox||{l:.25,r:.75,t:.21,b:.77};
 const near=(p,pad=.055)=>p.x>box.l-pad&&p.x<box.r+pad&&p.y>box.t-pad&&p.y<box.b+pad;
 const onFace=near(pick)||near(index,.075);
 if(state.frame==='AR6'){
   // Advance after user imitates the pinch AND pull, not merely face proximity.
   if(!pinch){state.pinchStart=null;state.pinchReady=true;return;}
   if(!state.pinchReady)return;
   const span=Math.max(.06,distance(hand[0],hand[9]));
   if(!state.pinchStart){state.pinchStart={point:pick,span,near:now};return;}
   const start=state.pinchStart;
   if((distance(pick,start.point)>.105||span>start.span*1.27)&&now-start.near>140){
     state.pinchReady=false;state.pinchStart=null;
     state.handGuide?.hideOnce(400);
     enter('AR7');
   }
   return;
 }
 if(!pinch){state.pinchStart=null;state.pinchReady=true;return;}
 if(!state.pinchReady)return;
 const span=Math.max(.06,distance(hand[0],hand[9]));
 if(!state.pinchStart){
   if(onFace)state.pinchStart={point:pick,span,near:now};
   return;
 }
 const start=state.pinchStart;
 const awayFromFace=distance(pick,start.point)>.105;
 // Pulling towards the camera grows the hand's apparent palm size.
 const pullTowardCamera=span>start.span*1.27;
 if((awayFromFace||pullTowardCamera)&&now-start.near>140){
   state.pinchReady=false;state.pinchStart=null;
   removeFabric();
   state.handGuide?.hideOnce(900);
   if(state.maskCount===0)delay(()=>enter('AR8'),420);
 }
}
async function initModels(){
 if(state.pending||state.model)return;
 state.pending=true;
 try{
   const m=await import(SDK);
   // The 3D veil uses the actual 468-point MediaPipe triangle mesh
   // and the official ordered face-oval contour, not a procedural ellipse.
   state.topology={
     triangles:m.FaceLandmarker.FACE_LANDMARKS_TESSELATION,
     outline:m.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL
   };
   state.tulle?.setConnections(state.topology.triangles,state.topology.outline);
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
   if(!state.root)return;
   // Real 512px hair confidence model refines the coarse 256px selfie
   // outline. This runs only occasionally and adapts to device latency.
   // Failure or excessive latency always leaves the base portrait intact.
   if(state.model && state.root){
     try{
       state.hair=await load(m.ImageSegmenter,
         'image_segmenter/hair_segmenter/float32/1/hair_segmenter.tflite',
         {outputConfidenceMasks:true,outputCategoryMask:false});
       state.hairEnabled=!!state.hair;
     }catch(error){
       state.hair=null;state.hairEnabled=false;
       console.info('[DCD AR] Hair refinement unavailable, base cutout retained:',error);
     }
   }
 }catch(error){console.warn('[DCD AR] Vision model unavailable; raw camera remains:',error);}
 finally{state.pending=false;}
}
// Live camera compositor: never hold a processed/encoded video frame.
// The segmentation mask is cached at lower rate, while the most recent
// unmodified camera pixels are composited every animation frame.
function paintPerson(segment){
 const video=state.video;
 if(!video||!segment?.confidenceMasks?.length)return;
 const mask=segment.confidenceMasks[1]||segment.confidenceMasks[0];
 const data=mask.getAsFloat32Array(),w=mask.width,h=mask.height;
 if(!w||!h||!data?.length)return;
 state.personMaskCache={data:new Float32Array(data),w,h};
 state.maskAnchor=state.faceAnchor?{...state.faceAnchor}:null;
 state.maskMotionAt=performance.now();
 compositePortraitMask();
}
function compositePortraitMask(){
 const base=state.personMaskCache;if(!base)return;
 const hair=state.hairData;
 const freshHair=!!(state.hairEnabled&&hair&&hair.w&&hair.h&&performance.now()-state.lastHairFrame<1000);
 // Preserve all 512 hair pixels instead of downsampling the entire cutout
 // back to the 256px SelfieSegmenter mask.
 const w=freshHair?Math.max(base.w,hair.w):base.w;
 const h=freshHair?Math.max(base.h,hair.h):base.h;
 if(!state.maskCanvas||state.maskCanvas.width!==w||state.maskCanvas.height!==h){
   state.maskCanvas=document.createElement('canvas');state.maskCanvas.width=w;state.maskCanvas.height=h;
   state.maskContext=state.maskCanvas.getContext('2d',{willReadFrequently:true});
   state.maskPixels=state.maskContext.createImageData(w,h);
   state.alphaHistory=new Float32Array(w*h);
 }
 const pixels=state.maskPixels,history=state.alphaHistory;
 for(let y=0;y<h;y++){
  const by=Math.min(base.h-1,Math.floor((y+.5)*base.h/h));
  const hy=freshHair?Math.min(hair.h-1,Math.floor((y+.5)*hair.h/h)):0;
  for(let x=0;x<w;x++){
   const n=y*w+x,k=n*4,bx=Math.min(base.w-1,Math.floor((x+.5)*base.w/w));
   const b=Math.max(0,Math.min(1,base.data[by*base.w+bx]));
   let alpha=b*b*(3-2*b);
   if(freshHair){
     const hx=Math.min(hair.w-1,Math.floor((x+.5)*hair.w/w));
     const hv=Math.max(0,Math.min(1,hair.data[hy*hair.w+hx]));
     const fine=Math.max(0,Math.min(1,(hv-.15)/.8));
     alpha=Math.max(alpha,fine*fine*(3-2*fine));
   }
   // Avoid lagging ghost contours. Mask motion compensation is handled
   // by face tracking, rather than a strong temporal alpha average.
   const stable=history[n]=alpha*.94+history[n]*.06;
   pixels.data[k]=255;pixels.data[k+1]=255;pixels.data[k+2]=255;
   pixels.data[k+3]=Math.round(stable*255);
  }
 }
 state.maskContext.putImageData(pixels,0,0);
 state.lastMaskAt=performance.now();
}
function drawLivePortrait(){
 const canvas=state.canvas,video=state.video;
 if(!canvas||!video||video.readyState<2)return;
 const w=canvas.width,h=canvas.height,vw=video.videoWidth,vh=video.videoHeight;
 if(!vw||!vh)return;
 const scale=Math.max(w/vw,h/vh),dw=vw*scale,dh=vh*scale,dx=(w-dw)*.5,dy=(h-dh)*.5;
 if(!state.subjectCanvas){
   state.subjectCanvas=document.createElement('canvas');
   state.subjectCanvas.width=w;state.subjectCanvas.height=h;
   state.subjectContext=state.subjectCanvas.getContext('2d',{alpha:true});
 }
 const subject=state.subjectContext,ctx=state.ctx;
 subject.clearRect(0,0,w,h);
 subject.save();subject.translate(w,0);subject.scale(-1,1);
 subject.drawImage(video,dx,dy,dw,dh);
 subject.restore();
 // The last mask only determines alpha, NOT the age of camera pixels.
 if(state.maskCanvas){
   subject.save();
   subject.globalCompositeOperation='destination-in';
   subject.imageSmoothingEnabled=true;
   subject.imageSmoothingQuality='high';
   subject.filter='blur(.65px)';
   // Reproject the previous segmentation to current face tracking position.
   // Coordinates are unmirrored here; both camera/mask are mirrored together.
   const a=state.faceAnchor,b=state.maskAnchor;
   let driftX=0,driftY=0,driftScale=1;
   if(a&&b&&state.lastMaskAt&&performance.now()-state.lastMaskAt<800){
     driftX=Math.max(-dw*.12,Math.min(dw*.12,(a.x-b.x)*dw));
     driftY=Math.max(-dh*.12,Math.min(dh*.12,(a.y-b.y)*dh));
     driftScale=Math.max(.90,Math.min(1.10,a.width/b.width));
   }
   subject.translate(w,0);subject.scale(-1,1);
   const cx=dx+dw/2,cy=dy+dh/2;
   subject.translate(cx+driftX,cy+driftY);
   subject.scale(driftScale,driftScale);
   subject.translate(-cx,-cy);
   subject.drawImage(state.maskCanvas,dx,dy,dw,dh);
   subject.restore();
 }
 ctx.clearRect(0,0,w,h);
 ctx.fillStyle='#e5edf6';ctx.fillRect(0,0,w,h);
 ctx.drawImage(state.subjectCanvas,0,0);
 if(state.maskCanvas){
   canvas.style.opacity='1';state.segmented=true;
 }
}
function tick(now){
 if(!state.playing||!state.root)return;
 state.requestId=requestAnimationFrame(tick);
 const video=state.video;
 if(!video||video.readyState<2)return;
 if(now-(state.lastDrawn||0)>=32){
   state.lastDrawn=now;
   try{drawLivePortrait()}catch(e){if(!state.drawWarning){console.warn('[DCD AR] portrait draw:',e);state.drawWarning=true}}
 }
 // Use the actual video clock. Calling detectForVideo again for the SAME
 // frame wastes CPU/GPU time without improving the cutout.
 const frameTime=video.currentTime;
 if(now-(state.lastInference||0)<50)return;
 const maskDue=!!(state.model&&now-(state.lastMask||0)>=115&&frameTime!==state.lastSegmentationVideoTime);
 const faceDue=!!(state.face&&now-(state.lastFace||0)>=110&&frameTime!==state.lastFaceVideoTime);
 const handDue=!!(state.hand&&['AR6','AR7'].includes(state.frame)&&now-(state.lastHand||0)>=135&&frameTime!==state.lastHandVideoTime);
 const hairDue=!!(state.hairEnabled&&state.hair&&now-(state.lastHairFrame||0)>=1100);
 // Always give the live person matte first priority, instead of the old
 // round-robin that could postpone masks by 3+ processing intervals.
 try{
   if(maskDue){
     state.lastInference=now;state.lastMask=now;state.lastSegmentationVideoTime=frameTime;
     const result=state.model.segmentForVideo(video,now);
     paintPerson(result);
     result?.confidenceMasks?.forEach(mask=>mask.close?.());
     return;
   }
   if(faceDue){
     state.lastInference=now;state.lastFace=now;state.lastFaceVideoTime=frameTime;
     const landmarks=state.face.detectForVideo(video,now).faceLandmarks?.[0];
     if(landmarks?.length){
       // Landmark 1 follows the nose. Eyes provide rotation-insensitive
       // scale so prior mattes follow head movement between segmentations.
       const eyeL=landmarks[33],eyeR=landmarks[263],nose=landmarks[1];
       const width=Math.max(.03,Math.hypot(eyeL.x-eyeR.x,eyeL.y-eyeR.y));
       state.faceAnchor={x:nose.x,y:nose.y,width,at:now};
       state.tulle?.update(landmarks,video);
       const xs=landmarks.map(p=>1-p.x),ys=landmarks.map(p=>p.y);
       const candidate={l:Math.min(...xs),r:Math.max(...xs),t:Math.min(...ys),b:Math.max(...ys)};
       const previous=state.faceBox;
       state.faceBox=previous?{
         l:previous.l*.45+candidate.l*.55,r:previous.r*.45+candidate.r*.55,
         t:previous.t*.45+candidate.t*.55,b:previous.b*.45+candidate.b*.55
       }:candidate;
     }
     if(state.frame==='AR3')observeFace(landmarks,now);
     return;
   }
   if(handDue){
     state.lastInference=now;state.lastHand=now;state.lastHandVideoTime=frameTime;
     observeHands(state.hand.detectForVideo(video,now).landmarks,now);
     return;
   }
   // Expensive 512px hair refinement only when segmentation/face/hand are
   // not due. It is optional and automatically disabled on slow devices.
   if(hairDue&&!maskDue&&!faceDue&&!handDue){
     state.lastInference=now;state.lastHairFrame=now;
     const started=performance.now();
     try{
       const result=state.hair.segmentForVideo(video,now);
       const mask=result.confidenceMasks?.[1]||result.confidenceMasks?.[0];
       if(mask)state.hairData={data:new Float32Array(mask.getAsFloat32Array()),w:mask.width,h:mask.height};
       result.confidenceMasks?.forEach(m=>m.close?.());
       if(state.hairData)compositePortraitMask();
       if(performance.now()-started>100)state.hairSlowFrames++;
       else state.hairSlowFrames=Math.max(0,state.hairSlowFrames-1);
       if(state.hairSlowFrames>=2){state.hairEnabled=false;state.hairData=null;compositePortraitMask();}
     }catch(e){
       state.hairEnabled=false;state.hairData=null;console.warn('[DCD AR] hair model fallback',e);
     }
   }
 }catch(e){
   if(!state.analysisError){console.warn('[DCD AR] inference:',e);state.analysisError=true;}
 }
}
function mount(stage,video){
 const root=stage?.querySelector('.ar-immersive');
 if(!root)return;
 if(state.root===root){state.video=video||state.video;return;}
 stop();
 state.root=root;state.stage=stage;state.video=video||root.querySelector('video');
 state.canvas=root.querySelector('.ar-person-segment');state.ctx=state.canvas.getContext('2d');
 state.tulle=window.DCD_TULLE?.create(root.querySelector('.ar-organza-stack'))||null;
 state.handGuide=window.DCD_AR_HAND_GUIDE?.create(root)||null;
 if(state.topology)state.tulle?.setConnections(state.topology.triangles,state.topology.outline);
 state.sheets=[];state.variant='first';state.maskCount=0;state.segmented=false;state.analysisError=false;
 state.faceBox=null;state.faceAnchor=null;state.maskAnchor=null;state.alphaHistory=null;state.hairData=null;state.personMaskCache=null;state.hairSlowFrames=0;state.lastHairFrame=0;state.maskCanvas=null;state.maskContext=null;state.maskPixels=null;
 state.subjectCanvas=null;state.subjectContext=null;state.lastInference=0;state.lastDrawn=0;state.lastFace=0;state.lastMask=0;state.lastHand=0;state.inferSlot=0;
 enter('AR3');
}
function start(video){
 if(!state.root)return;
 if(video)state.video=video;
 if(state.playing)return;
 state.playing=true;
 state.requestId=requestAnimationFrame(tick);
 // MediaPipe stays available for face and hand geometry and as a segmentation
 // fallback. Longpipe is only the rendered high-quality portrait layer.
 // Avoid the delayed Longpipe video output, which freezes/warps faces.
 // Keep source video as the live clock; MediaPipe supplies alpha only.
 initModels();
}
function stop(){
 state.playing=false;cancelAnimationFrame(state.requestId);stopTimers();
 state.matting?.stop();state.matting=null;
 state.subjectCanvas=null;state.subjectContext=null;state.maskCanvas=null;
 state.faceAnchor=null;state.maskAnchor=null;state.hairData=null;state.personMaskCache=null;
 state.tulle?.destroy();state.tulle=null;state.sheets=[];
 state.handGuide?.destroy();state.handGuide=null;
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