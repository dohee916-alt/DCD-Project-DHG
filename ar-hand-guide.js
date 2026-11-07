(()=>{'use strict';
const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)},mix=(a,b,t)=>a+(b-a)*t;
function create(root){
const el=root.querySelector('.ar-gesture-guide');let active=true,frame='',since=performance.now(),hiddenUntil=0,raf=0,last=0;
let renderer,scene,camera,pivot,nodes,open,closed,scale=1;
const setFrame=f=>{frame=f;since=performance.now();hiddenUntil=0;el.style.display=['AR6','AR7'].includes(f)?'block':'none'};
const hideOnce=(ms=900)=>{hiddenUntil=performance.now()+ms;el.style.opacity='0'};
async function init(){
try{
const THREE=await import('three');
const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
if(!active)return;
scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-214,214,463,-463,.1,4000);camera.position.z=1200;
renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
renderer.setPixelRatio(1);renderer.setSize(428,926,false);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
el.replaceChildren(renderer.domElement);
renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
scene.add(new THREE.HemisphereLight(0xffffff,0xaaa5ae,2.3));
const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(5,8,12);scene.add(key);
const gltf=await new GLTFLoader().loadAsync('assets/models/Do_Hand_DetailedRiggedAnimated_shared_16022026.glb');
if(!active)return;
const model=gltf.scene,clip=gltf.animations.find(x=>x.name==='Pose_OKHand')||gltf.animations[0];
const mixer=new THREE.AnimationMixer(model);mixer.clipAction(clip).play();
nodes=[];model.traverse(n=>{if(n.isBone||n.isMesh||n===model||n.name==='Do_HandRigged')nodes.push(n)});
const snap=t=>{mixer.setTime(Math.min(t,clip.duration-.01));return nodes.map(n=>({p:n.position.clone(),q:n.quaternion.clone(),s:n.scale.clone()}))};
open=snap(.05);closed=snap(Math.min(1.95,clip.duration*.49));mixer.stopAllAction();
const centered=new THREE.Group();centered.add(model);pivot=new THREE.Group();pivot.add(centered);scene.add(pivot);
const box=new THREE.Box3().setFromObject(model),c=box.getCenter(new THREE.Vector3()),d=box.getSize(new THREE.Vector3());
centered.position.set(-c.x,-c.y,-c.z);scale=195/Math.max(1,d.x,d.y);
model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;if(o.material)o.material.side=THREE.DoubleSide}});
}catch(err){console.warn('[DCD AR] Hand guide unavailable',err);el.style.display='none'}
}
function render(now){
if(!active)return;raf=requestAnimationFrame(render);
if(!renderer||!pivot||!['AR6','AR7'].includes(frame)||now<hiddenUntil){el.style.opacity='0';return}
if(now-last<33)return;last=now;el.style.display='block';el.style.opacity='1';el.style.transform='none';
const t=(now-since)/1000;let x=0,y=0,z=1,p=0,ry=0;
if(frame==='AR6'){
 const u=t%4.6,pull=ease((u-1.35)/.84)*(1-ease((u-2.85)/.38));
 p=ease((u-.68)/.52)*(1-ease((u-3.2)/.42));
 x=mix(-16,78,pull);y=mix(-135,-38,pull);z=mix(.87,1.23,pull);
}else{
 ry=Math.PI*ease(t/.62);
 const u=Math.max(0,t-.62)%4.65,reach=ease(u/.78),pull=ease((u-1.47)/.78)*(1-ease((u-2.9)/.52)),back=ease((u-3.58)/.7);
 p=ease((u-.9)/.42)*(1-ease((u-2.62)/.36));
 x=mix(mix(90,22,reach)+108*pull,90,back);
 y=mix(mix(-188,22,reach)+105*pull,-188,back);
 z=mix(mix(.79,.94,reach)+.34*pull,.79,back);
}
for(let i=0;i<nodes.length;i++){const n=nodes[i],a=open[i],b=closed[i];n.position.copy(a.p).lerp(b.p,p);n.quaternion.copy(a.q).slerp(b.q,p);n.scale.copy(a.s).lerp(b.s,p)}
pivot.position.set(x,y,0);pivot.rotation.set(0,ry,0);pivot.scale.setScalar(scale*z);renderer.render(scene,camera);
}
init().then(()=>{if(active)raf=requestAnimationFrame(render)});
return {setFrame,hideOnce,destroy(){active=false;cancelAnimationFrame(raf);renderer?.dispose();renderer?.domElement?.remove();el.replaceChildren();el.style.display='none'}};
}
window.DCD_AR_HAND_GUIDE={create};
})();