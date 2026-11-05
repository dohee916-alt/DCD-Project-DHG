/* DCD AR fabric: sculpted translucent 5-layer drape, real uploaded Tulle Height sample, UV-printed phrases. */
(()=>{'use strict';
const RAW='eNpjYAABRr0KeQYkQCqfQb1BmRI+o2YLZXzTLjlK+KJZOaas5POFYzzEnU3YyOULhTtzMPC7m7ORxxcMsmcHUgI+1uzk8AV8YeKBEHHS+PweFuwwd4WB3EUSn1MEJVyi0cKJID8gw5QNOV4yc0njp/ZTlG4YNXooS7cK7RTlGwb5KlT36JeTxlfLEEXhO+WSxjdPFkTh++aQxnfIFELh+xWQxneoE0PhuzWQxjer9WRH4vN5VpHGd5VNcEQI8DmbkMi3YhSNsoWlSH4PYJYmjQ80SyTUCiIAzZik8hmE/c3YEMUC6XwGIS9jVkihRB6fQdDVQDLGHc4lmc8g4FXmz8lAPp/RtUmcgRK+X6EQRXxS8w06n9R8i84ntdxA44/W/6P1/2j9P1r/j9b/o/X/aP0/APW/S44IeXwA8coG+g==';
const WORDS={
 first:["THAT’S CHEATING.","YOU DIDN’T EARN THAT BODY.","IS THAT EVEN THE REAL YOU?","DID YOU REALLY NEED MEDICATION?","YOU’LL JUST GAIN IT ALL BACK."],
 replacement:["WHY DON’T YOU JUST TAKE GLP-1?","WHAT’S YOUR EXCUSE NOW?","EVERYONE ELSE IS LOSING WEIGHT.","DON’T YOU CARE ABOUT YOUR HEALTH?","YOU’RE NOT EVEN TRYING."]
};
const VS='attribute vec2 p;attribute vec2 uv;varying vec2 v;void main(){v=uv;gl_Position=vec4(p,0.,1.);}';
const FS=`precision mediump float;
uniform sampler2D tex;uniform float opacity;varying vec2 v;
void main(){
  vec4 col=texture2D(tex,v);
  float u=v.x,y=1.-v.y;
  float side=abs(u-.5)*2.;
  float halfWidth=.5*(.88+.075*sin(3.14159*y)-.16*pow(y,3.));
  float sideAlpha=1.-smoothstep(halfWidth-.027,halfWidth+.010,abs(u-.5));
  float top=.018+.025*pow(side,2.);
  float bottom=.988-.095*pow(side,2.)-.008*sin(u*24.);
  float ends=smoothstep(top-.012,top+.024,y)*(1.-smoothstep(bottom-.040,bottom,y));
  float thread=clamp(col.a,0.,1.);
  float alpha=thread*sideAlpha*ends*opacity;
  gl_FragColor=vec4(col.rgb,alpha);
}`;
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=t=>t*t*(3-2*t);
const compile=(gl,t,source)=>{let shader=gl.createShader(t);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
async function sample(){
 if(typeof DecompressionStream==='undefined')return null;
 const bytes=Uint8Array.from(atob(RAW),c=>c.charCodeAt(0));
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
 return new Uint8Array(await new Response(stream).arrayBuffer());
}
function surface(mask,word,index){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=720;
 const x=canvas.getContext('2d');
 // Semi-transparent fine threads: the mesh repeat is 4x smaller than before.
 const tile=document.createElement('canvas');tile.width=16;tile.height=16;
 const tc=tile.getContext('2d'),p=tc.createImageData(16,16);
 for(let y=0;y<16;y++)for(let u=0;u<16;u++){ 
   const q=mask?mask[(y*4)*64+u*4]:((u+y)%5===0?98:18);
   const i=(y*16+u)*4;
   p.data[i]=236;p.data[i+1]=216;p.data[i+2]=215;
   p.data[i+3]=Math.round(clamp((q-14)*1.35,0,100));
 }
 tc.putImageData(p,0,0);
 x.fillStyle=x.createPattern(tile,'repeat');x.fillRect(0,0,512,720);
 // Sheer pink translucency is part of the threads, never a rectangular wash.
 // No opaque rectangular wash: only gauzy mesh threads and printed ink.
 x.fillStyle='rgba(52,38,45,.96)';x.textAlign='center';x.textBaseline='middle';
 x.font='800 27px Arial, sans-serif';
 const maxWidth=400,terms=word.split(' '),lines=[];let line='';
 for(const term of terms){let candidate=line?line+' '+term:term;
   if(line&&x.measureText(candidate).width>maxWidth){lines.push(line);line=term;}else line=candidate;}
 if(line)lines.push(line);
 // Dedicated vertical text band for each fabric: no mirrored/backwards text.
 const cy=196+index*86;
 lines.forEach((s,i)=>x.fillText(s,256,cy+(i-(lines.length-1)/2)*31));
 return canvas;
}
function create(root){
 if(!root)return null;
 const canvas=document.createElement('canvas');
 canvas.className='ar-tulle-webgl';canvas.width=428;canvas.height=926;root.prepend(canvas);
 let gl,program;
 try{
   gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,depth:false,preserveDrawingBuffer:false});
   if(!gl)throw Error('WebGL unavailable');
   program=gl.createProgram();gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,VS));
   gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 }catch(e){console.warn('[DCD AR] Fabric GPU fallback',e);canvas.remove();return null;}
 const rows=34,cols=26,vertices=new Float32Array((rows+1)*(cols+1)*4),indices=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){let a=y*(cols+1)+x,b=a+1,c=a+cols+1,d=c+1;indices.push(a,c,b,b,c,d);}
 const vb=gl.createBuffer(),ib=gl.createBuffer();
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
 const pLoc=gl.getAttribLocation(program,'p'),uvLoc=gl.getAttribLocation(program,'uv');
 const oLoc=gl.getUniformLocation(program,'opacity'),texLoc=gl.getUniformLocation(program,'tex');
 let face=null,enabled=true,renderId=0;
 const active=[],textures={},lastWords=new Set();
 function texture(source){
   const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
   return t;
 }
 (async()=>{
  try{
    const h=await sample();if(!enabled)return;
    for(const variant of ['first','replacement'])textures[variant]=WORDS[variant].map((word,i)=>texture(surface(h,word,i)));
  }catch(e){console.warn('[DCD AR] Tulle texture loading',e);}
 })();
 function points(raw,video){
   if(!raw?.length)return null;
   const vw=video?.videoWidth||428,vh=video?.videoHeight||926,k=Math.max(428/vw,926/vh);
   const ox=(428-vw*k)/2,oy=(926-vh*k)/2;
   return raw.map(q=>({x:ox+(1-q.x)*vw*k,y:oy+q.y*vh*k,z:q.z||0}));
 }
 function update(raw,video){
   const p=points(raw,video);if(!p)return;
   const xs=p.map(q=>q.x),ys=p.map(q=>q.y);
   const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),w=right-left,h=bottom-top;
   const next={
     x:(left+right)/2,y:top+h*.50,
     w:clamp(w*1.12,145,390),h:clamp(h*1.15,205,505),
     nose:p[1]||p[4],l:p[205]||p[93],r:p[425]||p[323]
   };
   if(!face)face=next;
   else{for(const key of ['x','y','w','h'])face[key]=mix(face[key],next[key],.24);
     for(const key of ['nose','l','r'])if(face[key]&&next[key]){
       face[key]={x:mix(face[key].x,next[key].x,.24),y:mix(face[key].y,next[key].y,.24)};
     }}
   root.classList.add('ar-tulle-ready');
 }
 function bulge(x,y,p,rx,ry){
   if(!p)return 0;
   return Math.exp(-.5*((x-p.x)**2/rx**2+(y-p.y)**2/ry**2));
 }
 function render(now){
   if(!enabled)return;
   gl.viewport(0,0,428,926);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
   if(!face||!active.length)return;
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(program);
   gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.enableVertexAttribArray(pLoc);gl.vertexAttribPointer(pLoc,2,gl.FLOAT,false,16,0);
   gl.enableVertexAttribArray(uvLoc);gl.vertexAttribPointer(uvLoc,2,gl.FLOAT,false,16,8);
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.activeTexture(gl.TEXTURE0);gl.uniform1i(texLoc,0);
   for(const layer of active){
     const tex=textures[layer.variant]?.[layer.index];if(!tex)continue;
     const t=clamp((now-layer.since)/920,0,1),e=smooth(t);
     if(layer.removing&&t>=1)continue;
     const a=layer.removing?1-e:e;
     // Each separately arriving fabric starts above/in front of the lens,
     // flutters sideways, then conforms to the head in a soft 3D drape.
     const drift=(layer.index%2?1:-1),flight=layer.removing?e:1-e;
     const w=face.w*(1+.12*flight),h=face.h*(1+.15*flight);
     const cx=face.x+drift*(28*flight+7*Math.sin(t*6.2)*flight);
     const cy=face.y-145*flight;
     const left=cx-w/2,top=cy-h/2;
     for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
       const u=x/cols,v=y/rows;
       const px=left+u*w,py=top+v*h;
       const nose=bulge(px,py,face.nose,face.w*.11,face.h*.11);
       const cheek=.4*(bulge(px,py,face.l,face.w*.18,face.h*.16)+bulge(px,py,face.r,face.w*.18,face.h*.16));
       const ext=nose+cheek;
       const fold=Math.sin(u*26+v*9+layer.index)*2.5*(.3+.7*v);
       const pos=(y*(cols+1)+x)*4;
       vertices[pos]=(px+(px-face.x)*ext*.085+fold)/214-1;
       vertices[pos+1]=1-(py-face.h*.045*nose+Math.sin(u*15+v*9)*3*(1-v))/463;
       vertices[pos+2]=u;vertices[pos+3]=1-v; // upright uploaded text
     }
     gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);
     gl.bindTexture(gl.TEXTURE_2D,tex);
     gl.uniform1f(oLoc,clamp(a*.85,0,1));
     gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
   }
 }
 function loop(now){if(!enabled)return;render(now);renderId=requestAnimationFrame(loop);}
 renderId=requestAnimationFrame(loop);
 function add(variant,index){let layer={variant,index,since:performance.now(),removing:false};active.push(layer);return layer;}
 function remove(layer){if(layer){layer.since=performance.now();layer.removing=true;}}
 function clear(){active.length=0;}
 function destroy(){enabled=false;cancelAnimationFrame(renderId);active.length=0;
   for(const v of Object.values(textures))v.forEach(tex=>gl.deleteTexture(tex));
   gl.deleteBuffer(vb);gl.deleteBuffer(ib);gl.deleteProgram(program);canvas.remove();}
 return {add,remove,update,clear,destroy};
}
window.DCD_TULLE={create,words:WORDS};
})();