/* Landmark-driven organza with a continuous feathered surface. */
(()=>{'use strict';
const RAW='eNpjYAABRr0KeQYkQCqfQb1BmRI+o2YLZXzTLjlK+KJZOaas5POFYzzEnU3YyOULhTtzMPC7m7ORxxcMsmcHUgI+1uzk8AV8YeKBEHHS+PweFuwwd4WB3EUSn1MEJVyi0cKJID8gw5QNOV4yc0njp/ZTlG4YNXooS7cK7RTlGwb5KlT36JeTxlfLEEXhO+WSxjdPFkTh++aQxnfIFELh+xWQxneoE0PhuzWQxjer9WRH4vN5VpHGd5VNcEQI8DmbkMi3YhSNsoWlSH4PYJYmjQ80SyTUCiIAzZik8hmE/c3YEMUC6XwGIS9jVkihRB6fQdDVQDLGHc4lmc8g4FXmz8lAPp/RtUmcgRK+X6EQRXxS8w06n9R8i84ntdxA44/W/6P1/2j9P1r/j9b/o/X/aP0/APW/S44IeXwA8coG+g==';
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
  float strand=smoothstep(0.06,0.67,fiber);
  float fiberLight=clamp(vLight+0.15*(left-right+up-down),0.76,1.17);
  // Nearly white woven filament; the openings retain camera transparency.
  vec3 whiteNet=vec3(0.985,0.972,0.954)*fiberLight;
  float netAlpha=0.006+strand*0.65;
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
  vec3 color=mix(whiteNet*(1.0-shade),orangeThread,stitch);
  float alpha=mix(netAlpha,0.99,stitch);
  alpha*=1.0-0.85*smoothstep(0.94,1.0,vFringe);
  gl_FragColor=vec4(color,clamp(alpha*opacity,0.0,1.0));
}`;
function shader(gl,type,code){
  const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));
  return s;
}
async function getHeight(){
  if(typeof DecompressionStream==='undefined')return null;
  const data=Uint8Array.from(atob(RAW),c=>c.charCodeAt(0));
  const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
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
    weave.setTransform(new DOMMatrix().translate(index*9,index*13).scale(.56));
  ctx.imageSmoothingEnabled=true;ctx.fillStyle=weave;ctx.fillRect(0,0,c.width,c.height);
  return c;
}
// Keep embroidered phrases in stable cloth regions. Facial features are
// still tracked by the full mesh, but the text must NOT cross eyelids or
// fold over the nose. Five separated labels remain legible as layers stack.
const EMBROIDERY_SLOTS={
  first:[
    {u:.34,v:.79,max:.23}, // upper left forehead
    {u:.65,v:.79,max:.24}, // upper right forehead
    {u:.77,v:.43,max:.25}, // right outer cheek
    {u:.23,v:.43,max:.25}, // left outer cheek
    {u:.50,v:.19,max:.28}  // lower chin
  ],
  replacement:[
    {u:.34,v:.79,max:.23},
    {u:.65,v:.79,max:.24},
    {u:.50,v:.19,max:.28},
    {u:.23,v:.43,max:.25},
    {u:.77,v:.43,max:.25}
  ]
};
function embroideredLetters(variant,index){
  const c=document.createElement('canvas');c.width=c.height=TEXTURE_SIZE;
  const ctx=c.getContext('2d');
  const config=FIGMA_MASK_TEXT[variant]?.[index];
  const slot=EMBROIDERY_SLOTS[variant]?.[index];
  if(!config||!slot)return c;
  // Canonical UVs have a bottom-left origin. Canvas pixels are top-left.
  // The camera mesh is mirrored; inverse the atlas once, not each letter.
  ctx.save();
  ctx.translate(TEXTURE_SIZE,0);
  ctx.scale(-1,1);
  ctx.translate(slot.u*TEXTURE_SIZE,(1-slot.v)*TEXTURE_SIZE);
  ctx.rotate(-config.r*Math.PI/180);
  ctx.fillStyle='#fff';
  ctx.textAlign='center';
  ctx.textBaseline='top';
  const lines=config.text.split('\n');
  const sizes=lines.map((_,i)=>config.fs[i]||18);
  const leading=lines.map((_,i)=>config.lh[i]||20);
  const totalHeight=leading.reduce((a,b)=>a+b,0);
  let widest=0;
  lines.forEach((line,i)=>{
    ctx.font='700 '+sizes[i]+'px "Turret Road",sans-serif';
    widest=Math.max(widest,ctx.measureText(line).width);
  });
  // Limit the ink's atlas footprint so one phrase cannot sprawl across
  // both eyes or be folded through the sharp nose ridge.
  const fit=Math.min(2.65,slot.max*TEXTURE_SIZE/Math.max(widest,1));
  ctx.scale(fit,fit);
  let y=-totalHeight/2;
  lines.forEach((line,i)=>{
    ctx.font='700 '+sizes[i]+'px "Turret Road",sans-serif';
    ctx.fillText(line,0,y);
    y+=leading[i];
  });
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
function create(root){
  if(!root)return null;
  const canvas=document.createElement('canvas');
  canvas.className='ar-tulle-webgl';canvas.width=W;canvas.height=H;root.prepend(canvas);
  let gl,program;
  try{
    gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
    if(!gl)throw Error('WebGL not supported');
    program=gl.createProgram();
    gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,VERT));
    gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,FRAG));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  }catch(error){console.warn('[DCD] Cloth WebGL unavailable',error);canvas.remove();return null;}
  // Suppress the old flat CSS oval when the tracked 3D cloth is available.
  root.classList.add('ar-tulle-gpu');
  const vb=gl.createBuffer(),ib=gl.createBuffer();
  const stride=7,positionAttr=gl.getAttribLocation(program,'position');
  const uvAttr=gl.getAttribLocation(program,'uv'),lightAttr=gl.getAttribLocation(program,'lighting');
  const fringeAttr=gl.getAttribLocation(program,'fringe');
  const opacityUniform=gl.getUniformLocation(program,'opacity'),texUniform=gl.getUniformLocation(program,'fabric');
  const stitchUniform=gl.getUniformLocation(program,'embroideryMask');
  let outline=[],neighborsByVertex=[],mesh=null,vertices=null,indexCount=0,faceCenter=null;
  let vertexCount=0,neutralUV=null;
  let live=true,frameId=0,lastRendered=0,renderErrorReported=false;
  const textures={},layers=[];
  function setConnections(){
    const canonical=window.DCD_FACE_CANONICAL;
    if(!canonical||canonical.uv.length!==468||canonical.triangles.length<2000)return false;
    outline=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
    const faceVertices=canonical.uv.length;
    const ringLength=outline.length;
    vertexCount=faceVertices+ringLength*2;
    // MediaPipe's canonical surface leaves eye and mouth openings. This is
    // a continuous piece of tulle, so bridge those openings using the exact
    // surrounding facial landmarks. Never cut holes around features.
    // Only close the eye openings. Do not triangulate the lips: a large
    // bridge over the mouth creates visible crossing seams/false lip lines.
    const patches=[
      [33,160,158,133,153,144],
      [362,385,387,263,373,380]
    ];
    const completeTriangles=canonical.triangles.slice();
    for(const loop of patches){
      for(let i=1;i<loop.length-1;i++)
        completeTriangles.push(loop[0],loop[i],loop[i+1]);
    }
    // Extend the textile beyond the actual face outline (loose draped veil).
    // These extension vertices are not extra face landmarks.
    const rim=outline;
    for(let ring=0;ring<2;ring++){
      const inner=ring===0?rim:null;
      for(let i=0;i<rim.length;i++){
        const next=(i+1)%rim.length;
        const a=ring===0?rim[i]:faceVertices+i;
        const b=ring===0?rim[next]:faceVertices+next;
        const c=faceVertices+(ring+1)*rim.length+i;
        const d=faceVertices+(ring+1)*rim.length+next;
        completeTriangles.push(a,b,c,b,d,c);
      }
    }
    indexCount=completeTriangles.length;
    mesh=new Float32Array(vertexCount*stride);
    vertices=new Float32Array(mesh.length);
    neutralUV=new Float32Array(vertexCount*2);
    neighborsByVertex=Array.from({length:faceVertices},()=>new Set());
    for(let i=0;i<faceVertices;i++){
      neutralUV[i*2]=canonical.uv[i][0];
      neutralUV[i*2+1]=canonical.uv[i][1];
    }
    for(let k=0;k<indexCount;k+=3){
      const [a,b,c]=completeTriangles.slice(k,k+3);
      if(a>=faceVertices||b>=faceVertices||c>=faceVertices)continue;
      neighborsByVertex[a].add(b);neighborsByVertex[a].add(c);
      neighborsByVertex[b].add(a);neighborsByVertex[b].add(c);
      neighborsByVertex[c].add(a);neighborsByVertex[c].add(b);
    }
    neighborsByVertex=neighborsByVertex.map(x=>[...x]);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(completeTriangles),gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,vb);
    gl.bufferData(gl.ARRAY_BUFFER,vertices.byteLength,gl.DYNAMIC_DRAW);
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
  (async()=>{
    try{
      const [height]=await Promise.all([
        getHeight(),
        document.fonts?.load('700 18px "Turret Road"').catch(()=>{})||Promise.resolve()
      ]);
      if(!live)return;
      const fiberTextures=Array.from({length:5},(_,i)=>makeTexture(paintedFabric(height,i)));
      for(const variant of ['first','replacement']){
        textures[variant]=WORDS[variant].map((phrase,i)=>({
          fabric:fiberTextures[i],
          thread:makeTexture(embroideredLetters(variant,i))
        }));
      }
    }catch(error){console.warn('[DCD] Cloth texture preparation:',error);}
  })();
  function update(points,width,height){
    if(!mesh||!points?.length||points.length<468||!width||!height){
      faceCenter=null;return;
    }
    // Landmark coordinates and the mirrored live camera use one consistent
    // screen-space projection. Official UVs stay attached to each landmark.
    const fit=Math.max(W/width,H/height),dw=width*fit,dh=height*fit;
    const offsetX=(W-dw)/2,offsetY=(H-dh)/2;
    const pos=Array.from({length:468},(_,i)=>{
      const p=points[i];
      return {x:offsetX+(1-p.x)*dw,y:offsetY+p.y*dh,z:p.z*dw};
    });
    const c=pos[1],top=pos[10],bottom=pos[152];
    const faceHeight=Math.max(50,Math.hypot(top.x-bottom.x,top.y-bottom.y));
    faceCenter={x:c.x,y:c.y};
    for(let i=0;i<468;i++){
      const p=pos[i],off=i*stride;
      mesh[off]=p.x;mesh[off+1]=p.y;mesh[off+2]=p.z;
      mesh[off+3]=neutralUV[i*2];
      mesh[off+4]=neutralUV[i*2+1];
      // Local surface tilt from real face depth, not painted shadow.
      let xx=0,yy=0,weight=0;
      for(const j of neighborsByVertex[i]){
        const q=pos[j],dx=q.x-p.x,dy=q.y-p.y;
        const length2=dx*dx+dy*dy+3;
        const influence=Math.min(1,55/Math.sqrt(length2));
        xx+=(q.z-p.z)*dx/length2*influence;
        yy+=(q.z-p.z)*dy/length2*influence;
        weight+=influence;
      }
      mesh[off+5]=clamp(0.99+0.23*(-xx+yy)/Math.max(0.2,weight/5),0.71,1.21);
      // Canonical UV distance fades only the cloth perimeter, not facial
      // features. The real triangulation contains nose, cheek and lip bends.
      const u=neutralUV[i*2],v=neutralUV[i*2+1];
      const radial=Math.hypot((u-.5)*1.64,(v-.49)*1.46);
      mesh[off+6]=clamp((radial-.76)/.25,0,1);
    }
    // A loose net is bigger than the head: expand a two-ring soft perimeter
    // from the face contour, with gravity pulling the bottom edges down.
    // The center of the net still follows the real tracked 468-point face.
    const n=outline.length;
    for(let ring=0;ring<2;ring++){
      const grow=ring===0?1.16:1.35;
      for(let j=0;j<n;j++){
        const k=outline[j],p=pos[k],dx=p.x-c.x,dy=p.y-c.y;
        const down=ring===0?7:24;
        const off=(468+ring*n+j)*stride;
        mesh[off]=c.x+dx*grow;
        mesh[off+1]=c.y+dy*grow+down+Math.max(0,dy)*.065;
        mesh[off+2]=p.z+6+ring*8;
        const u=neutralUV[k*2],v=neutralUV[k*2+1];
        mesh[off+3]=.5+(u-.5)*grow;
        mesh[off+4]=.5+(v-.5)*grow;
        mesh[off+5]=clamp(mesh[k*stride+5]*.96,0.72,1.16);
        mesh[off+6]=ring===0?.18:.94;
      }
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
    gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    for(let i=layers.length-1;i>=0;i--){
      if(layers[i].removing&&now-layers[i].exit>1200)layers.splice(i,1);
    }
    const ready=Boolean(faceCenter&&indexCount&&textures.first&&layers.length);
    if(!ready||gl.isContextLost()){
      root.classList.remove('ar-tulle-ready');
      return;
    }
    try{
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
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
    gl.activeTexture(gl.TEXTURE0);gl.uniform1i(texUniform,0);
    gl.uniform1i(stitchUniform,1);
    // Draw already-settled layers first; each new veil remains on top.
    // Standard source-over accumulates alpha across all five physical layers.
    for(const layer of layers){
      const tex=textures[layer.variant]?.[layer.index];
      if(!tex)continue;
      const seconds=(now-layer.start)/1000,progress=clamp(seconds/1.25,0,1);
      const approaching=layer.removing?1:arrival(progress);
      const fly=1-approaching;
      const fadeIn=clamp(seconds/.24,0,1);
      const leave=layer.removing?clamp((now-layer.exit)/1150,0,1):0;
      const opacity=layer.removing?1-ease(leave):fadeIn;
      if(opacity<=0)continue;
      const offsetX=(layer.index%2?-1:1)*(56*fly);
      const offsetY=-85*fly;
      const settle=progress>=.90?Math.sin((progress-.9)*Math.PI*20)*
        Math.exp(-(progress-.9)*23)*1.8:0;
      const size=1+.12*fly,center=faceCenter;
      // Distinct cloth rims are essential for a visible layered stack.
      // Settled layers shift just 1–3 px rather than sharing one exact outline.
      const rimX=(layer.index-2)*1.35;
      const rimY=(layer.index%2===0?-1:1)*(1.2+layer.index*.45);
      const rimScale=1+(layer.index-2)*.006;
      for(let at=0;at<mesh.length;at+=stride){
        const x=mesh[at]-center.x,y=mesh[at+1]-center.y;
        const sway=mesh[at+6]**2*Math.sin(now*.0029+y*.041+layer.index*.7)*2.1;
        const lift=ease(leave);
        vertices[at]=(center.x+x*size*rimScale+offsetX+rimX+settle+sway+lift*(38-y*.23))/W*2-1;
        vertices[at+1]=1-(center.y+y*size*rimScale+offsetY+rimY+lift*(-165+x*.23))/H*2;
        vertices[at+2]=0;
        for(let i=3;i<stride;i++)vertices[at+i]=mesh[at+i];
      }
      gl.bufferSubData(gl.ARRAY_BUFFER,0,vertices);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex.fabric);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tex.thread);
      gl.uniform1f(opacityUniform,opacity);
      gl.drawElements(gl.TRIANGLES,indexCount,gl.UNSIGNED_SHORT,0);
    }
    // The previous code hid the fallback before confirming that any WebGL
    // output was produced. Keep it visible whenever GPU drawing fails.
    const error=gl.getError();
    if(error!==gl.NO_ERROR)throw new Error('WebGL draw error '+error);
    root.classList.add('ar-tulle-ready');
    renderErrorReported=false;
    }catch(error){
      root.classList.remove('ar-tulle-ready');
      if(!renderErrorReported){console.warn('[DCD AR] Cloth render fallback:',error);renderErrorReported=true;}
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
    gl.deleteBuffer(vb);gl.deleteBuffer(ib);gl.deleteProgram(program);canvas.remove();
    root.classList.remove('ar-tulle-gpu','ar-tulle-ready');
  }
  return {setConnections,update,add,remove,clear,destroy};
}
window.DCD_TULLE={create,words:WORDS,layout:(variant,index)=>FIGMA_MASK_TEXT[variant]?.[index]||null};
})();