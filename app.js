(() => {
'use strict';
const A=window.DCD_ASSETS, M=window.DCD_MOTION, stage=document.querySelector('#stage');
const effects=['Weight Loss','Appetite Control','Changes in Body Shape','Confidence in Appearance','Improved Self-Image','Improved Blood Sugar Control','Reduced Weight-Related Health Risks','Better Metabolic Health'];
const sides=['Nausea','Digestive Discomfort','Other Adverse Effects','Being Accused of Cheating','Having My Effort Dismissed','Being Judged for Using Medication','Being Pressured to Explain My Choice','Fear of Weight Regain'];
// WEB04 (Figma 334:1022): top-left, top-right, bottom-left, bottom-right.
const packRect=[589,99,471,224];
const packSlots=[[638,134,172,62],[843,134,172,62],[638,229,172,61],[843,229,172,61]];
// Keep the doll canvas at its original 346:873 aspect ratio and centered on the Figma slot.
const activeDollRect={x:371.3,y:81,w:111.4,h:281};
// Only the colored bulb is a valid source, never the empty neck or ring.
const bottleLiquids={purple:{x:125,y:86,rx:39,ry:34},orange:{x:129,y:174,rx:39,ry:34}};
const key='DCD_IMPLEMENTATION_1';
const signaturePath='M2.50021 39.3162C3.97397 25.5131 15.0272 6.78039 32.7124 3.08321C57.2822 -2.05324 36.3968 27.7477 15.0272 52.6265C3.31169 66.2659 29.4323 61.4999 52.6083 32.6614C71.0303 9.7382 81.3467 24.5272 52.6083 61.4999';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fresh=()=>({page:'00',phase:'intro',initialPresetVersion:3,figures:Array.from({length:4},(_,i)=>({kind:i+1,value:[85,45,65,100][i],orange:0,purple:0,packed:false})),active:0,loaded:null,firstFill:false,firstInject:false,handGuideDismissed:false,packGuideDone:false,used:{orange:false,purple:false},expected:[],side:[],signed:false});
let s=fresh(),drag=null,gesture=new Map(),timers=[],scale=1,offset={x:0,y:0},videoEnded=false;
let syringeInjectionAngle=45,rotateGuideFinished=false,signatureInk=null;
let packingAssetsWarmed=false;
let arCameraStream=null,arDropFrame=0,arDropFinished=false,arCameraReady=false,arCameraError='';
function warmPackingAssets(){
  if(packingAssetsWarmed)return;
  packingAssetsWarmed=true;
  [A.conveyor,A.machine,A.packFoil,A.packClearFront].forEach(src=>{const image=new Image();image.src=src;});
}
try{let old=JSON.parse(sessionStorage.getItem(key));if(old&&Array.isArray(old.figures)&&old.figures.length===4){s={...fresh(),...old};if((old.initialPresetVersion||0)<3&&!s.figures.some(f=>f.orange||f.purple||f.packed)){s.figures.forEach((f,i)=>{f.value=[85,45,65,100][i];});s.initialPresetVersion=3;}s.firstInject=!!(old.firstInject||s.figures.some(f=>f.orange||f.purple));s.packGuideDone=!!(old.packGuideDone||s.figures.some(f=>f.packed));if(s.page==='14'||s.page==='14done'){s.page='14';s.signed=false;}if(['08a','08b','09','10','11'].includes(s.page)){s.page='12';s.phase='ready';}if(s.page==='arFace'||s.page==='arOpen'){s.page='ar';s.phase='ready';}}}catch{}
function save(){if(!['00','01','02'].includes(s.page))sessionStorage.setItem(key,JSON.stringify(s));}
function later(fn,ms){let id=setTimeout(fn,ms);timers.push(id);return id;}
function clearTimers(){timers.forEach(clearTimeout);timers=[];}
function box(x,y,w,h,extra=''){return 'style="left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px;'+extra+'"';}
function img(src,x,y,w,h,cls=''){return '<img class="lay '+cls+'" '+box(x,y,w,h)+' src="'+src+'" draggable="false" alt="">';}
function group(x,y,w,h,cls,inner){return '<div class="lay '+cls+'" '+box(x,y,w,h)+'>'+inner+'</div>';}
function text(str,x,y,w,h,cls=''){return '<div class="lay '+cls+'" '+box(x,y,w,h)+'>'+str+'</div>';}
function glassButton(label,x,y,w,action,gray=false){
  const asset=label==='YES'?'consent-yes.png':label==='NO'?'consent-no.png':'consent-test-it.png';
  const shadow=gray?0:22,top=gray?0:11;
  return '<button class="lay consent-button figma-glass-button'+(gray?' gray':'')+'" '+box(x-shadow,y-top,w+shadow*2,gray?60:104)+' data-action="'+action+'" aria-label="'+label+'"><img src="assets/figma/'+asset+'" draggable="false" alt=""></button>';
}
function arrowButton(x,y,action,kind='12'){return '<button class="lay figma-arrow" '+box(x-22,y-11,94,94)+' data-action="'+action+'" aria-label="Next"><img src="assets/figma/'+(kind==='13'?'49c33':'634cb')+'.svg" alt=""></button>';}
function canvasFigure(i,x,y,w,h,cls='',rot=0,view='front'){return '<canvas class="lay figure '+cls+'" data-figure="'+i+'" data-view="'+view+'" '+box(x,y,w,h,'transform:rotate('+rot+'deg);')+' width="346" height="873" aria-label="Doll '+(i+1)+' '+view+'"></canvas>';}
function waveText(value){return [...value].map((letter,i)=>'<span style="animation-delay:'+(i*.07)+'s">'+(letter===' '?'&nbsp;':letter)+'</span>').join('');}
function handGuide(){return img(A.syringeGuideCore,163,240,164,185,'syringe-guide syringe-guide-core');}
function injectionHandGuide(){return img(A.syringeGuideCore,163,238,164,185,'syringe-guide syringe-injection-guide');}
function packHandGuide(){return img(A.syringeGuideCore,302,153,164,185,'pack-guide-hand')+text('DRAG HERE WHEN FINISHED',615,323,292,44,'doto guide-blink pack-guide-copy');}
function horizontalFigure(i,x,y,w,h,cls='',view='back'){
  // Keep the 172px long axis exact and preserve the original doll aspect ratio.
  const long=w,short=long*activeDollRect.w/activeDollRect.h;
  return canvasFigure(i,x+w/2-short/2,y+h/2-long/2,short,long,cls,-90,view);
}
function syringeMarkup(cls=''){
  const color=s.loaded,liquid=color==='orange'?A.syringeLiquidOrange:A.syringeLiquidPurple;
  return group(270,125,22,297,'syringe syringe-2d '+cls,
    img(A.syringePlunger,4,65,17,232,'syringe-plunger')+
    '<div class="syringe-drug-window'+(color?' filled':'')+'" aria-hidden="true"><img class="syringe-drug '+(color||'empty')+'" src="'+liquid+'" alt=""></div>'+ 
    img(A.syringeBarrel,0,0,22,219,'syringe-barrel')+
    '<span class="syringe-tip-marker" aria-hidden="true"></span>');
}
function setPage(p,phase='ready'){if(p!=='arOpen')cancelAnimationFrame(arMorphFrame);clearTimers();if(!['ar','arOpen','arFace'].includes(p)){cancelAnimationFrame(arDropFrame);stopArCamera();}s.page=p;s.phase=p==='12'&&phase==='ready'?'typing':phase;save();render();if(p==='12'&&s.phase==='typing')later(()=>{if(s.page==='12'&&s.phase==='typing'){s.phase='ready';stage.classList.replace('phase-typing','phase-ready');}},4200);}
function dimensions(){return ['00','01','02','03','ar','arOpen','arFace'].includes(s.page)?[428,926]:[874,428];}
function fit(){let [w,h]=dimensions(),v=document.querySelector('#viewport'),W=v.clientWidth,H=v.clientHeight,rotated=false;v.classList.toggle('workbench-viewport',w>h);scale=Math.min((rotated?H:W)/w,(rotated?W:H)/h);stage.style.width=w+'px';stage.style.height=h+'px';stage.style.clipPath='none';stage.style.transform='translate(-50%,-50%) rotate('+(rotated?90:0)+'deg) scale('+scale+')';stage.style.transformOrigin='center';stage.dataset.orientation=rotated?'rotated':'normal';offset={x:W/2,y:H/2};}
function localPoint(e){let r=stage.getBoundingClientRect(),dx=dimensions()[0]===874?52:0;if(stage.dataset.orientation==='rotated'){let [w,h]=dimensions(),cx=r.left+r.width/2,cy=r.top+r.height/2;return{x:w/2+(e.clientY-cy)/scale+dx,y:h/2-(e.clientX-cx)/scale};}return{x:(e.clientX-r.left)/scale+dx,y:(e.clientY-r.top)/scale};}
function hit(p,x,y,w,h){return p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h;}
const ropes={upper:{line:[6,20,406,596],pull:[-69,-111]},lower:{line:[8,752,406,615],pull:[90,99]}};
function ropeAt(p){let closest=null,distance=Infinity;for(const [name,{line}] of Object.entries(ropes)){let [x1,y1,x2,y2]=line,t=clamp(((p.x-x1)*(x2-x1)+(p.y-y1)*(y2-y1))/((x2-x1)**2+(y2-y1)**2),0,1),d=Math.hypot(p.x-(x1+t*(x2-x1)),p.y-(y1+t*(y2-y1)));if(d<distance){closest=name;distance=d;}}return distance<=55?closest:null;}
function pullDistance(g,p){let [dx,dy]=ropes[g.rope].pull,len=Math.hypot(dx,dy);return ((p.x-g.start.x)*dx+(p.y-g.start.y)*dy)/len;}
function drawFigures(){stage.querySelectorAll('canvas[data-figure]').forEach(c=>{let i=+c.dataset.figure;window.DCDMorph.draw(c,s.figures[i].kind,s.figures[i].value,c.dataset.view||'front');});}
function animateFigureValue(index,from,to,duration=530){return new Promise(resolve=>{let start=null,last=-1;function frame(t){if(start===null)start=t;let u=Math.min((t-start)/duration,1),e=u*u*(3-2*u),value=from+(to-from)*e;if(Math.abs(value-last)>.35||u===1){s.figures[index].value=value;const c=stage.querySelector('canvas.active-figure');if(c&&c.isConnected)window.DCDMorph.draw(c,s.figures[index].kind,value);last=value;}if(u<1)requestAnimationFrame(frame);else{s.figures[index].value=to;resolve();}}requestAnimationFrame(frame);});}
function posterWords(){const words=[['poster-the.svg',147.828,354.73,131,67],['poster-brand.svg',109.344,422.73,212,67],['poster-new.svg',143.188,492.73,147,67],['poster-glp.svg',123.235,561.962,181,68]];return words.map(([file,x,y,w,h])=>img('assets/figma-current/hd/'+file,x,y,w,h,'poster-word')).join('');}
function introMarkup(p){let h=img(A.opening,0,0,428,926,'poster-art poster-primary')+img(A.posterAlternate,0,0,428,926,'poster-art poster-alternate')+'<div class="poster-gradient poster-gradient-a"></div><div class="poster-gradient poster-gradient-b"></div><div class="poster-gradient poster-gradient-c"></div><div class="poster-gradient poster-gradient-d"></div>'+img('assets/figma-current/hd/poster-tagline-base.svg',64.5,858.5,299,17,'poster-tagline-svg')+img('assets/figma-current/hd/poster-tagline.svg',64.5,858.5,299,17,'poster-tagline-svg');if(p==='00'||s.phase==='intro')h+=posterWords();
if(p==='00'){if(s.phase!=='intro')h+=img('assets/figma-current/hd/poster-cta-base.svg',98.76,815.92,230,17,'poster-cta-svg')+img('assets/figma-current/hd/poster-cta.svg',98.76,815.92,230,17,'poster-cta-svg');h+='<button class="full-hit" data-action="enter" aria-label="Visit website"></button>';}
else if(s.phase==='guide'){h+=text('PULL THE STRINGS APART',26,808,376,96,'doto guide-blink guide-copy');h+=img(A.gestureHand,-25,363,154,174,'gesture gesture-left');h+=img(A.gestureHand,288,605,154,174,'gesture gesture-right');h+='<div class="pull-zone left-zone" aria-label="Pull left string"></div><div class="pull-zone right-zone" aria-label="Pull right string"></div>';}
else if(s.phase==='rupture'&&A.openingBreakVideo){h+='<video class="rupture-video" autoplay muted playsinline src="'+A.openingBreakVideo+'"></video>';}
return h;}
function resultMarkup(){const root='assets/figma-current/hd/';return img(A.posterResult,0,0,428,926,'poster-art poster-result-art')+'<div class="poster-gradient poster-gradient-a"></div><div class="poster-gradient poster-gradient-b"></div><div class="poster-gradient poster-gradient-c"></div><div class="poster-gradient poster-gradient-d"></div>'+img(root+'poster-tagline-base.svg',64.5,858.5,299,17,'poster-tagline-result-svg')+img(root+'poster-tagline.svg',64.5,858.5,299,17,'poster-tagline-result-svg')+text('CLICK THE PACK TO START',26,808,376,96,'doto guide-blink poster-click-guide')+'<button class="full-hit" data-action="start" aria-label="Start"></button>';}
function workbenchMarkup(showTutorial=true){let f=s.figures[s.active],h=img(A.workbenchBackground,52,0,874,428,'bg')+img(A.workbenchTray,308,39,237,355,'tray');let packInside=img(A.packClearBack,0,0,packRect[2],packRect[3],'pack pack-image pack-clear-back');for(let i=0;i<4;i++)if(s.figures[i].packed){let q=packSlots[i];packInside+=horizontalFigure(i,q[0]-packRect[0],q[1]-packRect[1],q[2],q[3],'packed-figure');}h+=group(...packRect,'pack-assembly workbench-pack',packInside);h+=img(A.purpleBottle,90,45,107,82,'bottle')+img(A.orangeBottle,88,141,110,85,'bottle');if(!(s.used.orange&&s.used.purple))h+=text('GAIN<br>WEIGHT',197,79,100,44,'bottle-label')+text('LOOSE<br>WEIGHT',197,162,100,44,'bottle-label');
if(!f.packed)h+=canvasFigure(s.active,activeDollRect.x,activeDollRect.y,activeDollRect.w,activeDollRect.h,'active-figure');h+=syringeMarkup();
if(showTutorial&&!s.handGuideDismissed&&!s.firstFill&&s.phase==='ready')h+=handGuide();
if(showTutorial&&s.loaded&&!s.firstInject&&s.phase==='ready')h+=injectionHandGuide();
if(showTutorial&&s.firstInject&&!s.packGuideDone&&!s.figures.some(v=>v.packed)&&s.phase==='ready')h+=packHandGuide();
if(f.value===0)h+=text('MINIMIZE',282,392,292,44,'doto guide-blink workbench-guide');if(f.value===100)h+=text('MAXIMIZE',282,389,292,44,'doto guide-blink workbench-guide');
h+=text('DOLL '+(s.active+1)+'/4',282,29,292,44,'progress workbench-count');return h;}
function rearPackMarkup(x,y,w,h,cls=''){return img(A.packFoil,x,y,w,h,'rear-pack pack-image pack-foil '+cls);}
function packingMarkup(){let h=img(A.workbenchBackground,52,0,874,428,'bg');if(['08a','08b'].includes(s.page)){h+=img(A.workbenchTray,308,39,237,355,'tray')+img(A.purpleBottle,90,45,107,82,'bottle')+img(A.orangeBottle,88,141,110,85,'bottle')+syringeMarkup('staged-tool');
  let inside=img(A.packClearBack,0,0,packRect[2],packRect[3],'pack pack-image pack-clear-back')+packSlots.map((q,i)=>horizontalFigure(i,q[0]-packRect[0],q[1]-packRect[1],q[2],q[3],'packed-figure')).join('');
  h+=group(...packRect,'pack-assembly sliding-pack',inside);return h;}
h+=img(A.conveyor,123,79,540,270,'conveyor');
const packX=s.page==='11'?277:s.page==='10'?113:7,packY=s.page==='10'?122:121;
h+=rearPackMarkup(packX,packY,386,183,s.page==='09'?'ejecting-pack':'');
h+=img(A.machine,52,29,101,376,'machine');
h+=text(waveText(s.page==='11'?'!!':'BEING PACKED..'),s.page==='11'?530:550,s.page==='10'?206:207,292,44,'packed-copy wave');return h;}
function frontFigures(ox=0,oy=0,cls='front-figure'){let q=[[204,47,59,148],[304,49,65,148],[204,234,60,148],[308,234,59,148]],order=[0,2,3,1];return q.map((b,i)=>canvasFigure(order[i],b[0]-ox,b[1]-oy,b[2],b[3],cls)).join('');}
function checklist(items,kind){return '<div class="options">'+items.map((v,i)=>'<label><input type="checkbox" data-kind="'+kind+'" data-index="'+i+'" '+(s[kind].includes(i)?'checked':'')+'><span>'+v+'</span></label>').join('')+'</div>';}
function signatureMarkup(){
  // One continuous gradient brush stroke, following the exact Figma sample curve.
  // A single path replaces 12 independent moving circles.
  return text('SIGN HERE TO CONFIRM.',2,505,291,25,'doto guide-blink signature-guide')
    +img('assets/figma/3fe8e.svg',299,456,68,59,'signature-sample')
    +'<svg class="lay signature-sample signature-flow" '+box(299,456,68,59)+' viewBox="0 0 73 64" aria-hidden="true">'
    +'<defs><linearGradient id="dcd-signature-gradient" x1="0" y1="0" x2="73" y2="64" gradientUnits="userSpaceOnUse">'
    +'<stop offset="0%" stop-color="#D83A00"/><stop offset="30%" stop-color="#FF571A"/>'
    +'<stop offset="70%" stop-color="#FF9239"/><stop offset="100%" stop-color="#FFD1A0"/>'
    +'</linearGradient></defs>'
    +'<path class="signature-flow-path" d="'+signaturePath+'" pathLength="100" fill="none" stroke="url(#dcd-signature-gradient)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
    +'</svg>'
    +'<canvas id="signature" class="lay signature" '+box(177,447,259,122)+' width="777" height="366" aria-label="Draw your signature"></canvas>';
}
function prescriptionMarkup(){
  let page=s.page,side=['13','14','14done'].includes(page),raised=page==='14'||page==='14done';
  let h=img(A.workbenchBackground,52,0,874,428,'bg');
  h+=group(61,-10,448,448,'pack-assembly front-pack',img(A.packFoil,0,0,448,448,'pack-image pack-foil pack-foil-base')+frontFigures(61,-10)+img(A.packClearFront,0,0,448,448,'pack-image pack-clear-front'));
  let paper=img(A.clipboard,0,0,441,588,'clipboard');
  paper+=text('PRESCRIPTION',75,113,291,25,'paper-head');
  paper+=text('SUM OF APPLIED GLP-1 : '+(s.figures.reduce((a,f)=>a+f.orange,0)).toFixed(1),75,156,291,25,'dose');
  paper+=text(side?'POSSIBLE SIDE EFFECTS':'EXPECTED EFFECTS',75,194,291,25,'paper-section');
  paper+=text(side?'Select the consequences you expect.':'Select the effects you expect.',75,211,291,24,'paper-prompt');
  paper+='<div class="lay checklist" '+box(77,231,291,211)+'>'+checklist(side?sides:effects,side?'side':'expected')+'</div>';
  if(raised){
    paper+=signatureMarkup();
  }
  h+=group(416,raised?-157:-14,441,588,'prescription-assembly',paper);
  if((page==='12'&&s.expected.length)||(page==='13'&&s.side.length))h+=arrowButton(746,365,'next',page);
  if(page==='14done')h+=arrowButton(839,365,'next','12');
  return h;
}
function consentMarkup(){
  let no=s.page==='16',h=img(A.workbenchBackground,52,0,874,428,'bg');
  let dose=(s.figures.reduce((a,f)=>a+f.orange,0)).toFixed(1);
  let paper=img(A.consentClipboardBase,0,0,441,588,'consent-paper');
  paper+=text('PRESCRIPTION',165,113,130,25,'paper-head');
  paper+=text('SUM OF APPLIED GLP-1 : '+dose,75,156,291,25,'dose');
  paper+=text('POSSIBLE SIDE EFFECTS',75,194,291,25,'paper-section');
  paper+=text('Select the consequences you expect.',75,211,291,24,'paper-prompt');
  paper+='<div class="lay checklist consent-checklist" '+box(77,231,291,211)+'>'+checklist(sides,'side')+'</div>';
  h+=group(65,-46,441,588,'consent-prescription',group(0,0,441,588,'consent-ambient',paper));
  let pack=img(A.packFoil,0,0,448,448,'pack-image pack-foil pack-foil-base')+frontFigures(61,-10,'consent-figure')+img(A.packClearFront,0,0,448,448,'pack-image pack-clear-front');
  h+=group(214.5,55.5,448,448,'consent-pack-assembly',group(0,0,448,448,'pack-ambient',pack));
  h+='<div class="orange-tint primary-tint"></div><div class="orange-tint deep-tint"></div>';
  h+=text(no?'Thank you<br>for Prescribing!':'DO YOU AGREE TO<br>TEST IT ON YOU?',no?604:593,151,264,64,'consent-copy');
  if(no)h+=glassButton('TEST IT',669,241,134,'ar');
  else h+=glassButton('YES',608,241,112,'ar')+glassButton('NO',730,241,112,'decline',true);
  return h;
}
function newPackMarkup(){
  const figureSlots=[[28,42,50,140],[107,42,50,140],[28,206,50,140],[107,206,50,140]],order=[0,2,3,1];
  let inside=img(A.arPackBack,-4,-19,193,429,'new-pack-layer new-pack-vertical new-pack-foil');
  inside+=figureSlots.map((q,i)=>canvasFigure(order[i],...q,'new-pack-figure')).join('');
  inside+=img(A.arPackClear,-6,-20,196,431,'new-pack-layer new-pack-vertical new-pack-clear');
  return group(208,21,185,391,'new-pack-assembly',inside);
}
function newTicker(x,reverse=false){
  const copy='>> THE BRAND NEW GLP-1    >> EASIEST CUT FOR YOUR DIET    ';
  return '<div class="lay new-ticker'+(reverse?' reverse':'')+'" '+box(x,0,25,428)+' aria-hidden="true"><div class="new-ticker-track"><span>'+copy+'</span><span>'+copy+'</span></div></div>';
}
function startNewTickers(){stage.querySelectorAll('.new-ticker-track').forEach(track=>{const first=track.firstElementChild,distance=first?.offsetHeight||0;if(!distance)return;track.style.top=(track.parentElement.classList.contains('reverse')?-426:-425)+'px';track.animate([{translate:'0 0'},{translate:'0 -'+distance+'px'}],{duration:distance*26,easing:'linear',iterations:Infinity});});}
function newButton(label,action,x,y,disabled=false){
  const source=label==='YES'?'yesButtonAlpha.png':label==='NO'?'noButtonAlpha.png':label==='TEST IT'?'testButtonAlpha.png':'nextButtonAlpha.png';
  const wide=label==='TEST IT'?140:label==='NEXT'?67:134;
  return '<button class="lay new-ui-button'+(disabled?' disabled':'')+'" '+box(x,y,wide,69)+' data-action="'+action+'" aria-label="'+label+'" '+(disabled?'disabled':'')+'><img src="assets/figma-current/hd/'+source+'" alt=""></button>';
}
function newPrescriptionMarkup(page=s.page){
  const side=page==='13',sign=page==='14'||page==='14done',consent=page==='15'||page==='16';
  const dose=s.figures.reduce((a,f)=>a+f.orange,0).toFixed(1);
  let h=img(A.workbenchBackground,52,0,874,428,'bg');
  h+=newPackMarkup();
  h+=text(page==='15'||page==='16'?'>> PRESCRIBED':'>> PRESCRIPTION',93,21,25,291,'new-prescription-title');
  h+=text('DCD<br>LAB',99,374,79,25,'new-brand-name');
  h+=newTicker(475)+newTicker(791,true);
  const doseY=page==='16'?41:page==='15'?44:sign?43:381;
  const doseClass='new-dose-group'+(page==='13'?' side-dose':'');
  h+=group(539,doseY,213,18,doseClass,text('SUM OF APPLIED GLP-1 : '+dose,0,0,213,18,'new-prescription-dose'));
  if(page==='12'||side){
    const items=side?sides:effects,selected=side?s.side:s.expected,kind=side?'side':'expected';
    let content=text(side?'POSSIBLE SIDE EFFECTS':'EXPECTED EFFECTS',524,43,291,24,'new-section-title');
    content+=text(side?'Select the consequences you expect.':'Select the effects you expect.',524,62,291,24,'new-section-prompt');
    content+='<div class="lay new-options" '+box(525,94,291,213)+'>'+items.map((item,i)=>'<label style="--line-index:'+i+'"><input type="checkbox" data-kind="'+kind+'" data-index="'+i+'" '+(selected.includes(i)?'checked':'')+'><img class="new-checked-asset" src="assets/figma-current/hd/checkbox-checked.svg" alt="" aria-hidden="true"><span>'+item+'</span></label>').join('')+'</div>';
    h+=group(0,0,926,428,'new-flow-content',content);
    h+=newButton('NEXT','next',827,347,!selected.length);
  }else if(sign){
    if(page==='14'&&!signatureInk){
      h+=img('assets/figma/3fe8e.svg',568,162,156,135,'new-signature-sample');
      h+='<svg class="lay new-signature-trace" '+box(568,162,156,135)+' viewBox="0 0 73 64" aria-hidden="true"><defs><linearGradient id="signature-trace-color"><stop stop-color="#D83A00"/><stop offset=".4" stop-color="#FF6A1C"/><stop offset="1" stop-color="#FFAE65"/></linearGradient></defs><path d="'+signaturePath+'" fill="none" stroke="url(#signature-trace-color)" stroke-width="5" stroke-linecap="round" stroke-dasharray="25 75" pathLength="100"/></svg>';
    }
    if(signatureInk)h+='<img class="lay new-signature-ink" '+box(524,142,291,170)+' src="'+signatureInk+'" alt="">';
    else h+='<canvas id="new-signature" class="lay new-signature-canvas" '+box(524,142,291,170)+' width="873" height="510" aria-label="Draw your signature"></canvas>';
    if(page==='14')h+=text('SIGN HERE TO CONFIRM.',500,396,291,25,'doto guide-blink new-signature-guide');
    h+=newButton('NEXT','next',827,347,page==='14');
  }else if(consent){
    h+='<div class="lay new-orange-tint" '+box(43,-13,883,459)+' aria-hidden="true"></div>';
    h+='<div class="lay new-orange-gradient grad-one" '+box(-4,-31,942,510)+' aria-hidden="true"><div></div></div>';
    h+='<div class="lay new-orange-gradient grad-two" '+box(-6,-38,942,510)+' aria-hidden="true"><div></div></div>';
    h+='<div class="lay new-orange-gradient grad-three" '+box(-12,-45,942,510)+' aria-hidden="true"><div></div></div>';
    h+='<div class="lay new-orange-gradient grad-four" '+box(-4,-31,942,510)+' aria-hidden="true"><div></div></div>';
    h+=text(page==='15'?'DO YOU AGREE TO<br>TEST IT ON YOU?':'Thank you<br>for Prescribing',page==='15'?513:514,262,264,64,'new-consent-copy');
    if(page==='15')h+=newButton('YES','ar',522,333)+newButton('NO','decline',633,333);
    else h+=newButton('TEST IT','ar',579,333);
  }
  return h;
}
function bindNewSignature(){
  const c=stage.querySelector('#new-signature');if(!c)return;
  const ctx=c.getContext('2d');ctx.strokeStyle='#171717';ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';let drawing=false,moved=false;
  function point(e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};}
  c.onpointerdown=e=>{e.stopPropagation();c.setPointerCapture(e.pointerId);drawing=true;const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);};
  c.onpointermove=e=>{if(!drawing)return;const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();if(!moved)stage.querySelectorAll('.new-signature-sample,.new-signature-trace,.new-signature-guide').forEach(n=>n.remove());moved=true;};
  c.onpointerup=e=>{e.stopPropagation();drawing=false;if(!moved)return;signatureInk=c.toDataURL('image/png');s.signed=true;setPage('14done');};
}
function arPackMarkup(){
  const slots=[[98,220,90,252],[241,220,90,252],[98,516,90,252],[240,516,90,252]],order=[0,2,3,1];
  let h='<div class="ar-pack-flip">';
  h+=group(48,145,334,704,'ar-pack-face ar-pack-back',img(A.arPackBack,3.5,5.4,328.5,693.2,'ar-pack-image'));
  let front=img(A.arPackBack,51.5,150.4,328.5,693.2,'ar-intact-foil ar-original-foil');
  front+='<canvas class="ar-foil-morph" width="428" height="926" aria-hidden="true"></canvas>';
  front+=order.map((index,i)=>{const q=slots[i];return canvasFigure(index,q[0],q[1],q[2],q[3],'ar-pack-doll');}).join('');
  front+=img(A.arPackClear,47.5,145,334,704,'ar-intact-clear ar-original-clear');
  front+='<canvas class="ar-front-morph" width="428" height="926" aria-hidden="true"></canvas>';
  h+='<div class="ar-pack-face ar-pack-front">'+front+'</div>';
  return h+'</div>';
}
function arMarkup(){
  if(s.page==='arFace')return '<video class="ar-camera-video" autoplay muted playsinline aria-label="Front camera"></video><div class="ar-camera-wash"></div>'+text('POSITION YOUR FACE HERE',35,149,358,34,'doto ar-face-copy')+img(A.arFaceRing,69.5,267,289,375,'ar-face-ring');
  let h=img(A.arBackground,0,0,428,926,'ar-orange-background')+text('>> NOW PRESCRIBE YOURSELF',29,91,370,29,'ar-headline');
  h+=arPackMarkup();
  if(s.page==='ar')h+=text('PRESS THE PACK!',29,829,370,29,'doto guide-blink ar-press-copy')+'<button class="ar-pack-hit" data-action="openAr" aria-label="Open the pack"></button>';
  return h;
}
// Independent front plastic and rear foil morph tracks share ONE exact progress value.
// Render both layers in a common artboard coordinate system. Image alpha bounds are
// registered to the original Figma blister rectangle to prevent doubled/misaligned packs.
const arMorphAssets=new Map();
let arMorphFrame=0;
function loadArMorphAsset(src){
  if(arMorphAssets.has(src))return arMorphAssets.get(src);
  const pending=new Promise((resolve,reject)=>{
    const im=new Image();im.onload=()=>resolve(im);
    im.onerror=()=>reject(new Error('Missing AR image: '+src));im.src=src;
  });
  arMorphAssets.set(src,pending);
  return pending;
}
function arRegisteredImage(im,rect){
  const source=document.createElement('canvas');
  source.width=im.naturalWidth;source.height=im.naturalHeight;
  const scan=source.getContext('2d',{willReadFrequently:true});
  scan.drawImage(im,0,0);
  const pixels=scan.getImageData(0,0,source.width,source.height).data;
  let x0=source.width,y0=source.height,x1=0,y1=0;
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
    if(pixels[(y*source.width+x)*4+3]<36)continue;
    if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
  }
  const c=document.createElement('canvas');c.width=428;c.height=926;
  const ctx=c.getContext('2d');
  if(x0<=x1&&y0<=y1){
    ctx.drawImage(im,x0,y0,x1-x0+1,y1-y0+1,...rect);
  }
  return c;
}
async function morphArBlister(){
  try{
    const sources=[A.arPackBack,A.arPackRipped,A.arPackClear,A.arPackCrumpled];
    const images=await Promise.all(sources.map(loadArMorphAsset));
    if(s.page!=='arOpen')return;
    const foil=stage.querySelector('.ar-foil-morph'),front=stage.querySelector('.ar-front-morph');
    if(!foil||!front)return;
    const rearBox=[51.5,150.4,328.5,693.2],frontBox=[47.5,145,334,704];
    const layers=[
      {canvas:foil,images:[arRegisteredImage(images[0],rearBox),arRegisteredImage(images[1],rearBox)],alpha:1},
      {canvas:front,images:[arRegisteredImage(images[2],frontBox),arRegisteredImage(images[3],frontBox)],alpha:.7}
    ];
    const renderProgress=p=>{
      for(const layer of layers){
        const ctx=layer.canvas.getContext('2d');
        ctx.clearRect(0,0,428,926);
        ctx.globalAlpha=layer.alpha*(1-p);
        ctx.drawImage(layer.images[0],0,0);
        ctx.globalAlpha=layer.alpha*p;
        ctx.drawImage(layer.images[1],0,0);
        ctx.globalAlpha=1;
      }
    };
    renderProgress(0);
    foil.style.opacity='1';front.style.opacity='1';
    stage.querySelectorAll('.ar-original-foil,.ar-original-clear').forEach(n=>n.style.opacity='0');
    const duration=1650;let beginning=null;
    function frame(now){
      if(s.page!=='arOpen')return;
      if(beginning===null)beginning=now;
      const t=Math.min((now-beginning)/duration,1);
      const p=t*t*(3-2*t);
      renderProgress(p); // front/back use identical t AND easing each frame
      if(t<1)arMorphFrame=requestAnimationFrame(frame);
      else later(()=>{if(s.page==='arOpen')runArDollDrop();},190);
    }
    arMorphFrame=requestAnimationFrame(frame);
  }catch(e){
    console.error('[DCD] AR blister assets:',e);
    // Never show a blank pack on an asset error.
    if(s.page==='arOpen')later(()=>runArDollDrop(),1800);
  }
}
function stopArCamera(){if(arCameraStream){arCameraStream.getTracks().forEach(track=>track.stop());arCameraStream=null;}arCameraReady=false;}
window.addEventListener('pagehide',stopArCamera);
function attachArCamera(){const video=stage.querySelector('.ar-camera-video');if(video&&arCameraStream){video.srcObject=arCameraStream;video.play().catch(()=>{});}}
function finishArIfReady(){if(s.page==='arOpen'&&arDropFinished){setPage('arFace');attachArCamera();}}
async function askArCamera(){
  arCameraError='';
  if(!navigator.mediaDevices?.getUserMedia){arCameraError='Camera unavailable';return;}
  try{
    arCameraStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'user'}}});
    if(!['ar','arOpen','arFace'].includes(s.page)){stopArCamera();return;}
    arCameraReady=true;attachArCamera();finishArIfReady();
  }catch(error){if(!['ar','arOpen','arFace'].includes(s.page))return;arCameraError=error?.name||'Camera unavailable';if(s.page==='arFace')render();}
}
function runArDollDrop(){
  if(s.page!=='arOpen')return;
  // Use the EXACT existing pack canvases. Reparent them instead of fading them
  // away and independently recreating smaller figures at arbitrary positions.
  const pack=stage.querySelector('.ar-pack-front');
  const nodes=[...(pack?.querySelectorAll('.ar-pack-doll')||[])];
  const slotPositions=[[98,220],[241,220],[98,516],[240,516]];
  if(nodes.length!==4){arDropFinished=true;finishArIfReady();return;}
  const bodies=nodes.map((node,i)=>{
    const [x,y]=slotPositions[i];
    node.classList.remove('ar-pack-doll');
    node.classList.add('ar-falling-doll','ar-falling-'+i);
    stage.appendChild(node);
    Object.assign(node.style,{
      left:'0px',top:'0px',width:'90px',height:'252px',opacity:'1',
      transformOrigin:'50% 72%',animation:'none',pointerEvents:'none',
      transform:'translate('+x+'px,'+y+'px) rotate(0deg)'
    });
    return {node,x,y,vx:[-1.0,1.1,-.7,.9][i],vy:[-1,-1.4,-.7,-1.2][i],
      angle:0,spin:[-.55,.6,-.45,.5][i],r:39};
  });
  // The torn Figma overlay stays in place; only its original contents drop.
  let previous=0,elapsed=0;
  function step(now){
    if(s.page!=='arOpen')return;
    const dt=Math.min((now-previous||16.7)/16.7,2);
    previous=now;elapsed+=dt*16.7;
    for(const b of bodies){
      b.vy+=.43*dt;
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.spin*dt;b.vx*=.997;
      if(b.x<5){b.x=5;b.vx=Math.abs(b.vx)*.6;}
      if(b.x>327){b.x=327;b.vx=-Math.abs(b.vx)*.6;}
      if(b.y>685){b.y=685;b.vy=-Math.abs(b.vy)*.28;b.vx*=.86;b.spin*=.82;}
    }
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
      const a=bodies[i],b=bodies[j],dx=b.x-a.x,dy=b.y-a.y,
        dist=Math.hypot(dx,dy)||1,min=a.r+b.r;
      if(dist>=min)continue;
      const nx=dx/dist,ny=dy/dist,overlap=(min-dist)/2;
      a.x-=nx*overlap;b.x+=nx*overlap;a.y-=ny*overlap;b.y+=ny*overlap;
      const rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(rel<0){const impulse=-rel*.56;a.vx-=impulse*nx;b.vx+=impulse*nx;
        a.vy-=impulse*ny;b.vy+=impulse*ny;}
    }
    bodies.forEach(b=>{b.node.style.transform='translate('+b.x+'px,'+b.y+'px) rotate('+b.angle+'deg)';});
    if(elapsed<3300)arDropFrame=requestAnimationFrame(step);
    else{arDropFinished=true;finishArIfReady();}
  }
  arDropFrame=requestAnimationFrame(step);
}
function beginAr(){arDropFinished=false;arCameraReady=false;arCameraError='';[A.arPackBack,A.arPackRipped,A.arPackClear,A.arPackCrumpled].forEach(src=>loadArMorphAsset(src).catch(()=>{}));setPage('ar');askArCamera();}
function openArPack(){if(s.page!=='ar')return;setPage('arOpen','opening');morphArBlister();}
function render(){fit();stage.className='stage page-'+s.page+' phase-'+s.phase;let h='';if(s.page==='00'||s.page==='01')h=introMarkup(s.page);else if(s.page==='02')h=resultMarkup();else if(s.page==='03')h='<div class="rotate-preview">'+workbenchMarkup(false).replace(/<div class="lay doto[^"]*"[^>]*>[\s\S]*?<\/div>/g,'')+'</div>'+(s.phase==='ready'?text('ROTATE YOUR PHONE',73,554,292,44,'doto guide-blink rotate-guide'):'');else if(s.page==='workbench'){warmPackingAssets();h=workbenchMarkup();}else if(['08a','08b','09','10','11'].includes(s.page))h=packingMarkup();else if(['12','13','14','14done','15','16'].includes(s.page))h=newPrescriptionMarkup();else if(['ar','arOpen','arFace'].includes(s.page))h=arMarkup();
stage.innerHTML=dimensions()[0]===874?'<div class="scene-content">'+h+'</div>':h;drawFigures();startNewTickers();if(s.page==='14')bindNewSignature();if(s.page==='arFace')attachArCamera();if(s.page==='01'&&s.phase==='rupture'){let v=stage.querySelector('video');if(v){v.onended=finishRupture;v.onerror=finishRupture;}else queueMicrotask(finishRupture);}}
function finishRupture(){if(s.page==='01'&&s.phase==='rupture'){videoEnded=true;setPage('02');}}
function runIntro(p){setPage(p,'intro');later(()=>{if(s.page===p&&s.phase==='intro'){s.phase=p==='00'?'loop':'guide';render();}},M.introMs);}
async function beginPacking(){
  // Keep the WEB04 pack and its four dolls in the same DOM group until it exits.
  render();s.page='08a';s.phase='sliding';save();stage.className='stage page-08a phase-sliding';
  const pack=stage.querySelector('.workbench-pack');
  if(pack){await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const slide=pack.animate([{translate:'0px 0px'},{translate:'380px 0px'}],{duration:1080,easing:'linear',fill:'forwards'});
    await slide.finished.catch(()=>{});
  }
  if(s.page!=='08a')return;
      setPage('09');later(()=>{if(s.page==='09'){
        // Do not rebuild the foil pack: keep the 2.32s ejection animation continuous.
        s.page='10';save();stage.className='stage page-10 phase-ready';
      }
        later(()=>{if(s.page==='10'){
          s.page='11';save();stage.className='stage page-11 phase-ready';
          const label=stage.querySelector('.wave');if(label){label.innerHTML=waveText('!!');label.style.left='530px';label.style.top='206px';label.style.width='292px';}
        }
          later(()=>{if(s.page==='11'){
            later(()=>{if(s.page==='11')setPage('12');},620);
          }},380);
        },850);
      },1130);
}

const bottleCore={purple:{x:125,y:86},orange:{x:124,y:187}};
function baseNeedleTip(angle){const radians=angle*Math.PI/180;return{x:281+124.5*Math.sin(radians),y:273.5-124.5*Math.cos(radians)};}
function syringeTipPoint(host){
  const marker=host?.querySelector('.syringe-tip-marker');
  if(!marker)return null;
  const bounds=marker.getBoundingClientRect();
  return localPoint({clientX:bounds.left+bounds.width/2,clientY:bounds.top+bounds.height/2});
}
function bottleTouched(tip){
  if(!tip)return null;
  for(const color of ['purple','orange']){
    const {x,y,rx,ry}=bottleLiquids[color];
    if(((tip.x-x)/rx)**2+((tip.y-y)/ry)**2<=1)return color;
  }
  return null;
}
// Compare the needle tip against the CURRENT, visible doll pixels, including
// morph changes. Reference outline rows cannot be trusted as a hit target.
function abdomenTouched(tip){
  if(!tip||!hit(tip,activeDollRect.x,activeDollRect.y,activeDollRect.w,activeDollRect.h))return false;
  const canvas=stage.querySelector('canvas.active-figure');
  if(!canvas||!canvas.width||!canvas.height)return false;
  const x=Math.floor((tip.x-activeDollRect.x)*canvas.width/activeDollRect.w);
  const y=Math.floor((tip.y-activeDollRect.y)*canvas.height/activeDollRect.h);
  if(x<0||y<0||x>=canvas.width||y>=canvas.height)return false;
  try{
    return canvas.getContext('2d',{willReadFrequently:true})
      .getImageData(x,y,1,1).data[3]>=24;
  }catch(error){
    console.warn('[DCD] Unable to read doll transparency',error);
    return false;
  }
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function moveSyringe(host,x,y,angle=0,ms=240){if(!host)return;host.style.transition='translate '+ms+'ms ease, transform '+ms+'ms ease';host.style.translate=x+'px '+y+'px';host.style.transform='rotate('+angle+'deg)';}
async function fillSyringe(color,host){
  if(s.phase!=='ready'||s.loaded)return;
  if(s.figures[s.active].value===(color==='orange'?0:100)){moveSyringe(host,0,0,0,330);await pause(350);render();return;}
  s.loaded=color;s.firstFill=true;s.phase='filling';
  stage.querySelectorAll('.syringe-guide').forEach(n=>n.remove());
  // WEB04 Figma horizontal barrel: x=117, y=81/163, width=219, height=22.
  const dx=-15.5,dy=(color==='purple'?81:163)-262.5;
  const plunger=host.querySelector('.syringe-plunger');
  plunger.style.translate='0 -69px';
  moveSyringe(host,dx,dy,-90,220);await pause(240);
  if(s.page!=='workbench'||s.phase!=='filling')return;
  const liquid=host.querySelector('.syringe-drug'),liquidWindow=host.querySelector('.syringe-drug-window');
  liquid.src=color==='orange'?A.syringeLiquidOrange:A.syringeLiquidPurple;
  liquid.className='syringe-drug '+color;
  const fillTiming={duration:M.fillMs||1200,easing:'linear',fill:'forwards'};
  await Promise.allSettled([
    liquidWindow.animate([{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0 0)'}],fillTiming).finished,
    plunger.animate([{translate:'0 -69px'},{translate:'0 0'}],fillTiming).finished
  ]);
  plunger.style.translate='0 0';
  liquidWindow.classList.add('filled');
  if(s.page!=='workbench'||s.phase!=='filling')return;
  moveSyringe(host,0,0,0,320);await pause(350);
  if(s.page==='workbench'&&s.phase==='filling'){s.phase='ready';save();render();}
}
async function inject(host){
  const color=s.loaded;if(!color||s.phase!=='ready')return;
  host.style.transition='none'; // Preserve the release position and angle during injection.
  s.phase='injecting';s.firstInject=true;
  stage.querySelectorAll('.syringe-guide').forEach(n=>n.remove());
  // Keep the exact pose the user is holding when the needle touches the doll.
  const liquidWindow=host.querySelector('.syringe-drug-window'),plunger=host.querySelector('.syringe-plunger');
  const injectionTiming={duration:M.injectionMs,easing:'linear',fill:'forwards'};
  await Promise.allSettled([
    liquidWindow.animate([{clipPath:'inset(0 0 0 0)'},{clipPath:'inset(0 0 100% 0)'}],injectionTiming).finished,
    plunger.animate([{translate:'0 0'},{translate:'0 -69px'}],injectionTiming).finished
  ]);
  if(s.page!=='workbench'||s.phase!=='injecting')return;
  const f=s.figures[s.active],before=f.value,target=clamp(before+(color==='orange'?-7:10),0,100);
  await animateFigureValue(s.active,before,target,510);
  if(s.page!=='workbench'||s.phase!=='injecting')return;
  moveSyringe(host,0,0,0,320);
  await plunger.animate([{translate:'0 -69px'},{translate:'0 0'}],{duration:320,easing:'ease-in-out',fill:'forwards'}).finished;
  if(s.page!=='workbench'||s.phase!=='injecting')return;
  f.value=target;f[color]++;s.used[color]=true;s.loaded=null;s.phase='ready';save();render();
}
function packActive(){s.figures[s.active].packed=true;s.packGuideDone=true;s.loaded=null;let n=s.figures.findIndex(f=>!f.packed);if(n<0){save();beginPacking();}else{s.active=n;save();render();}}
async function animatePackActive(el){
  if(!el){packActive();return;}
  s.phase='packing';const i=s.active,f=s.figures[i],q=packSlots[i];
  const back=el.cloneNode(false);back.classList.remove('active-figure','dragging');back.classList.add('packing-back');back.dataset.view='back';back.style.opacity='0';back.style.pointerEvents='none';el.parentElement.appendChild(back);
  // Start movement immediately on release; loading the back image must not
  // freeze the doll at the drop point. Its front-facing pixels are a fallback.
  back.getContext('2d').drawImage(el,0,0);
  window.DCDMorph.draw(back,f.kind,f.value,'back');
  const sx=activeDollRect.x+activeDollRect.w/2,sy=activeDollRect.y+activeDollRect.h/2;
  const tx=q[0]+q[2]/2,ty=q[1]+q[3]/2;
  const from=el.style.translate||'0px 0px',to=(tx-sx)+'px '+(ty-sy)+'px';
  // Preserve native proportions from pickup to the exact slot-height finish.
  // RotateY crushed the body; a partial early translate froze it mid-motion.
  const targetScale=q[2]/activeDollRect.h;
  const endTransform='rotate(-90deg) scale('+targetScale+')';
  const [fx,fy]=from.split(' ').map(parseFloat);
  const midTranslate=(fx+(tx-sx-fx)*.5)+'px '+(fy+(ty-sy-fy)*.5)+'px';
  const midTransform='rotate(-45deg) scale('+(1+targetScale)/2+')';
  const timing={duration:650,easing:'linear',fill:'forwards'};
  const a=el.animate([
    {offset:0,translate:from,transform:'rotate(0deg) scale(1)',opacity:1},
    {offset:.5,translate:midTranslate,transform:midTransform,opacity:1},
    {offset:1,translate:to,transform:endTransform,opacity:0}
  ],timing);
  const b=back.animate([
    {offset:0,translate:from,transform:'rotate(0deg) scale(1)',opacity:0},
    {offset:.5,translate:midTranslate,transform:midTransform,opacity:0},
    {offset:1,translate:to,transform:endTransform,opacity:1}
  ],timing);
  await Promise.allSettled([a.finished,b.finished]);
  if(s.page==='workbench'&&s.phase==='packing'){s.phase='ready';packActive();}
}

function unpack(i){s.figures[i].packed=false;s.active=i;s.loaded=null;save();render();}
function turnPrescriptionPage(){
  if(s.page!=='12'||s.phase==='turning')return;
  const paper=stage.querySelector('.prescription-assembly');
  if(!paper){setPage('13');return;}
  s.phase='turning';stage.querySelector('.figma-arrow')?.remove();
  const motion=paper.animate([{filter:'brightness(1)',transform:'perspective(850px) rotateY(0deg)'},{filter:'brightness(.94)',transform:'perspective(850px) rotateY(-10deg)'},{filter:'brightness(1)',transform:'perspective(850px) rotateY(0deg)'}],{duration:600,easing:'ease-in-out'});
  motion.onfinish=()=>{if(s.page!=='12')return;
    s.page='13';s.phase='ready';save();stage.className='stage page-13 phase-ready';
    paper.querySelector('.paper-section').textContent='POSSIBLE SIDE EFFECTS';
    paper.querySelector('.paper-prompt').textContent='Select the consequences you expect.';
    paper.querySelector('.checklist').innerHTML=checklist(sides,'side');
    if(s.side.length)(stage.querySelector('.scene-content')||stage).insertAdjacentHTML('beforeend',arrowButton(746,365,'next','13'));
  };
}
function raisePrescription(){
  if(s.page!=='13'||s.phase==='raising')return;
  s.phase='raising';
  const paper=stage.querySelector('.prescription-assembly');
  if(!paper){setPage('14');return;}
  stage.querySelector('.figma-arrow')?.remove();
  const motion=paper.animate([{translate:'0 0'},{translate:'0 -143px'}],{duration:720,easing:'cubic-bezier(.26,.7,.2,1)',fill:'forwards'});
  motion.onfinish=()=>{if(s.page!=='13')return;
    paper.style.top='-157px';motion.cancel();
    s.page='14';s.phase='ready';save();stage.className='stage page-14 phase-ready';
    paper.insertAdjacentHTML('beforeend',signatureMarkup());bindSignature();
  };
}
function enterConsent(){
  if(s.page!=='14done')return;
  const root=stage.querySelector('.scene-content'),paper=root?.querySelector('.prescription-assembly'),pack=root?.querySelector('.pack-assembly');
  if(!root||!paper||!pack){setPage('15');return;}
  const oldPaper=paper.getBoundingClientRect(),oldPack=pack.getBoundingClientRect();
  clearTimers();s.page='15';s.phase='ready';save();
  root.querySelectorAll('.figma-arrow,.signature,.signature-guide,.signature-sample').forEach(el=>el.remove());
  paper.classList.remove('prescription-assembly');paper.classList.add('consent-prescription');
  Object.assign(paper.style,{left:'65px',top:'-46px'});
  const paperImage=paper.querySelector('.clipboard');if(paperImage){paperImage.src=A.consentClipboardBase;paperImage.classList.replace('clipboard','consent-paper');}
  const paperPositions={'.paper-head':[165,113,130,25],'.dose':[75,156,291,25],'.paper-section':[75,194,291,25],'.paper-prompt':[75,211,291,24],'.checklist':[77,231,291,211]};
  for(const [selector,[x,y,w,h]] of Object.entries(paperPositions)){const el=paper.querySelector(selector);if(el)Object.assign(el.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});}
  paper.querySelector('.checklist')?.classList.add('consent-checklist');
  pack.classList.remove('front-pack');pack.classList.add('consent-pack-assembly');
  Object.assign(pack.style,{left:'214.5px',top:'55.5px'});
  root.insertAdjacentHTML('beforeend','<div class="orange-tint primary-tint"></div><div class="orange-tint deep-tint"></div>'+text('DO YOU AGREE TO<br>TEST IT ON YOU?',593,151,264,64,'consent-copy')+glassButton('YES',608,241,112,'ar')+glassButton('NO',730,241,112,'decline',true));
  stage.className='stage page-15 phase-ready consent-entering';
  const animateFrom=(el,before,finishRotation=0)=>{
    const after=el.getBoundingClientRect(),dx=(before.left-after.left)/scale,dy=(before.top-after.top)/scale;
    const motion=el.animate([{transform:`translate(${dx}px,${dy}px) rotate(0deg)`},{transform:`translate(0,0) rotate(${finishRotation}deg)`}],{duration:1000,easing:'cubic-bezier(.2,.7,.15,1)'});
    motion.onfinish=()=>{if(s.page==='15'||s.page==='16')el.classList.add('floating');};
    return motion.finished.catch(()=>{});
  };
  Promise.all([animateFrom(paper,oldPaper),animateFrom(pack,oldPack,-8.5)]).then(()=>{if(s.page==='15')stage.classList.remove('consent-entering');});
}
function declineConsent(){
  if(s.page!=='15')return;
  s.page='16';save();stage.className='stage page-16 phase-ready';
  const root=stage.querySelector('.scene-content')||stage;
  const copy=stage.querySelector('.consent-copy');if(copy){copy.textContent='';copy.style.opacity='0';copy.style.left='604px';copy.style.top='151px';}
  root.querySelectorAll('.consent-button').forEach(n=>n.remove());
  later(()=>{if(s.page!=='16')return;if(copy){copy.innerHTML='Thank you<br>for Prescribing!';copy.style.opacity='1';}root.insertAdjacentHTML('beforeend',glassButton('TEST IT',669,241,134,'ar'));},720);
}
let physicalLandscape=false;
function finishRotationIfReady(){if(s.page==='03'&&rotateGuideFinished&&(window.innerWidth>window.innerHeight||physicalLandscape))setPage('workbench');}
function startRotateGuide(){rotateGuideFinished=false;setPage('03');later(()=>{if(s.page!=='03')return;rotateGuideFinished=true;s.phase='waiting';render();finishRotationIfReady();},M.rotateGuideMs);}
async function advanceNewPrescription(){
  if(s.phase==='transition')return;
  const from=s.page;
  if(from==='12'&&!s.expected.length||from==='13'&&!s.side.length||from==='14'&&!s.signed)return;
  if(from==='14done'){setPage('15');return;}
  if(from!=='12'&&from!=='13')return;
  s.phase='transition';stage.querySelector('.new-ui-button')?.setAttribute('disabled','');
  const content=stage.querySelector('.new-flow-content');
  const moves=[];
  if(content)moves.push(content.animate([{translate:'0 0'},{translate:'0 -310px'}],{duration:950,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).finished);
  if(from==='13'){
    const dose=stage.querySelector('.new-dose-group');
    if(dose)moves.push(dose.animate([{translate:'0 0'},{translate:'0 -338px'}],{duration:950,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}).finished);
  }
  await Promise.allSettled(moves);
  if(s.page!==from)return;
  setPage(from==='12'?'13':'14',from==='12'?'typing':'ready');
  if(from==='12')later(()=>{if(s.page==='13'&&s.phase==='typing'){s.phase='ready';stage.classList.replace('phase-typing','phase-ready');}},4200);
}
function act(a){if(a==='enter'&&s.page==='00')runIntro('01');if(a==='start')startRotateGuide();if(a==='next')advanceNewPrescription();if(a==='decline'&&s.page==='15')setPage('16');if(a==='ar')beginAr();if(a==='openAr')openArPack();}
stage.addEventListener('click',e=>{let b=e.target.closest('[data-action]');if(b)act(b.dataset.action);});
stage.addEventListener('change',e=>{let t=e.target;if(!t.matches('input[data-kind]'))return;let kind=t.dataset.kind,n=+t.dataset.index;let set=new Set(s[kind]);t.checked?set.add(n):set.delete(n);s[kind]=[...set];save();render();});
stage.addEventListener('pointerdown',e=>{let p=localPoint(e);if(s.page==='01'&&s.phase==='guide'){let rope=ropeAt(p);if(!rope)return;e.preventDefault();gesture.set(e.pointerId,{rope,start:p,type:e.pointerType||'mouse',pulled:false});stage.setPointerCapture(e.pointerId);return;}
if(s.page!=='workbench'||s.phase!=='ready')return;let kind=null,index=-1;if(hit(p,261,125,40,297))kind='syringe';else if(hit(p,activeDollRect.x,activeDollRect.y,activeDollRect.w,activeDollRect.h))kind='doll';else{index=packSlots.findIndex((b,i)=>s.figures[i].packed&&hit(p,...b));if(index>=0)kind='packed';}if(kind){e.preventDefault();const el=kind==='syringe'?stage.querySelector('.syringe'):kind==='doll'?stage.querySelector('.active-figure'):stage.querySelector('canvas.packed-figure[data-figure="'+index+'"]');drag={kind,index,pointerId:e.pointerId,start:p,last:p,moved:false,angle:kind==='syringe'?(s.loaded?45:-45):0,el};if(el)el.classList.add('dragging');if(kind==='syringe'){s.handGuideDismissed=true;save();stage.querySelectorAll('.syringe-guide').forEach(n=>n.remove());if(el){el.style.transition='none';el.style.transform='rotate('+drag.angle+'deg)';}}stage.setPointerCapture(e.pointerId);}});
stage.addEventListener('pointermove',e=>{
  let p=localPoint(e);
  if(gesture.has(e.pointerId)){
    let g=gesture.get(e.pointerId);
    g.pulled=pullDistance(g,p)>=14;
    let active=[...gesture.values()];
    let both=active.some(v=>v.rope==='upper'&&v.pulled)&&active.some(v=>v.rope==='lower'&&v.pulled);
    let singlePointerMirror=g.type!=='touch'&&g.pulled;
    if((both||singlePointerMirror)&&s.page==='01'&&s.phase==='guide'){
      gesture.clear();setPage('01','rupture');
    }
    return;
  }
  if(!drag||drag.pointerId!==e.pointerId)return;
  drag.moved=true;
  let el=drag.el;
  if(el){
    el.style.translate=(p.x-drag.start.x)+'px '+(p.y-drag.start.y)+'px';
    if(drag.kind==='syringe')el.style.transform='rotate('+drag.angle+'deg)';
  }
  // NEVER trigger fill or injection during a drag. The person chooses
  // when to stop, even if the needle passes through the doll.
  drag.last=p;
});
stage.addEventListener('pointerup',e=>{
  gesture.delete(e.pointerId);
  if(!drag||drag.pointerId!==e.pointerId)return;
  const p=localPoint(e),d=drag;
  drag=null;
  if(d.kind==='syringe'){
    syringeInjectionAngle=d.angle;
    // Commit the precise release point (the final move event can be stale).
    if(d.el){
      d.el.style.transition='none';
      d.el.style.translate=(p.x-d.start.x)+'px '+(p.y-d.start.y)+'px';
      d.el.style.transform='rotate('+d.angle+'deg)';
    }
    const tip=syringeTipPoint(d.el);
    const color=!s.loaded&&bottleTouched(tip);
    if(color)fillSyringe(color,d.el);
    else if(s.loaded&&abdomenTouched(tip))inject(d.el);
    else render();
  }else if(d.kind==='doll'){
    if(hit(p,...packRect))animatePackActive(d.el);else render();
  }else if(d.kind==='packed'){
    if(hit(p,308,39,237,355))unpack(d.index);else render();
  }
});
stage.addEventListener('pointercancel',e=>{gesture.delete(e.pointerId);if(drag){drag=null;render();}});
function bindSignature(){let c=stage.querySelector('#signature');if(!c)return;let ctx=c.getContext('2d'),drawing=false,moved=false;ctx.strokeStyle='#171717';ctx.lineWidth=5;ctx.lineJoin='round';ctx.lineCap='round';function point(e){let r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};}c.onpointerdown=e=>{e.stopPropagation();c.setPointerCapture(e.pointerId);drawing=true;moved=false;let p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);};c.onpointermove=e=>{if(!drawing)return;let p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();if(!moved){stage.querySelectorAll('.signature-guide,.signature-sample').forEach(n=>n.remove());}moved=true;};c.onpointerup=e=>{e.stopPropagation();drawing=false;if(moved){s.signed=true;s.page='14done';save();stage.className='stage page-14done phase-ready';let guide=stage.querySelector('.signature-guide');if(guide)guide.remove();(stage.querySelector('.scene-content')||stage).insertAdjacentHTML('beforeend',arrowButton(839,365,'next','12'));}};}
function onViewportChange(){fit();finishRotationIfReady();}
window.addEventListener('resize',onViewportChange);window.addEventListener('orientationchange',onViewportChange);
window.addEventListener('deviceorientation',e=>{physicalLandscape=Number.isFinite(e.gamma)&&Math.abs(e.gamma)>55;if(physicalLandscape)finishRotationIfReady();});
if(s.page==='00'&&s.phase==='intro')runIntro('00');else if(s.page==='01'&&s.phase==='intro')runIntro('01');else if(s.page==='03')startRotateGuide();else render();
window.DCD_DEBUG={state:()=>structuredClone(s),page:p=>setPage(p),finishRupture};
})();
