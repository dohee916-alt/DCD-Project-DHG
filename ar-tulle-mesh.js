/* DCD translucent face fabric test — uploaded Tulle01Small_2K Height sample.
   Five distinct texts per branch, baked into the same UV texture as the fabric.
   Canvas WebGL 1 (no extra renderer dependency), with a basic CSS fallback. */
(() => {
'use strict';
const RAW='eNpjYAABRr0KeQYkQCqfQb1BmRI+o2YLZXzTLjlK+KJZOaas5POFYzzEnU3YyOULhTtzMPC7m7ORxxcMsmcHUgI+1uzk8AV8YeKBEHHS+PweFuwwd4WB3EUSn1MEJVyi0cKJID8gw5QNOV4yc0njp/ZTlG4YNXooS7cK7RTlGwb5KlT36JeTxlfLEEXhO+WSxjdPFkTh++aQxnfIFELh+xWQxneoE0PhuzWQxjer9WRH4vN5VpHGd5VNcEQI8DmbkMi3YhSNsoWlSH4PYJYmjQ80SyTUCiIAzZik8hmE/c3YEMUC6XwGIS9jVkihRB6fQdDVQDLGHc4lmc8g4FXmz8lAPp/RtUmcgRK+X6EQRXxS8w06n9R8i84ntdxA44/W/6P1/2j9P1r/j9b/o/X/aP0/APW/S44IeXwA8coG+g==';
const WORDS={
 first:["THAT’S CHEATING.","YOU DIDN’T EARN THAT BODY.","IS THAT EVEN THE REAL YOU?","DID YOU REALLY NEED MEDICATION?","YOU’LL JUST GAIN IT ALL BACK."],
 replacement:["WHY DON’T YOU JUST TAKE GLP-1?","WHAT’S YOUR EXCUSE NOW?","EVERYONE ELSE IS LOSING WEIGHT.","DON’T YOU CARE ABOUT YOUR HEALTH?","YOU’RE NOT EVEN TRYING."]
};
const vert='attribute vec2 p;attribute vec2 uv;varying vec2 v;void main(){v=uv;gl_Position=vec4(p,0.,1.);}';
const frag='precision mediump float;uniform sampler2D tex;uniform float alpha;varying vec2 v;void main(){vec4 c=texture2D(tex,v);gl_FragColor=vec4(c.rgb,c.a*alpha);}';
const compile=(gl,t,s)=>{const shader=gl.createShader(t);gl.shaderSource(shader,s);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
const ease=t=>t*t*(3-2*t);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
async function heightTile(){
 const bytes=Uint8Array.from(atob(RAW),c=>c.charCodeAt(0));
 if(typeof DecompressionStream==='undefined')return null;
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}
function createSurface(mask,word,index){
 const c=document.createElement('canvas');c.width=512;c.height=640;
 const x=c.getContext('2d');
 // An airy carrier layer; the thread opacity comes from the uploaded Height map.
 const wash=x.createLinearGradient(0,0,512,640);
 wash.addColorStop(0,'rgba(249,241,240,.12)');
 wash.addColorStop(.48,'rgba(235,217,228,.19)');
 wash.addColorStop(1,'rgba(255,244,235,.13)');
 x.fillStyle=wash;x.fillRect(0,0,512,640);
 const mesh=document.createElement('canvas');mesh.width=128;mesh.height=128;
 const cx=mesh.getContext('2d');const pixels=cx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let u=0;u<128;u++){
   const a=mask?mask[(y>>1)*64+(u>>1)]:((u+y)%5===0?80:0);
   const k=(y*128+u)*4,thread=clamp((a-9)*2,0,166);
   pixels.data[k]=236;pixels.data[k+1]=225;pixels.data[k+2]=226;pixels.data[k+3]=thread;
 }
 cx.putImageData(pixels,0,0);
 const pattern=x.createPattern(mesh,'repeat');x.save();x.globalAlpha=.72;
 x.fillStyle=pattern;x.fillRect(0,0,512,640);x.restore();
 // Each phrase sits at a different height, so earlier overlapping sheets
 // remain legible; text and threads occupy exactly one deformable UV surface.
 const band=.22+index*.143;
 x.fillStyle='rgba(47,38,46,.94)';
 x.font='900 34px Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';
 const words=word.split(' '),lines=[];let line='';
 for(const part of words){const test=line?line+' '+part:part;if(x.measureText(test).width>422&&line){lines.push(line);line=part;}else line=test;}
 if(line)lines.push(line);
 const lineHeight=40,Y=band*640;
 lines.forEach((t,i)=>x.fillText(t,256,Y+(i-(lines.length-1)/2)*lineHeight));
 return c;
}
function make(root){
 const canvas=document.createElement('canvas');
 canvas.className='ar-tulle-webgl';
 canvas.width=428;canvas.height=926;
 root.prepend(canvas);
 let gl=null,program=null;
 try{
   gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,depth:false});
   if(!gl)throw Error('WebGL unavailable');
   program=gl.createProgram();
   gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vert));
   gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,frag));
   gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 }catch(error){console.warn('[DCD] Fabric WebGL fallback:',error);canvas.remove();return null;}
 const rows=26,cols=19,N=(rows+1)*(cols+1);
 const data=new Float32Array(N*4),inds=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;
   inds.push(a,c,b,b,c,d);
 }
 const vb=gl.createBuffer(),ib=gl.createBuffer();
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
 gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(inds),gl.STATIC_DRAW);
 const pLoc=gl.getAttribLocation(program,'p'),uvLoc=gl.getAttribLocation(program,'uv');
 const texLoc=gl.getUniformLocation(program,'tex'),alphaLoc=gl.getUniformLocation(program,'alpha');
 const sheets=[],active=new Set();
 let face=null,lastTime=0,enabled=true,maskTexture=null;
 const makeTex=surface=>{
   let t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,surface);
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
   return t;
 };
 const build=async()=>{
   const mask=await heightTile();
   if(!enabled)return;
   for(const variant of ['first','replacement']){
     sheets[variant]=WORDS[variant].map((t,i)=>makeTex(createSurface(mask,t,i)));
   }
   draw();
 };
 build().catch(error=>console.warn('[DCD] Fabric texture:',error));
 function getPoints(raw,video){
   if(!raw||!raw.length)return null;
   const vw=video?.videoWidth||428,vh=video?.videoHeight||926;
   const factor=Math.max(428/vw,926/vh),ox=(428-vw*factor)/2,oy=(926-vh*factor)/2;
   return raw.map(v=>({x:ox+(1-v.x)*vw*factor,y:oy+v.y*vh*factor,z:v.z||0}));
 }
 function update(raw,video){
   const p=getPoints(raw,video);
   if(!p)return;
   const xs=p.map(q=>q.x),ys=p.map(q=>q.y);
   const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
   const w=maxX-minX,h=maxY-minY;
   // Face-adjacent fabric floats outward from the cheek and nose, but
   // deliberately does not cling perfectly to every facial contour.
   face={
     x:(minX+maxX)/2,y:(minY+maxY)/2,
     w:clamp(w*1.35,165,365),h:clamp(h*1.28,235,555),
     nose:p[1]||{x:(minX+maxX)/2,y:(minY+maxY)/2},
     l:p[205]||{x:minX+w*.3,y:minY+h*.6},
     r:p[425]||{x:maxX-w*.3,y:minY+h*.6}
   };
   draw();
 }
 const bumps=(x,y,v)=>Math.exp(-((x-v.x)**2/(2*(face.w*.11)**2)+(y-v.y)**2/(2*(face.h*.125)**2)));
 function draw(){
   if(!enabled||!face)return;
   gl.viewport(0,0,canvas.width,canvas.height);
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
   gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER,vb);
   gl.enableVertexAttribArray(pLoc);gl.vertexAttribPointer(pLoc,2,gl.FLOAT,false,16,0);
   gl.enableVertexAttribArray(uvLoc);gl.vertexAttribPointer(uvLoc,2,gl.FLOAT,false,16,8);
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
   gl.activeTexture(gl.TEXTURE0);gl.uniform1i(texLoc,0);
   const x0=face.x-face.w/2,y0=face.y-face.h/2;
   for(const sheet of active){
     if(!sheets[sheet.variant])continue;
     const now=performance.now();
     const elapsed=now-sheet.since;
     const t=clamp(elapsed/710,0,1),opacity=sheet.removing?1-ease(t):ease(t);
     if(sheet.removing&&t>=1){active.delete(sheet);continue;}
     // Lightly offset each membrane in depth, not location. The same UV sheet
     // carries the actual tulle threads and its printed phrase together.
     for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
       const u=x/cols,v=y/rows;
       const px=x0+u*face.w,py=y0+v*face.h;
       const nose=bumps(px,py,face.nose),cheek=.32*(bumps(px,py,face.l)+bumps(px,py,face.r));
       const bulge=nose+cheek;
       const outX=(px-face.x)*bulge*.10;
       const outY=-(nose*.055+cheek*.02)*face.h;
       const pos=(y*(cols+1)+x)*4;
       data[pos]=(px+outX)/214-1;
       data[pos+1]=1-(py+outY)/463;
       data[pos+2]=u;data[pos+3]=v;
     }
     gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
     gl.bindTexture(gl.TEXTURE_2D,sheets[sheet.variant][sheet.index]);
     gl.uniform1f(alphaLoc,clamp(opacity*.88,0,1));
     gl.drawElements(gl.TRIANGLES,inds.length,gl.UNSIGNED_SHORT,0);
   }
 }
 function add(variant,index){const item={variant,index,since:performance.now(),removing:false};active.add(item);draw();return item;}
 function remove(item){if(item){item.removing=true;item.since=performance.now();draw();}}
 function sync(){draw();}
 function destroy(){enabled=false;active.clear();sheets.first?.forEach(t=>gl.deleteTexture(t));sheets.replacement?.forEach(t=>gl.deleteTexture(t));gl.deleteBuffer(vb);gl.deleteBuffer(ib);gl.deleteProgram(program);canvas.remove();}
 return {canvas,add,remove,update,sync,destroy,active,draw};
}
window.DCD_TULLE={create:make,words:WORDS};
})();