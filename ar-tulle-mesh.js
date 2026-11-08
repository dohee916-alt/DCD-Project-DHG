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
precision mediump float;
uniform sampler2D fabric;
uniform float opacity;
varying vec2 vUV;
varying float vLight;
varying float vFringe;
void main(){
  vec4 src=texture2D(fabric,vUV);
  // Preserve Figma's glyph silhouettes, but shade them as raised
  // embroidery threads instead of a flat orange paint fill.
  // The actual supplied height-map controls where individual fibers lie.
  // Open holes stay clear even when five separate cloth layers accumulate.
  float fiber=src.a;
  vec2 texel=vec2(1.0/1024.0);
  float leftFiber=texture2D(fabric,vUV-vec2(texel.x,0.0)).a;
  float rightFiber=texture2D(fabric,vUV+vec2(texel.x,0.0)).a;
  float upFiber=texture2D(fabric,vUV-vec2(0.0,texel.y)).a;
  float downFiber=texture2D(fabric,vUV+vec2(0.0,texel.y)).a;
  vec2 slope=vec2(rightFiber-leftFiber,downFiber-upFiber);
  float lit=clamp(0.90+0.29*(-slope.x+slope.y),0.72,1.22);
  float strand=pow(clamp(fiber,0.0,1.0),0.72);
  vec3 cloth=vec3(0.925,0.690,0.663)*lit*(0.80+0.35*strand);
  // Red ink in the texture is the Figma glyph silhouette only.
  float ink=smoothstep(0.27,0.48,src.r-src.g);
  // Raised satin-style embroidery: tiny alternating thread highlights
  // and shadow on glyph edges. Never applied to the mesh holes.
  float stitches=sin((vUV.x*0.86+vUV.y*0.51)*4100.0);
  float threadLight=clamp(0.89+0.12*stitches,0.77,1.01);
  float glyphEdge=texture2D(fabric,vUV+vec2(texel.x,texel.y)).r
                 -texture2D(fabric,vUV+vec2(texel.x,texel.y)).g;
  float stitchRim=clamp(0.96+0.16*(ink-glyphEdge),0.86,1.05);
  vec3 embroidery=vec3(0.88,0.236,0.076)*threadLight*stitchRim;
  vec3 color=mix(cloth,embroidery,ink);
  // A single translucent carrier contributes real opacity. Five sheets
  // accumulate to ~83% coverage even at an open hole (1 - .7^5).
  // Raised threads are much denser than the open carrier.
  float gauze=0.30+0.69*strand;
  float alpha=mix(gauze,0.97,ink);
  // Lightly frayed/feathered outer hem without cutting the face.
  // Preserve a visible soft rim for each newly stacked veil.
  alpha*=1.0-0.84*smoothstep(0.88,1.0,vFringe);
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
function paintedFabric(height,phrase,index){
  const c=document.createElement('canvas');c.width=c.height=TEXTURE_SIZE;
  const ctx=c.getContext('2d');
  // Render only the archived uploaded tulle heightmap. Its 64x64
  // working copy is reconstructed without fabricating missing fibers.
  const tile=document.createElement('canvas');tile.width=tile.height=64;
  const tctx=tile.getContext('2d'),pixels=tctx.createImageData(64,64);
  for(let i=0;i<4096;i++){
    const fiber=height?.[i]??0,k=i*4;
    pixels.data[k]=245;pixels.data[k+1]=188;pixels.data[k+2]=175;
    // Original height amplitude is the only source of texture relief.
    // Archived height values top out at 143, not 255.
    // Preserve zero as open mesh while using the full alpha range for fibers.
    pixels.data[k+3]=Math.round(Math.max(0,Math.min(255,fiber*255/143)));
  }
  tctx.putImageData(pixels,0,0);
  const weave=ctx.createPattern(tile,'repeat');
  // Stagger the ACTUAL uploaded fiber pattern between sheets. Identical
  // UV alignment previously made five layers look like one flat surface.
  if(weave?.setTransform&&typeof DOMMatrix!=='undefined')
   weave.setTransform(new DOMMatrix().translate(index*9,index*13).scale(.56));
  ctx.imageSmoothingEnabled=true;
  ctx.fillStyle=weave;
  ctx.fillRect(0,0,c.width,c.height);
  // 05_AR_MASK_TEXT_EDIT: exact per-layer text, position, rotation, size,
  // and leading supplied by the user in Figma. Their placement boards use
  // 428x926; the head-guide in those boards is x=64..364,y=270..676.
  // The tracked veil samples a 0.05..0.95 UV window around its face oval.
  const config=FIGMA_MASK_TEXT[phrase.variant]?.[index];
  if(config){
   // UV in update(): u=.5+.45*x/rx and v=.5-.45*y/ry.
   // The texture is 1024x1024 with its true centre at 512,512;
   // map the exact Figma guide region (64..364, 270..676)
   // onto that same UV region instead of the erroneous 320,400 origin.
   const sx=.9*TEXTURE_SIZE/300,sy=.9*TEXTURE_SIZE/406;
   const px=TEXTURE_SIZE/2+(config.x-214)*sx;
   const py=TEXTURE_SIZE/2+(config.y-473)*sy;
   ctx.save();
   ctx.translate(px,py);
   ctx.scale(sx,sy);
   // Figma transform defines rotation in screen space; use the negative
   // angle here because of canvas coordinate conventions.
   ctx.rotate(-config.r*Math.PI/180);
   ctx.textAlign='center';ctx.textBaseline='top';
   ctx.fillStyle='#e83d0a';
   let yy=0;
   for(const [line,li] of config.text.split('\n').map((str,i)=>[str,i])){
    ctx.font='700 '+config.fs[li]+'px "Turret Road",sans-serif';
    ctx.fillText(line,config.w/2,yy);
    yy+=config.lh[li];
   }
   ctx.restore();
  }
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
  const rings=[.30,.60,.82,1];
  let outline=[],mesh=null,vertices=null,indexCount=0,faceCenter=null;
  let live=true,frameId=0,lastRendered=0;
  const textures={},layers=[];
  function setConnections(connections){
    outline=faceOutline(connections);
    if(outline.length<25)return false;
    const size=outline.length;
    const indices=[];
    for(let i=0;i<size;i++){
      const j=(i+1)%size;
      indices.push(0,1+i,1+j);
      for(let ring=1;ring<rings.length;ring++){
        const a=1+(ring-1)*size+i,b=1+(ring-1)*size+j;
        const c=1+ring*size+i,d=1+ring*size+j;
        indices.push(a,c,d,a,d,b);
      }
    }
    indexCount=indices.length;
    const count=1+rings.length*size;
    mesh=new Float32Array(count*stride);
    vertices=new Float32Array(mesh.length);
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
      for(const variant of ['first','replacement']){
        textures[variant]=WORDS[variant].map((phrase,i)=>makeTexture(paintedFabric(height,{variant},i)));
      }
    }catch(error){console.warn('[DCD] Cloth texture preparation:',error);}
  })();
  function update(points,width,height){
    if(!mesh||!points?.length||!width||!height){faceCenter=null;return;}
    const scale=Math.max(W/width,H/height),dw=width*scale,dh=height*scale;
    const offsetX=(W-dw)/2,offsetY=(H-dh)/2;
    const oval=outline.map(i=>({
      x:offsetX+(1-points[i].x)*dw,y:offsetY+points[i].y*dh
    }));
    const center=oval.reduce((sum,p)=>({x:sum.x+p.x/oval.length,y:sum.y+p.y/oval.length}),{x:0,y:0});
    // Unroll the face to assign one continuous UV field. The geometry uses
    // only the outer contour, so expressions cannot emboss eyes or lips.
    const left=points[263],right=points[33];
    const dx=(left.x-right.x)*dw,dy=(right.y-left.y)*dh;
    const length=Math.hypot(dx,dy)||1,cos=dx/length,sin=dy/length;
    const local=oval.map(p=>{
      const x=p.x-center.x,y=p.y-center.y;
      return {x:x*cos+y*sin,y:y*cos-x*sin};
    });
    const rx=Math.max(...local.map(p=>Math.abs(p.x)))*1.20;
    const ry=Math.max(...local.map(p=>Math.abs(p.y)))*1.20;
    if(!Number.isFinite(rx)||rx<18||ry<25){faceCenter=null;return;}
    faceCenter=center;
    mesh.set([center.x,center.y,0,.5,.5,1,0],0);
    for(let ring=0;ring<rings.length;ring++){
      const r=rings[ring];
      local.forEach((p,i)=>{
        const x=p.x*1.18*r,y=p.y*(p.y<0?1.25:1.15)*r;
        const at=(1+ring*local.length+i)*stride;
        mesh[at]=center.x+x*cos-y*sin;
        mesh[at+1]=center.y+x*sin+y*cos;
        mesh[at+2]=0;
        mesh[at+3]=.5+.45*x/rx;
        mesh[at+4]=.5-.45*y/ry;
        mesh[at+5]=.99-.11*r*r+.045*(x/rx-y/ry);
        mesh[at+6]=r;
      });
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
      gl.bindTexture(gl.TEXTURE_2D,tex);
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
    for(const texArray of Object.values(textures))for(const tex of texArray)gl.deleteTexture(tex);
    gl.deleteBuffer(vb);gl.deleteBuffer(ib);gl.deleteProgram(program);canvas.remove();
    root.classList.remove('ar-tulle-gpu','ar-tulle-ready');
  }
  return {setConnections,update,add,remove,clear,destroy};
}
window.DCD_TULLE={create,words:WORDS};
})();