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
const VERT=String.raw`
attribute vec3 position;
attribute vec2 uv;
attribute float lighting;
attribute float fringe;
varying vec2 vUV;
varying float vLight;
varying float vFringe;
void main(){
  vUV=uv;vLight=lighting;vFringe=fringe;
  gl_Position=vec4(position.xy,clamp(position.z,-0.8,0.8),1.0);
}`;
const FRAG=`
precision highp float;
uniform sampler2D fabric;
uniform sampler2D embroideryMask;
uniform float opacity;
uniform float embroideryPass;
varying vec2 vUV;
varying float vLight;
varying float vFringe;
void main(){
  vec4 cloth=texture2D(fabric,vUV);
  vec2 pixel=vec2(1.0/1024.0);
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
  float fiberLight=clamp(vLight+0.17*(left-right+up-down),0.76,1.17);
  vec3 whiteNet=vec3(0.985,0.972,0.954)*fiberLight;
  // Give the photographic thread visible scattering while leaving the
  // spaces between woven fibers transparent. A faint organza body connects
  // the fabric even when individual thread pixels shrink at camera scale.
  float netAlpha=0.030+0.31*strand+0.025*detail;
  // A separate embroidery coverage map prevents fibers from turning black.
  float stitch=texture2D(embroideryMask,vUV).a;
  float eLeft=texture2D(embroideryMask,vUV-vec2(pixel.x,0.0)).a;
  float eRight=texture2D(embroideryMask,vUV+vec2(pixel.x,0.0)).a;
  float eUp=texture2D(embroideryMask,vUV-vec2(0.0,pixel.y)).a;
  float eDown=texture2D(embroideryMask,vUV+vec2(0.0,pixel.y)).a;
  // Raised thread edge: light on one side and a narrow contact shadow
  // on the other. No generated plaid/grid/false black stitch pattern.
  float rim=clamp((eLeft-eRight+eUp-eDown)*0.24,-0.20,0.20);
  float surface=clamp(0.82+0.12*fiber+0.13*(vLight-0.85)+rim,0.60,1.10);
  vec3 orangeThread=vec3(0.99,0.315,0.035)*surface;
  float contact=clamp(max(max(eLeft,eRight),max(eUp,eDown))-stitch,0.0,1.0);
  float shade=contact*0.13;
  // Fabric and embroidery have independent draw passes. In particular the
  // last fabric layer must not erase the letters from earlier layers.
  float edgeFade=1.0-0.85*smoothstep(0.94,1.0,vFringe);
  if(embroideryPass>0.5){
    gl_FragColor=vec4(orangeThread,clamp(stitch*opacity,0.0,1.0));
  }else{
    gl_FragColor=vec4(whiteNet*(1.0-shade),clamp(netAlpha*opacity*edgeFade,0.0,1.0));
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
  const weave=ctx.createPattern(tile,'repeat');
  if(weave?.setTransform&&typeof DOMMatrix!=='undefined')
    weave.setTransform(new DOMMatrix().translate(index*9,index*13).scale(.92));
  ctx.imageSmoothingEnabled=true;ctx.fillStyle=weave;ctx.fillRect(0,0,c.width,c.height);
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
 return {u:clamp((c.x+c.w/2-CLOTH_REF.left)/276,.13,.87),
 v:clamp(1-(c.y+h/2-CLOTH_REF.top)/396,.13,.87),
 max:clamp(c.w/276,.13,.48)};
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
 ctx.scale(Math.min(2.1,slot.max*TEXTURE_SIZE*.86/widest),Math.min(2.1,slot.max*TEXTURE_SIZE*.86/widest));
 let y=-total/2;
 lines.forEach((line,i)=>{ctx.font='700 '+fs[i]+'px "Turret Road",sans-serif';ctx.fillText(line,0,y);y+=lh[i]});
 ctx.restore();
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
  const pattern=ctx.createPattern(tile,'repeat');
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
    // Keep generous margins around the face, but never let the cloth grow
    // into the heading or extend an entire face-height beyond the chin.
    const cw=clamp(fw*1.32,fw+24,350);
    const ch=clamp(fh*1.29,fh+38,540);
    const cx=(left.x+right.x)/2,cy=(head.y+jaw.y)/2;
    const angle=Math.atan2(eyeL.y-eyeR.y,eyeL.x-eyeR.x);
    // Render the translucent yarn in one pass, then all embroidered words
    // in a separate final pass; later nets must not erase earlier words.
    for(let pass=0;pass<2;pass++)for(const layer of layers){
      const age=(now-layer.start)/1000;
      const progress=clamp(age/1.25,0,1);
      const fly=Math.pow(1-progress,3);
      const shiftX=(layer.index%2?1:-1)*56*fly,shiftY=-85*fly;
      const exit=layer.removing?clamp((now-layer.exit)/1150,0,1):0;
      const alpha=layer.removing?1-ease(exit):clamp(age/.24,0,1);
      if(alpha<=0)continue;
      ctx.save();ctx.globalAlpha=alpha;
      ctx.translate(cx+shiftX+exit*45,cy+shiftY-exit*155);
      ctx.rotate(angle);
      const l=-cw/2,r=cw/2,t=-ch*.47,b=ch*.53;
      // One cloth with four continuous sides, softened top corners and
      // subtly tucked lower corners, rather than a face-shaped ellipse.
      ctx.beginPath();
      ctx.moveTo(l+cw*.09,t);
      ctx.lineTo(r-cw*.09,t);
      ctx.quadraticCurveTo(r,t,r,t+ch*.09);
      ctx.lineTo(r,b-ch*.18);
      // Raise and tuck the lower corners, allow the central hem to curl.
      // Two unequal arcs prevent the sheet from ending in a straight edge.
      ctx.quadraticCurveTo(r-cw*.035,b-ch*.11,r-cw*.21,b-ch*.075);
      ctx.quadraticCurveTo(r-cw*.38,b-ch*.025,0,b-ch*.035);
      ctx.quadraticCurveTo(l+cw*.40,b+ch*.015,l+cw*.21,b-ch*.085);
      ctx.quadraticCurveTo(l+cw*.035,b-ch*.12,l,b-ch*.18);
      ctx.lineTo(l,t+ch*.09);
      ctx.quadraticCurveTo(l,t,l+cw*.09,t);
      ctx.closePath();ctx.clip();
      if(pass===0){
      ctx.fillStyle='rgba(250,248,243,.065)';
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
        ctx.fillStyle='#fb5511';ctx.textBaseline='top';ctx.textAlign='center';
        const lines=config.text.split('\n');
        const scale=Math.min(1.35,Math.max(.94,cw/276));
        ctx.scale(scale,scale);
        const total=lines.reduce((z,_,i)=>z+(config.lh[i]||20),0);
        let yy=-total/2;
        for(let i=0;i<lines.length;i++){
          ctx.font='700 '+(config.fs[i]||18)+'px "Turret Road",sans-serif';
          ctx.lineWidth=.75;ctx.strokeStyle='rgba(210,62,8,.65)';
          ctx.strokeText(lines[i],0,yy);
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
  canvas.className='ar-tulle-webgl';canvas.width=W;canvas.height=H;root.prepend(canvas);
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
  const stride=7,positionAttr=gl.getAttribLocation(program,'position');
  const uvAttr=gl.getAttribLocation(program,'uv'),lightAttr=gl.getAttribLocation(program,'lighting');
  const fringeAttr=gl.getAttribLocation(program,'fringe');
  const opacityUniform=gl.getUniformLocation(program,'opacity'),texUniform=gl.getUniformLocation(program,'fabric');
  const stitchUniform=gl.getUniformLocation(program,'embroideryMask');
  const passUniform=gl.getUniformLocation(program,'embroideryPass');
  let outline=[],mesh=null,vertices=null,indexCount=0,faceCenter=null;
  let facePixels=null,faceDepth=null,faceBounds=null,frameLast=0;
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
  const columns=28,rows=34;
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
    const indices=[];
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
      const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;
      indices.push(a,c,b,b,c,d);
    }
    indexCount=indices.length;
    mesh=new Float32Array((columns+1)*(rows+1)*stride);
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
    const angle=Math.atan2(eyeA.y-eyeB.y,eyeA.x-eyeB.x),co=Math.cos(angle),si=Math.sin(angle);
    const cx=(left.x+right.x)/2,cy=(forehead.y+chin.y)/2;
    const cw=clamp(fw*1.32,fw+24,350),ch=clamp(fh*1.29,fh+38,540);
    faceCenter={x:cx,y:cy,cw,ch,co,si,fw,fh};
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
    for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){
      const u=x/columns,v=y/rows,nx=u*2-1;
      const edgeX=Math.max(0,(Math.abs(nx)-.68)/.32);
      const lower=Math.max(0,(v-.69)/.31);
      // Lower fabric is not a flat screen-facing rectangle. Below the jaw
      // the cloth falls forward, folds under the chin and tucks around the
      // left/right sides of the neck. Keep its boundary irregular and soft.
      const tuck=lower*lower*(3-2*lower);
      // Upper 70% remains smoothly stretched across the face. Drape only
      // the excess BELOW the jaw, with a curled hem instead of a straight
      // square boundary. No creases or independent upper-layer offsets.
      // A rectangle never becomes a pointed triangular hem. Let only the
      // outer 15% of the cloth draw gently inward after the jaw line.
      // Fold free side edges behind the temples instead of displaying the
      // rectangular corners beside the head. This smooth taper is spatial,
      // not a sinusoidal crease across the forehead.
      const sideFold=clamp((Math.abs(nx)-.72)/.28,0,1);
      const upperCorner=clamp((.19-v)/.19,0,1)*clamp((Math.abs(nx)-.64)/.36,0,1);
      const curl=tuck*(.065+.055*edgeX)+sideFold*.22+upperCorner*.09;
      const px=nx*cw*.5*(1-curl);
      const rolledEdge=Math.max(0,(v-.87)/.13);
      const curve=Math.pow(Math.abs(nx),1.5);
      // Keep the lower edge broad: the center/side height difference stays
      // below ~3% of the face height rather than the previous 27.5%.
      const hemLift=tuck*fh*(.025+.020*curve);
      const hemScoop=tuck*fh*.015*(1-curve);
      const py=(v-.47)*ch-hemLift+hemScoop-rolledEdge*rolledEdge*fh*.012+
        upperCorner*fh*.065;
      const bump=Math.exp(-((nx/.35)**2+((v-.42)/.35)**2));
      const cheek=Math.exp(-(((Math.abs(nx)-.51)/.27)**2+((v-.51)/.31)**2));
      const foldDepth=tuck*(.025+.055*edgeX)+rolledEdge*.03;
      const at=(y*(columns+1)+x)*stride;
      mesh[at]=cx+px*co-py*si;
      mesh[at+1]=cy+px*si+py*co;
      // Clip-space Z: smaller is nearer. This measured, bounded relief is
      // deliberately retained through the vertex buffer (it was discarded).
      // Sample the tracked 3D facial surface from nearby landmarks, not
      // from an invented constant-depth nose bump. Closest four landmarks
      // are blended so no hard transitions appear at triangle boundaries.
      const xx=mesh[at],yy=mesh[at+1];
      const nearest=[1e12,1e12,1e12,1e12],ids=[0,0,0,0];
      for(let k=0;k<468;k++){
        const dx=xx-facePixels[k*2],dy=yy-facePixels[k*2+1];
        const d=dx*dx+dy*dy;
        if(d>=nearest[3])continue;
        let q=3;
        while(q>0&&d<nearest[q-1]){nearest[q]=nearest[q-1];ids[q]=ids[q-1];q--;}
        nearest[q]=d;ids[q]=k;
      }
      let weightedZ=0,weightSum=0;
      for(let k=0;k<4;k++){
        const weight=1/(nearest[k]+160);
        weightedZ+=faceDepth[ids[k]]*weight;weightSum+=weight;
      }
      const trackedSurface=weightedZ/Math.max(weightSum,1e-6);
      const sideWrap=sideFold;
      const jawWrap=tuck*Math.max(0,(v-.74)/.26);
      const behind=.19*Math.max(sideWrap,jawWrap,upperCorner*.85);
      // Foreground fabric is just outside the face. Excess cloth moves
      // behind the side/jaw surface where depth occlusion can hide it.
      mesh[at+2]=clamp(trackedSurface-.032+behind+foldDepth*.16,-.79,.79);
      mesh[at+3]=u;mesh[at+4]=v;
      const foldShade=tuck*(.055*edgeX+.012*curve);
      mesh[at+5]=clamp(.94+.10*bump+.035*cheek-foldShade-rolledEdge*.13,.68,1.10);
      const border=Math.min(u,1-u,v,1-v);
      mesh[at+6]=clamp((.075-border)/.075,0,1);
    }
  }
  function arrival(t){
    // One short, decisive approach with a softly decelerating landing.
    // The slow 65%-of-flight drift in the prior version is removed.
    t=clamp(t,0,1);
    return 1-Math.pow(1-t,3);
  }
  function render(now){
    if(!live)return;
    gl.viewport(0,0,W,H);
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
      // Occluder is depth-only: the tracked camera remains visible, while
      // draped corners that travel behind the face disappear naturally.
      if(occProgram&&occBuffer&&faceDepth?.length===468){
        gl.disable(gl.BLEND);
        gl.colorMask(false,false,false,false);gl.depthMask(true);
        gl.useProgram(occProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER,occBuffer);
        gl.enableVertexAttribArray(occPosition);
        gl.vertexAttribPointer(occPosition,3,gl.FLOAT,false,12,0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,occIndex);
        gl.drawElements(gl.TRIANGLES,occIndices,gl.UNSIGNED_SHORT,0);
        gl.disableVertexAttribArray(occPosition);
        gl.colorMask(true,true,true,true);
      }
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
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
      gl.uniform1i(texUniform,0);gl.uniform1i(stitchUniform,1);

      // Two separate passes: every membrane is drawn first, then all five
      // embroidered phrases above the yarn. Later tulle may not erase words.
      for(let pass=0;pass<2;pass++){
        gl.uniform1f(passUniform,pass);
        for(const layer of layers){
          const tex=textures[layer.variant]?.[layer.index];
          if(!tex)continue;
          const seconds=(now-layer.start)/1000;
          const progress=clamp(seconds/1.25,0,1);
          const approach=layer.removing?1:arrival(progress);
          const fly=1-approach;
          const leave=layer.removing?clamp((now-layer.exit)/1150,0,1):0;
          const opacity=layer.removing?1-ease(leave):clamp(seconds/.24,0,1);
          if(opacity<=0)continue;
          const shiftX=(layer.index%2?-1:1)*56*fly;
          const shiftY=-85*fly;
          const center=faceCenter;
          const clothWidth=center.cw,clothHeight=center.ch;
          const xCos=center.co,ySin=center.si;
          for(let at=0;at<mesh.length;at+=stride){
            const u=mesh[at+3],v=mesh[at+4],nx=2*u-1;
            const flatX=nx*clothWidth*.5;
            const flatY=(v-.47)*clothHeight;
            const startX=center.x+flatX*xCos-flatY*ySin;
            const startY=center.y+flatX*ySin+flatY*xCos;
            // Contact begins at the nose, spreads through the cheeks, and
            // reaches the free edges last. At the end all vertices settle.
            const radius=clamp(Math.hypot(nx*.7,(v-.48)*1.15),0,1);
            const threshold=.48+.28*radius;
            const contact=clamp((approach-threshold)/(1-threshold),0,1);
            const smooth=contact*contact*(3-2*contact);
            const pull=clamp((v-.73)/.27,0,1);
            const flutter=fly*pull*pull*Math.sin(now*.003+nx*9+layer.index*.3)*1.5;
            const x=startX+(mesh[at]-startX)*smooth;
            const y=startY+(mesh[at+1]-startY)*smooth;
            const lift=ease(leave);
            const scale=1-.28*fly;
            vertices[at]=(center.x+(x-center.x)*scale+shiftX+flutter+lift*42)/W*2-1;
            vertices[at+1]=1-(center.y+(y-center.y)*scale+shiftY-lift*175)/H*2;
            // Before contact the textile approaches from in front of the
            // nose; final Z is the sampled face surface with jaw curl.
            vertices[at+2]=clamp(-.65*fly+mesh[at+2]*approach,-.8,.8);
            for(let j=3;j<stride;j++)vertices[at+j]=mesh[at+j];
          }
          gl.bindBuffer(gl.ARRAY_BUFFER,vb);
          gl.bufferSubData(gl.ARRAY_BUFFER,0,vertices);
          gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex.fabric);
          gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tex.thread);
          // Five stacked textile layers must stay translucent; embroidery
          // remains opaque enough to be read even across the older layers.
          gl.uniform1f(opacityUniform,opacity*(pass===0?.62:1));
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
    if(now-lastRendered>=33){lastRendered=now;render(now);}
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