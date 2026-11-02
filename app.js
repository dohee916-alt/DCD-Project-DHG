(() => {
'use strict';
const A=window.DCD_ASSETS, M=window.DCD_MOTION, stage=document.querySelector('#stage');
const effects=['Weight Loss','Appetite Control','Changes in Body Shape','Confidence in Appearance','Improved Self-Image','Improved Blood Sugar Control','Reduced Weight-Related Health Risks','Better Metabolic Health'];
const sides=['Nausea','Digestive Discomfort','Other Adverse Effects','Being Accused of Cheating','Having My Effort Dismissed','Being Judged for Using Medication','Being Pressured to Explain My Choice','Fear of Weight Regain'];
// WEB04 (Figma 334:1022): top-left, top-right, bottom-left, bottom-right.
const packRect=[584,96,483,229];
const packSlots=[[638,131,172,62],[843,131,172,62],[638,229,172,61],[843,229,172,61]];
const key='DCD_IMPLEMENTATION_1';
const signaturePath='M2.50021 39.3162C3.97397 25.5131 15.0272 6.78039 32.7124 3.08321C57.2822 -2.05324 36.3968 27.7477 15.0272 52.6265C3.31169 66.2659 29.4323 61.4999 52.6083 32.6614C71.0303 9.7382 81.3467 24.5272 52.6083 61.4999';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fresh=()=>({page:'00',phase:'intro',figures:Array.from({length:4},(_,i)=>({kind:i+1,value:35+Math.floor(Math.random()*31),orange:0,purple:0,packed:false})),active:0,loaded:null,firstFill:false,firstInject:false,used:{orange:false,purple:false},expected:[],side:[],signed:false});
let s=fresh(),drag=null,gesture=new Map(),timers=[],scale=1,offset={x:0,y:0},videoEnded=false;
let syringeInjectionAngle=45,rotateGuideFinished=false;
let packingAssetsWarmed=false;
function warmPackingAssets(){
  if(packingAssetsWarmed)return;
  packingAssetsWarmed=true;
  [A.conveyor,A.machine,A.packFoil,A.packClearFront].forEach(src=>{const image=new Image();image.src=src;});
}
try{let old=JSON.parse(sessionStorage.getItem(key));if(old&&Array.isArray(old.figures)&&old.figures.length===4){s={...fresh(),...old};s.firstInject=!!(old.firstInject||s.figures.some(f=>f.orange||f.purple));if(s.page==='14'||s.page==='14done'){s.page='14';s.signed=false;}if(['08a','08b','09','10','11'].includes(s.page)){s.page='12';s.phase='ready';}}}catch{}
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
function horizontalFigure(i,x,y,w,h,cls='',view='back'){return canvasFigure(i,x+(w-h)/2,y+(h-w)/2,h,w,cls,-90,view);}
function syringeMarkup(cls=''){
  const color=s.loaded,liquid=color==='orange'?A.syringeLiquidOrange:A.syringeLiquidPurple;
  return group(270,125,22,297,'syringe syringe-2d '+cls,
    img(A.syringePlunger,4,65,17,232,'syringe-plunger'+(color?' filled':''))+
    '<div class="syringe-drug-window" aria-hidden="true"><img class="syringe-drug'+(color?' filled':'')+'" src="'+liquid+'" alt=""></div>'+
    img(A.syringeBarrel,0,0,22,219,'syringe-barrel'));
}
function setPage(p,phase='ready'){clearTimers();s.page=p;s.phase=phase;save();render();}
function dimensions(){return ['00','01','02','03','ar'].includes(s.page)?[428,926]:[874,428];}
function fit(){let [w,h]=dimensions(),v=document.querySelector('#viewport'),W=v.clientWidth,H=v.clientHeight,rotated=w>h&&W<H;scale=Math.min((rotated?H:W)/w,(rotated?W:H)/h);stage.style.width=w+'px';stage.style.height=h+'px';stage.style.clipPath='none';stage.style.transform='translate(-50%,-50%) rotate('+(rotated?90:0)+'deg) scale('+scale+')';stage.style.transformOrigin='center';stage.dataset.orientation=rotated?'rotated':'normal';offset={x:W/2,y:H/2};}
function localPoint(e){let r=stage.getBoundingClientRect(),dx=dimensions()[0]===874?52:0;if(stage.dataset.orientation==='rotated'){let [w,h]=dimensions(),cx=r.left+r.width/2,cy=r.top+r.height/2;return{x:w/2+(e.clientY-cy)/scale+dx,y:h/2-(e.clientX-cx)/scale};}return{x:(e.clientX-r.left)/scale+dx,y:(e.clientY-r.top)/scale};}
function hit(p,x,y,w,h){return p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h;}
const ropes={upper:{line:[6,20,406,596],pull:[-74,-96]},lower:{line:[8,752,406,615],pull:[110,-44]}};
function ropeAt(p){let closest=null,distance=Infinity;for(const [name,{line}] of Object.entries(ropes)){let [x1,y1,x2,y2]=line,t=clamp(((p.x-x1)*(x2-x1)+(p.y-y1)*(y2-y1))/((x2-x1)**2+(y2-y1)**2),0,1),d=Math.hypot(p.x-(x1+t*(x2-x1)),p.y-(y1+t*(y2-y1)));if(d<distance){closest=name;distance=d;}}return distance<=55?closest:null;}
function pullDistance(g,p){let [dx,dy]=ropes[g.rope].pull,len=Math.hypot(dx,dy);return ((p.x-g.start.x)*dx+(p.y-g.start.y)*dy)/len;}
function drawFigures(){stage.querySelectorAll('canvas[data-figure]').forEach(c=>{let i=+c.dataset.figure;window.DCDMorph.draw(c,s.figures[i].kind,s.figures[i].value,c.dataset.view||'front');});}
function animateFigureValue(index,from,to,duration=530){return new Promise(resolve=>{let start=null,last=-1;function frame(t){if(start===null)start=t;let u=Math.min((t-start)/duration,1),e=u*u*(3-2*u),value=from+(to-from)*e;if(Math.abs(value-last)>.35||u===1){s.figures[index].value=value;const c=stage.querySelector('canvas.active-figure');if(c&&c.isConnected)window.DCDMorph.draw(c,s.figures[index].kind,value);last=value;}if(u<1)requestAnimationFrame(frame);else{s.figures[index].value=to;resolve();}}requestAnimationFrame(frame);});}
function introMarkup(p){let copy=['THE','BRAND','NEW','GLP-1'];let h=img(A.opening,0,0,428,926,'poster-art');if(s.phase==='intro')h+=text(copy.map((v,i)=>'<span class="impact headline-orange" style="animation-delay:'+(0.05+i*.115)+'s">'+v+'</span>').join(''),69,345,292,296,'title-stack');else if(p==='00')h+=text(copy.map(v=>'<span class="title-line headline-orange">'+v+'</span>').join(''),69,345,292,296,'title-stack fixed');
h+='<div class="poster-dodge" aria-hidden="true"></div>';
if(p==='00'){if(s.phase!=='intro')h+=text('COME VISIT TO TRY IT!',68,799,292,22,'poster-cta guide-blink');h+='<button class="full-hit" data-action="enter" aria-label="Visit website"></button>';}
else if(s.phase==='guide'){h+=text('PULL<br>THE STRINGS<br>APART',33,435,376,96,'doto guide-blink guide-copy');h+=img(A.gestureHand,0,186,211,249,'gesture gesture-left');h+=img(A.gestureHand,208,620,220,249,'gesture gesture-right');h+='<div class="pull-zone left-zone" aria-label="Pull left string"></div><div class="pull-zone right-zone" aria-label="Pull right string"></div>';}
else if(s.phase==='rupture'&&A.openingBreakVideo){h+='<video class="rupture-video" autoplay muted playsinline src="'+A.openingBreakVideo+'"></video>';}
return h;}
function resultMarkup(){let h=img(A.openingLastFrame||A.opening,0,0,428,926);h+='<div class="poster-dodge" aria-hidden="true"></div>';h+=text('THE PILL IS GONE..',78,139,292,22,'result-top');h+=text('OOPS!',-5,141,292,22,'oops');h+=text('LET’S MAKE OUR OWN!',68,809,292,22,'result-bottom');h+='<button type="button" class="lay figma-cta" data-action="start" style="left:132px;top:453px;width:166px;height:60px" aria-label="LET’S GO"><svg viewBox="0 0 166 60" width="166" height="60" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cta-perimeter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EA5A06"/><stop offset=".5048" stop-color="#F2DDDA"/><stop offset="1" stop-color="#E0480A"/></linearGradient><radialGradient id="cta-face" cx=".5" cy=".5" r=".65"><stop offset="0" stop-color="#FF630B" stop-opacity=".97"/><stop offset=".38" stop-color="#FF9142" stop-opacity=".91"/><stop offset=".7" stop-color="#FFBA91" stop-opacity=".91"/><stop offset="1" stop-color="#FFEDE0" stop-opacity=".96"/></radialGradient><radialGradient id="cta-glow"><stop offset="0" stop-color="#FF3300" stop-opacity=".43"/><stop offset=".45" stop-color="#FF571A" stop-opacity=".28"/><stop offset="1" stop-color="#FFCC99" stop-opacity="0"/></radialGradient><linearGradient id="cta-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".85"/><stop offset=".33" stop-color="#FFD4B2" stop-opacity=".8"/><stop offset="1" stop-color="#FFFFFF" stop-opacity=".58"/></linearGradient></defs><rect x=".5" y=".5" width="165" height="59" rx="29.5" fill="url(#cta-perimeter)"/><rect x="3" y="2.5" width="160" height="55" rx="27.5" fill="url(#cta-face)" stroke="#FFF2E3" stroke-opacity=".3"/><rect x="3" y="2.5" width="160" height="55" rx="27.5" fill="url(#cta-glow)"/><rect x=".5" y=".5" width="165" height="59" rx="29.5" fill="none" stroke="url(#cta-rim)" stroke-width=".5"/><text x="83" y="37" text-anchor="middle" fill="#FFFFFF" font-family="Source Sans 3,Arial,sans-serif" font-size="20" font-weight="700">LET’S GO</text></svg></button>';return h;}
function workbenchMarkup(showTutorial=true){let f=s.figures[s.active],h=img(A.workbenchBackground,52,0,874,428,'bg')+img(A.workbenchTray,308,39,237,355,'tray')+img(A.packClearBack,...packRect,'pack pack-image pack-clear-back');h+=img(A.purpleBottle,90,45,107,82,'bottle')+img(A.orangeBottle,89,146,107,82,'bottle');if(!s.firstInject)h+=text('GAIN<br>WEIGHT',205.7,87.5,62.8,34.4,'bottle-label')+text('LOOSE<br>WEIGHT',205.7,168.5,62.8,34.4,'bottle-label');
for(let i=0;i<4;i++)if(s.figures[i].packed){let q=packSlots[i];h+=horizontalFigure(i,...q,'packed-figure');}
h+=canvasFigure(s.active,377,81,100,281,'active-figure');h+=syringeMarkup();
if(showTutorial&&!s.firstFill&&s.phase==='ready')h+=img(A.syringeGuideHand,141,273,164,155,'syringe-tutorial tutorial-hand tutorial-to-bottle');
else if(showTutorial&&s.firstFill&&!s.firstInject&&s.loaded&&s.phase==='ready')h+=img(A.syringeGuideHand,141,273,164,155,'syringe-tutorial tutorial-hand tutorial-to-doll');
if(f.value===0)h+=text('MINIMIZE',282,387,292,44,'doto guide-blink workbench-guide');if(f.value===100)h+=text('MAXIMIZE',282,387,292,44,'doto guide-blink workbench-guide');
h+=text('DOLL '+(s.active+1)+'/4',399,29,100,14,'progress workbench-count');return h;}
function rearPackMarkup(x,y,w,h,cls=''){return img(A.packFoil,x,y,w,h,'rear-pack pack-image pack-foil '+cls);}
function packingMarkup(){let h=img(A.workbenchBackground,52,0,874,428,'bg');if(['08a','08b'].includes(s.page)){h+=img(A.workbenchTray,308,39,237,355,'tray')+img(A.purpleBottle,90,45,107,82,'bottle')+img(A.orangeBottle,89,146,107,82,'bottle')+syringeMarkup('staged-tool');
  let inside=img(A.packClearBack,0,0,packRect[2],packRect[3],'pack pack-image pack-clear-back')+packSlots.map((q,i)=>horizontalFigure(i,q[0]-packRect[0],q[1]-packRect[1],q[2],q[3],'packed-figure')).join('');
  h+=group(...packRect,'pack-assembly sliding-pack',inside);return h;}
h+=img(A.conveyor,123,79,540,270,'conveyor');h+=rearPackMarkup(s.page==='11'?271:52,0,437,428,s.page==='11'?'':'ejecting-pack');h+=img(A.machine,52,29,101,376,'machine');h+=text(waveText(s.page==='11'?'!!':'BEING PACKED..'),s.page==='11'?798.1:620.7,213.3,s.page==='11'?16.6:196.4,19,'packed-copy wave');return h;}
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
  paper+=text('AVERAGE OF APPLIED GLP-1 : '+(s.figures.reduce((a,f)=>a+f.orange,0)/4).toFixed(1),75,156,291,25,'dose');
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
  let dose=(s.figures.reduce((a,f)=>a+f.orange,0)/4).toFixed(1);
  let paper=img(A.consentClipboardBase,0,0,441,588,'consent-paper');
  paper+=text('PRESCRIPTION',165,113,130,25,'paper-head');
  paper+=text('AVERAGE OF APPLIED GLP-1 : '+dose,75,156,291,25,'dose');
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
function render(){fit();stage.className='stage page-'+s.page+' phase-'+s.phase;let h='';if(s.page==='00'||s.page==='01')h=introMarkup(s.page);else if(s.page==='02')h=resultMarkup();else if(s.page==='03')h='<div class="rotate-preview">'+workbenchMarkup(false).replace(/<div class="lay doto[^"]*"[^>]*>[\s\S]*?<\/div>/g,'')+'</div>'+(s.phase==='ready'?text('ROTATE YOUR PHONE',73,554,292,44,'doto guide-blink rotate-guide'):'');else if(s.page==='workbench'){warmPackingAssets();h=workbenchMarkup();}else if(['08a','08b','09','10','11'].includes(s.page))h=packingMarkup();else if(['12','13','14','14done'].includes(s.page))h=prescriptionMarkup();else if(['15','16'].includes(s.page))h=consentMarkup();else if(s.page==='ar')h='<div class="ar-placeholder">AR<br><small>Portrait experience</small></div>';
stage.innerHTML=dimensions()[0]===874?'<div class="scene-content">'+h+'</div>':h;drawFigures();if(s.page==='14')bindSignature();if(s.page==='01'&&s.phase==='rupture'){let v=stage.querySelector('video');if(v){v.onended=finishRupture;v.onerror=finishRupture;}else queueMicrotask(finishRupture);}}
function finishRupture(){if(s.page==='01'&&s.phase==='rupture'){videoEnded=true;setPage('02');}}
function runIntro(p){setPage(p,'intro');later(()=>{if(s.page===p&&s.phase==='intro'){s.phase=p==='00'?'loop':'guide';render();}},M.introMs);}
function beginPacking(){
  // One continuous slide. Replacing 08A with 08B mid-animation caused a visible hitch.
  setPage('08a');later(()=>{if(s.page!=='08a')return;
      setPage('09');later(()=>{if(s.page==='09'){
        // Do not rebuild the foil pack: keep the 2.32s ejection animation continuous.
        s.page='10';save();stage.className='stage page-10 phase-ready';
      }
        later(()=>{if(s.page==='10'){
          s.page='11';save();stage.className='stage page-11 phase-ready';
          const label=stage.querySelector('.wave');if(label){label.innerHTML=waveText('!!');label.style.left='798.1px';label.style.width='16.6px';}
        }
          later(()=>{if(s.page==='11'){
            later(()=>{if(s.page==='11')setPage('12');},620);
          }},380);
        },850);
      },1130);
  },1080);
}

const syringeTip={x:281,y:125};
const bottleMouth={purple:{x:191,y:86},orange:{x:190,y:187}};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function moveSyringe(host,x,y,angle=0,ms=240){if(!host)return;host.style.transition='translate '+ms+'ms ease, transform '+ms+'ms ease';host.style.translate=x+'px '+y+'px';host.style.transform='rotate('+angle+'deg)';}
async function fillSyringe(color,host){
  if(s.phase!=='ready'||s.loaded)return;
  if(s.figures[s.active].value===(color==='orange'?0:100)){moveSyringe(host,0,0,0,330);await pause(350);render();return;}
  s.loaded=color;s.firstFill=true;s.phase='filling';
  stage.querySelectorAll('.syringe-tutorial').forEach(n=>n.remove());
  // Turn the needle left by 90 degrees at the bottle; injection keeps the release angle.
  const bottle=bottleMouth[color],dx=bottle.x-132.5,dy=bottle.y-273.5;
  moveSyringe(host,dx,dy,-90,220);await pause(240);
  if(s.page!=='workbench'||s.phase!=='filling')return;
  const liquid=host.querySelector('.syringe-drug'),plunger=host.querySelector('.syringe-plunger');
  liquid.src=color==='orange'?A.syringeLiquidOrange:A.syringeLiquidPurple;
  await Promise.allSettled([
    liquid.animate([{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0 0)'}],{duration:M.fillMs||1200,easing:'ease-in-out',fill:'forwards'}).finished,
    plunger.animate([{translate:'0 0'},{translate:'0 45px'}],{duration:M.fillMs||1200,easing:'ease-in-out',fill:'forwards'}).finished
  ]);
  if(s.page!=='workbench'||s.phase!=='filling')return;
  moveSyringe(host,0,0,0,320);await pause(350);
  if(s.page==='workbench'&&s.phase==='filling'){s.phase='ready';save();render();}
}
async function inject(host){
  const color=s.loaded;if(!color||s.phase!=='ready')return;
  s.phase='injecting';s.firstInject=true;
  stage.querySelectorAll('.syringe-tutorial').forEach(n=>n.remove());
  // The user's released position and angle stay fixed while the liquid empties.
  const liquid=host.querySelector('.syringe-drug'),plunger=host.querySelector('.syringe-plunger');
  await Promise.allSettled([
    liquid.animate([{clipPath:'inset(0 0 0 0)'},{clipPath:'inset(0 0 100% 0)'}],{duration:M.injectionMs,easing:'ease-in-out',fill:'forwards'}).finished,
    plunger.animate([{translate:'0 45px'},{translate:'0 0'}],{duration:M.injectionMs,easing:'ease-in-out',fill:'forwards'}).finished
  ]);
  if(s.page!=='workbench'||s.phase!=='injecting')return;
  const f=s.figures[s.active],before=f.value,target=clamp(before+(color==='orange'?-7:10),0,100);
  await animateFigureValue(s.active,before,target,510);
  if(s.page!=='workbench'||s.phase!=='injecting')return;
  moveSyringe(host,0,0,0,320);await pause(350);
  if(s.page!=='workbench'||s.phase!=='injecting')return;
  f.value=target;f[color]++;s.used[color]=true;s.loaded=null;s.phase='ready';save();render();
}
function packActive(){s.figures[s.active].packed=true;s.loaded=null;let n=s.figures.findIndex(f=>!f.packed);if(n<0){save();beginPacking();}else{s.active=n;save();render();}}
async function animatePackActive(el){
  if(!el){packActive();return;}
  s.phase='packing';const i=s.active,f=s.figures[i],q=packSlots[i];
  const back=el.cloneNode(false);back.classList.remove('active-figure','dragging');back.classList.add('packing-back');back.dataset.view='back';back.style.opacity='0';back.style.pointerEvents='none';el.parentElement.appendChild(back);
  await window.DCDMorph.preload(f.kind,f.value,'back');
  await window.DCDMorph.draw(back,f.kind,f.value,'back');
  if(s.page!=='workbench'||s.phase!=='packing'){back.remove();return;}
  const sx=377+100/2,sy=81+281/2,tx=q[0]+q[2]/2,ty=q[1]+q[3]/2;
  const from=el.style.translate||'0px 0px',to=(tx-sx)+'px '+(ty-sy)+'px';
  const timing={duration:650,easing:'cubic-bezier(.25,.7,.2,1)',fill:'forwards'};
  const a=el.animate([{offset:0,translate:from,transform:'rotate(0deg) rotateY(0deg) scale(1)',opacity:1},{offset:.4,translate:to,transform:'rotate(-90deg) rotateY(35deg) scale(.61)',opacity:1},{offset:.65,translate:to,transform:'rotate(-90deg) rotateY(82deg) scale(.61)',opacity:0},{offset:1,translate:to,transform:'rotate(-90deg) rotateY(82deg) scale(.61)',opacity:0}],timing);
  const b=back.animate([{offset:0,translate:from,transform:'rotate(0deg) rotateY(-82deg) scale(1)',opacity:0},{offset:.4,translate:to,transform:'rotate(-90deg) rotateY(-82deg) scale(.61)',opacity:0},{offset:.65,translate:to,transform:'rotate(-90deg) rotateY(-35deg) scale(.61)',opacity:1},{offset:1,translate:to,transform:'rotate(-90deg) rotateY(0deg) scale(.61)',opacity:1}],timing);
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
function act(a){if(a==='enter'&&s.page==='00')runIntro('01');if(a==='start')startRotateGuide();if(a==='next'){if(s.page==='12'&&s.expected.length)turnPrescriptionPage();else if(s.page==='13'&&s.side.length)raisePrescription();else if(s.page==='14done')enterConsent();}if(a==='decline')declineConsent();if(a==='ar')setPage('ar');}
stage.addEventListener('click',e=>{let b=e.target.closest('[data-action]');if(b)act(b.dataset.action);});
stage.addEventListener('change',e=>{let t=e.target;if(!t.matches('input[data-kind]'))return;let kind=t.dataset.kind,n=+t.dataset.index;let set=new Set(s[kind]);t.checked?set.add(n):set.delete(n);s[kind]=[...set];save();
  if(s.page==='12'||s.page==='13'){
    let existing=stage.querySelector('.figma-arrow'),needed=s[kind].length>0;
    if(needed&&!existing)(stage.querySelector('.scene-content')||stage).insertAdjacentHTML('beforeend',arrowButton(746,365,'next',s.page));
    else if(!needed&&existing)existing.remove();
  }
});
stage.addEventListener('pointerdown',e=>{let p=localPoint(e);if(s.page==='01'&&s.phase==='guide'){let rope=ropeAt(p);if(!rope)return;e.preventDefault();gesture.set(e.pointerId,{rope,start:p,type:e.pointerType||'mouse',pulled:false});stage.setPointerCapture(e.pointerId);return;}
if(s.page!=='workbench'||s.phase!=='ready')return;let kind=null,index=-1;if(hit(p,261,125,40,297))kind='syringe';else if(hit(p,377,81,100,281))kind='doll';else{index=packSlots.findIndex((b,i)=>s.figures[i].packed&&hit(p,...b));if(index>=0)kind='packed';}if(kind){e.preventDefault();drag={kind,index,pointerId:e.pointerId,start:p,last:p,turnAnchorX:p.x,moved:false,angle:kind==='syringe'?45:0,el:e.target.closest('.syringe,.figure')};if(drag.el)drag.el.classList.add('dragging');if(kind==='syringe'&&drag.el)drag.el.style.transform='rotate(45deg)';stage.setPointerCapture(e.pointerId);}});
stage.addEventListener('pointermove',e=>{let p=localPoint(e);if(gesture.has(e.pointerId)){let g=gesture.get(e.pointerId);g.pulled=pullDistance(g,p)>=14;let active=[...gesture.values()],both=active.some(v=>v.rope==='upper'&&v.pulled)&&active.some(v=>v.rope==='lower'&&v.pulled),singlePointerMirror=g.type!=='touch'&&g.pulled;if((both||singlePointerMirror)&&s.page==='01'&&s.phase==='guide'){gesture.clear();setPage('01','rupture');}return;}
if(!drag||drag.pointerId!==e.pointerId)return;drag.moved=true;let el=drag.el;if(el){el.style.translate=(p.x-drag.start.x)+'px '+(p.y-drag.start.y)+'px';if(drag.kind==='syringe'){let dx=p.x-drag.turnAnchorX;if(Math.abs(dx)>=36){drag.angle=dx<0?-45:45;drag.turnAnchorX=p.x;}el.style.transform='rotate('+drag.angle+'deg)';}}drag.last=p;});
stage.addEventListener('pointerup',e=>{gesture.delete(e.pointerId);if(!drag||drag.pointerId!==e.pointerId)return;let p=localPoint(e),d=drag;drag=null;if(d.kind==='syringe'){syringeInjectionAngle=d.angle;
  const angle=d.angle*Math.PI/180;
  const tip={x:syringeTip.x+148.5*Math.sin(angle)+p.x-d.start.x,y:273.5-148.5*Math.cos(angle)+p.y-d.start.y};
  const near=(point,target)=>Math.hypot(point.x-target.x,point.y-target.y)<=44;
  if(!s.loaded&&(near(tip,bottleMouth.orange)||near(p,bottleMouth.orange)))fillSyringe('orange',d.el);
  else if(!s.loaded&&(near(tip,bottleMouth.purple)||near(p,bottleMouth.purple)))fillSyringe('purple',d.el);
  else if(s.loaded&&(hit(tip,377,115,100,205)||hit(p,377,115,100,205)))inject(d.el);else render();
}else if(d.kind==='doll'){if(hit(p,...packRect))animatePackActive(d.el);else render();}else if(d.kind==='packed'){if(hit(p,308,39,237,355))unpack(d.index);else render();}});
stage.addEventListener('pointercancel',e=>{gesture.delete(e.pointerId);if(drag){drag=null;render();}});
function bindSignature(){let c=stage.querySelector('#signature');if(!c)return;let ctx=c.getContext('2d'),drawing=false,moved=false;ctx.strokeStyle='#171717';ctx.lineWidth=5;ctx.lineJoin='round';ctx.lineCap='round';function point(e){let r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};}c.onpointerdown=e=>{e.stopPropagation();c.setPointerCapture(e.pointerId);drawing=true;moved=false;let p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);};c.onpointermove=e=>{if(!drawing)return;let p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();if(!moved){stage.querySelectorAll('.signature-guide,.signature-sample').forEach(n=>n.remove());}moved=true;};c.onpointerup=e=>{e.stopPropagation();drawing=false;if(moved){s.signed=true;s.page='14done';save();stage.className='stage page-14done phase-ready';let guide=stage.querySelector('.signature-guide');if(guide)guide.remove();(stage.querySelector('.scene-content')||stage).insertAdjacentHTML('beforeend',arrowButton(839,365,'next','12'));}};}
function onViewportChange(){fit();finishRotationIfReady();}
window.addEventListener('resize',onViewportChange);window.addEventListener('orientationchange',onViewportChange);
window.addEventListener('deviceorientation',e=>{physicalLandscape=Number.isFinite(e.gamma)&&Math.abs(e.gamma)>55;if(physicalLandscape)finishRotationIfReady();});
if(s.page==='00'&&s.phase==='intro')runIntro('00');else if(s.page==='01'&&s.phase==='intro')runIntro('01');else if(s.page==='03')startRotateGuide();else render();
window.DCD_DEBUG={state:()=>structuredClone(s),page:p=>setPage(p),finishRupture};
})();
