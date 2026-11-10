/* Landmark-driven organza with a continuous feathered surface. */
(()=>{'use strict';
// Pre-expanded original 64x64 textile alpha map, 4096 raw bytes.
// Base64 is only byte transport, NOT deflate compression.
const HEIGHT_BYTES='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';
const WORDS={first:["THAT’S CHEATING.","YOU DIDN’T EARN THAT BODY.","IS THAT EVEN THE REAL YOU?","DID YOU REALLY NEED MEDICATION?","YOU’LL JUST GAIN IT ALL BACK."],replacement:["WHY DON’T YOU JUST TAKE GLP-1?","WHAT’S YOUR EXCUSE NOW?","EVERYONE ELSE IS LOSING WEIGHT EXCEPT YOU.","DON’T YOU CARE ABOUT YOUR HEALTH?","YOU’RE NOT EVEN TRYING."]};
const FIGMA_MASK_TEXT={first:[{"text":"THAT’S\nCHEATING.","x":92.9706116,"y":380.9452515,"w":86,"r":2.56086785,"fs":[18,18],"lh":[20,20]},{"text":"YOU DIDN’T\nEARN\nTHAT BODY.","x":152.9406738,"y":322.0475159,"w":93,"r":8.83248771,"fs":[18,18,18],"lh":[20,20,20]},{"text":"IS THAT EVEN\nTHE REAL YOU?","x":224.5595703,"y":422,"w":122,"r":-5.48380546,"fs":[18,18],"lh":[20,20]},{"text":"DID YOU\nREALLY NEED\nMEDICATION?","x":119.9868164,"y":481.8559875,"w":128,"r":3.78941459,"fs":[18,18,18],"lh":[20,20,20]},{"text":"YOU’LL\nJUST GAIN IT\nALL BACK.","x":171.458252,"y":566.708313,"w":103,"r":-6.77999273,"fs":[18,18,18],"lh":[20,20,20]}],replacement:[{"text":"WHY DON’T YOU\nJUST TAKE GLP-1?","x":142,"y":316,"w":144,"r":0,"fs":[18,18],"lh":[20,20]},{"text":"WHAT’S YOUR\nEXCUSE NOW?","x":211.7207794,"y":505.0860901,"w":113,"r":-7.26322978,"fs":[18,18],"lh":[20,20]},{"text":"EVERYONE ELSE\nIS LOSING WEIGHT\nEXCEPT YOU.","x":143.9927979,"y":561.5820313,"w":146,"r":2.43377355,"fs":[18,18,18],"lh":[20,20,20]},{"text":"DON’T YOU\nCARE ABOUT\nYOUR HEALTH?","x":88.2729492,"y":444.2741699,"w":124,"r":-3.93080351,"fs":[18,18,18],"lh":[20,20,20]},{"text":"YOU’RE\nNOT EVEN\nTRYING.","x":221.9506836,"y":398.5280762,"w":80,"r":9.00960469,"fs":[18,18,18],"lh":[20,20,20]}]};

const W=428,H=926,TEXTURE_SIZE=1024,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
// MediaPipe eye landmark numbering changes left/right after the selfie
// mirror. atan2(leftEye-rightEye) may point toward PI and rotate the entire
// cloth and its writing 180 degrees. Keep the horizontal face axis upright.
function uprightFaceAngle(a,b){
 let angle=Math.atan2(a.y-b.y,a.x-b.x);
 if(Math.cos(angle)<0)angle+=angle>0?-Math.PI:Math.PI;
 return angle;
}
const VERT=String.raw`
attribute vec3 position;
attribute vec2 uv;
attribute float lighting;
attribute float fringe;
attribute float travel;
attribute vec3 surfaceNormal;
varying vec3 vNormal;
uniform vec2 projectionCenter;
varying vec2 vUV;
varying float vLight;
varying float vFringe;
void main(){
  // Canvas textures otherwise land upside-down on the WebGL face UVs.
  // Flip only the sampled atlas, not the geometry or head tracking.
  vUV=uv;vLight=lighting;vFringe=fringe;vNormal=surfaceNormal;
  // Homogeneous perspective during approach/peel; w=1 at contact keeps
  // the calibrated screen-space face and its depth occluder registered.
  float w=max(0.28,1.0+travel);
  gl_Position=vec4(projectionCenter*w+(position.xy-projectionCenter),
    clamp(position.z,-0.8,0.8)*w,w);
}`;
const FRAG=`
precision highp float;
uniform sampler2D fabric;
uniform sampler2D embroideryMask;
uniform float opacity;
uniform float embroideryPass;
varying vec3 vNormal;
varying vec2 vUV;
varying float vLight;
varying float vFringe;
float smoothVeilSilhouette(vec2 uv){
  // Head-covering sculpted veil. Unlike the old screen-size rectangular
  // mesh, this has a domed crown, soft side falloff and rounded lower hem.
  float v=1.0-uv.y; // UVs are vertically flipped at the vertex shader.
  float x=abs(uv.x-.5)*2.0;
  float upper=1.0-smoothstep(0.0,0.21,v);
  float lower=smoothstep(0.74,1.0,v);
  float crown=pow(clamp((.22-v)/.22,0.0,1.0),1.55);
  float hem=pow(clamp((v-.78)/.22,0.0,1.0),1.65);
  float width=1.0-.12*crown-.11*hem;
  // The crown is arched: each side starts lower than the center.
  float topCurve=.038*pow(x,1.8);
  float bottomCurve=.045*pow(x,1.55);
  float sideMask=1.0-smoothstep(width-.075,width+.012,x);
  float topMask=smoothstep(topCurve-.018,topCurve+.035,v);
  float bottomMask=1.0-smoothstep(1.0-bottomCurve-.045,1.0-bottomCurve+.005,v);
  return sideMask*topMask*bottomMask;
}
void main(){
  vec4 cloth=texture2D(fabric,vUV);
  vec2 pixel=vec2(1.0/1010.0);
  float fiber=cloth.a;
  float left=texture2D(fabric,vUV-vec2(pixel.x,0.0)).a;
  float right=texture2D(fabric,vUV+vec2(pixel.x,0.0)).a;
  float up=texture2D(fabric,vUV+vec2(0.0,pixel.y)).a;
  float down=texture2D(fabric,vUV-vec2(0.0,pixel.y)).a;
  // The source is a sparse 64x64 photographed weave (66% holes).
  // The former 0.06..0.67 threshold and 0.006 alpha erased its fine strands
  // when sampled through mipmaps at phone resolution.
  float strand=smoothstep(0.008,0.33,fiber);
  float detail=clamp(abs(left-right)+abs(up-down),0.0,1.0);
  vec3 N=normalize(vNormal);
  vec3 L=normalize(vec3(-.55,.65,1.0));
  float faceDiffuse=max(0.0,dot(N,L));
  float grazing=pow(1.0-clamp(N.z,0.0,1.0),3.0);
  float fiberLight=clamp(.54+.48*faceDiffuse+.10*(left-right+up-down),.48,1.12);
  // Slight pearlescent warm/cool scatter, not an opaque grid.
  float sheen=clamp(0.5+0.5*(vLight-0.9)*3.0,0.0,1.0);
  vec3 whiteNet=mix(vec3(.957,.966,.982),vec3(1.0,.982,.955),sheen)*fiberLight;
  // Give the photographic thread visible scattering while leaving the
  // spaces between woven fibers transparent. A faint organza body connects
  // the fabric even when individual thread pixels shrink at camera scale.
  // Fine, thin organza filament with a faint continuous translucent body.
  // Avoid the coarse opaque mesh effect from the earlier yarn intensity.
  // Physical alpha compositing accumulates each sheet. A continuous
  // 12% body makes 1/3/5 layers distinguishable, even between fibers.
  float netAlpha=.12+.19*strand+.025*detail+.025*grazing;
  // A separate embroidery coverage map prevents fibers from turning black.
  float stitch=texture2D(embroideryMask,vUV).a;
  float eLeft=texture2D(embroideryMask,vUV-vec2(pixel.x,0.0)).a;
  float eRight=texture2D(embroideryMask,vUV+vec2(pixel.x,0.0)).a;
  float eUp=texture2D(embroideryMask,vUV-vec2(0.0,pixel.y)).a;
  float eDown=texture2D(embroideryMask,vUV+vec2(0.0,pixel.y)).a;
  // RGB carries raised satin stitches, alpha carries the exact glyph.
  // Sample the actual relief instead of a subpixel sine that vanishes
  // when the 1024 atlas is reduced to face size.
  float h=texture2D(embroideryMask,vUV).r;
  vec2 stepUV=pixel*1.5;
  float hx=texture2D(embroideryMask,vUV+vec2(stepUV.x,0.0)).r
    -texture2D(embroideryMask,vUV-vec2(stepUV.x,0.0)).r;
  float hy=texture2D(embroideryMask,vUV+vec2(0.0,stepUV.y)).r
    -texture2D(embroideryMask,vUV-vec2(0.0,stepUV.y)).r;
  vec3 T=normalize(vec3(N.z,0.,-N.x));
  vec3 B=normalize(cross(N,T));
  vec3 threadNormal=normalize(N+T*(-hx*1.65)+B*(-hy*1.65));
  vec3 lamp=normalize(vec3(-.55,.65,1.0));
  float diffuse=max(0.0,dot(threadNormal,lamp));
  float shine=pow(max(0.0,dot(threadNormal,normalize(lamp+vec3(0.,0.,1.)))),10.0);
  float rim=clamp((eLeft-eRight+eUp-eDown)*.16,-.10,.10);
  vec3 threadColor=vec3(.055,.049,.043)
    +vec3(.15,.135,.12)*diffuse*(.35+.65*h)
    +vec3(.16,.145,.13)*shine+rim*.45;
  threadColor*=clamp(vLight,.75,1.15);
  float contact=clamp(max(max(eLeft,eRight),max(eUp,eDown))-stitch,0.0,1.0);
  float shade=contact*0.13;
  // Fabric and embroidery have independent draw passes. In particular the
  // last fabric layer must not erase the letters from earlier layers.
  // The fabric is real and semi-transparent through the center. The hems
  // fade fully away instead of retaining 15% alpha as square border rails.
  // Geometry itself is the tracked face plus feathered outside margin.
  // Do not impose an additional screen-space oval clip on these vertices.
  float silhouette=1.0;
  float edgeFade=1.0;
  if(embroideryPass>0.5){
    // Stitch texture is fixed to the same UVs as the deforming fabric.
    // Only the forward falling panel carries text.
    float frontPanel=1.0-smoothstep(.46,.50,vUV.y);
    gl_FragColor=vec4(threadColor,stitch*opacity*edgeFade*frontPanel);
  }else{
    gl_FragColor=vec4(whiteNet*(1.0-shade),
      clamp(netAlpha*opacity*edgeFade*silhouette,0.0,1.0));
  }
}`;
function shader(gl,type,code){
  const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function getHeight(){
  const data=Uint8Array.from(atob(HEIGHT_BYTES),c=>c.charCodeAt(0));
  if(data.length!==4096)throw new Error('Invalid tulle height map: '+data.length);
  return data;
}
function paintedFabric(height,index){
  const c=document.createElement('canvas');c.width=c.height=TEXTURE_SIZE;
  const ctx=c.getContext('2d');
  // Retain the existing archived 64x64 photographed fiber heightmap.
  const tile=document.createElement('canvas');tile.width=tile.height=64;
  const tctx=tile.getContext('2d'),pixels=tctx.createImageData(64,64);
  for(let i=0;i<4096;i++){
    const fiber=height?.[i]??0,k=i*4;
    pixels.data[k]=251;pixels.data[k+1]=249;pixels.data[k+2]=245;
    pixels.data[k+3]=Math.round(Math.max(0,Math.min(255,fiber*255/143)));
  }
  tctx.putImageData(pixels,0,0);
  // Render the real photographed yarn more finely rather than relying on
  // DOMMatrix pattern transforms (unsupported in some mobile WebViews).
  const fineTile=document.createElement('canvas');
  fineTile.width=fineTile.height=38;
  const ft=fineTile.getContext('2d');
  ft.imageSmoothingEnabled=true;ft.imageSmoothingQuality='high';
  ft.drawImage(tile,0,0,38,38);
  const weave=ctx.createPattern(fineTile,'repeat');
  ctx.imageSmoothingEnabled=true;
  ctx.save();ctx.translate((index*11)%38,(index*17)%38);
  ctx.fillStyle=weave;ctx.fillRect(-38,-38,c.width+76,c.height+76);
  ctx.restore();
  return c;
}
// Keep embroidered phrases in stable cloth regions. Facial features are
// still tracked by the full mesh, but the text must NOT cross eyelids or
// fold over the nose. Five separated labels remain legible as layers stack.
// Reference layout from the approved Figma 428×926 portrait frame.
 // Bind word centers to the canonical face UV atlas, not guessed upper/lower
 // slots. The local face guide is x=69.5..358.5, y=267..643.
// Figma label coordinates relative to a larger rectangular cloth.
const CLOTH_REF={left:76,right:352,top:297,bottom:693};
function embroiderySlot(c){
 const h=c.text.split('\n').reduce((a,_,i)=>a+(c.lh[i]||20),0);
 const centerY=c.y+h/2;
 // The front panel is the camera-facing half of the physical 3D cloth.
 // Move Figma's label centers onto that panel in the SAME physical UV space.
 // The y=0.5 center is the crown; smaller V descends toward the front hem.
 return {
  u:clamp(.5+(c.x+c.w/2-214)/360,.22,.78),
  v:clamp(.39-(centerY-345)*.00118,.105,.39),
  max:clamp(c.w/276,.13,.48)
 };
}
function embroideredLetters(variant,index){
 const c=document.createElement('canvas');c.width=c.height=TEXTURE_SIZE;
 const ctx=c.getContext('2d'),config=FIGMA_MASK_TEXT[variant]?.[index];
 if(!config)return c;
 const slot=embroiderySlot(config),lines=config.text.split('\n');
 ctx.save();
 // No horizontal mirror: the camera position is mirrored once in update().
 ctx.translate(slot.u*TEXTURE_SIZE,(1-slot.v)*TEXTURE_SIZE);
 // The live webcam is mirrored on screen, which reverses the printed
 // embroidery. Counter-mirror the letter glyphs within their local region
 // without moving each Figma text anchor or flipping the textile itself.
 // Mesh U is already left-to-right; the previous counter-mirror reversed
 // the glyphs. Keep all text upright in the single shared canvas/UV axis.
 ctx.rotate(config.r*Math.PI/180);
 ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='top';
 const fs=lines.map((_,i)=>config.fs[i]||18),lh=lines.map((_,i)=>config.lh[i]||20);
 const total=lh.reduce((a,b)=>a+b,0);
 let widest=1;
 lines.forEach((line,i)=>{ctx.font='700 '+fs[i]+'px "Turret Road",sans-serif';widest=Math.max(widest,ctx.measureText(line).width)});
 // The 3.15x atlas cap enlarged 18px Figma letters across the actual
 // face mesh. Limit glyph growth and preserve the authored 18px/20px
 // proportions and label anchors without flattening the tracked fabric.
 const atlasScale=Math.min(2.05,slot.max*TEXTURE_SIZE*.83/widest);
 ctx.scale(atlasScale,atlasScale);
 let y=-total/2;
 lines.forEach((line,i)=>{
   ctx.font='700 '+fs[i]+'px "Turret Road",sans-serif';
   ctx.lineJoin='round';ctx.lineWidth=.62;ctx.strokeStyle='rgba(255,255,255,.9)';
   ctx.strokeText(line,0,y);ctx.fillText(line,0,y);y+=lh[i];
 });
 ctx.restore();
 const ink=ctx.getImageData(0,0,TEXTURE_SIZE,TEXTURE_SIZE);
 const src=new Uint8ClampedArray(ink.data),n=TEXTURE_SIZE;
 const coverage=(x,y)=>x<0||y<0||x>=n||y>=n?0:src[(y*n+x)*4+3]/255;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const k=(y*n+x)*4,a=src[k+3]/255;
   if(!a){ink.data[k]=ink.data[k+1]=ink.data[k+2]=0;continue;}
   // Five atlas pixels per stitch remain visible at face scale. Rounded
   // ridges plus a darker valley create distinct threads within each glyph.
   const dx=coverage(x+2,y)-coverage(x-2,y);
   const dy=coverage(x,y+2)-coverage(x,y-2);
   const horizontal=Math.abs(dy)>Math.abs(dx);
   const along=horizontal?x:y;
   const across=horizontal?y:x;
   const phase=(along+Math.floor(across/8)*.7)*Math.PI*2/4.8;
   const ridge=Math.pow(.5+.5*Math.cos(phase),.65);
   const edge=Math.min(coverage(x-1,y),coverage(x+1,y),
     coverage(x,y-1),coverage(x,y+1));
   const filaments=.85+.15*Math.cos(across*Math.PI*2/1.7);
   const height=a*(.08+.92*ridge)*(.65+.35*edge)*filaments;
   ink.data[k]=ink.data[k+1]=ink.data[k+2]=Math.round(height*255);
   ink.data[k+3]=Math.round(src[k+3]*(.72+.28*ridge));
 }
 ctx.putImageData(ink,0,0);
 return c;
}
function faceOutline(connections){
  if(!connections?.length)return [];
  const around=new Map();
  for(const {start,end} of connections){
    if(!around.has(start))around.set(start,new Set());
    if(!around.has(end))around.set(end,new Set());
    around.get(start).add(end);around.get(end).add(start);
  }
  const oval=[],start=10;let previous=-1,current=start;
  while(oval.length<50){
    oval.push(current);
    const next=[...(around.get(current)||[])].find(i=>i!==previous);
    if(next===undefined||next===start)break;
    previous=current;current=next;
  }
  return oval;
}
// Preserve the actual 64x64 photographic threads on browsers where a
// WebGL context or shader cannot draw. The fallback follows tracked facial
// landmarks and NEVER draws the old static CSS oval.
const FACE_RIM=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
function canvasCloth(root){
  const canvas=document.createElement('canvas');
  canvas.className='ar-tulle-2d';canvas.width=W;canvas.height=H;
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:4;pointer-events:none';
  root.appendChild(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});
  const tile=document.createElement('canvas');tile.width=tile.height=64;
  const t=tile.getContext('2d',{alpha:true}),im=t.createImageData(64,64);
  const height=getHeight();
  for(let i=0;i<4096;i++){
    const v=height[i],k=i*4;
    im.data[k]=252;im.data[k+1]=249;im.data[k+2]=243;
    im.data[k+3]=v?Math.round(80+175*Math.sqrt(v/143)):0;
  }
  t.putImageData(im,0,0);
  const finer=document.createElement('canvas');finer.width=finer.height=38;
  const fineCtx=finer.getContext('2d');
  fineCtx.imageSmoothingEnabled=true;fineCtx.imageSmoothingQuality='high';
  fineCtx.drawImage(tile,0,0,38,38);
  const pattern=ctx.createPattern(finer,'repeat');
  let positions=null,lastSeen=0,live=true;
  function update(points,width,height){
    if(!points?.length||points.length<468||!width||!height){
      if(performance.now()-lastSeen>1600)positions=null;
      return;
    }
    const fit=Math.max(W/width,H/height),dw=width*fit,dh=height*fit;
    positions=points.map(p=>({x:(W-dw)/2+(1-p.x)*dw,y:(H-dh)/2+p.y*dh}));
    lastSeen=performance.now();
  }
  function draw(layers,now){
    if(!live||!ctx)return;
    ctx.clearRect(0,0,W,H);
    if(!positions||!layers.length)return;
    const center=positions[1],head=positions[10],jaw=positions[152];
    const left=positions[234],right=positions[454];
    const eyeL=positions[33],eyeR=positions[263];
    const fw=Math.max(65,Math.hypot(right.x-left.x,right.y-left.y));
    const fh=Math.max(90,Math.hypot(head.x-jaw.x,head.y-jaw.y));
    // Fallback also uses a larger head-covering sheet.
    const cw=fw*1.90;
    const ch=fh*1.75;
    const cx=(left.x+right.x)/2,cy=head.y+fh*.62;
    const angle=uprightFaceAngle(eyeL,eyeR);
    // Render the translucent yarn in one pass, then all embroidered words
    // in a separate final pass; later nets must not erase earlier words.
    for(let pass=0;pass<2;pass++)for(const layer of layers){
      const age=(now-layer.start)/1000;
      const progress=clamp(age/.36,0,1);
      const fly=1-progress*progress*progress;
      const shiftX=(layer.index%2?1:-1)*24*fly,shiftY=-55*fly;
      const exit=layer.removing?clamp((now-layer.exit)/1150,0,1):0;
      const alpha=layer.removing?1-ease(exit):clamp(age/.14,0,1);
      if(alpha<=0)continue;
      ctx.save();ctx.globalAlpha=alpha;
      ctx.translate(cx+shiftX+exit*45,cy+shiftY-exit*155);
      ctx.rotate(angle);
      const l=-cw/2,r=cw/2,t=-ch*.50,b=ch*.50;
      ctx.beginPath();
      ctx.moveTo(0,-ch*.5);
       ctx.bezierCurveTo(cw*.37,-ch*.53,cw*.48,-ch*.37,cw*.47,-ch*.22);
       ctx.bezierCurveTo(cw*.58,ch*.10,cw*.53,ch*.37,cw*.43,ch*.48);
       ctx.quadraticCurveTo(0,ch*.54,-cw*.43,ch*.48);
       ctx.bezierCurveTo(-cw*.53,ch*.37,-cw*.58,ch*.10,-cw*.47,-ch*.22);
       ctx.bezierCurveTo(-cw*.48,-ch*.37,-cw*.37,-ch*.53,0,-ch*.5);
       ctx.closePath();ctx.clip();
      if(pass===0){
      ctx.fillStyle='rgba(250,248,243,.12)';
      ctx.fillRect(l,t,cw,ch+fh*.06);
      ctx.fillStyle=pattern;ctx.globalAlpha=alpha*.43;
      ctx.fillRect(l,t,cw,ch+fh*.06);
      // Soft fold shadow follows the tucked hem, without painting a hard line.
      ctx.globalAlpha=alpha*.26;
      const fold=ctx.createLinearGradient(0,b-ch*.23,0,b);
      fold.addColorStop(0,'rgba(100,91,84,0)');
      fold.addColorStop(.65,'rgba(86,81,77,.16)');
      fold.addColorStop(1,'rgba(253,249,243,.22)');
      ctx.fillStyle=fold;ctx.fillRect(l,b-ch*.23,cw,ch*.23);
      }
      const config=FIGMA_MASK_TEXT[layer.variant]?.[layer.index];
      if(pass===1&&config){
        const slot=embroiderySlot(config);
        const x=l+slot.u*cw,y=t+(1-slot.v)*ch;
        ctx.globalAlpha=alpha;
        ctx.translate(x,y);ctx.rotate(config.r*Math.PI/180);
        ctx.fillStyle='#29251f';ctx.textBaseline='top';ctx.textAlign='center';
        const lines=config.text.split('\n');
        const scale=Math.min(1.35,Math.max(.94,cw/276));
        ctx.scale(scale,scale);
        const total=lines.reduce((z,_,i)=>z+(config.lh[i]||20),0);
        let yy=-total/2;
        for(let i=0;i<lines.length;i++){
          ctx.font='700 '+(config.fs[i]||18)+'px "Turret Road",sans-serif';
          ctx.fillText(lines[i],0,yy);yy+=config.lh[i]||20;
        }
      }
      ctx.restore();
    }
  }
  return {update,draw,destroy(){live=false;canvas.remove();}};
}
function create(root){
  if(!root)return null;
  const canvas=document.createElement('canvas');
  canvas.className='ar-tulle-webgl';
  const pixelRatio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(W*pixelRatio);canvas.height=Math.round(H*pixelRatio);root.prepend(canvas);
  let gl,program;
  try{
    gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,premultipliedAlpha:true});
    if(!gl)throw Error('WebGL not supported');
    program=gl.createProgram();
    gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,VERT));
    gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,FRAG));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  }catch(error){
    console.warn('[DCD] Cloth WebGL unavailable; using tracked canvas cloth:',error);
    canvas.remove();
    root.classList.add('ar-tulle-fallback');
    const backup=canvasCloth(root),layers=[];
    let frameId=0,live=true;
    function tick(now){if(!live)return;backup.draw(layers,now);frameId=requestAnimationFrame(tick);}
    frameId=requestAnimationFrame(tick);
    return {
      setConnections(){return true},
      update:backup.update,
      add(variant,index){const layer={variant,index,start:performance.now(),removing:false,exit:0};layers.push(layer);return layer;},
      remove(layer){if(layer){layer.removing=true;layer.exit=performance.now();}},
      clear(){layers.length=0;},
      destroy(){live=false;cancelAnimationFrame(frameId);backup.destroy();}
    };
  }
  // Suppress the old flat CSS oval when the tracked 3D cloth is available.
  root.classList.add('ar-tulle-gpu');
  const vb=gl.createBuffer(),ib=gl.createBuffer();
  const stride=11,positionAttr=gl.getAttribLocation(program,'position');
  const uvAttr=gl.getAttribLocation(program,'uv'),lightAttr=gl.getAttribLocation(program,'lighting');
  const fringeAttr=gl.getAttribLocation(program,'fringe');
  const travelAttr=gl.getAttribLocation(program,'travel');
  const normalAttr=gl.getAttribLocation(program,'surfaceNormal');
  const projectionUniform=gl.getUniformLocation(program,'projectionCenter');
  const opacityUniform=gl.getUniformLocation(program,'opacity'),texUniform=gl.getUniformLocation(program,'fabric');
  const stitchUniform=gl.getUniformLocation(program,'embroideryMask');
  const passUniform=gl.getUniformLocation(program,'embroideryPass');
  let outline=[],mesh=null,vertices=null,indexCount=0,faceCenter=null;
  let facePixels=null,faceDepth=null,faceBounds=null,frameLast=0;
  let triangleBins=null;
  const BIN_W=20,BIN_H=32;
  function faceSurfaceAt(x,y){
    if(!triangleBins||!facePixels)return null;
    const gx=clamp(Math.floor(x/W*BIN_W),0,BIN_W-1);
    const gy=clamp(Math.floor(y/H*BIN_H),0,BIN_H-1);
    for(const t of triangleBins[gy*BIN_W+gx]){
      const a=faceData.triangles[t*3],b=faceData.triangles[t*3+1],c=faceData.triangles[t*3+2];
      const ax=facePixels[a*2],ay=facePixels[a*2+1];
      const bx=facePixels[b*2],by=facePixels[b*2+1];
      const cx=facePixels[c*2],cy=facePixels[c*2+1];
      const det=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
      if(Math.abs(det)<1e-7)continue;
      const u=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/det;
      const v=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/det;
      const w=1-u-v;
      if(u>=-1e-5&&v>=-1e-5&&w>=-1e-5)
        return u*faceDepth[a]+v*faceDepth[b]+w*faceDepth[c];
    }
    return null;
  }
  const faceData=window.DCD_FACE_CANONICAL;
  // Render the real MediaPipe face triangles invisibly to the depth buffer.
  // It is not another visible mask; it only hides portions of cloth that
  // have curled behind the user's forehead, cheeks, or jaw.
  let occProgram=null,occBuffer=null,occIndex=null,occIndices=0;
  let occPosition=-1;
  let live=true,frameId=0,lastRendered=0,renderErrorReported=false;
  let setupStatus='pending',lastDiagnostic='',lastDiagnosticAt=0,lastFaceSeenAt=0;
  function reportState(state,now=performance.now()){
    root.dataset.tulleState=state;
    if(state!==lastDiagnostic&&now-lastDiagnosticAt>500){
      console.info('[DCD AR] Organza state:',state,{
        faceTracked:!!faceCenter,
        geometry:setupStatus,
        meshIndices:indexCount,
        fabricReady:!!textures.first,
        layers:layers.length
      });
      lastDiagnostic=state;lastDiagnosticAt=now;
    }
  }
  const textures={},layers=[];
  const canvasBackup=canvasCloth(root);
  // Cloth uses only the observed facial mesh and its canonical material UVs.
  const oval=FACE_RIM;
  const GRID_COLS=24,GRID_ROWS=24;
  const faceVertexCount=(GRID_COLS+1)*(GRID_ROWS+1);
  // Face and tulle share the same 428x926 screen projection and relative
  // MediaPipe depth. An occluder cannot work if they use different spaces.
  function initOccluder(){
    if(!faceData?.triangles?.length)return false;
    const vertexShader=String.raw`attribute vec3 position;
      void main(){gl_Position=vec4(position,1.0);}`;
    const fragmentShader=String.raw`precision mediump float;
      void main(){gl_FragColor=vec4(0.0);}`;
    occProgram=gl.createProgram();
    gl.attachShader(occProgram,shader(gl,gl.VERTEX_SHADER,vertexShader));
    gl.attachShader(occProgram,shader(gl,gl.FRAGMENT_SHADER,fragmentShader));
    gl.linkProgram(occProgram);
    if(!gl.getProgramParameter(occProgram,gl.LINK_STATUS))
      throw new Error('Face depth shader: '+gl.getProgramInfoLog(occProgram));
    occPosition=gl.getAttribLocation(occProgram,'position');
    occBuffer=gl.createBuffer();occIndex=gl.createBuffer();
    occIndices=faceData.triangles.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,occIndex);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(faceData.triangles),gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,occBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,468*3*4,gl.DYNAMIC_DRAW);
    return true;
  }
  function setConnections(){
    if(!faceData?.triangles?.length)throw Error('Face geometry unavailable');
    // A separate fabric mesh, independent of the tracked skin triangles.
    const indices=[];
    for(let r=0;r<GRID_ROWS;r++)for(let c=0;c<GRID_COLS;c++){
      const a=r*(GRID_COLS+1)+c,b=a+1,d=a+GRID_COLS+1,e=d+1;
      indices.push(a,d,b,b,d,e);
    }
    indexCount=indices.length;
    mesh=new Float32Array(faceVertexCount*stride);
    vertices=new Float32Array(mesh.length);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);
    gl.bufferData(gl.ARRAY_BUFFER,vertices.byteLength,gl.DYNAMIC_DRAW);
    setupStatus='ready';root.dataset.tulleSetup='ready';
    return true;
  }
  function makeTexture(source){
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.generateMipmap(gl.TEXTURE_2D);
    const aniso=gl.getExtension('EXT_texture_filter_anisotropic');
    if(aniso)gl.texParameterf(gl.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,
      Math.min(8,gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    return tex;
  }
  // Canonical geometry is a bundled static asset. Initialize it now, not
  // behind the asynchronous FaceLandmarker SDK / model loading sequence.
  // Previously a model-loader interruption left indexCount=0 permanently.
  try{
    if(!setConnections())throw new Error('Textile grid missing or invalid');
    if(!initOccluder())throw new Error('Official face triangles unavailable');
  }catch(error){
    setupStatus='error';
    root.dataset.tulleSetup='error';
    console.error('[DCD AR] Organza mesh initialization:',error);
  }
  (async()=>{
    try{
      // A failed font request must not prevent the actual cloth from loading.
      // Keep native fabric preparation independent of optional font loading.
      const height=getHeight();
      if(!live)return;
      await Promise.race([
        document.fonts?.load('700 18px "Turret Road"').catch(()=>{})||Promise.resolve(),
        new Promise(resolve=>setTimeout(resolve,800))
      ]);
      if(!live)return;
      const fiberTextures=Array.from({length:5},(_,i)=>makeTexture(paintedFabric(height,i)));
      for(const variant of ['first','replacement']){
        textures[variant]=WORDS[variant].map((phrase,i)=>({
          fabric:fiberTextures[i],
          thread:makeTexture(embroideredLetters(variant,i))
        }));
      }
      root.dataset.tulleTexture='ready';
    }catch(error){root.dataset.tulleTexture='error';console.error('[DCD] Cloth texture preparation:',error);}
  })();
  function update(points,width,height){
    if(!mesh||!points?.length||points.length<468||!width||!height){
      if(performance.now()-lastFaceSeenAt>1600)faceCenter=null;
      canvasBackup.update(null,width,height);return;
    }
    lastFaceSeenAt=performance.now();canvasBackup.update(points,width,height);
    const factor=Math.max(W/width,H/height),dw=width*factor,dh=height*factor;
    const ox=(W-dw)/2,oy=(H-dh)/2;
    const p=i=>({x:ox+(1-points[i].x)*dw,y:oy+points[i].y*dh});
    const forehead=p(10),chin=p(152),left=p(234),right=p(454),eyeA=p(33),eyeB=p(263);
    // MediaPipe landmark Z is relative to face width (negative toward the
    // camera). Compute a bounded nose/cheek relief from measured depth;
    // this remains a relative depth field, NOT a metric camera calibration.
    const rawNose=points[1].z,rawCheek=(points[205].z+points[425].z)*.5;
    const noseRelief=clamp((rawCheek-rawNose)*1.8,.015,.18);
    const fw=Math.max(65,Math.hypot(right.x-left.x,right.y-left.y));
    const fh=Math.max(90,Math.hypot(forehead.x-chin.x,forehead.y-chin.y));
    const angle=uprightFaceAngle(eyeA,eyeB),co=Math.cos(angle),si=Math.sin(angle);
    const cx=(left.x+right.x)/2,cy=(forehead.y+chin.y)/2+fh*.035;
    // Track the rigid head using the face, but NEVER sculpt cloth from skin.
    // Estimated skull volume includes the crown above landmark 10.
    const centerY=forehead.y+fh*.34;
    const yaw=clamp(((points[1].x-(points[234].x+points[454].x)*.5)/
      Math.max(.08,Math.abs(points[454].x-points[234].x)))*1.1,-.52,.52);
    const pitch=clamp((points[1].z-(points[10].z+points[152].z)*.5)*2,-.32,.32);
    const cw=fw*2.35,ch=fh*2.05;
    // Smooth head translation and size only; screen-facing veil has no
    // independent yaw/pitch rotation. Small tracked head roll is bounded.
    const previous=faceCenter;
    const blend=(old,next,rate)=>previous?mix(old,next,rate):next;
    const headX=blend(previous?.x,cx,.22);
    const headY=blend(previous?.y,centerY,.22);
    const headW=blend(previous?.fw,fw,.16);
    const headH=blend(previous?.fh,fh,.16);
    const roll=blend(previous?.roll,clamp(angle,-.10,.10),.14);
    faceCenter={x:headX,y:headY,cw:headW*2.35,ch:headH*2.05,
      co:Math.cos(roll),si:Math.sin(roll),roll,fw:headW,fh:headH,
      yaw:0,pitch:0,radiusX:headW*.59,radiusY:headH*.84,
      radiusZ:headW*.59};
    // Build the real tracked face surface in the same mirrored screen space.
    facePixels=new Float32Array(468*2);
    faceDepth=new Float32Array(468);
    const depthVerts=new Float32Array(468*3);
    for(let i=0;i<468;i++){
      const pt=points[i],xx=ox+(1-pt.x)*dw,yy=oy+pt.y*dh;
      const zz=clamp(.12+(pt.z-rawCheek)*1.8,-.7,.7);
      facePixels[i*2]=xx;facePixels[i*2+1]=yy;faceDepth[i]=zz;
      depthVerts[i*3]=xx/W*2-1;
      depthVerts[i*3+1]=1-yy/H*2;
      depthVerts[i*3+2]=zz;
    }
    if(occBuffer){
      gl.bindBuffer(gl.ARRAY_BUFFER,occBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,depthVerts);
    }
    // Geometry is generated by a 3D fabric solver in drapedCloth().
    // No 468-point face surface is ever copied into a cloth vertex.
  }

  // A crown-fixed veil: a stationary drape in head-local coordinates.
  // The old Verlet simulation allowed a single pinned vertex while all
  // other vertices continued falling and pulling the embroidery around the
  // face. The reference calls for a fixed crown and an almost still printed
  // center, with only the hanging outer fabric gently fluttering.
  function drapedCloth(layer,now){
    const head=faceCenter;
    const fw=head.fw,fh=head.fh;
    const radiusY=head.radiusY/fw;
    const radiusX=head.radiusX/fw;
    const radiusZ=head.radiusZ/fw;
    const roll=head.si;
    const cosRoll=head.co;
    for(let id=0;id<faceVertexCount;id++){
      const row=Math.floor(id/(GRID_COLS+1));
      const col=id%(GRID_COLS+1);
      const u=col/GRID_COLS,v=row/GRID_ROWS,at=id*stride;
      const x=(u-.5)*3.34;
      const z=(v-.5)*3.34;
      const radius=Math.hypot(x/radiusX,z/radiusZ);
      // The crown lies on the ellipsoid; fabric outside the skull hangs.
      const dome=radius<1?
        -radiusY*Math.sqrt(Math.max(0,1-radius*radius)):
        (radius-1)*.48;
      const curtain=Math.pow(Math.abs(v-.5)*2,1.7);
      const side=clamp((Math.abs(x)-.50)/1.12,0,1);
      const printedCenter=clamp((Math.abs(x)-.60)/.55,0,1);
      // Permanent small folds at the sides, not a free-spinning sheet.
      const pleat=.047*Math.sin(u*24+layer.index*1.7)*
        Math.pow(side,1.5)*curtain;
      const seconds=now*.001;
      const breeze=Math.sin(seconds*1.65+u*10+layer.index*.75)*
        .026*curtain*(.12+.88*side)*printedCenter;
      const frontHem=v<.5?fh/fw*.32*Math.pow(1-2*v,1.6):0;
      const y=dome+pleat+breeze+frontHem;
      const xLocal=x+(.025*Math.sin(seconds*1.35+v*12+layer.index)*
        side*curtain);
      // Head moves under the fixed veil, but it never acquires its own
      // unbounded yaw/rotation. Center embroidery moves rigidly with the head.
      const screenX=head.x+fw*(xLocal*cosRoll-y*roll);
      const screenY=head.y+fw*(xLocal*roll+y*cosRoll);
      mesh[at]=screenX;mesh[at+1]=screenY;
      // Front-half depth is closer to the viewer. Old front/rear vertices
      // projected to almost identical places and multiplied the text.
      mesh[at+2]=clamp(-.16+z*.19,-.74,.52);
      mesh[at+3]=u;mesh[at+4]=v;
      mesh[at+5]=clamp(.95+.07*Math.sin(u*22+layer.index)*side,.78,1.10);
      mesh[at+6]=Math.min(u,1-u,v,1-v);
      mesh[at+7]=0;
      const nx=clamp(x/(radiusX*3),-.46,.46);
      const ny=clamp(-z/(radiusZ*3),-.46,.46);
      mesh[at+8]=nx;mesh[at+9]=ny;
      mesh[at+10]=Math.sqrt(Math.max(.55,1-nx*nx-ny*ny));
    }
  }
  function arrival(t){
    // One short, decisive approach with a softly decelerating landing.
    // The slow 65%-of-flight drift in the prior version is removed.
    t=clamp(t,0,1);
    return t*t*t;
  }
  function render(now){
    if(!live)return;
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.depthMask(true);gl.clearDepth(1);gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    for(let i=layers.length-1;i>=0;i--){
      if(layers[i].removing&&now-layers[i].exit>1200)layers.splice(i,1);
    }
    const ready=Boolean(faceCenter&&setupStatus==='ready'&&indexCount&&textures.first&&layers.length);
    if(!ready||gl.isContextLost()){
      reportState(gl.isContextLost()?'context-lost':(!faceCenter?'no-face':(!textures.first?'no-texture':'not-ready')),now);
      root.classList.remove('ar-tulle-ready');
      canvasBackup.draw(layers,now);
      return;
    }
    try{
      for(let i=0;i<8&&gl.getError()!==gl.NO_ERROR;i++){}
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      // Do not depth-clip the loose cloth with the tracked face:
      // that prepass produced the forehead cut and glued-on mask shape.
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER,vb);
      gl.enableVertexAttribArray(positionAttr);
      gl.vertexAttribPointer(positionAttr,3,gl.FLOAT,false,stride*4,0);
      gl.enableVertexAttribArray(uvAttr);
      gl.vertexAttribPointer(uvAttr,2,gl.FLOAT,false,stride*4,3*4);
      gl.enableVertexAttribArray(lightAttr);
      gl.vertexAttribPointer(lightAttr,1,gl.FLOAT,false,stride*4,5*4);
      gl.enableVertexAttribArray(fringeAttr);
      gl.vertexAttribPointer(fringeAttr,1,gl.FLOAT,false,stride*4,6*4);
      gl.enableVertexAttribArray(travelAttr);
      gl.vertexAttribPointer(travelAttr,1,gl.FLOAT,false,stride*4,7*4);
      gl.enableVertexAttribArray(normalAttr);
      gl.vertexAttribPointer(normalAttr,3,gl.FLOAT,false,stride*4,8*4);
      gl.uniform2f(projectionUniform,faceCenter.x/W*2-1,1-faceCenter.y/H*2);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
      gl.uniform1i(texUniform,0);gl.uniform1i(stitchUniform,1);

      // Composite each physical sheet with its own embroidery. A new sheet
      // veils both the face and the older embroidery beneath it.
      for(const layer of layers){
        for(let pass=0;pass<2;pass++){
          gl.uniform1f(passUniform,pass);
          const tex=textures[layer.variant]?.[layer.index];
          if(!tex)continue;
          const seconds=(now-layer.start)/1000;
          const progress=clamp(seconds/.36,0,1);
          const approach=layer.removing?1:arrival(progress);
          const fly=1-approach;
          const leave=layer.removing?clamp((now-layer.exit)/1150,0,1):0;
          const opacity=layer.removing?1-ease(clamp((leave-.82)/.18,0,1)):clamp(seconds/.10,0,1);
          if(opacity<=0)continue;
          const shiftX=(layer.index%2?-1:1)*24*fly;
          const shiftY=-55*fly;
          const center=faceCenter;
          const clothWidth=center.cw,clothHeight=center.ch;
          if(pass===0)drapedCloth(layer,now);
          for(let at=0;at<mesh.length;at+=stride){
            const u=mesh[at+3],v=mesh[at+4];
            const flatX=(u-.5)*clothWidth;
            const flatY=(.5-v)*clothHeight*.04;
            const startX=center.x+flatX*center.co-flatY*center.si;
            const startY=center.y-clothHeight*.44+flatX*center.si+flatY*center.co;
            const landing=ease(clamp((seconds-.12)/.75,0,1));
            const x=startX+(mesh[at]-startX)*landing;
            const y=startY+(mesh[at+1]-startY)*landing;
            const flutter=(1-landing)*Math.sin(u*17+now*.008+layer.index)*5;
            const distance=clamp((1-u)*.48+v*.52,0,1);
            const released=layer.removing?clamp((leave*1.55-distance)/.40,0,1):0;
            const lift=ease(released),curl=Math.sin(lift*Math.PI*.82);
            const depart=ease(clamp((leave-.65)/.35,0,1));
            vertices[at]=(x+flutter+shiftX*(1-landing)+
              lift*clothWidth*.35+depart*W*.75)/W*2-1;
            vertices[at+1]=1-(y+shiftY*(1-landing)-
              lift*clothHeight*.23-depart*H*.20)/H*2;
            vertices[at+2]=clamp(-.7*(1-landing)+mesh[at+2]*landing
              -layer.index*.002-lift*.24,-.8,.8);
            for(let j=3;j<stride;j++)vertices[at+j]=mesh[at+j];
            vertices[at+5]*=1-.20*curl;
            vertices[at+7]=-.52*(1-landing)-.14*curl;
          }
          gl.bindBuffer(gl.ARRAY_BUFFER,vb);
          gl.bufferSubData(gl.ARRAY_BUFFER,0,vertices);
          if(pass===0){
            // Use the physical sheet's own depth, not the face as an
            // occluder. Hide fabric on the far side of the head/itself.
            // Reset only depth for this layer so earlier translucent sheets
            // remain visible in the color buffer.
            gl.depthMask(true);
            gl.clear(gl.DEPTH_BUFFER_BIT);
            gl.disable(gl.BLEND);
            gl.colorMask(false,false,false,false);
            gl.drawElements(gl.TRIANGLES,indexCount,gl.UNSIGNED_SHORT,0);
            gl.depthMask(false);
            gl.colorMask(true,true,true,true);
            gl.enable(gl.BLEND);
          }
          gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex.fabric);
          gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tex.thread);
          // Five stacked textile layers must stay translucent; embroidery
          // remains opaque enough to be read even across the older layers.
          gl.uniform1f(opacityUniform,opacity*(pass===0?.96:1));
          gl.drawElements(gl.TRIANGLES,indexCount,gl.UNSIGNED_SHORT,0);
        }
      }
      const err=gl.getError();
      if(err!==gl.NO_ERROR)throw new Error('WebGL cloth/face draw error '+err);
      root.classList.add('ar-tulle-ready');
      canvasBackup.draw([],now);
      reportState('rendering',now);
      renderErrorReported=false;
    }catch(error){
      gl.colorMask(true,true,true,true);gl.depthMask(true);
      root.classList.remove('ar-tulle-ready');
      canvasBackup.draw(layers,now);
      reportState('draw-error',now);
      if(!renderErrorReported){
        console.error('[DCD AR] face/cloth pipeline:',error);
        renderErrorReported=true;
      }
    }
  }
  function loop(now){
    if(!live)return;
    // Thirty FPS is sufficient for a translucent face cloth and prevents
    // a second 60 FPS WebGL loop from competing with camera inference.
    if(now-lastRendered>=16){lastRendered=now;render(now);}
    frameId=requestAnimationFrame(loop);
  }
  frameId=requestAnimationFrame(loop);
  function add(variant,index){
    const layer={variant,index,start:performance.now(),removing:false,exit:0};
    layers.push(layer);return layer;
  }
  function remove(layer){
    if(layer&&!layer.removing){layer.removing=true;layer.exit=performance.now();}
  }
  function clear(){layers.length=0;}
  function destroy(){
    live=false;cancelAnimationFrame(frameId);layers.length=0;
    const seen=new Set();
    for(const texArray of Object.values(textures))for(const pair of texArray){
      for(const t of [pair.fabric,pair.thread])if(!seen.has(t)){gl.deleteTexture(t);seen.add(t);}
    }
    canvasBackup.destroy();
    if(occBuffer)gl.deleteBuffer(occBuffer);
    if(occIndex)gl.deleteBuffer(occIndex);
    if(occProgram)gl.deleteProgram(occProgram);
    gl.deleteBuffer(vb);gl.deleteBuffer(ib);gl.deleteProgram(program);canvas.remove();
    root.classList.remove('ar-tulle-gpu','ar-tulle-ready');
  }
  return {setConnections,update,add,remove,clear,destroy};
}
window.DCD_TULLE={create,words:WORDS,layout:(variant,index)=>FIGMA_MASK_TEXT[variant]?.[index]||null};
})();