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
const fresh=()=>({page:'00',phase:'intro',initialPresetVersion:4,figures:Array.from({length:4},(_,i)=>({kind:i+1,value:[85,70,50,100][i],orange:0,purple:0,packed:false})),active:0,loaded:null,firstFill:false,firstInject:false,handGuideDismissed:false,packGuideDone:false,packGuideHandFinished:false,packGuideHandStartedAt:null,used:{orange:false,purple:false},expected:[],side:[],signed:false});
let s=fresh(),drag=null,gesture=new Map(),timers=[],scale=1,offset={x:0,y:0},videoEnded=false;
let syringeInjectionAngle=45,rotateGuideFinished=false,signatureInk=null;
let packingAssetsWarmed=false;
let arCameraStream=null,arDropFrame=0,arDropFinished=false,arCameraReady=false,arCameraError='';
function warmPackingAssets(){
  if(packingAssetsWarmed)return;
  packingAssetsWarmed=true;
  [A.conveyor,A.machine,A.packFoil,A.packClearFront].forEach(src=>{const image=new Image();image.src=src;});
}
try{let old=JSON.parse(sessionStorage.getItem(key));if(old&&Array.isArray(old.figures)&&old.figures.length===4){s={...fresh(),...old};if((old.initialPresetVersion||0)<4&&!s.figures.some(f=>f.orange||f.purple||f.packed)){s.figures.forEach((f,i)=>{f.value=[85,70,50,100][i];});s.initialPresetVersion=4;}s.firstInject=!!(old.firstInject||s.figures.some(f=>f.orange||f.purple));s.packGuideDone=!!(old.packGuideDone||s.figures.some(f=>f.packed));if(s.page==='14'||s.page==='14done'){s.page='14';s.signed=false;}if(['08a','08b','09','10','11'].includes(s.page)){s.page='12';s.phase='ready';}if(s.page==='arFace'||s.page==='arOpen'){s.page='ar';s.phase='ready';}}}catch{}
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
// The approved Figma AR doll is 89.8299 x 252.0602 inside a
// 328.4825 x 693.1656 pack. Every other pack uses this same scale ratio.
const FIGMA_PACK_DOLL={width:89.829887,height:252.060196,packW:328.48249,packH:693.165607};
function canvasFigure(i,x,y,w,h,cls='',rot=0,view='front'){
  // Figma already fixes the visible doll rectangle. Do not recalculate its
  // width from the 346x873 source canvas or alter its location.
  return '<canvas class="lay figure '+cls+'" data-figure="'+i+'" data-view="'+view+'" '+box(x,y,w,h,'transform:rotate('+rot+'deg);')+' width="346" height="873" aria-label="Doll '+(i+1)+' '+view+'"></canvas>';
}
function waveText(value){return [...value].map((letter,i)=>'<span style="animation-delay:'+(i*.07)+'s">'+(letter===' '?'&nbsp;':letter)+'</span>').join('');}
function handGuide(){return img(A.syringeGuideCore,163,240,164,185,'syringe-guide syringe-guide-core');}
function injectionHandGuide(){return img(A.syringeGuideCore,163,238,164,185,'syringe-guide syringe-injection-guide');}
const PACK_HAND_CYCLE_MS=1550,PACK_HAND_TOTAL_MS=PACK_HAND_CYCLE_MS*3;
function packHandGuide(){
  if(!s.packGuideHandFinished&&!s.packGuideHandStartedAt){
    s.packGuideHandStartedAt=Date.now();save();
  }
  if(s.packGuideHandStartedAt&&Date.now()-s.packGuideHandStartedAt>=PACK_HAND_TOTAL_MS){
    s.packGuideHandFinished=true;save();
  }
  // Guide copy must remain after the hand animation has finished.
  return (s.packGuideHandFinished?'':img(A.syringeGuideCore,302,153,164,185,'pack-guide-hand'))+
    text('DRAG HERE WHEN FINISHED',615,323,292,44,'doto guide-blink pack-guide-copy');
}
function horizontalFigure(i,x,y,w,h,cls='',view='back'){
  // The WEB04 pack is the same foil rotated 90 degrees; derive the doll
  // long axis from the foil scale rather than separately sizing the doll.
  const ratio=packRect[2]/FIGMA_PACK_DOLL.packH;
  const long=FIGMA_PACK_DOLL.height*ratio;
  const short=FIGMA_PACK_DOLL.width*ratio;
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
function drawFigures(){
  // The same body image is drawn in every scene. The pack geometry, not the
  // body pixels or image transparency, determines the scene's uniform scale.
  stage.querySelectorAll('canvas[data-figure]').forEach(c=>{
    const i=+c.dataset.figure;
    window.DCDMorph.draw(c,s.figures[i].kind,s.figures[i].value,c.dataset.view||'front');
  });
}
function animateFigureValue(index,from,to,duration=530){return new Promise(resolve=>{let start=null,last=-1;function frame(t){if(start===null)start=t;let u=Math.min((t-start)/duration,1),e=u*u*(3-2*u),value=from+(to-from)*e;if(Math.abs(value-last)>.35||u===1){s.figures[index].value=value;const c=stage.querySelector('canvas.active-figure');if(c&&c.isConnected)window.DCDMorph.draw(c,s.figures[index].kind,value);last=value;}if(u<1)requestAnimationFrame(frame);else{s.figures[index].value=to;resolve();}}requestAnimationFrame(frame);});}
// Figma's GLASS renderer is not exposed as browser CSS. Its exact source
// shader is not public. These text nodes use refraction/dispersion/frost=0,
// so the important live effect is directional specular light on glyph edges.
// SVG alpha-lighting retains the exact existing font metrics and SVG paths.
function figmaGlassText(kind,x,y,w,h,base,glass){
  // Retain exactly the approved Figma box, and the original SVG as a safe
  // fallback until the glyph-SDF canvas has finished drawing.
  return '<div class="lay poster-glass-text" '+box(x,y,w,h)+'>'
    +img(base,0,0,w,h,'poster-glass-original')
    +img(glass,0,0,w,h,'poster-glass-original')
    +'<canvas class="lay poster-glass-canvas" data-figma-glass="'+kind+'" data-w="'+w+'" data-h="'+h+'" '+box(0,0,w,h)+' aria-hidden="true"></canvas></div>';
}
function posterWords(){const words=[['poster-the.svg',147.828,354.73,131,67],['poster-brand.svg',109.344,422.73,212,67],['poster-new.svg',143.188,492.73,147,67],['poster-glp.svg',123.235,561.962,181,68]];return words.map(([file,x,y,w,h])=>img('assets/figma-current/hd/'+file,x,y,w,h,'poster-word')).join('');}
function introMarkup(p){let h=img(A.opening,0,0,428,926,'poster-art poster-primary')+img(A.posterAlternate,0,0,428,926,'poster-art poster-alternate')+'<div class="poster-gradient poster-gradient-a"></div><div class="poster-gradient poster-gradient-b"></div><div class="poster-gradient poster-gradient-c"></div><div class="poster-gradient poster-gradient-d"></div>'+figmaGlassText('easiest',64.5,858.5,299,17,'assets/figma-current/hd/poster-tagline-base.svg','assets/figma-current/hd/poster-tagline.svg');if(p==='00'||s.phase==='intro')h+=posterWords();
if(p==='00'){if(s.phase!=='intro')h+=figmaGlassText('come',98.76,815.92,230,17,'assets/figma-current/hd/poster-cta-base.svg','assets/figma-current/hd/poster-cta.svg');h+='<button class="full-hit" data-action="enter" aria-label="Visit website"></button>';}
else if(s.phase==='guide'){h+=text('PULL THE STRINGS APART',26,808,376,96,'doto guide-blink guide-copy');h+=img(A.gestureHand,-25,363,154,174,'gesture gesture-left');h+=img(A.gestureHand,288,605,154,174,'gesture gesture-right');h+='<div class="pull-zone left-zone" aria-label="Pull left string"></div><div class="pull-zone right-zone" aria-label="Pull right string"></div>';}
else if(s.phase==='rupture'&&A.openingBreakVideo){h+='<video class="rupture-video" autoplay muted playsinline src="'+A.openingBreakVideo+'"></video>';}
return h;}
function resultMarkup(){const root='assets/figma-current/hd/';return img(A.posterResult,0,0,428,926,'poster-art poster-result-art')+'<div class="poster-gradient poster-gradient-a"></div><div class="poster-gradient poster-gradient-b"></div><div class="poster-gradient poster-gradient-c"></div><div class="poster-gradient poster-gradient-d"></div>'+img(root+'poster-tagline-base.svg',64.5,858.5,299,17,'poster-tagline-result-svg')+img(root+'poster-tagline.svg',64.5,858.5,299,17,'poster-tagline-result-svg')+text('CLICK THE PACK TO START',26,808,376,96,'doto guide-blink poster-click-guide')+'<button class="full-hit" data-action="start" aria-label="Start"></button>';}
function workbenchMarkup(showTutorial=true){let f=s.figures[s.active],h=img(A.workbenchBackground,52,0,874,428,'bg')+img(A.workbenchTray,308,39,237,355,'tray');let packInside=img(A.workbenchPack,0,0,337,224,'pack pack-image pack-clear-back workbench-native-export');for(let i=0;i<4;i++)if(s.figures[i].packed){let q=packSlots[i];packInside+=horizontalFigure(i,q[0]-packRect[0],q[1]-packRect[1],q[2],q[3],'packed-figure');}h+=group(...packRect,'pack-assembly workbench-pack',packInside);h+=img(A.purpleBottle,90,45,107,82,'bottle')+img(A.orangeBottle,88,141,110,85,'bottle');if(!s.used.purple&&s.loaded!=='purple')h+=text('GAIN<br>WEIGHT',197,79,100,44,'bottle-label bottle-label-purple');if(!s.used.orange&&s.loaded!=='orange')h+=text('LOOSE<br>WEIGHT',197,162,100,44,'bottle-label bottle-label-orange');
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
  // Figma 03_MOBILE_WEB / New12–New16 (615:538 etc).
  // These are the actual Figma slots and material bounds, not sizes inferred
  // from the different AR pack. Keep the group origin at the clear foil's origin.
  const figureSlots=[
    [28,41.719,49.913,140.054],
    [107.276,41.719,49.913,140.054],
    [28,206,49.913,140.054],
    [107,206,49.913,140.054]
  ],order=[0,2,3,1];
  let inside=img(A.arPackBack,2.235,2.980,182.517,385.149,'new-pack-layer new-pack-vertical new-pack-foil');
  inside+=figureSlots.map((q,i)=>canvasFigure(order[i],...q,'new-pack-figure')).join('');
  inside+=img(A.arPackClear,0,0,185.497,391.108,'new-pack-layer new-pack-vertical new-pack-clear');
  return group(208,21,185.497,391.108,'new-pack-assembly',inside);
}
function newTicker(x,reverse=false){
  const copy='>> THE BRAND NEW GLP-1    >> EASIEST CUT FOR YOUR DIET    ';
  return '<div class="lay new-ticker'+(reverse?' reverse':'')+'" '+box(x,0,25,428)+' aria-hidden="true"><div class="new-ticker-track"><span>'+copy+'</span><span>'+copy+'</span><span>'+copy+'</span></div></div>';
}
function startNewTickers(){
  stage.querySelectorAll('.new-ticker-track').forEach(track=>{
    if(track.dataset.running==='1')return;
    const first=track.firstElementChild;
    const distance=first?.offsetHeight||0; // Unscaled layout px: getBoundingClientRect was scaled by #stage and left empty gaps.
    if(!distance)return;
    // The second copy immediately follows the first. Moving exactly one
    // copy height makes the wrap seamless, with no blank jump or reset.
    // Center copy covers the viewport at the beginning. The preceding and
    // following copies cover both ends of every frame, including the seam.
    track.style.top=(-distance)+'px';
    track.dataset.running='1';
    track.animate(
      [{transform:'translateY(0)'},{transform:'translateY(-'+distance+'px)'}],
      {duration:distance*26,easing:'linear',iterations:Infinity}
    );
  });
}
function newButton(label,action,x,y,disabled=false,size=null){
  const source=label==='YES'?'yesButtonAlpha.png':label==='NO'?'noButtonAlpha.png':label==='TEST IT'?'testButtonAlpha.png':'nextButtonAlpha.png';
  const wide=size?.[0]??(label==='TEST IT'?140:label==='NEXT'?67:134);
  const high=size?.[1]??69;
  return '<button class="lay new-ui-button'+(disabled?' disabled':'')+'" '+box(x,y,wide,high)+' data-action="'+action+'" aria-label="'+label+'" '+(disabled?'disabled':'')+'><img src="assets/figma-current/hd/'+source+'" alt=""></button>';
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
    if(signatureInk)h+='<img class="lay new-signature-ink" '+box(524,82,291,260)+' src="'+signatureInk+'" alt="">';
    else h+='<canvas id="new-signature" class="lay new-signature-canvas" '+box(524,82,291,260)+' width="873" height="780" aria-label="Draw your signature"></canvas>';
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
  const ctx=c.getContext('2d');ctx.strokeStyle='#171717';ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';
  let activePointer=null,strokeMoved=false,hasInk=!!s.signed;
  function point(e){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};}
  c.onpointerdown=e=>{
    e.stopPropagation();e.preventDefault();
    if(activePointer!==null)return;
    activePointer=e.pointerId;strokeMoved=false;c.setPointerCapture(e.pointerId);
    const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);
  };
  c.onpointermove=e=>{
    if(activePointer!==e.pointerId)return;
    e.stopPropagation();e.preventDefault();
    const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();strokeMoved=true;
    if(!hasInk){
      hasInk=true;
      stage.querySelectorAll('.new-signature-sample,.new-signature-trace,.new-signature-guide').forEach(n=>n.remove());
      const next=stage.querySelector('.new-ui-button[data-action="next"]');
      if(next){next.disabled=false;next.removeAttribute('disabled');next.classList.remove('disabled');}
    }
  };
  const finish=e=>{
    if(activePointer!==e.pointerId)return;
    e.stopPropagation();e.preventDefault();
    activePointer=null;
    if(!strokeMoved)return;
    signatureInk=c.toDataURL('image/png');s.signed=true;save();
    // Keep the SAME canvas mounted so additional strokes remain possible.
    // Page 15 starts only when the user explicitly taps NEXT.
  };
  c.onpointerup=finish;
  c.onpointercancel=finish;
}
function arPackMarkup(){
  // Exact approved NewAR1 doll rectangles (636:367..370), frame local.
  const slots=[[97.915,220.083,89.830,252.060],[240.590,220.083,89.830,252.060],[97.915,515.745,89.830,252.060],[240.094,515.745,89.830,252.060]],order=[0,2,3,1];
  let h='<div class="ar-pack-flip">';
  h+=group(48,145,334,704,'ar-pack-face ar-pack-back',img(A.arPackBack,3.5,5.4,328.5,693.2,'ar-pack-image'));
  // Figma left-bottom overlapped stack (origin -2567,3285); coordinates here
  // are the same layers translated into the 428x926 AR frame. Never crop.
  let front=img(A.arOverlayFoilStates[0],50.5,150.363,328.482,693.166,'ar-intact-foil ar-original-foil');
  front+='<canvas class="ar-foil-static" width="428" height="926" aria-hidden="true"></canvas>';
  front+='<canvas class="ar-foil-morph" width="428" height="926" aria-hidden="true"></canvas>';
  front+=order.map((index,i)=>{const q=slots[i];return canvasFigure(index,q[0],q[1],q[2],q[3],'ar-pack-doll');}).join('');
  front+=img(A.arOverlayFrontStates[0],47.5,145,333.845,703.892,'ar-intact-clear ar-original-clear');
  front+='<canvas class="ar-front-static" width="428" height="926" aria-hidden="true"></canvas>';
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
// The exact SIX layers overlapped at the left-bottom of the Figma AR canvas.
// Three foil states and three front-plastic states progress in parallel.
const arMorphAssets=new Map();
let arMorphFrame=0;
function loadArMorphAsset(src){
  if(arMorphAssets.has(src))return arMorphAssets.get(src);
  const promise=new Promise((resolve,reject)=>{
    const im=new Image();
    im.onload=()=>resolve(im);
    im.onerror=()=>reject(new Error('Missing AR state: '+src));
    im.src=src;
  });
  arMorphAssets.set(src,promise);
  return promise;
}
function arPlacedFrame(im,rect){
  const canvas=document.createElement('canvas');
  canvas.width=428;canvas.height=926;
  // Keep all transparent margins. Cropping alpha pixels or fitting to a
  // generic rectangle changes the apparent pack size between frames.
  canvas.getContext('2d').drawImage(im,rect[0],rect[1],rect[2],rect[3]);
  return canvas;
}
// Estimate a small, smooth displacement field for each pair of already
// registered Figma images. This moves matching creases instead of dissolving
// every highlight and edge into two overlapping ghost images.
function arCreaseFlow(a,b){
  const width=428,height=926,cell=24,cols=Math.ceil(width/cell)+1,rows=Math.ceil(height/cell)+1;
  const vectors=new Float32Array(cols*rows*2);
  const intensity=(data,x,y)=>{
    const k=(y*width+x)*4,alpha=data[k+3]/255;
    return (data[k]*.299+data[k+1]*.587+data[k+2]*.114)*alpha;
  };
  for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
    const x=Math.min(width-14,Math.max(14,gx*cell));
    const y=Math.min(height-14,Math.max(14,gy*cell));
    let best=Infinity,bx=0,by=0;
    for(let dy=-12;dy<=12;dy+=3)for(let dx=-12;dx<=12;dx+=3){
      if(x+dx<12||x+dx>=width-12||y+dy<12||y+dy>=height-12)continue;
      let error=(dx*dx+dy*dy)*1.4;
      for(let sy=-9;sy<=9;sy+=6)for(let sx=-9;sx<=9;sx+=6){
        const ax=x+sx,ay=y+sy,bx2=ax+dx,by2=ay+dy;
        const ai=(ay*width+ax)*4,bi=(by2*width+bx2)*4;
        const alphaGap=a[ai+3]-b[bi+3];
        const lumGap=intensity(a,ax,ay)-intensity(b,bx2,by2);
        error+=lumGap*lumGap*.015+alphaGap*alphaGap*.016;
      }
      if(error<best){best=error;bx=dx;by=dy;}
    }
    const index=(gy*cols+gx)*2;
    vectors[index]=bx;vectors[index+1]=by;
  }
  // Neighbourhood regularization removes block-to-block jumps.
  const smooth=new Float32Array(vectors.length);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    let sumX=0,sumY=0,weight=0;
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
      const nx=Math.max(0,Math.min(cols-1,x+ox)),ny=Math.max(0,Math.min(rows-1,y+oy));
      const w=(ox===0&&oy===0)?3:1,index=(ny*cols+nx)*2;
      sumX+=vectors[index]*w;sumY+=vectors[index+1]*w;weight+=w;
    }
    const index=(y*cols+x)*2;
    smooth[index]=sumX/weight;smooth[index+1]=sumY/weight;
  }
  return {vectors:smooth,cols,rows,cell};
}
function arWarpedPair(pair,amount,output,opacity){
  const width=428,height=926,flow=pair.flow,field=flow.vectors;
  const source=pair.source,target=pair.target;
  const read=(pixels,x,y,k)=>{
    const xx=Math.max(0,Math.min(width-1,Math.round(x)));
    const yy=Math.max(0,Math.min(height-1,Math.round(y)));
    return pixels[(yy*width+xx)*4+k];
  };
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const gridX=Math.min(flow.cols-2,x/flow.cell),gridY=Math.min(flow.rows-2,y/flow.cell);
    const ix=Math.floor(gridX),iy=Math.floor(gridY),u=gridX-ix,v=gridY-iy;
    const j=(iy*flow.cols+ix)*2,jR=j+2,jB=j+flow.cols*2,jBR=jB+2;
    // The six Figma stages already share their external sheet registration.
    // Feature matching is unreliable on the reflective foil, so only the
    // interiors of the four cavities may move. The outer frame stays pinned.
    const cavities=[[144,330],[285,330],[144,623],[285,623]];
    let region=0;
    for(const [cx,cy] of cavities){
      const rx=(x-cx)/57,ry=(y-cy)/132,radial=rx*rx+ry*ry;
      if(radial>=1)continue;
      const falloff=(1-radial)*(1-radial);
      if(falloff>region)region=falloff;
    }
    const rawX=(field[j]*(1-u)+field[jR]*u)*(1-v)+(field[jB]*(1-u)+field[jBR]*u)*v;
    const rawY=(field[j+1]*(1-u)+field[jR+1]*u)*(1-v)+(field[jB+1]*(1-u)+field[jBR+1]*u)*v;
    const vx=Math.max(-7,Math.min(7,rawX))*region;
    const vy=Math.max(-7,Math.min(7,rawY))*region;
    const srcX=x-vx*amount,srcY=y-vy*amount;
    const dstX=x+vx*(1-amount),dstY=y+vy*(1-amount);
    const sa=read(source,srcX,srcY,3)*(1-amount);
    const da=read(target,dstX,dstY,3)*amount,total=sa+da;
    const k=(y*width+x)*4;
    if(total<.5){output[k]=0;output[k+1]=0;output[k+2]=0;output[k+3]=0;continue;}
    for(let channel=0;channel<3;channel++){
      output[k+channel]=(read(source,srcX,srcY,channel)*sa+read(target,dstX,dstY,channel)*da)/total;
    }
    output[k+3]=total*opacity;
  }
}
// Figma ellipse masks 786:227/228/229/230, translated from the
// shared left-bottom stack origin (-2567,3285) to the AR artboard (47.5,145).
// Keep the plastic sheet outside these four capsule domes pixel-identical.
// Absolute ellipse x positions: -2541 and -2402; base x: -2573 => AR x: 79.5, 218.5.
const arCapsuleOvals=[
  [79.5,209,129,276],[218.5,209,129,276],
  [79.5,506,129,276],[218.5,506,129,276]
];
function arCapsuleMask(){
  const mask=new Uint8Array(428*926);
  for(const [left,top,w,h] of arCapsuleOvals){
    const cx=left+w/2,cy=top+h/2,rx=w/2,ry=h/2;
    for(let y=Math.max(0,Math.floor(top));y<Math.min(926,Math.ceil(top+h));y++){
      for(let x=Math.max(0,Math.floor(left));x<Math.min(428,Math.ceil(left+w));x++){
        const nx=(x+.5-cx)/rx,ny=(y+.5-cy)/ry;
        const dist=Math.sqrt(nx*nx+ny*ny);
        // A two-pixel feather prevents a visible sharp seam at the dome rim.
        const feather=Math.max(0,Math.min(1,(1-dist)*Math.min(rx,ry)/2));
        const i=y*428+x;
        mask[i]=Math.max(mask[i],Math.round(feather*255));
      }
    }
  }
  return mask;
}
async function morphArBlister(){
  try{
    const imgs=await Promise.all([
      A.arOverlayFoilStates[0],A.arOverlayFoilStates[2],A.arOverlayFrontStates[0],A.arOverlayFrontStates[1]
    ].map(loadArMorphAsset));
    if(s.page!=='arOpen')return;
    const foil=stage.querySelector('.ar-foil-morph');
    const plastic=stage.querySelector('.ar-front-morph');
    if(!foil||!plastic)return;
    // Exact Figma absolute positions of 784:217/216/215, 784:218/219/220
    // translated from shared origin (-2567,3285) to (47.5,145).
    const foilRects=[
      [50.5,150.363,328.482,693.166],
      [47.5,165,327,660]
    ];
    const plasticRects=[
      [47.5,145,333.845,703.892],
      [52.5,-70,329,1133]
    ];
    const domeMask=arCapsuleMask();
    const layers=[
      {canvas:foil,staticCanvas:stage.querySelector('.ar-foil-static'),
        images:imgs.slice(0,2),rects:foilRects,opacity:1},
      {canvas:plastic,staticCanvas:stage.querySelector('.ar-front-static'),
        images:imgs.slice(2,4),rects:plasticRects,opacity:.7}
    ].map(layer=>{
      if(!layer.staticCanvas)throw new Error('Missing fixed AR sheet canvas');
      const ctx=layer.canvas.getContext('2d');
      const samples=layer.images.map((im,i)=>
        arPlacedFrame(im,layer.rects[i]).getContext('2d').getImageData(0,0,428,926).data);
      // Paint the original sheet exactly once OUTSIDE the four Figma ovals.
      // Its alpha is zero INSIDE so that a torn oval can become a real hole.
      const staticCtx=layer.staticCanvas.getContext('2d');
      const staticPixels=staticCtx.createImageData(428,926);
      for(let pixel=0;pixel<domeMask.length;pixel++){
        const k=pixel*4,initial=samples[0],retain=1-domeMask[pixel]/255;
        staticPixels.data[k]=initial[k];
        staticPixels.data[k+1]=initial[k+1];
        staticPixels.data[k+2]=initial[k+2];
        staticPixels.data[k+3]=Math.round(initial[k+3]*retain*layer.opacity);
      }
      staticCtx.putImageData(staticPixels,0,0);
      return {...layer,ctx,samples,pixels:ctx.createImageData(428,926),
        pair:{source:samples[0],target:samples[1],flow:arCreaseFlow(samples[0],samples[1])}};
    });
    function renderProgress(p){
      for(const layer of layers){
        arWarpedPair(layer.pair,p,layer.pixels.data,layer.opacity);
        // No pixel outside the original four Figma ovals is ever animated.
        // Avoid a second semi-transparent sheet covering the fixed background.
        const out=layer.pixels.data;
        for(let pixel=0;pixel<domeMask.length;pixel++){
          out[pixel*4+3]=Math.round(out[pixel*4+3]*domeMask[pixel]/255);
        }
        layer.ctx.putImageData(layer.pixels,0,0);
      }
    }
    renderProgress(0);
    for(const layer of layers){
      layer.staticCanvas.style.opacity='1';
      layer.canvas.style.opacity='1';
    }
    stage.querySelectorAll('.ar-original-foil,.ar-original-clear').forEach(n=>n.style.opacity='0');
    let begin=null;
    function step(time){
      if(s.page!=='arOpen')return;
      if(begin===null)begin=time;
      const t=Math.min((time-begin)/240,1);
      // ONE progression clock for both surfaces, from intact to final; no intermediate asset.
      const p=1-Math.pow(1-t,3);
      renderProgress(p);
      if(t<1)arMorphFrame=requestAnimationFrame(step);
      else if(s.page==='arOpen')runArDollDrop();
    }
    arMorphFrame=requestAnimationFrame(step);
  }catch(error){
    console.error('[DCD] AR start/end images unavailable:',error);
    // Do not animate a different set of images or silently skip to a fall.
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
  const pack=stage.querySelector('.ar-pack-front');
  const nodes=[...(pack?.querySelectorAll('.ar-pack-doll')||[])];
  const slots=[[97.915,220.083],[240.590,220.083],[97.915,515.745],[240.094,515.745]];
  if(nodes.length!==4){arDropFinished=true;finishArIfReady();return;}

  // Create a different, compact overlapping heap on every play. Each figure
  // takes a separate tumbling route into the pile rather than radiating out
  // in the former fixed left/right fan pattern.
  const random=(min,max)=>min+Math.random()*(max-min);
  // Final top-left targets all share one visual center. A near-horizontal
  // tumble (rather than four radially divergent poses) reads as a small pile.
  // Offsets introduce visible layers without spreading dolls across the floor.
  const pile=[
    {x:157,y:575,angle:-88,layer:1},
    {x:180,y:604,angle:96,layer:3},
    {x:166,y:622,angle:-105,layer:4},
    {x:189,y:587,angle:77,layer:2}
  ];
  for(let i=pile.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [pile[i],pile[j]]=[pile[j],pile[i]];
  }
  const bodies=nodes.map((node,i)=>{
    const [x,y]=slots[i],target=pile[i];
    node.classList.remove('ar-pack-doll');
    node.classList.add('ar-falling-doll','ar-falling-'+i,'ar-depth-retreat');
    stage.appendChild(node);
    Object.assign(node.style,{
      left:'0px',top:'0px',width:FIGMA_PACK_DOLL.width+'px',
      height:FIGMA_PACK_DOLL.height+'px',opacity:'1',
      transformOrigin:'50% 72%',animation:'none',pointerEvents:'none',
      transform:'translate('+x+'px,'+y+'px) rotate(0deg) scale(1)'
    });
    return {
      node,x,y,
      targetX:target.x+random(-7,7),
      targetY:target.y+random(-7,7),
      angle:target.angle+random(-9,9),
      stagger:random(0,65),
      sway:random(-15,15),
      layer:target.layer,
      released:false
    };
  });

  // Layer ordering follows the stack, not source slot order.
  bodies.forEach(b=>{b.node.style.setProperty('--pile-layer',String(5+b.layer));});
  let start=null;
  function frame(now){
    if(s.page!=='arOpen')return;
    if(start===null)start=now;
    const elapsed=now-start,retreat=Math.min(elapsed/140,1);
    if(elapsed<140){
      const eased=retreat*retreat*(3-2*retreat);
      bodies.forEach(b=>{
        b.node.style.transform='translate('+b.x+'px,'+(b.y-16*eased)+'px) rotate(0deg) scale('+(1-.18*eased)+')';
      });
    }else{
      for(const b of bodies){
        if(!b.released){b.node.classList.remove('ar-depth-retreat');b.released=true;}
        const progress=Math.max(0,Math.min(1,(elapsed-140-b.stagger)/(1050-140-b.stagger)));
        // Fast gravity-like tumble with a tiny final settling bounce.
        const fall=1-Math.pow(1-progress,2.65);
        const tumble=1-Math.pow(1-progress,2);
        const x=b.x+(b.targetX-b.x)*fall+Math.sin(Math.PI*progress)*b.sway;
        const y=b.y-16+(b.targetY-(b.y-16))*fall-
          Math.sin(Math.PI*Math.min(1,progress))*12*(1-progress);
        const rotation=b.angle*tumble;
        b.node.style.transform='translate('+x+'px,'+y+'px) rotate('+rotation+'deg) scale(.82)';
      }
    }
    if(elapsed<1050)arDropFrame=requestAnimationFrame(frame);
    else{arDropFinished=true;finishArIfReady();}
  }
  arDropFrame=requestAnimationFrame(frame);
}
function beginAr(){arDropFinished=false;arCameraReady=false;arCameraError='';[A.arOverlayFoilStates[0],A.arOverlayFoilStates[2],A.arOverlayFrontStates[0],A.arOverlayFrontStates[1]].forEach(src=>loadArMorphAsset(src).catch(()=>{}));setPage('ar');askArCamera();}
function openArPack(){if(s.page!=='ar')return;setPage('arOpen','opening');morphArBlister();}
function render(){fit();stage.className='stage page-'+s.page+' phase-'+s.phase;let h='';if(s.page==='00'||s.page==='01')h=introMarkup(s.page);else if(s.page==='02')h=resultMarkup();else if(s.page==='03')h='<div class="rotate-preview">'+workbenchMarkup(false).replace(/<div class="lay doto[^"]*"[^>]*>[\s\S]*?<\/div>/g,'')+'</div>'+(s.phase==='ready'?text('ROTATE YOUR PHONE',73,554,292,44,'doto guide-blink rotate-guide'):'');else if(s.page==='workbench'){warmPackingAssets();h=workbenchMarkup();}else if(['08a','08b','09','10','11'].includes(s.page))h=packingMarkup();else if(['12','13','14','14done','15','16'].includes(s.page))h=newPrescriptionMarkup();else if(['ar','arOpen','arFace'].includes(s.page))h=arMarkup();
stage.innerHTML=dimensions()[0]===874?'<div class="scene-content">'+h+'</div>':h;if((s.page==='00'||s.page==='01')&&window.DCDFigmaGlass)window.DCDFigmaGlass.render(stage);drawFigures();startNewTickers();const packHand=stage.querySelector('.pack-guide-hand');
if(packHand){
  // The workbench re-renders after injections; keep the animation clock
  // independent of each newly created DOM image.
  const elapsed=Math.max(0,Date.now()-(s.packGuideHandStartedAt||Date.now()));
  packHand.style.setProperty('animation-delay',(-elapsed)+'ms','important');
  const endHand=()=>{
    if(s.packGuideHandFinished||!s.packGuideHandStartedAt)return;
    if(Date.now()-s.packGuideHandStartedAt<PACK_HAND_TOTAL_MS)return;
    s.packGuideHandFinished=true;save();
    stage.querySelector('.pack-guide-hand')?.remove();
  };
  packHand.addEventListener('animationend',endHand,{once:true});
  setTimeout(endHand,Math.max(0,PACK_HAND_TOTAL_MS-elapsed)+40);
}if(s.page==='14')bindNewSignature();if(s.page==='arFace')attachArCamera();if(s.page==='01'&&s.phase==='rupture'){let v=stage.querySelector('video');if(v){v.onended=finishRupture;v.onerror=finishRupture;}else queueMicrotask(finishRupture);}}
function finishRupture(){if(s.page==='01'&&s.phase==='rupture'){videoEnded=true;setPage('02');}}
function runIntro(p){setPage(p,'intro');later(()=>{if(s.page===p&&s.phase==='intro'){s.phase=p==='00'?'loop':'guide';render();}},M.introMs);}
async function animatePackIntoPrescription(){
  // The same WEB09 foil remains on screen at the ejection endpoint (277,121).
  // Only the transitional overlay is new. All original art and WEB12 geometry
  // stay unchanged; the pack contents remain the four saved figure canvases.
  if(s.page!=='11')return;
  const root=stage.querySelector('.scene-content'),rear=root?.querySelector('.ejecting-pack');
  if(!root||!rear){if(s.page==='11')setPage('12');return;}
  const next=document.createElement('div');
  next.className='pack-flight-next';
  next.innerHTML=newPrescriptionMarkup('12');
  // The front face is animated separately so it does not appear twice.
  const duplicatePack=next.querySelector('.new-pack-assembly');
  if(duplicatePack)duplicatePack.style.visibility='hidden';

  const flight=document.createElement('div');
  flight.className='pack-flight-overlay';
  const front=document.createElement('div');
  front.className='pack-flight-front';
  front.innerHTML=newPackMarkup();
  flight.appendChild(front);
  root.appendChild(next);
  root.appendChild(flight);
  // Stop the finished CSS ejection without rebuilding the existing foil image.
  rear.classList.remove('ejecting-pack');
  rear.classList.add('pack-flight-rear');
  rear.style.left='277px';
  rear.style.top='121px';
  rear.style.translate='none';
  rear.style.transform='none';
  rear.style.animation='none';
  flight.appendChild(rear);
  // Render the SAME saved doll states on the new front face before it flips in.
  const figures=[...front.querySelectorAll('canvas[data-figure]')];
  await Promise.all(figures.map(c=>{
    const item=s.figures[+c.dataset.figure];
    return window.DCDMorph.draw(c,item.kind,item.value,c.dataset.view||'front');
  }));
  if(s.page!=='11')return;

  const D=1580;
  const timing={duration:D,easing:'linear',fill:'forwards'};
  const rearMotion=rear.animate([
    {offset:0,transform:'perspective(1100px) translate3d(0,0,0) rotateZ(0deg) rotateY(0deg) scale(1)',opacity:1},
    {offset:.18,transform:'perspective(1100px) translate3d(12px,-3px,0) rotateZ(-5deg) rotateY(3deg) scale(1.25)',opacity:1},
    {offset:.39,transform:'perspective(1100px) translate3d(30px,-6px,0) rotateZ(-13deg) rotateY(15deg) scale(1.95)',opacity:1},
    {offset:.56,transform:'perspective(1100px) translate3d(10px,0,0) rotateZ(-31deg) rotateY(88deg) scale(2.75)',opacity:0},
    {offset:1,transform:'perspective(1100px) translate3d(10px,0,0) rotateZ(-31deg) rotateY(88deg) scale(2.75)',opacity:0}
  ],timing);
  const frontMotion=front.animate([
    {offset:0,transform:'perspective(1100px) translate(177px,0) rotateZ(-90deg) rotateY(-87deg) scale(2.65)',opacity:0},
    {offset:.47,transform:'perspective(1100px) translate(177px,0) rotateZ(-90deg) rotateY(-87deg) scale(2.65)',opacity:0},
    {offset:.58,transform:'perspective(1100px) translate(177px,0) rotateZ(-82deg) rotateY(-10deg) scale(2.72)',opacity:1},
    {offset:.70,transform:'perspective(1100px) translate(126px,-6px) rotateZ(-44deg) rotateY(0deg) scale(2.1)',opacity:1},
    {offset:.87,transform:'perspective(1100px) translate(-4px,9px) rotateZ(3deg) rotateY(0deg) scale(.94)',opacity:1},
    {offset:.94,transform:'perspective(1100px) translate(0,-3px) rotateZ(-1deg) rotateY(0deg) scale(1.025)',opacity:1},
    {offset:1,transform:'perspective(1100px) translate(0,0) rotateZ(0deg) rotateY(0deg) scale(1)',opacity:1}
  ],timing);
  const nextMotion=next.animate([
    {offset:0,opacity:0},
    {offset:.30,opacity:0},
    {offset:.69,opacity:1},
    {offset:1,opacity:1}
  ],timing);
  await Promise.allSettled([rearMotion.finished,frontMotion.finished,nextMotion.finished]);
  if(s.page==='11')setPage('12');
}
async function beginPacking(){
  // Warm the exact four front-body references while the machine is running,
  // so the WEB12 front face does not stall at the moment of the fast release.
  s.figures.forEach(f=>window.DCDMorph.preload(f.kind,f.value,'front').catch(()=>{}));
  // Keep WEB04 contents alive until they slide into the packaging machine.
  render();s.page='08a';s.phase='sliding';save();stage.className='stage page-08a phase-sliding';
  const pack=stage.querySelector('.workbench-pack');
  if(pack){
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const slide=pack.animate([{translate:'0px 0px'},{translate:'380px 0px'}],{duration:1080,easing:'linear',fill:'forwards'});
    await slide.finished.catch(()=>{});
  }
  if(s.page!=='08a')return;
  setPage('09');
  // Wait for the foil's actual final ejection frame; do not pause on WEB11.
  const foil=stage.querySelector('.ejecting-pack');
  const ejected=new Promise(resolve=>{
    if(!foil){resolve();return;}
    let done=false;
    const finish=()=>{if(done)return;done=true;resolve();};
    foil.addEventListener('animationend',e=>{
      if(e.target===foil&&e.animationName==='packExtrudeFigma')finish();
    });
    // Browser animationend may be suppressed by background-tab throttling.
    setTimeout(finish,2370);
  });
  await new Promise(resolve=>later(resolve,1130));
  if(s.page!=='09')return;
  s.page='10';save();stage.className='stage page-10 phase-ready';
  await new Promise(resolve=>later(resolve,850));
  if(s.page!=='10')return;
  s.page='11';save();stage.className='stage page-11 phase-ready';
  const label=stage.querySelector('.wave');
  if(label){label.innerHTML=waveText('!!');label.style.left='530px';label.style.top='206px';label.style.width='292px';}
  await ejected;
  if(s.page==='11')await animatePackIntoPrescription();
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
  // Hide ONLY the label beside the bottle whose liquid was just selected.
  // The other bottle keeps its own label until it is used independently.
  stage.querySelector('.bottle-label-'+color)?.remove();
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
  if(from==='14'||from==='14done'){setPage('15');return;}
  if(from!=='12'&&from!=='13')return;
  s.phase='transition';stage.querySelector('.new-ui-button')?.setAttribute('disabled','');
  const content=stage.querySelector('.new-flow-content');
  const moves=[];
  // Both expectation and side-effect sections leave upward on NEXT.
  // Only the side-effect→signature transition also raises the dose.
  if(from==='12'&&content){
    moves.push(content.animate(
      [{translate:'0 0'},{translate:'0 -310px'}],
      {duration:950,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'}
    ).finished);
  }
  if(from==='13'){
    const dose=stage.querySelector('.new-dose-group');
    const timing={duration:950,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'};
    if(content)moves.push(content.animate([{translate:'0 0'},{translate:'0 -310px'}],timing).finished);
    if(dose)moves.push(dose.animate([{translate:'0 0'},{translate:'0 -338px'}],timing).finished);
  }
  await Promise.allSettled(moves);
  if(s.page!==from)return;
  setPage(from==='12'?'13':'14',from==='12'?'typing':'ready');
  if(from==='12')later(()=>{if(s.page==='13'&&s.phase==='typing'){s.phase='ready';stage.classList.replace('phase-typing','phase-ready');}},4200);
}
function act(a){if(a==='enter'&&s.page==='00')runIntro('01');if(a==='start')startRotateGuide();if(a==='next')advanceNewPrescription();if(a==='decline'&&s.page==='15')setPage('16');if(a==='ar')beginAr();if(a==='openAr')openArPack();}
stage.addEventListener('click',e=>{let b=e.target.closest('[data-action]');if(b)act(b.dataset.action);});
stage.addEventListener('change',e=>{
  const t=e.target;
  if(!t.matches('input[data-kind]'))return;
  const kind=t.dataset.kind,index=Number(t.dataset.index);
  const chosen=new Set(s[kind]);
  if(t.checked)chosen.add(index);else chosen.delete(index);
  s[kind]=[...chosen];
  save();
  // DO NOT render the whole prescription screen for a checkbox. Retain the
  // existing animated text and both independently scrolling ticker nodes.
  if((s.page==='12'&&kind==='expected')||(s.page==='13'&&kind==='side')){
    const next=stage.querySelector('.new-ui-button');
    if(next){
      const disabled=chosen.size===0;
      next.disabled=disabled;
      next.classList.toggle('disabled',disabled);
    }
    return;
  }
  // Legacy checklist (only when explicitly mounted) also needs no rebuild.
});
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
