/* DCD AR face-conforming organza prototype.
   Uses MediaPipe's genuine face triangles, smoothed 3D landmark depth,
   expanded free fabric edge, live face-locked UV print and 5 cloth layers.
   No static ellipse, no opaque face-shaped shape, no external 3D renderer. */
(()=>{'use strict';
const RAW='eNpjYAABRr0KeQYkQCqfQb1BmRI+o2YLZXzTLjlK+KJZOaas5POFYzzEnU3YyOULhTtzMPC7m7ORxxcMsmcHUgI+1uzk8AV8YeKBEHHS+PweFuwwd4WB3EUSn1MEJVyi0cKJID8gw5QNOV4yc0njp/ZTlG4YNXooS7cK7RTlGwb5KlT36JeTxlfLEEXhO+WSxjdPFkTh++aQxnfIFELh+xWQxneoE0PhuzWQxjer9WRH4vN5VpHGd5VNcEQI8DmbkMi3YhSNsoWlSH4PYJYmjQ80SyTUCiIAzZik8hmE/c3YEMUC6XwGIS9jVkihRB6fQdDVQDLGHc4lmc8g4FXmz8lAPp/RtUmcgRK+X6EQRXxS8w06n9R8i84ntdxA44/W/6P1/2j9P1r/j9b/o/X/aP0/APW/S44IeXwA8coG+g==';
const WORDS={
  first:["THAT’S CHEATING.","YOU DIDN’T EARN THAT BODY.","IS THAT EVEN THE REAL YOU?","DID YOU REALLY NEED MEDICATION?","YOU’LL JUST GAIN IT ALL BACK."],
  replacement:["WHY DON’T YOU JUST TAKE GLP-1?","WHAT’S YOUR EXCUSE NOW?","EVERYONE ELSE IS LOSING WEIGHT.","DON’T YOU CARE ABOUT YOUR HEALTH?","YOU’RE NOT EVEN TRYING."]
};
const W=428,H=926,COUNT=468,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
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
  float ink=smoothstep(0.28,0.43,src.r-src.g);
  float light=clamp(vLight,0.72,1.24);
  vec3 cloth=vec3(0.965,0.685,0.610)*light;
  vec3 printed=vec3(0.917,0.238,0.039);
  vec3 color=mix(cloth,printed,ink);
  float weave=0.065+src.a*0.62;
  float alpha=mix(weave,min(0.96,src.a*1.15),ink);
  // The free 3D fringe fades to transparent at the outside boundary.
  alpha*=1.0-vFringe;
  gl_FragColor=vec4(color,alpha*opacity);
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
  const c=document.createElement('canvas');c.width=640;c.height=800;
  const ctx=c.getContext('2d');
  // A fine, almost transparent organdy weave derived from the supplied
  // height map; crucially there is no opaque orange oval backing.
  const tile=document.createElement('canvas');tile.width=12;tile.height=12;
  const tctx=tile.getContext('2d'),p=tctx.createImageData(12,12);
  for(let y=0;y<12;y++)for(let x=0;x<12;x++){
    const i=(y*12+x)*4;
    const h=height?height[Math.min(63,Math.floor(y*64/12))*64+
      Math.min(63,Math.floor(x*64/12))]:95;
    const thread=(Math.abs((x-y+12)%12)<=1||Math.abs((x+y)%12-6)<=1);
    p.data[i]=245;p.data[i+1]=188;p.data[i+2]=175;
    p.data[i+3]=thread?clamp(55+h*.3,55,107):12;
  }
  tctx.putImageData(p,0,0);
  ctx.fillStyle='rgba(246,175,158,0.065)';ctx.fillRect(0,0,640,800);
  ctx.fillStyle=ctx.createPattern(tile,'repeat');ctx.fillRect(0,0,640,800);
  // Written directly into each sheet's UV material: follows facial
  // rotation, nose projection, and fabric motion as one physical surface.
  const spots=[
    {x:445,y:185,r:-22},
    {x:204,y:302,r:16},
    {x:422,y:411,r:-14},
    {x:210,y:532,r:12},
    {x:376,y:646,r:-9}
  ];
  const loc=spots[index];
  ctx.save();ctx.translate(loc.x,loc.y);ctx.rotate(loc.r*Math.PI/180);
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='700 40px "Source Sans 3",Arial,sans-serif';
  ctx.fillStyle='#e83d0a';
  const maxWidth=390,words=phrase.split(' '),lines=[];let line='';
  for(const word of words){
    const candidate=line?line+' '+word:word;
    if(line&&ctx.measureText(candidate).width>maxWidth){lines.push(line);line=word;}
    else line=candidate;
  }
  if(line)lines.push(line);
  lines.forEach((value,i)=>ctx.fillText(value,0,(i-(lines.length-1)/2)*46,maxWidth));
  ctx.restore();
  return c;
}
function topology(triConnections,ovalConnections){
  const triangles=[],neighbors=Array.from({length:COUNT},()=>new Set());
  if(!triConnections?.length||!ovalConnections?.length)return null;
  const edge=(a,b)=>{if(a>=COUNT||b>=COUNT)return;neighbors[a].add(b);neighbors[b].add(a);};
  // MediaPipe publishes three directed edges per triangular face.
  for(let i=0;i+2<triConnections.length;i+=3){
    const a=triConnections[i],b=triConnections[i+1],c=triConnections[i+2];
    if(a.end!==b.start||b.end!==c.start||c.end!==a.start)continue;
    if(a.start>=COUNT||a.end>=COUNT||b.end>=COUNT)continue;
    triangles.push(a.start,a.end,b.end);
    edge(a.start,a.end);edge(a.end,b.end);edge(b.end,a.start);
  }
  const around=new Map();
  for(const {start,end} of ovalConnections){
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
  if(triangles.length<300||oval.length<25)return null;
  return {triangles,neighbors:neighbors.map(n=>[...n]),oval};
}
function create(root){
  if(!root)return null;
  const canvas=document.createElement('canvas');
  canvas.className='ar-tulle-webgl';canvas.width=W;canvas.height=H;root.prepend(canvas);
  let gl,program;
  try{
    gl=canvas.getContext('webgl',{alpha:true,antialias:true,depth:true,premultipliedAlpha:false});
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
  let geo=null,vertices=null,indices=null,uvs=null,base=null,shades=null,initialUV=null,faceCenter=null;
  let live=true,frameId=0;
  const textures={},layers=[],trace=[];
  function setConnections(tri,oval){
    const next=topology(tri,oval);
    if(!next)return false;
    geo=next;
    const vertexCount=COUNT+geo.oval.length;
    vertices=new Float32Array(vertexCount*stride);
    base=new Float32Array(vertexCount*3);
    shades=new Float32Array(vertexCount);
    uvs=new Float32Array(vertexCount*2);
    indices=new Uint16Array([
      ...geo.triangles,
      ...geo.oval.flatMap((v,i)=>{
        const w=geo.oval[(i+1)%geo.oval.length];
        const A=COUNT+i,B=COUNT+((i+1)%geo.oval.length);
        return [v,w,B,v,B,A];
      })
    ]);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
    return true;
  }
  function makeTexture(source){
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    return tex;
  }
  (async()=>{
    try{
      const [height]=await Promise.all([
        getHeight(),
        document.fonts?.load('700 40px "Source Sans 3"').catch(()=>{})||Promise.resolve()
      ]);
      if(!live)return;
      for(const variant of ['first','replacement']){
        textures[variant]=WORDS[variant].map((phrase,i)=>makeTexture(paintedFabric(height,phrase,i)));
      }
    }catch(error){console.warn('[DCD] Cloth texture preparation:',error);}
  })();
  function update(raw,video){
    if(!geo||!raw||raw.length<COUNT)return;
    const vw=video?.videoWidth||W,vh=video?.videoHeight||H;
    const scale=Math.max(W/vw,H/vh),offsetX=(W-vw*scale)/2,offsetY=(H-vh*scale)/2;
    const coords=new Float32Array(COUNT*3);
    let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
    for(let i=0;i<COUNT;i++){
      const p=raw[i],x=offsetX+(1-p.x)*vw*scale,y=offsetY+p.y*vh*scale;
      coords[i*3]=x;coords[i*3+1]=y;
      coords[i*3+2]=p.z*vw*scale;
      if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y;
    }
    const cx=(left+right)/2,cy=(top+bottom)/2,fw=right-left,fh=bottom-top;
    if(!Number.isFinite(fw)||fw<30||fh<50)return;
    const c={x:cx,y:cy,w:fw,h:fh};
    if(!faceCenter)faceCenter=c;
    else for(const k of ['x','y','w','h'])faceCenter[k]=mix(faceCenter[k],c[k],.26);
    // Face surface is non-planar. Smooth only part of the landmark depth
    // field so it bridges the nose while maintaining cheek/forehead relief.
    for(let i=0;i<COUNT;i++){
      const p=i*3,near=geo.neighbors[i];
      let avgZ=coords[p+2];
      if(near.length){avgZ=0;for(const j of near)avgZ+=coords[j*3+2];avgZ/=near.length;}
      const z=coords[p+2]*.76+avgZ*.24;
      base[p]=coords[p]+(coords[p]-cx)*.034;
      base[p+1]=coords[p+1]+(coords[p+1]-cy)*.025;
      base[p+2]=z-7;
    }
    // The boundary isn't glued to skin: an independent, lightly floating,
    // alpha-feathered fabric rim is stitched to MediaPipe's real face oval.
    for(let i=0;i<geo.oval.length;i++){
      const k=geo.oval[i]*3,j=(COUNT+i)*3;
      const px=base[k],py=base[k+1];
      const upper=(py-cy)<0;
      base[j]=px+(px-cx)*.09;
      base[j+1]=py+(py-cy)*.095+(upper?-2:4);
      base[j+2]=base[k+2]-8;
    }
    if(!initialUV){
      initialUV=new Float32Array(COUNT*2);
      for(let i=0;i<COUNT;i++){
        const j=i*3,k=i*2;
        initialUV[k]=clamp(.10+.80*(base[j]-left)/fw,0,1);
        initialUV[k+1]=clamp(.055+.89*(base[j+1]-top)/fh,0,1);
      }
    }
    for(let i=0;i<COUNT;i++){uvs[i*2]=initialUV[i*2];uvs[i*2+1]=initialUV[i*2+1];}
    for(let i=0;i<geo.oval.length;i++){
      const src=geo.oval[i],dst=COUNT+i;
      uvs[dst*2]=clamp((uvs[src*2]-.5)*1.095+.5,0,1);
      uvs[dst*2+1]=clamp((uvs[src*2+1]-.5)*1.095+.5,0,1);
    }
    // Estimate a surface normal from real triangles for fabric shading.
    const normal=new Float32Array((COUNT+geo.oval.length)*3);
    for(let i=0;i<geo.triangles.length;i+=3){
      const a=geo.triangles[i],b=geo.triangles[i+1],c=geo.triangles[i+2];
      const ax=base[a*3],ay=base[a*3+1],az=base[a*3+2];
      const ux=base[b*3]-ax,uy=base[b*3+1]-ay,uz=base[b*3+2]-az;
      const vx=base[c*3]-ax,vy=base[c*3+1]-ay,vz=base[c*3+2]-az;
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      for(const j of [a,b,c]){
        normal[j*3]+=nx;normal[j*3+1]+=ny;normal[j*3+2]+=nz;
      }
    }
    for(let i=0;i<COUNT;i++){
      const x=normal[i*3],y=normal[i*3+1],z=normal[i*3+2];
      const length=Math.hypot(x,y,z)||1;
      shades[i]=clamp(.95+(-.28*x-.23*y+.60*Math.abs(z))/length*.25,.74,1.18);
    }
    for(let i=0;i<geo.oval.length;i++)shades[COUNT+i]=shades[geo.oval[i]];
    root.classList.add('ar-tulle-ready');
  }
  function arrival(t){
    // 65% of the flight: float nearer only a little; final 35%:
    // accelerate rapidly into the live 3D face mesh.
    return t<.65 ? .19*ease(t/.65) : .19+.81*Math.pow((t-.65)/.35,2);
  }
  function render(now){
    if(!live)return;
    gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    if(!geo||!base||!textures.first||!layers.length)return;
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
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
    for(const layer of layers){
      const tex=textures[layer.variant]?.[layer.index];
      if(!tex)continue;
      const seconds=(now-layer.start)/1000,progress=clamp(seconds/3.0,0,1);
      const approaching=layer.removing?1:arrival(progress);
      const fly=1-approaching;
      const fadeIn=clamp(seconds/.8,0,1);
      const leave=layer.removing?clamp((now-layer.exit)/1150,0,1):0;
      const opacity=layer.removing?1-ease(leave):fadeIn;
      if(opacity<=0)continue;
      const offsetX=(layer.index%2?-1:1)*(56*fly);
      const offsetY=-115*fly;
      const settle=progress>=.90?Math.sin((progress-.9)*Math.PI*20)*
        Math.exp(-(progress-.9)*23)*1.8:0;
      const size=1+.19*fly,center=faceCenter||{x:W/2,y:H/2};
      for(let i=0;i<base.length/3;i++){
        const k=i*3,v=i*stride,px=base[k],py=base[k+1];
        const fringe=i>=COUNT,edge=fringe?1:0;
        const inertia=fringe?
          Math.sin(now*.0024+i*1.77+layer.index*.8)*1.8:0;
        const releaseX=layer.removing?(i%3===0?1:-1)*45*ease(leave):0;
        const releaseY=layer.removing?-165*ease(leave):0;
        vertices[v]=((center.x+(px-center.x)*size+offsetX+releaseX+
          inertia+settle)/W)*2-1;
        vertices[v+1]=1-((center.y+(py-center.y)*size+offsetY+
          releaseY)/H)*2;
        vertices[v+2]=clamp((base[k+2]-layer.index*2-42*fly)/850,-.65,.65);
        vertices[v+3]=uvs[i*2];vertices[v+4]=1-uvs[i*2+1];
        vertices[v+5]=shades[i];vertices[v+6]=edge;
      }
      gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.uniform1f(opacityUniform,opacity);
      gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    }
    for(let i=layers.length-1;i>=0;i--){
      if(layers[i].removing&&now-layers[i].exit>1200)layers.splice(i,1);
    }
  }
  function loop(now){if(!live)return;render(now);frameId=requestAnimationFrame(loop);}
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