/* DCD AR3–AR10 foundation. Provisional fabric visuals; final organza artwork/text
   remains user-authored. Camera processing stays entirely on the device. */
(() => {
'use strict';
const MODEL_ROOT='https://storage.googleapis.com/mediapipe-models/';
const SDK='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const frameNames=['AR3','AR4','AR5','AR5-1','AR5-2','AR6','AR7','AR8','AR9','AR10'];
const state={root:null,video:null,stage:null,frame:'AR3',maskCount:0,variant:'first',
 face:null,hand:null,playing:false,requestId:0,lastFace:0,lastHand:0,lastVideoTime:-1,
 guideSince:0,pinchStart:null,pinchReady:true,handGuide:null,stepTimer:[],
 tulle:null,sheets:[],faceBox:null,matte:null,session:0};
const delay=(fn,ms)=>{const timer=setTimeout(()=>{state.stepTimer=state.stepTimer.filter(t=>t!==timer);fn();},ms);state.stepTimer.push(timer);return timer};
const stopTimers=()=>{state.stepTimer.forEach(clearTimeout);state.stepTimer=[]};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function markup(){
 return '<div class="ar-immersive" data-ar-frame="AR3">'+
 '<video class="ar-camera-video ar-portrait-camera" autoplay muted playsinline aria-label="Front camera"></video>'+
 '<canvas class="ar-person-segment" width="428" height="926" aria-hidden="true"></canvas>'+
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
 // Facial alignment controls AR progression independently of
 // background processing; a slow GPU must never freeze the experience.
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
async function initModels(session){
 try{
   const m=await import(SDK);
   if(session!==state.session)return;
   state.tulle?.setConnections(m.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL);
   const vision=await m.FilesetResolver.forVisionTasks(WASM);
   if(session!==state.session)return;
   const load=async(key,Ctor,path,options)=>{
     const create=delegate=>Ctor.createFromOptions(vision,{
       baseOptions:{modelAssetPath:MODEL_ROOT+path,delegate},runningMode:'VIDEO',...options
     });
     try{
       const model=await create('GPU').catch(()=>create('CPU'));
       if(session===state.session)state[key]=model;else model.close();
     }catch(error){console.warn('[DCD AR] '+key+' tracker:',error);}
   };
   await load('face',m.FaceLandmarker,'face_landmarker/face_landmarker/float16/1/face_landmarker.task',{numFaces:1});
   if(session===state.session)await load('hand',m.HandLandmarker,'hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',{numHands:2});
 }catch(error){console.warn('[DCD AR] Vision models:',error);}
}
function handsDue(now){
 return state.hand&&(state.frame==='AR6'||state.frame==='AR7')&&now-state.lastHand>=70;
}
function track(frame,width,height,now=performance.now()){
 try{
   if(state.face&&now-state.lastFace>=42){
     state.lastFace=now;
     const points=state.face.detectForVideo(frame,now).faceLandmarks?.[0];
     state.tulle?.update(points,width,height);
     if(points?.length){
       let l=1,r=0,t=1,b=0;
       for(const p of points){const x=1-p.x;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,p.y);b=Math.max(b,p.y);}
       state.faceBox={l,r,t,b};
     }else{state.faceBox=null;state.guideSince=0;}
     observeFace(points,now);
   }
   if(handsDue(now)){
     state.lastHand=now;
     observeHands(state.hand.detectForVideo(frame,now).landmarks,now);
   }
 }catch(error){
   if(!state.analysisError){console.warn('[DCD AR] tracking:',error);state.analysisError=true;}
 }
}
function tick(){
 if(!state.playing)return;
 state.requestId=requestAnimationFrame(tick);
 const video=state.video;
 if(state.matte?.visible||video.readyState<2||video.currentTime===state.lastVideoTime)return;
 state.lastVideoTime=video.currentTime;
 track(video,video.videoWidth,video.videoHeight);
}
function mount(stage,video){
 const root=stage?.querySelector('.ar-immersive');
 if(!root)return;
 if(state.root===root){state.video=video||state.video;return;}
 stop();
 state.root=root;state.stage=stage;state.video=video||root.querySelector('video');
 state.tulle=window.DCD_TULLE?.create(root.querySelector('.ar-organza-stack'))||null;
 state.handGuide=window.DCD_AR_HAND_GUIDE?.create(root)||null;
 state.sheets=[];state.variant='first';state.maskCount=0;state.analysisError=false;
 state.faceBox=null;state.lastFace=0;state.lastHand=0;state.lastVideoTime=-1;
 enter('AR3');
}
function start(video){
 if(!state.root)return;
 if(video)state.video=video;
 if(state.playing)return;
 state.playing=true;
 const canvas=state.root.querySelector('.ar-person-segment');
 // The landmark API reads dimensions from HTML video/canvas and ImageBitmap,
 // so stage VideoFrame inputs on a reused canvas before tracking.
 const input=document.createElement('canvas'),ctx=input.getContext('2d',{alpha:false});
 state.matte=window.DCD_AR_MATTE?.create(state.root,state.video,canvas,(frame,w,h)=>{
   const now=performance.now();
   if(!(state.face&&now-state.lastFace>=42)&&!handsDue(now))return;
   const scale=Math.min(1,640/Math.max(w,h));
   const width=Math.round(w*scale),height=Math.round(h*scale);
   if(input.width!==width||input.height!==height){input.width=width;input.height=height;}
   ctx.drawImage(frame,0,0,width,height);
   track(input,w,h,now);
 })||null;
 state.requestId=requestAnimationFrame(tick);
 initModels(state.session);
}
function stop(){
 state.session++;
 state.playing=false;cancelAnimationFrame(state.requestId);stopTimers();
 state.matte?.stop();state.matte=null;
 state.face?.close();state.face=null;
 state.hand?.close();state.hand=null;
 state.tulle?.destroy();state.tulle=null;state.sheets=[];
 state.handGuide?.destroy();state.handGuide=null;
 state.root=null;state.stage=null;state.video=null;
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