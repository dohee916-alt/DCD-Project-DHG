/* DCD AR3–AR10 foundation. Provisional fabric visuals; final organza artwork/text
   remains user-authored. Camera processing stays entirely on the device. */
(() => {
'use strict';
const MODEL_ROOT='https://storage.googleapis.com/mediapipe-models/';
const SDK='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const frameNames=['AR3','AR3-1','AR4','AR5','AR5-1','AR5-2','AR6','AR7','AR8','AR9','AR10'];
const state={root:null,video:null,stage:null,frame:'AR3',maskCount:0,variant:'first',
 face:null,hand:null,playing:false,requestId:0,lastFace:0,lastHand:0,lastVideoTime:-1,
 guideSince:0,pinchStart:null,pinchReady:true,portraitPending:false,manualPeels:0,autoPeeling:false,handGuide:null,stepTimer:[],
 tulle:null,sheets:[],faceBox:null,matte:null,whisperAudio:null,session:0,
 modelState:'idle',faceSeen:false,analysisError:false};
const delay=(fn,ms)=>{const timer=setTimeout(()=>{state.stepTimer=state.stepTimer.filter(t=>t!==timer);fn();},ms);state.stepTimer.push(timer);return timer};
const stopTimers=()=>{state.stepTimer.forEach(clearTimeout);state.stepTimer=[]};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const FIGMA_AR_GROUP_SVG="<svg class=\"ar-group3-figma\" width=\"428\" height=\"912\" viewBox=\"0 0 428 912\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g style=\"mix-blend-mode:color\"><rect x=\"-16.0001\" y=\"985\" width=\"1100\" height=\"459\" transform=\"rotate(-90 -16.0001 985)\" fill=\"#D83A00\" style=\"fill:#D83A00;fill:color(display-p3 0.8461 0.2256 0.0000);fill-opacity:1;mix-blend-mode:hard-light\"/></g>\n<rect x=\"476\" y=\"942\" width=\"510\" height=\"1010\" transform=\"rotate(-180 476 942)\" fill=\"url(#paint0_linear_861_298)\" style=\"mix-blend-mode:multiply\"/>\n<rect x=\"469\" y=\"944\" width=\"510\" height=\"1010\" transform=\"rotate(-180 469 944)\" fill=\"url(#paint1_linear_861_298)\" style=\"mix-blend-mode:multiply\"/>\n\n<path d=\"M476 1032L-34.0001 1032L-34 -90L476 -90L476 1032Z\" fill=\"url(#paint3_linear_861_298)\" style=\"mix-blend-mode:lighten\"/>\n<defs>\n<linearGradient id=\"paint0_linear_861_298\" x1=\"866.251\" y1=\"1044.36\" x2=\"484.613\" y2=\"1817.82\" gradientUnits=\"userSpaceOnUse\">\n<stop stop-color=\"white\" style=\"stop-color:white;stop-opacity:1;\"/>\n<stop offset=\"0.293269\" stop-color=\"white\" stop-opacity=\"0\" style=\"stop-color:none;stop-opacity:0;\"/>\n<stop offset=\"0.995192\" stop-color=\"#E9A67C\" style=\"stop-color:#E9A67C;stop-color:color(display-p3 0.9134616 0.6507682 0.4874723);stop-opacity:1;\"/>\n</linearGradient>\n<linearGradient id=\"paint1_linear_861_298\" x1=\"859.251\" y1=\"1046.36\" x2=\"445.833\" y2=\"1084.81\" gradientUnits=\"userSpaceOnUse\">\n<stop stop-color=\"white\" style=\"stop-color:white;stop-opacity:1;\"/>\n<stop offset=\"0.293269\" stop-color=\"white\" stop-opacity=\"0\" style=\"stop-color:none;stop-opacity:0;\"/>\n<stop offset=\"0.995192\" stop-color=\"#E59B73\" style=\"stop-color:#E59B73;stop-color:color(display-p3 0.8990384 0.6068510 0.4495192);stop-opacity:1;\"/>\n</linearGradient>\n<linearGradient id=\"paint2_linear_861_298\" x1=\"852.251\" y1=\"1052.36\" x2=\"399.619\" y2=\"1080.51\" gradientUnits=\"userSpaceOnUse\">\n<stop stop-color=\"white\" style=\"stop-color:white;stop-opacity:1;\"/>\n<stop offset=\"0.293269\" stop-color=\"white\" stop-opacity=\"0\" style=\"stop-color:none;stop-opacity:0;\"/>\n<stop offset=\"0.995192\" stop-color=\"#9E4F00\" style=\"stop-color:#9E4F00;stop-color:color(display-p3 0.6196 0.3098 0.0000);stop-opacity:1;\"/>\n</linearGradient>\n<linearGradient id=\"paint3_linear_861_298\" x1=\"85.7484\" y1=\"839.639\" x2=\"467.387\" y2=\"66.1786\" gradientUnits=\"userSpaceOnUse\">\n<stop stop-color=\"white\" stop-opacity=\"0.8\" style=\"stop-color:white;stop-opacity:0.8;\"/>\n<stop offset=\"0.293269\" stop-color=\"white\" stop-opacity=\"0\" style=\"stop-color:none;stop-opacity:0;\"/>\n<stop offset=\"0.995192\" stop-color=\"#9E2A00\" stop-opacity=\"0\" style=\"stop-color:none;stop-opacity:0;\"/>\n</linearGradient>\n</defs>\n</svg>\n";
function markup(){
 return '<div class="ar-immersive" data-ar-frame="AR3">'+
 '<video class="ar-camera-video ar-portrait-camera" autoplay muted playsinline aria-label="Front camera"></video>'+
 '<canvas class="ar-person-segment" width="428" height="926" aria-hidden="true"></canvas>'+

 '<div class="ar-organza-stack" aria-hidden="true"></div>'+
 '<div class="ar-choice-gradient" aria-hidden="true"></div>'+FIGMA_AR_GROUP_SVG+
 '<div class="ar-choice-pack" aria-hidden="true"></div>'+
 '<div class="ar-final-color" aria-hidden="true"></div>'+
 '<div class="ar-flash" aria-hidden="true"></div>'+
 '<div class="ar-copy" aria-live="polite"></div>'+ 
 '<div class="ar-stigma-message" aria-live="polite"><div class="ar-stigma-heading">THEY SAY</div><div class="ar-stigma-typed"></div></div>'+
  '<button type="button" class="ar-ending-hit" aria-label="Return to the beginning" hidden></button>'+
 '<svg class="ar-face-guide" aria-hidden="true" width="289" height="375" viewBox="0 0 289 375" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="144.5" cy="187.5" rx="142" ry="185" stroke="#D83A00" stroke-width="5" stroke-linecap="round" stroke-dasharray="0.5 30"/></svg>'+
 '<div class="ar-gesture-guide" aria-hidden="true"></div>'+
 '<div class="ar-flow-choices"></div></div>';
}
// Approved Freesound Ben_0815 Murmur (CC0), bundled as an actual Ogg/Opus
// file encoded as UTF-8 base64 so GitHub Pages serves it without an external
// redirect or an unavailable Freesound download endpoint.
const WHISPER_B64='assets/audio/murmur-ben0815-clip.opus.b64';
let whisperContext=null,whisperGain=null,whisperBuffer=null,whisperNode=null;
let whisperLoading=null,whisperWanted=false;
const WHISPER_MAX=.44,WHISPER_MIN=.006;
let whisperTarget=0;
function whisperLevel(target,fade=.4){
 whisperTarget=Math.max(0,Math.min(WHISPER_MAX,target));
 if(!whisperGain||!whisperContext)return;
 const now=whisperContext.currentTime;
 const automation=whisperGain.gain;
 // A deterministic ramp reaches the target within the peel interval.
 // setTargetAtTime approached its value asymptotically, leaving audible
 // crowd sound between peels until the last hard stop.
 automation.cancelScheduledValues(now);
 automation.setValueAtTime(automation.value,now);
 automation.linearRampToValueAtTime(whisperTarget,now+Math.max(.08,fade));
}
function whisperForLayers(lastHandPeel=false){
 const n=Math.max(0,Math.min(5,state.maskCount));
 // Deliberately audible attenuation on every single layer removal.
 // The volume steps are 100%, 53%, 27%, 12%, 4%, then 0%.
 const layerLevels=[0,.018,.053,.118,.234,WHISPER_MAX];
 const level=lastHandPeel&&n===0?0:layerLevels[n];
 whisperLevel(level,n===0?.65:.48);
 if(state.root){
  state.root.dataset.whisperLayers=String(n);
  state.root.dataset.whisperVolume=level.toFixed(3);
 }
}
function primeWhisper(){
 // This is called synchronously from the user's pack-click gesture.
 // An unlocked AudioContext can play a decoded buffer later in the AR flow.
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextClass)return;
 try{
  whisperContext ||=new AudioContextClass();
  state.whisperPrimed=true;
  whisperContext.resume()?.catch?.(error=>console.warn('[DCD AR] Audio permission:',error));
  if(!whisperGain){whisperGain=whisperContext.createGain();whisperGain.gain.value=whisperTarget;whisperGain.connect(whisperContext.destination);}
  if(!whisperLoading){
   whisperLoading=fetch(WHISPER_B64).then(response=>{
     if(!response.ok)throw new Error('Murmur audio HTTP '+response.status);
     return response.text();
   }).then(encoded=>{
     const raw=atob(encoded.trim()),bytes=new Uint8Array(raw.length);
     for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
     // iOS Safari cannot reliably decode Ogg/Opus natively. Keep a
     // pristine copy for the WASM fallback; decodeAudioData may detach its input.
     return whisperContext.decodeAudioData(bytes.buffer.slice(0)).catch(async nativeError=>{
       console.info('[DCD AR] Native Opus decoder unavailable, loading browser decoder:',nativeError);
       const decoder=await import('https://cdn.jsdelivr.net/npm/audio-decode@3.12.0/+esm');
       return decoder.default(bytes.buffer.slice(0));
     });
   }).then(buffer=>{
     whisperBuffer=buffer;
     if(whisperWanted)playWhisperBuffer();
   }).catch(error=>{whisperLoading=null;console.warn('[DCD AR] Murmur decode:',error);});
  }
 }catch(error){console.warn('[DCD AR] Murmur setup:',error);}
}
function playWhisperBuffer(){
 if(!whisperBuffer||!whisperContext||!whisperWanted||whisperNode)return;
 whisperContext.resume()?.catch?.(()=>{});
 const node=whisperContext.createBufferSource();
 node.buffer=whisperBuffer;node.loop=true;
 node.connect(whisperGain);node.start();
 whisperNode=node;
 node.onended=()=>{if(whisperNode===node)whisperNode=null;};
}
function startWhisper(){
 whisperWanted=true;
 if(!whisperContext)primeWhisper();
 // The whispered crowd is prominent before stigma appears.
 if(whisperGain&&whisperContext)whisperLevel(WHISPER_MAX,.3);
 playWhisperBuffer();
}
function stopWhisper(force=false){
 if(!force&&state.whisperPrimed&&state.frame==='AR3')return;
 whisperWanted=false;
 if(whisperNode){try{whisperNode.stop();}catch{}whisperNode.disconnect();whisperNode=null;}
 state.whisperPrimed=false;
  whisperTarget=0;
  if(whisperGain&&whisperContext)whisperGain.gain.setValueAtTime(0,whisperContext.currentTime);
}
// Same frame-local absolute-box model as app.js text()/box().
 // One immutable Figma rectangle per page and per independent text layer.
 const AR_TEXT_RECTS={
   'AR3':{copy:[68,89,292,44]},
   'AR3-1':{copy:[33,64,362,32]},
   'AR4':{heading:[61,64,306,32],typed:[61,109,306,46]},
   'AR5':{copy:[61,64,306,64]},
   'AR5-1':{copy:[61,92,306,64]},
   'AR5-2':{heading:[61,64,306,32],typed:[61,109,306,46]},
   'AR6':{copy:[50,89,342,44]},
   'AR7':{copy:[50,89,342,44]},
   'AR8':{},
   'AR9':{copy:[61,430,306,64]},
   'AR10':{copy:[0,0,428,926],not:[61,388,306,70],rest:[61,454,306,96]}
 };
 function placeText(node,rect){
   if(!node||!rect)return;
   const [x,y,w,h]=rect;
   Object.assign(node.style,{position:'absolute',left:x+'px',top:y+'px',width:w+'px',height:h+'px',right:'auto',bottom:'auto',margin:'0',padding:'0',transform:'none',translate:'none'});
 }
 function layoutText(){
   const root=state.root,rects=AR_TEXT_RECTS[state.frame];
   if(!root||!rects)return;
   const copy=root.querySelector('.ar-copy'),message=root.querySelector('.ar-stigma-message');
   copy.removeAttribute('style');
   message.removeAttribute('style');
   message.querySelectorAll('div').forEach(node=>node.removeAttribute('style'));
   placeText(copy,rects.copy);
   // Heading and typed text are independent children within a full-frame
   // transparent overlay, not sequential flow boxes with inherited offsets.
   placeText(message,[0,0,428,926]);
   placeText(message.querySelector('.ar-stigma-heading'),rects.heading);
   placeText(message.querySelector('.ar-stigma-typed'),rects.typed);
 }
 function clearScene(){
 if(!state.root)return;
 state.root.querySelector('.ar-copy').textContent='';
 const stigma=state.root.querySelector('.ar-stigma-typed');if(stigma)stigma.textContent='';
 const heading=state.root.querySelector('.ar-stigma-heading');if(heading)heading.textContent='';
 state.root.querySelector('.ar-flow-choices').innerHTML='';
 state.root.querySelector('.ar-choice-pack').innerHTML='';
  const endingHit=state.root.querySelector('.ar-ending-hit');if(endingHit)endingHit.hidden=true;
 state.endingReady=false;
 state.root.classList.toggle('ar-final-mode',state.frame==='AR9'||state.frame==='AR10');
 state.root.classList.toggle('ar-moment',state.frame==='AR8');
 state.root.classList.toggle('ar-align-gesture',state.frame==='AR3');
 // Blink only guidance authored in Doto, not consent or ending copy.
 state.root.classList.toggle('ar-doto-blink',['AR3','AR6','AR7'].includes(state.frame));
 state.handGuide?.setFrame(state.frame);
 state.root.classList.toggle('ar-choice-phase',state.frame==='AR5-1');
 state.root.classList.toggle('ar-plain-choice',state.frame==='AR5');
}
function restartEnding(){
 if(!state.root||state.frame!=='AR10'||!state.endingReady||state.endingRestarting)return;
 state.endingRestarting=true;
 window.DCD_RESTART_WEB?.();
}
function endingAudioEnded(){
 if(!state.root||!['AR9','AR10'].includes(state.frame))return;
 state.endingMusicEnded=true;
 maybeRestartEnding();
}
function maybeRestartEnding(){
 if(!state.root||state.frame!=='AR10'||!state.endingReady||!state.endingMusicEnded||state.endingRestarting)return;
 const elapsed=performance.now()-state.endingReadyAt;
 if(elapsed>=1500)restartEnding();
 else delay(maybeRestartEnding,Math.ceil(1500-elapsed));
}
function typeEndingPrompt(text,onComplete){
 const root=state.root,copy=root?.querySelector('.ar-copy');
 if(!copy||state.frame!=='AR10')return;
 copy.replaceChildren();
 const prompt=document.createElement('span');
 prompt.className='ar-ending-prompt';
 const letters=[...text];
 copy.appendChild(prompt);
 placeText(prompt,[61,444,306,64]);
 const session=state.session;let i=0;
 function write(){
  if(state.root!==root||state.session!==session||state.frame!=='AR10')return;
  prompt.textContent=letters.slice(0,++i).join('');
  if(i<letters.length){delay(write,32);return;}
  onComplete?.();
 }
 write();
}
function showEndingExit(){
 typeEndingPrompt('THEN TAP\nTO EXIT',()=>{
  state.endingReady=true;state.endingReadyAt=performance.now();
  const hit=state.root?.querySelector('.ar-ending-hit');if(hit)hit.hidden=false;
  maybeRestartEnding();
 });
}
function showEndingQuestion(){
 typeEndingPrompt('READY TO SEE\nBODIES DIFFERENTLY?',()=>delay(showEndingExit,2200));
}
function caption(value){const e=state.root?.querySelector('.ar-copy');if(e)e.textContent=value;}
function typeCaption(value,duration=1200,onComplete=null){
 const element=state.root?.querySelector('.ar-copy');if(!element)return;
 const letters=[...value];let i=0;const period=duration/Math.max(1,letters.length);
 const frame=state.frame,session=state.session;
 let finalNot=null,finalRest=null;
 if(frame==='AR10'){
   element.innerHTML='<span class="ar-final-not"></span><span class="ar-final-rest"></span>';
   finalNot=element.querySelector('.ar-final-not');finalRest=element.querySelector('.ar-final-rest');
   placeText(finalNot,AR_TEXT_RECTS.AR10.not);placeText(finalRest,AR_TEXT_RECTS.AR10.rest);
 }
 function write(){
  if(!state.root||state.frame!==frame||state.session!==session)return;
  const chars=letters.slice(0,++i).join('');
  if(state.frame==='AR10'){
   // Figma AR10 uses a separate 64px NOT and 26px supporting statement.
   const top=chars.slice(0,3);
   const lower=chars.length>4?chars.slice(4):'';
   if(finalNot.textContent!==top)finalNot.textContent=top;
   if(finalRest.textContent!==lower)finalRest.textContent=lower;
  }else element.textContent=chars;
  if(i<letters.length)delay(write,period);
   else onComplete?.();
 }
 write();
}
const ORGANZA_TEXT={
 first:["THAT’S CHEATING.","YOU DIDN’T EARN THAT BODY.","IS THAT EVEN THE REAL YOU?","DID YOU REALLY NEED MEDICATION?","YOU’LL JUST GAIN IT ALL BACK."],
 replacement:["WHY DON’T YOU JUST TAKE GLP-1?","WHAT’S YOUR EXCUSE NOW?","EVERYONE IS LOSING WEIGHT EXCEPT YOU.","DON’T YOU CARE ABOUT YOUR HEALTH?","YOU’RE NOT EVEN TRYING."]
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
   const design=window.DCD_TULLE?.layout(state.variant,i);
   copy.textContent=design?.text||ORGANZA_TEXT[state.variant][i];
   if(design){
     // The static fallback uses the SAME Figma authoring coordinates and
     // Turret Road type as the camera-tracked cloth. No legacy centered text.
     const sheetX=428*.09,sheetY=926*.19,sheetW=428*.82,sheetH=926*.65;
     copy.style.setProperty('left',((design.x-sheetX)/sheetW*100)+'%','important');
     copy.style.setProperty('top',((design.y-sheetY)/sheetH*100)+'%','important');
     copy.style.setProperty('width',(design.w/sheetW*100)+'%','important');
     copy.style.setProperty('right','auto','important');
     copy.style.setProperty('font-family','"Turret Road",sans-serif','important');
     copy.style.setProperty('font-size','18px','important');
     copy.style.setProperty('line-height','20px','important');
     copy.style.setProperty('font-weight','700','important');
     copy.style.setProperty('text-align','left','important');
     copy.style.setProperty('white-space','pre-line','important');
     copy.style.setProperty('transform','rotate('+design.r+'deg)','important');
     copy.style.setProperty('transform-origin','top left','important');
   }
   // The stigma is now typed in the fixed header, never embroidered on the cloth.
   root.appendChild(layer);
   const surface=state.tulle?.add(state.variant,i)||null;
   state.sheets.push({layer,surface});
   requestAnimationFrame(()=>requestAnimationFrame(()=>layer.classList.add('shown')));
 }
}
function addFabric(){
 if(!state.root||state.maskCount>=5)return;
 state.maskCount++;
 // First stigma sequence retains the original background volume.
 // Layer-driven volume changes are reserved for the later sequence.
 if(state.frame==='AR5-2')whisperForLayers();
 window.DCD_SCENE_AUDIO?.play?.('mask-arrive');
 fabric();
}
function typeStigmaTimed(node,text,ms,onComplete){
 if(!node)return;
 node.textContent='';
 const letters=[...text],session=state.session,frame=state.frame;
 const started=performance.now();
 function next(){
   if(!state.root||state.session!==session||state.frame!==frame)return;
   const count=Math.min(letters.length,1+Math.floor((performance.now()-started)/ms));
   node.textContent=letters.slice(0,count).join('');
   if(count<letters.length)delay(next,ms);
   else onComplete?.();
 }
 next();
}
function typeStigmaHeading(text,onComplete){
 typeStigmaTimed(state.root?.querySelector('.ar-stigma-heading'),text,42,onComplete);
}
function typeStigma(text,onComplete){
 const typed=state.root?.querySelector('.ar-stigma-typed');
 if(!typed)return;
 const wide=text==='WHY DON’T YOU JUST TAKE GLP-1?';
 const rect=AR_TEXT_RECTS[state.frame]?.typed;
 if(rect)placeText(typed,wide?[24,rect[1],380,rect[3]]:rect);
 // Keep the typed copy and the three visual echoes in the same Figma box.
 // Each echo mirrors only the characters already revealed by the typewriter.
 typed.replaceChildren();
 const main=document.createElement('span');
 main.className='ar-whisper-main';
 const echoes=['left','right','far'].map(direction=>{
   const span=document.createElement('span');
   span.className='ar-whisper-echo '+direction;
   span.setAttribute('aria-hidden','true');
   typed.appendChild(span);
   return span;
 });
 typed.appendChild(main);
 const words=text.split(/\n/);
 // Limit tracking on long copy so the original wrapping and alignment survive.
 const longest=Math.max(...words.map(line=>[...line].length));
 const tracking=Math.min(1.8,Math.max(.45,18/Math.max(1,longest)));
 typed.style.setProperty('--whisper-tracking',tracking+'px');
 const letters=[...text],session=state.session,frame=state.frame,started=performance.now();
 function next(){
   if(!state.root||state.session!==session||state.frame!==frame||!main.isConnected)return;
   const count=Math.min(letters.length,1+Math.floor((performance.now()-started)/24));
   const current=letters.slice(0,count).join('');
   main.textContent=current;
   echoes.forEach(span=>{span.textContent=current;});
   if(count<letters.length)delay(next,24);
   else onComplete?.();
 }
 next();
}
function showStigmaSequence(variant,done){
 const words=ORGANZA_TEXT[variant];
 let index=0;
 function next(){
   if(index>=words.length){delay(done,2000);return;}
   window.DCD_STIGMA_VOICES?.play?.(variant,index);
   typeStigma(words[index],()=>{
     // Launch the sheet and its arrival sound immediately on the final typed character.
     if(!state.root||state.variant!==variant)return;
     addFabric();
     // Preserve the existing interval after launch for the sheet to settle.
     delay(()=>{index++;next();},3300);
   });
 }
 next();
}
function removeFabric(){
 if(state.maskCount===0)return;
 state.maskCount--;
  whisperForLayers(state.frame==='AR7');
  const sheet=state.sheets.pop();
 if(!sheet)return;
 window.DCD_SCENE_AUDIO?.play?.('mask-peel');
 sheet.layer.classList.add('peeling');
 state.tulle?.remove(sheet.surface);
 delay(()=>sheet.layer.remove(),720);
}
// First three masks are removed by hand; the last two peel one at a time.
function completeHandPeel(){
  if(state.frame!=='AR7'||state.autoPeeling||state.maskCount===0)return;
  // One held pinch cannot be counted more than once on tracker dropouts.
  const now=performance.now();
  if(now-(state.lastPeelAt||0)<1250)return;
  state.lastPeelAt=now;
  state.manualPeels++;
  state.pinchReady=false;
  state.pinchStart=null;
  if(state.manualPeels<=2){
    removeFabric();
    if(state.manualPeels===1)state.handGuide?.hideOnce(0);
  }else{
    state.autoPeeling=true;
    caption('');
    state.root?.classList.remove('ar-doto-blink');
    // Gesture three starts THREE separate automatic peel animations.
    // No fourth gesture is needed and the first two gestures remove one each.
    for(let i=0;i<3;i++)delay(()=>{
      if(state.frame==='AR7'&&state.maskCount>0)removeFabric();
    },i*1350);
    delay(()=>{
      if(state.frame==='AR7'&&state.maskCount===0)enter('AR8');
    },2*1350+1250);
  }
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
 stopTimers();
 // Whispering is one continuous ambience from AR3-1 through all five first
 // stigma labels and cloth arrivals. Do not restart at every new frame.
 if(['AR8','AR9','AR10'].includes(frame))stopWhisper(true);
 if(['AR5','AR5-1','AR5-2','AR6','AR7','AR8','AR9','AR10'].includes(frame))
   window.DCD_STIGMA_VOICES?.stop?.();
 state.frame=frame;state.guideSince=0;state.pinchStart=null;state.pinchReady=true;
 if(frame==='AR9'){state.endingMusicEnded=false;state.endingRestarting=false;}
 if(frame==='AR10')state.endingRestarting=false;
 state.root.dataset.arFrame=frame;clearScene();layoutText();
 window.DCD_SCENE_AUDIO?.scene?.(frame);
 switch(frame){
 case 'AR3':state.portraitPending=false;caption('POSITION YOUR FACE HERE');break;
 case 'AR3-1':
   // The cutout is already visibly ready before this transition.
   caption("What's with all the whispering?");
    startWhisper();
    delay(()=>{if(state.frame==='AR3-1')caption('Why are they staring at you?');},2600);
    delay(()=>{if(state.frame==='AR3-1')enter('AR4');},5500);
   break;
 case 'AR4':
   // Only after face recognition: start expensive cutout/fabric and hand model.
   startArVisuals();
   if(!state.hand)loadHandWhenNeeded(state.session);
   caption('');
   state.variant='first';state.maskCount=0;whisperLevel(WHISPER_MAX,.3);state.sheets.forEach(e=>e.layer.remove());
   state.sheets=[];state.tulle?.clear();
   // Wait for a fresh cutout before starting the mask sequence.
   function readyForStigmas(){
     if(state.frame!=='AR4')return;
     const status=state.root.__dcdMatteStatus;
     const fresh=!!state.faceBox&&performance.now()-state.faceBoxSeenAt<1000;
     if(fresh){
       typeStigmaHeading('THEY SAY',()=>{
         if(state.frame==='AR4')showStigmaSequence('first',()=>{if(state.frame==='AR4')enter('AR5');});
       });
     }else delay(readyForStigmas,180);
   }
   delay(readyForStigmas,500);break;
 case 'AR5':
   caption('WOULD YOU CHOOSE\nDIFFERENTLY NOW?');
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
   // Figma AR5-1 (636:672) has a single centered NO button.
   // The prior YES choice remains in AR5 and is not repeated here.
   const choiceArea=state.root.querySelector('.ar-flow-choices');
   choiceArea.innerHTML='<button type="button" data-ar-choice="no" class="ar-choice no">NO</button>';
   choiceArea.querySelector('[data-ar-choice=no]').addEventListener('click',e=>{e.stopPropagation();enter('AR5-2');});
   break;
 case 'AR5-2':
   caption('');
   // Keep both headings hidden until the old five sheets have fully exited.
   for(let i=0;i<5;i++)delay(()=>{
     if(state.frame==='AR5-2')removeFabric();
   },400+i*1350);
   delay(()=>{
     if(state.frame!=='AR5-2'||state.maskCount!==0)return;
     state.variant='replacement';
      whisperLevel(WHISPER_MIN,.25);
      typeStigmaHeading('NOW THEY SAY',()=>{
       if(state.frame==='AR5-2')
         showStigmaSequence('replacement',()=>{if(state.frame==='AR5-2')enter('AR6');});
     });
   },8950);break;
 case 'AR6':
     whisperForLayers();
     state.manualPeels=0;state.autoPeeling=false;state.lastPeelAt=0;
    caption('REACH YOUR HANDS TOWARD YOUR FACE\n(NOT THE CAMERA!)');break;
 case 'AR7':caption('PINCH AND PULL THE MASKS OFF');break;
 case 'AR8':
    window.DCD_SCENE_AUDIO?.play?.('mask-all-cleared');
    stopWhisper(true);
    // Explicitly clear the removed transition label, including when
   // returning from a previous scene in an existing browser session.
   caption('');
   delay(()=>enter('AR9'),1800);break;
 case 'AR9':
   typeCaption('GLP-1 IS JUST\nONE MORE OPTION',1400);
   delay(()=>enter('AR10'),3400);break;
 case 'AR10':
    typeCaption('NOT\nA REASON TO\nPRESCRIBE\nOTHERS',1500,()=>{
      delay(showEndingQuestion,2000);
    });
    break;
 }
}
// AR3 keeps only the approved POSITION YOUR FACE HERE prompt.
// Camera / model diagnostics are sent to the console, never to invented UI.
function cameraError(error){console.warn('[DCD AR] Camera:',error);}
function faceDisplayRect(points){
 // FaceLandmarker coordinates are relative to the SOURCE camera frame.
 // The mirrored <video> is object-fit:cover in a 428×926 portrait viewport;
 // crop/scale the landmarks in the same way before matching the oval.
 const video=state.video;
 const vw=video?.videoWidth||428,vh=video?.videoHeight||926;
 const scale=Math.max(428/vw,926/vh);
 const left=(428-vw*scale)/2,top=(926-vh*scale)/2;
 let l=Infinity,r=-Infinity,t=Infinity,b=-Infinity;
 for(const p of points){
   const x=(left+(1-p.x)*vw*scale)/428;
   const y=(top+p.y*vh*scale)/926;
   l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
 }
 return {x:(l+r)/2,y:(t+b)/2,w:r-l,h:b-t};
}
function observeFace(points,now){
 if(state.frame!=='AR3'||!points?.length)return;
 // Prepare the high-quality portrait worker on FIRST face detection rather
 // than waiting for the 650ms alignment dwell; keep raw video live meanwhile.
 if(!state.matte)ensurePortraitMatte();
 const face=faceDisplayRect(points);
 // The real, mirrored face must be centered within the existing AR3 guide.
 // Require stable alignment, not merely a face anywhere in the camera.
 const centered=face.x>.18&&face.x<.82&&face.y>.19&&face.y<.81;
 const appropriateSize=face.w>.12&&face.w<1.10&&face.h>.14&&face.h<.94;
 if(!centered||!appropriateSize){state.guideSince=0;return;}
 if(!state.guideSince)state.guideSince=now;
 // The visible camera is not a segmented cutout. A stable live face is
 // sufficient to advance; the independent matte supplies scalp data only.
 if(now-state.guideSince>=350&&!state.portraitPending){
   state.portraitPending=true;
   ensurePortraitMatte();
   enter('AR3-1');
 }
}
// The physical palm plane is built from the wrist and four MCP joints.
// Its normal is deliberately oriented AWAY from the camera (positive z).
// The flexed fingertips must lie behind that plane for a dorsal pinch;
// this geometric check does not depend on a possibly mirrored Left/Right label.
function handPlaneEvidence(h,aspect=1){
 if(!h||h.length<21)return null;
 const p=i=>[h[i].x,h[i].y*aspect,h[i].z];
 const sub=(a,b)=>a.map((x,k)=>x-b[k]);
 const dot=(a,b)=>a.reduce((n,x,k)=>n+x*b[k],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const wrist=p(0),index=p(5),pinky=p(17),middle=p(9),ring=p(13);
 const n1=cross(sub(index,wrist),sub(pinky,wrist));
 const n2=cross(sub(index,middle),sub(pinky,middle));
 // First triangle spans the palm; the second refines it only if compatible.
 const n=n1.map((x,i)=>x+(dot(n1,n2)>0?n2[i]:-n2[i])*.25);
 const len=Math.hypot(...n),width=Math.hypot(...sub(index,pinky));
 if(!Number.isFinite(len)||len<1e-8||width<1e-5)return null;
 const unit=n.map(x=>x/len*(n[2]<0?-1:1));
 const center=wrist.map((x,i)=>(x+index[i]+middle[i]+ring[i]+pinky[i])/5);
 const depth=i=>dot(sub(p(i),center),unit)/width;
 const thumb=depth(4),finger=depth(8),curl=[12,16,20].map(depth);
 return {facing:unit[2],thumb,finger,mean:(thumb+finger)/2,curl, pinch:Math.hypot(...sub(p(4),p(8)))/width};
}
function handBackFacing(h,world,aspect){
 const image=handPlaneEvidence(h,aspect),metric=handPlaneEvidence(world,1);
 const e=metric||image;if(!e)return null;
 // Near-edge-on hands are ambiguous. A pinch on the visible palm lies
 // toward the lens (negative depth); it must never arm the peel.
 const valid=e.facing>.38&&e.mean>.025&&Math.min(e.thumb,e.finger)>-.055
   &&e.pinch<.62&&(!image||image.mean>-.055);
 return {valid,score:e.mean,facing:e.facing,pinch:e.pinch,imageDepth:image?.mean,
   worldDepth:metric?.mean};
}
function observeHands(result,now){
 const hands=result?.landmarks||[],labels=result?.handedness||result?.handednesses||[],worlds=result?.worldLandmarks||[];
 const aspect=(state.video?.videoHeight||1)/(state.video?.videoWidth||1);
  if(!['AR6','AR7'].includes(state.frame)||state.autoPeeling)return;
  const box=state.faceBox;
  if(!box)return; // Never substitute an inferred face center.
  const faceWidth=Math.max(.16,box.r-box.l),faceHeight=Math.max(.17,box.b-box.t);
  const near=(p,padX=.10,padY=.09)=>p.x>box.l-padX&&p.x<box.r+padX
    &&p.y>box.t-padY&&p.y<box.b+padY;
  const display=p=>({x:1-p.x,y:p.y});
  const choices=hands.map((h,i)=>({h,label:labels[i]?.[0],world:worlds[i]})).filter(({h})=>h?.length>=21).map(({h,label,world})=>{
    const index=display(h[8]),thumb=display(h[4]);
    const pick={x:(index.x+thumb.x)*.5,y:(index.y+thumb.y)*.5};
    const palmWidth=Math.max(.035,distance(h[5],h[17]));
    const tipGap=distance(h[4],h[8]);
    const pinchLimit=Math.max(.073,palmWidth*.88);
    const palmSpan=Math.max(.04,distance(h[0],h[9]));
    return {pick,tipGap,pinch:tipGap<pinchLimit,
      holding:!!state.pinchStart&&tipGap<pinchLimit*1.25,
      palmSpan,onFace:near(pick)||near(index,.11,.10),h,back:handBackFacing(h,world,aspect),side:label?.categoryName||label?.displayName};
  });
  if(!choices.length){
    // A brief occlusion of fingertips by the face should not lose the grip.
    state.pinchStart=null;return;
  }
  const mid={x:(box.l+box.r)*.5,y:(box.t+box.b)*.5};
  if(state.pinchStart){
    // Continue following the hand that started the pull.
    choices.sort((a,b)=>distance(a.pick,state.pinchStart.lastPoint||state.pinchStart.point)
      -distance(b.pick,state.pinchStart.lastPoint||state.pinchStart.point));
  }else{
    choices.sort((a,b)=>(Number(!a.onFace)-Number(!b.onFace))
      ||distance(a.pick,mid)-distance(b.pick,mid));
  }
  // Keep the currently gripping hand; never switch to another candidate
  // merely because the original hand temporarily turns edge-on.
  const hand=state.pinchStart?choices.find(c=>c.side===state.pinchStart.side):choices.find(c=>c.back?.valid);
  if(state.root){const e=(hand||choices[0])?.back;state.root.dataset.handFacing=e?.valid?'back-pinch':'rejected';state.root.dataset.handDepth=e?e.score.toFixed(3):'unknown';}
  if(!hand){state.pinchStart=null;if(choices.every(c=>!c.pinch))state.pinchReady=true;return;}
  // Palm facing the camera must not advance or complete a peel.
  if(!hand.back?.valid){
    state.pinchStart=null;return;
  }
  if(state.frame==='AR6'){
    if(!hand.onFace||!hand.pinch){state.pinchStart=null;return;}
    if(!state.pinchStart){
      state.pinchStart={point:hand.pick,lastPoint:hand.pick,side:hand.side,near:now,lastSeen:now};
      return;
    }
    state.pinchStart.lastSeen=now;
    if(now-state.pinchStart.near>=210)enter('AR7');
    return;
  }
  if(!hand.pinch&&!hand.holding){
    state.pinchStart=null;state.pinchReady=true;return;
  }
  if(!state.pinchReady)return;
  if(!state.pinchStart){
    if(hand.onFace&&hand.pinch){
      state.pinchStart={point:hand.pick,lastPoint:hand.pick,palmSpan:hand.palmSpan,side:hand.side,
        near:now,lastSeen:now};
    }
    return;
  }
  const start=state.pinchStart;
  // HandLandmarker runs every ~70ms; preserve grips across brief stalls.
  if(now-start.lastSeen>420){state.pinchStart=null;return;}
  start.lastSeen=now;
  start.lastPoint=hand.pick;
  const moved=distance(hand.pick,start.point);
  const outward=distance(hand.pick,mid)-distance(start.point,mid);
  // A gentle diagonal tug is enough; thresholds scale with face size.
  const movedEnough=moved>Math.max(.045,faceWidth*.13)
    &&outward>Math.max(.019,Math.min(faceWidth,faceHeight)*.055);
  // A hand moving only toward the lens is not an intentional outward peel.
  if(now-start.near>=210&&movedEnough)completeHandPeel();
}
async function loadHandWhenNeeded(session){
 if(!state.playing||session!==state.session||state.hand)return;
 try{
   const m=await import(SDK);
   if(session!==state.session)return;
   const vision=await m.FilesetResolver.forVisionTasks(WASM);
   if(session!==state.session)return;
   let model;
   try{model=await m.HandLandmarker.createFromOptions(vision,{
     baseOptions:{modelAssetPath:MODEL_ROOT+'hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'GPU'},
     runningMode:'VIDEO',numHands:2
   });}
   catch{model=await m.HandLandmarker.createFromOptions(vision,{
     baseOptions:{modelAssetPath:MODEL_ROOT+'hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'CPU'},
     runningMode:'VIDEO',numHands:2
   });}
   if(session===state.session)state.hand=model;else model.close();
 }catch(error){console.warn('[DCD AR] Hand tracker:',error);}
}
async function initModels(session){
 if(session!==state.session||state.face)return;
 try{
   const m=await import(SDK);
   if(session!==state.session)return;
   const vision=await m.FilesetResolver.forVisionTasks(WASM);
   if(session!==state.session)return;
   // AR3 on mobile must get reliable inference priority over WebGL shaders.
   // CPU first avoids WebGL context pressure from the AR canvas + GPU matte.
   const delegates=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
     ?['CPU','GPU']:['GPU','CPU'];
   let model=null,lastError;
   for(const delegate of delegates){
     try{
       model=await m.FaceLandmarker.createFromOptions(vision,{
         baseOptions:{modelAssetPath:MODEL_ROOT+'face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate},
         runningMode:'VIDEO',numFaces:1,
         minFaceDetectionConfidence:.35,
         minFacePresenceConfidence:.35,
         minTrackingConfidence:.35
       });
       break;
     }catch(error){lastError=error;}
   }
   if(session!==state.session){model?.close();return;}
   if(!model)throw lastError||new Error('Face model unavailable');
   state.face=model;
   state.modelState='ready';
   state.lastVideoTime=-1;
 }catch(error){
   if(session!==state.session)return;
   state.modelState='error';
   console.warn('[DCD AR] Face model initialization:',error);
 }
}
function handsDue(now){
 return state.hand&&(state.frame==='AR6'||state.frame==='AR7')&&now-state.lastHand>=70;
}

/* Local inverse image warping, following the radial bulge/pinch and
   smooth landmark handles used in GPU image-processing pipelines.
   Only the displayed camera is warped. Tracking and segmentation still
   receive the original video. No second model, change to facial geometry
   used by the fabric, or persistent camera images. */
function createFaceWarp(root){
 const canvas=document.createElement('canvas');
 canvas.className='ar-face-warp';
 canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;visibility:hidden';
 root.appendChild(canvas);
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
 if(!gl){canvas.remove();return null;}
 // Schaefer, McPhail & Warren, SIGGRAPH 2006:
 // https://doi.org/10.1145/1179352.1141920
 // Inverse similarity MLS on a dense GPU mesh. All contour constraints
 // are solved together; no independently gated jaw/cheek pixel bands.
 const controlCount=42;
 const vs=`
 precision highp float;
 attribute vec2 p;
 varying vec2 vSource;
 uniform vec2 crop,aspect;
 uniform float amount;
 uniform vec2 controls[42],moves[42];
 vec2 similarityMLS(vec2 v,float strength){
   if(strength<=.0001)return v;
   float total=0.0;
   vec2 pc=vec2(0.0),qc=vec2(0.0);
   for(int i=0;i<42;i++){
     vec2 src=controls[i],dst=src+moves[i]*strength;
     vec2 d=v-dst;
     float r2=dot(d,d);
     if(r2<1e-12)return src;
     float w=1.0/max(r2,1e-10);
     total+=w;pc+=dst*w;qc+=src*w;
   }
   pc/=total;qc/=total;
   float a=0.0,b=0.0,mu=0.0;
   for(int i=0;i<42;i++){
     vec2 src=controls[i],dst=src+moves[i]*strength;
     vec2 d=v-dst;
     float w=1.0/max(dot(d,d),1e-10);
     vec2 h=dst-pc,k=src-qc;
     a+=w*dot(h,k);b+=w*(h.x*k.y-h.y*k.x);
     mu+=w*dot(h,h);
   }
   vec2 d=v-pc;
   return qc+vec2(a*d.x-b*d.y,b*d.x+a*d.y)/max(mu,1e-9);
 }
 void main(){
   vec2 uv=(p+1.0)*.5;
   vec2 st=vec2(1.0-uv.x,1.0-uv.y)*crop+(1.0-crop)*.5;
   vSource=similarityMLS(st*aspect,max(amount,0.0));
   gl_Position=vec4(p,0.0,1.0);
 }`;
 const fs=`
 precision highp float;
 varying vec2 vSource;
 uniform sampler2D image;
 uniform vec2 aspect;
 uniform vec2 leftEye,rightEye,axis,mid;
 uniform vec4 radii,contour;
 uniform float amount;
 float weight(vec2 p,vec2 c,float r){
   float q=clamp(length(p-c)/max(r,.0001),0.0,1.0);
   float w=1.0-q*q;return w*w;
 }
 vec2 eye(vec2 p,vec2 c,float r,float strength){
   return (p-c)*(-strength*weight(p,c,r));
 }
 void main(){
   vec2 p=vSource;
   // Preserve the existing opposite-branch fuller-face effect exactly.
   vec2 horizontal=normalize(axis),vertical=vec2(-horizontal.y,horizontal.x);
   float y=dot(p-mid,vertical)/max(contour.x,.001);
   float x=dot(p-mid,horizontal),u=x/max(contour.y,.001);
   float envelope=1.0-smoothstep(1.0,1.9,abs(u));
   float verticalEnvelope=smoothstep(-.95,-.20,y)*(1.0-smoothstep(1.05,1.75,y));
   float centerProtect=smoothstep(.20,.65,abs(u));
   float sx=x*.038*min(amount,0.0)*envelope*verticalEnvelope*centerProtect;
   vec2 eyes=eye(p,leftEye,radii.x,amount*.012)+eye(p,rightEye,radii.y,amount*.012);
   vec2 q=(p+horizontal*sx+eyes)/aspect;
   gl_FragColor=texture2D(image,clamp(q,vec2(0.0),vec2(1.0)));
 }`;
 function shader(kind,source){const sh=gl.createShader(kind);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
 let program,buffer,indexBuffer,texture,indexCount=0;
 try{
   const v=shader(gl.VERTEX_SHADER,vs),f=shader(gl.FRAGMENT_SHADER,fs);
   program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
   gl.deleteShader(v);gl.deleteShader(f);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   gl.useProgram(program);
   buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   // A fixed screen lattice evaluates the continuous deformation at vertices,
   // not 42 controls for every phone-screen pixel.
   const nx=48,ny=80,grid=[],tri=[];
   for(let row=0;row<=ny;row++)for(let col=0;col<=nx;col++)
     grid.push(col/nx*2-1,row/ny*2-1);
   for(let row=0;row<ny;row++)for(let col=0;col<nx;col++){
     const a=row*(nx+1)+col,b=a+1,c=a+nx+1,d=c+1;
     tri.push(a,b,c,b,d,c);
   }
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(grid),gl.STATIC_DRAW);
   indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(tri),gl.STATIC_DRAW);
   indexCount=tri.length;
   const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
   texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 }catch(error){console.warn('[DCD face warp]',error);canvas.remove();return null;}
 const uniforms={};
 for(const key of ['image','crop','aspect','leftEye','rightEye','axis','mid','radii','contour','amount'])uniforms[key]=gl.getUniformLocation(program,key);
 uniforms.controls=gl.getUniformLocation(program,'controls[0]');
 uniforms.moves=gl.getUniformLocation(program,'moves[0]');
 let measured=null,smooth=null,lastSeen=0,lastDraw=0,lastTime=-1,amount=0,dead=false,tw=0,th=0;
 const mix=(a,b,t)=>a+(b-a)*t;
 function update(points,w,h,now){
   if(!points?.length||!w||!h)return;
   const ratio=w/h;
   const pt=i=>[points[i].x*ratio,points[i].y];
   const avg=ids=>ids.reduce((a,i)=>{const p=pt(i);return [a[0]+p[0]/ids.length,a[1]+p[1]/ids.length]},[0,0]);
   const leftEye=avg([33,133,159,145]),rightEye=avg([362,263,386,374]);
   const cheekA=avg([234,93,132]),cheekB=avg([454,323,361]);
   const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
   const fw=dist(cheekA,cheekB);
   if(fw<.036)return;
   const axis=[(cheekB[0]-cheekA[0])/fw,(cheekB[1]-cheekA[1])/fw];
   const vertical=[-axis[1],axis[0]];
   const mid=[(cheekA[0]+cheekB[0])*.5,(cheekA[1]+cheekB[1])*.5];
   const chin=pt(152);
   const height=Math.max(fw*.34,(chin[0]-mid[0])*vertical[0]+(chin[1]-mid[1])*vertical[1]);
   const projectedWidth=(a,b)=>Math.abs((b[0]-a[0])*axis[0]+(b[1]-a[1])*axis[1])*.5;
   const jaw=projectedWidth(avg([172,136]),avg([397,365]));
   const lower=projectedWidth(avg([149,176]),avg([378,400]));
   // Anatomically ordered bilateral contour samples. Width changes
   // gradually from temple through cheek and jaw; no abrupt bands.
   const controls=[],moves=[];
   const add=(p,dx=0,dy=0)=>{controls.push(...p);moves.push(dx,dy);};
   const step=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
   const rimA=[127,234,93,132,58,172,136,150,149,176,148];
   const rimB=[356,454,323,361,288,397,365,379,378,400,377];
   for(const i of [...rimA,...rimB]){
     const p=pt(i),d=[p[0]-mid[0],p[1]-mid[1]];
     const x=d[0]*axis[0]+d[1]*axis[1];
     const y=(d[0]*vertical[0]+d[1]*vertical[1])/height;
     // ~2.7% cheek narrowing, gradual increase to ~6% at the jaw.
     // The chin tip preserves the original vertical facial proportion.
     const taper=(.027+.037*step(.08,.82,y))*step(-1.15,-.48,y);
     add(p,-axis[0]*x*taper,-axis[1]*x*taper);
   }
   add(chin,-vertical[0]*height*.008,-vertical[1]*height*.008);
   // Stable features: keep eyes, nose, mouth and central forehead fixed.
   for(const i of [168,1,33,263,61,291,17])add(pt(i));
   // Fixed surrounding anchors keep background and hair from being pulled.
   for(let k=0;k<12;k++){
     const t=k*Math.PI/6,x=Math.cos(t)*fw*.88,y=Math.sin(t)*Math.max(height*1.62,fw*.83);
     add([mid[0]+axis[0]*x+vertical[0]*y,mid[1]+axis[1]*x+vertical[1]*y]);
   }
   if(controls.length!==controlCount*2)return;
   measured={leftEye,rightEye,axis,mid,controls,moves,
      contour:[height,fw*.5,Math.max(fw*.30,jaw),Math.max(fw*.17,lower)],
      radii:[Math.min(fw*.25,dist(pt(33),pt(133))*1.10),Math.min(fw*.25,dist(pt(362),pt(263))*1.10),0,0]};
   if(!smooth)smooth=Object.fromEntries(Object.entries(measured).map(([k,v])=>[k,v.slice()]));
   lastSeen=now;
 }
 function render(video,now,target){
   if(dead||gl.isContextLost()){canvas.style.visibility='hidden';return;}
   if(!video||video.readyState<2||!video.videoWidth)return;
   const dt=lastDraw?Math.min(100,now-lastDraw):33;
   if(dt<33&&lastDraw)return;
   lastDraw=now;
   const valid=measured&&now-lastSeen<450;
   const desired=valid?target:0;
   amount=mix(amount,desired,1-Math.exp(-dt/235));
   if(!smooth||Math.abs(amount)<.008&&desired===0){canvas.style.visibility='hidden';return;}
   // Stronger response to moving landmarks, softer response at rest.
   for(const k of Object.keys(measured)){
     const q=measured[k],p=smooth[k];
     const delta=Math.hypot(...q.map((v,i)=>v-p[i]));
     const a=1-Math.exp(-dt/(delta>.028?38:75));
     for(let i=0;i<p.length;i++)p[i]=mix(p[i],q[i],a);
   }
   const vw=video.videoWidth,vh=video.videoHeight;
   const scale=Math.max(428/vw,926/vh);
   const ratio=Math.min(1.5,window.devicePixelRatio||1);
   const cw=Math.round(428*ratio),ch=Math.round(926*ratio);
   if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
   try{
     gl.viewport(0,0,cw,ch);gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
     if(lastTime!==video.currentTime||tw!==vw||th!==vh){
       if(tw!==vw||th!==vh){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);tw=vw;th=vh;}
       else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,video);
       lastTime=video.currentTime;
     }
     gl.uniform1i(uniforms.image,0);
     gl.uniform2f(uniforms.crop,428/(vw*scale),926/(vh*scale));
     gl.uniform2f(uniforms.aspect,vw/vh,1);
     for(const k of ['leftEye','rightEye','axis','mid'])gl.uniform2fv(uniforms[k],smooth[k]);
     gl.uniform4fv(uniforms.radii,smooth.radii);gl.uniform4fv(uniforms.contour,smooth.contour);gl.uniform1f(uniforms.amount,amount);
     gl.uniform2fv(uniforms.controls,smooth.controls);
     gl.uniform2fv(uniforms.moves,smooth.moves);
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);
     gl.drawElements(gl.TRIANGLES,indexCount,gl.UNSIGNED_SHORT,0);
     canvas.style.visibility='visible';
   }catch(error){dead=true;canvas.style.visibility='hidden';console.warn('[DCD face warp]',error);}
 }
 function hide(){canvas.style.visibility='hidden';lastDraw=0;}
 function destroy(){dead=true;gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteBuffer(indexBuffer);gl.deleteProgram(program);canvas.remove();}
 return {update,render,hide,destroy};
}
function faceWarpTarget(){
 if(['AR3-1','AR4','AR5'].includes(state.frame))return 1;
 if(state.frame==='AR5-2')return -1;
 if(['AR6','AR7'].includes(state.frame)){
   const sign=state.variant==='replacement'?-1:1;
   return sign*Math.min(1,state.maskCount/5);
 }
 return 0;
}

function track(frame,width,height,now=performance.now()){
 try{
   if(state.face&&now-state.lastFace>=100){
     state.lastFace=now;
     const points=state.face.detectForVideo(frame,now).faceLandmarks?.[0];
     // Do not let a WebGL/organza rendering failure block AR3 face
     // recognition and progression. Face observation happens first.
     observeFace(points,now);
     if(points?.length){
       if(!state.faceWarp&&!state.faceWarpUnavailable&&state.frame!=='AR3'){
         try{state.faceWarp=createFaceWarp(state.root);state.faceWarpUnavailable=!state.faceWarp;}catch(error){state.faceWarpUnavailable=true;console.warn('[DCD face warp]',error);}
       }
       state.faceWarp?.update(points,width,height,now);
       const rawX=[points[234].x,points[454].x];
       state.root.__dcdFaceRegion={
         cx:(rawX[0]+rawX[1])*.5,
         width:Math.abs(rawX[0]-rawX[1]),
         top:points[10].y,
         at:performance.now()
       };
       let l=1,r=0,t=1,b=0;
       for(const p of points){const x=1-p.x;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,p.y);b=Math.max(b,p.y);}
       state.faceBox={l,r,t,b};state.faceBoxSeenAt=now;
     }else{
       // A hand touching the face occludes FaceLandmarker for a few frames.
       // Preserve its last REAL bounds briefly instead of losing the pinch
       // precisely when the user's fingers arrive at their own face.
       if(!['AR6','AR7'].includes(state.frame)||now-(state.faceBoxSeenAt||0)>1100){
         state.faceBox=null;
       }
       state.guideSince=0;
     }
     // Update inside the landmark scope, after current-frame metadata.
     try{state.tulle?.update(points,width,height);}
     catch(error){
       if(!state.tulleWarning){console.warn('[DCD AR] Cloth update:',error);state.tulleWarning=true;}
     }
   }
   if(handsDue(now)){
     state.lastHand=now;
     observeHands(state.hand.detectForVideo(frame,now),now);
   }
 }catch(error){
   if(!state.analysisError){console.warn('[DCD AR] tracking:',error);state.analysisError=true;}
   if(state.frame==='AR3')state.modelState='error';
 }
}
function tick(){
 if(!state.playing)return;
 state.requestId=requestAnimationFrame(tick);
 const video=state.video;
 // Facial landmarks must continue updating whether the portrait matte is
 // loading, visible, stalled or switching engines. The matte affects only
 // the camera background, never the mask's face tracking.
 if(!video||video.readyState<2||!video.videoWidth)return;
 // Restore the previous independently timed tracker: segmentation and
 // WebGL updates must not trigger a heavy face inference every animation frame.
 const now=performance.now();
 if(['AR5-1','AR8','AR9','AR10'].includes(state.frame))state.faceWarp?.hide();
 else state.faceWarp?.render(video,now,faceWarpTarget());
 if(!(state.face&&now-state.lastFace>=100)&&!handsDue(now))return;
 if(video.currentTime===state.lastVideoTime)return;
 state.lastVideoTime=video.currentTime;
 track(video,video.videoWidth,video.videoHeight,now);
}
function mount(stage,video){
 const root=stage?.querySelector('.ar-immersive');
 if(!root)return;
 if(state.root===root){state.video=video||state.video;return;}
 stop(true);
 state.root=root;state.stage=stage;state.video=video||root.querySelector('video');
  root.querySelector('.ar-ending-hit')?.addEventListener('click',restartEnding);
 // Do NOT allocate GPU organza or start heavy matting before AR3 can see
 // the face. Those visuals are only needed after the detection transition.
 state.tulle=null;
 state.handGuide=null;
 state.sheets=[];state.variant='first';state.maskCount=0;state.analysisError=false;state.tulleWarning=false;
 state.portraitPending=false;state.faceBox=null;state.faceBoxSeenAt=0;state.lastFace=0;state.lastHand=0;state.lastVideoTime=-1;
 state.modelState='idle';state.faceSeen=false;
 enter('AR3');
}
function start(video){
 if(!state.root)return;
 if(video)state.video=video;
 if(state.playing)return;
 state.playing=true;
 state.modelState='loading';
 // Initial inference has priority. No segmentation / cloth GPU work in AR3.
 state.requestId=requestAnimationFrame(tick);
 initModels(state.session);
}
function ensurePortraitMatte(){
 if(!state.playing||!state.root||state.matte)return;
 try{state.matte=window.DCD_AR_MATTE?.create(state.root,state.video,
   state.root.querySelector('.ar-person-segment'))||null;}
 catch(error){console.warn('[DCD AR] Portrait matte init:',error);}
}
function startArVisuals(){
 if(!state.playing||!state.root)return;
 // This work was wrongly executed before the first face detection.
 if(!state.tulle){
   try{state.tulle=window.DCD_TULLE?.create(state.root.querySelector('.ar-organza-stack'))||null;}
   catch(error){console.warn('[DCD AR] Organza init:',error);}
 }
 if(!state.handGuide){
   try{
     state.handGuide=window.DCD_AR_HAND_GUIDE?.create(state.root)||null;
     state.handGuide?.setFrame(state.frame);
   }catch(error){console.warn('[DCD AR] Gesture guide init:',error);}
 }
 ensurePortraitMatte();
}
function stop(preservePrimedAudio=false){
 state.session++;
 state.playing=false;cancelAnimationFrame(state.requestId);stopTimers();
 if(!preservePrimedAudio)stopWhisper(true);
 state.matte?.stop();state.matte=null;
 state.face?.close();state.face=null;
 state.hand?.close();state.hand=null;
 state.tulle?.destroy();state.tulle=null;state.sheets=[];
 state.faceWarp?.destroy();state.faceWarp=null;state.faceWarpUnavailable=false;
 state.handGuide?.destroy();state.handGuide=null;
 state.root=null;state.stage=null;state.video=null;
}

window.DCD_AR_FLOW={markup,mount,start,stop,cameraError,primeWhisper,endingAudioEnded,frame:()=>state.frame,debugNext:()=>{
 const pos=frameNames.indexOf(state.frame);
 if(state.frame==='AR4'){for(let i=state.maskCount;i<5;i++)addFabric();enter('AR5');}
 else if(state.frame==='AR5'){enter('AR5-1');}
 else if(state.frame==='AR5-1'){enter('AR6');}
 else if(state.frame==='AR6'){enter('AR7');}
 else if(state.frame==='AR7'){completeHandPeel();}
 else enter(frameNames[Math.min(frameNames.length-1,pos+1)]);
}};
})();