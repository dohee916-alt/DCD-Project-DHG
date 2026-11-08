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
  vec4 clothSample=texture2D(fabric,vUV);
  float fiber=clothSample.a;
  vec2 pixel=vec2(1.0/1024.0);
  float dx=texture2D(fabric,vUV+vec2(pixel.x,0.0)).a-texture2D(fabric,vUV-vec2(pixel.x,0.0)).a;
  float dy=texture2D(fabric,vUV+vec2(0.0,pixel.y)).a-texture2D(fabric,vUV-vec2(0.0,pixel.y)).a;
  // The actual archived cloth relief controls lighting and opacity; the
  // holes remain transparent. No flat red overlay or procedural grid.
  float raised=smoothstep(0.07,0.75,fiber);
  float clothLight=clamp(vLight+0.23*(-dx+dy),0.66,1.24);
  vec3 orange=vec3(1.0,0.37,0.065)*clothLight;
  float clothAlpha=0.012+0.52*raised;
  // Black lettering is a separate alpha texture. Its opacity is never
  // inferred from the orange fibers' RGB, preventing false dark stripes.
  float stitched=texture2D(embroideryMask,vUV).a;
  float edgeX=texture2D(embroideryMask,vUV+vec2(pixel.x,0.0)).a-
    texture2D(embroideryMask,vUV-vec2(pixel.x,0.0)).a;
  float edgeY=texture2D(embroideryMask,vUV+vec2(0.0,pixel.y)).a-
    texture2D(embroideryMask,vUV-vec2(0.0,pixel.y)).a;
  // Reuse the existing cloth's physical fiber height as micro-relief
  // instead of inventing a separate simulated stitch pattern.
  float threadShine=clamp(0.85+0.12*fiber+0.11*(-edgeX+edgeY)+0.08*(vLight-0.9),0.67,1.05);
  vec3 blackThread=vec3(0.045,0.046,0.049)*threadShine;
  float alpha=mix(clothAlpha,0.985,stitched);
  alpha*=1.0-0.92*smoothstep(0.90,1.0,vFringe);
  vec3 color=mix(orange,blackThread,stitched);
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
    pixels.data[k]=245;pixels.data[k+1]=116;pixels.data[k+2]=35;
    pixels.data[k+3]=Math.round(Math.max(0,Math.min(255,fiber*255/143)));
  }
  tctx.putImageData(pixels,0,0);
  const weave=ctx.createPattern(tile,'repeat');
  if(weave?.setTransform&&typeof DOMMatrix!=='undefined')
    weave.setTransform(new DOMMatrix().translate(index*9,index*13).scale(.56));
  ctx.imageSmoothingEnabled=true;ctx.fillStyle=weave;ctx.fillRect(0,0,c.width,c.height);
  return c;
}
function embroideredLetters(variant,index){
  const c=document.createElement('canvas');c.width=c.height=TEXTURE_SIZE;
  const ctx=c.getContext('2d');
  const config=FIGMA_MASK_TEXT[variant]?.[index];
  if(!config)return c;
  const sx=.9*TEXTURE_SIZE/300,sy=.9*TEXTURE_SIZE/406;
  const px=TEXTURE_SIZE/2+(config.x-214)*sx;
  const py=TEXTURE_SIZE/2+(config.y-473)*sy;
  ctx.save();ctx.translate(px,py);ctx.scale(sx,sy);
  ctx.rotate(-config.r*Math.PI/180);
  ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#fff';
  let yy=0;
  for(const [line,li] of config.text.split('\n').map((str,i)=>[str,i])){
    ctx.font='700 '+config.fs[li]+'px "Turret Road",sans-serif';
    ctx.fillText(line,config.w/2,yy);
    yy+=config.lh[li];
  }
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
  let outline=[],edges=[],triangles=[],mesh=null,vertices=null,indexCount=0,faceCenter=null;
  let vertexCount=0,neutralUV=null;
  let live=true,frameId=0,lastRendered=0;
  const textures={},layers=[];
  function setConnections(tessellation,ovalConnections){
    outline=faceOutline(ovalConnections);
    if(outline.length<25||!tessellation?.length)return false;
    // MediaPipe triangle connectivity spans the cheeks, nose, lips and eyes.
    // Reconstruct each triangular face from the undirected edge graph.
    const neighbors=new Map(),edgeSet=new Set();
    const pair=(a,b)=>a<b?a+','+b:b+','+a;
    vertexCount=0;
    for(const {start,end} of tessellation){
      if(start===end)continue;
      vertexCount=Math.max(vertexCount,start+1,end+1);
      if(!neighbors.has(start))neighbors.set(start,new Set());
      if(!neighbors.has(end))neighbors.set(end,new Set());
      neighbors.get(start).add(end);neighbors.get(end).add(start);
      edgeSet.add(pair(start,end));
    }
    edges=[...edgeSet].map(s=>s.split(',').map(Number));
    const unique=new Set(),indices=[];
    for(const [a,b] of edges){
      for(const c of neighbors.get(a)){
        if(c===b||!neighbors.get(b)?.has(c))continue;
        const tri=[a,b,c].sort((x,y)=>x-y);
        const key=tri.join(',');
        if(unique.has(key))continue;
        unique.add(key);indices.push(...tri);
      }
    }
    if(indices.length<900)return false;
    triangles=indices;
    indexCount=indices.length;
    mesh=new Float32Array(vertexCount*stride);
    vertices=new Float32Array(mesh.length);
    neutralUV=null;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
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
    if(!mesh||!points?.length||points.length<vertexCount||!width||!height){
      faceCenter=null;return;
    }
    const fit=Math.max(W/width,H/height),dw=width*fit,dh=height*fit;
    const offsetX=(W-dw)/2,offsetY=(H-dh)/2;
    const project=p=>({x:offsetX+(1-p.x)*dw,y:offsetY+p.y*dh,z:p.z||0});
    const oval=outline.map(i=>project(points[i]));
    const center=oval.reduce((sum,p)=>({x:sum.x+p.x/oval.length,y:sum.y+p.y/oval.length}),{x:0,y:0});
    const left=project(points[263]),right=project(points[33]);
    const dx=left.x-right.x,dy=right.y-left.y;
    const length=Math.hypot(dx,dy)||1,cos=dx/length,sin=dy/length;
    const local=oval.map(p=>{const x=p.x-center.x,y=p.y-center.y;return{x:x*cos+y*sin,y:y*cos-x*sin};});
    const rx=Math.max(...local.map(p=>Math.abs(p.x)))*1.20;
    const ry=Math.max(...local.map(p=>Math.abs(p.y)))*1.20;
    if(!Number.isFinite(rx)||rx<18||ry<25){faceCenter=null;return;}
    faceCenter=center;
    // Capture stable UV registration per landmark, rather than projecting
    // every letter onto a rigid oval that ignores nose, mouth and cheeks.
    if(!neutralUV)neutralUV=new Float32Array(vertexCount*2);
    const pos=Array.from({length:vertexCount},(_,i)=>project(points[i]));
    for(let i=0;i<vertexCount;i++){
      const p=pos[i],x=p.x-center.x,y=p.y-center.y;
      const lx=x*cos+y*sin,ly=y*cos-x*sin;
      const off=i*stride;
      mesh[off]=p.x;mesh[off+1]=p.y;mesh[off+2]=p.z;
      if(!neutralUV[i*2]&&!neutralUV[i*2+1]){
        neutralUV[i*2]=.5+.45*lx/rx;
        neutralUV[i*2+1]=.5-.45*ly/ry;
      }
      mesh[off+3]=neutralUV[i*2];
      mesh[off+4]=neutralUV[i*2+1];
      // Derived from the actual tracked 3D vertex depth changes, not
      // artificially painted nose or cheek shapes.
      let gradX=0,gradY=0,total=0;
      // Nearest connected landmarks determine the local surface tilt.
      for(const [a,b] of edges){
        if(a!==i&&b!==i)continue;
        const n=pos[a===i?b:a],ddx=n.x-p.x,ddy=n.y-p.y;
        const dz=(n.z-p.z)*dw;
        const d2=ddx*ddx+ddy*ddy+1;
        gradX+=dz*ddx/d2;gradY+=dz*ddy/d2;total++;
      }
      mesh[off+5]=clamp(0.94-0.24*gradX+0.23*gradY,0.67,1.19);
      // Fade only the physical cloth edge, not the interior eyes or mouth.
      const norm=Math.hypot(lx/rx,ly/ry);
      mesh[off+6]=clamp((norm-.65)/.37,0,1);
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
    const ready=Boolean(faceCenter&&textures.first&&layers.length);
    root.classList.toggle('ar-tulle-ready',ready);
    if(!ready)return;
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
window.DCD_TULLE={create,words:WORDS};
})();