/* DCD AR6/AR7 gesture motion — original rigged GLB.
   Preserve the supplied model and its animation hierarchy. No PNG swap,
   unlit rectangle, flat cut-out, or transparent DoubleSide overdraw.
   The arm follows the existing AR6/7 approach-and-pull path; the original
   Pose_OKHand clip controls the bones at every frame. */
(()=>{'use strict';
const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
const mix=(a,b,t)=>a+(b-a)*t;
const MODEL='assets/models/Do_Hand_DetailedRiggedAnimated_shared_16022026.glb';
function create(root){
 const el=root.querySelector('.ar-gesture-guide');
 let active=true,frame='',since=performance.now(),hiddenUntil=0,raf=0,last=0;
 let renderer=null,scene=null,camera=null,pivot=null,mixer=null,clip=null,clipAction=null;
 let model=null,scale=1,THREE=null;
 const ownedMaterials=[],ownedGeometries=[];
 const setFrame=f=>{
   frame=f;since=performance.now();hiddenUntil=0;
   el.style.display=['AR6','AR7'].includes(f)?'block':'none';
   el.style.opacity='0';
 };
 const hideOnce=(ms=900)=>{hiddenUntil=performance.now()+ms;el.style.opacity='0'};
 async function init(){
  try{
   THREE=await import('three');
   const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
   if(!active)return;
   const gltf=await new GLTFLoader().loadAsync(MODEL);
   if(!active)return;
   model=gltf.scene;
   const clips=gltf.animations||[];
   clip=clips.find(x=>x.name==='Pose_OKHand')||clips[0]||null;
   if(!clip)console.warn('[DCD AR hand] No embedded animation clip found; display rest pose.');
   scene=new THREE.Scene();
   camera=new THREE.OrthographicCamera(-214,214,463,-463,.1,4000);
   camera.position.set(0,0,1200);
   // Antialias the actual 3D rig at device resolution, up to 2x to
   // avoid mobile overdraw. The old path was 1x without antialiasing.
   renderer=new THREE.WebGLRenderer({
     alpha:true,antialias:true,powerPreference:'high-performance',
     premultipliedAlpha:true,depth:true
   });
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
   renderer.setSize(428,926,false);
   renderer.setClearColor(0x000000,0);
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   el.replaceChildren(renderer.domElement);
   renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
   const ambient=new THREE.HemisphereLight(0xffffff,0x73554b,2.25);
   scene.add(ambient);
   const key=new THREE.DirectionalLight(0xffffff,1.45);
   key.position.set(5,10,16);scene.add(key);
   const fill=new THREE.DirectionalLight(0xffc7a8,.65);
   fill.position.set(-6,4,9);scene.add(fill);
   const centered=new THREE.Group();
   centered.add(model);
   pivot=new THREE.Group();
   pivot.add(centered);
   scene.add(pivot);
   // Measure the actual rig, keep the original GLB skeleton and meshes.
   if(clip){
     mixer=new THREE.AnimationMixer(model);
     clipAction=mixer.clipAction(clip);
     clipAction.enabled=true;
     clipAction.play();
     mixer.setTime(Math.min(.05,Math.max(.001,clip.duration-.001)));
   }
   const box=new THREE.Box3().setFromObject(model);
   const center=box.getCenter(new THREE.Vector3());
   const size=box.getSize(new THREE.Vector3());
   centered.position.copy(center).multiplyScalar(-1);
   scale=195/Math.max(1,size.x,size.y);
   // The WEB hand is smooth coral/peach with a warm fingertip.
   // Do NOT use the original exaggerated orange translucent shader, and
   // do NOT draw front/back faces of transparent meshes separately.
   const wrist=new THREE.Color('#ed8055');
   const tip=new THREE.Color('#ffc5a2');
   model.traverse(mesh=>{
    if(!mesh.isMesh)return;
    mesh.frustumCulled=false;
    const original=mesh.material;
    const mat=new THREE.MeshStandardMaterial({
     color:0xffffff,roughness:.88,metalness:0,
     side:THREE.FrontSide,transparent:false,opacity:1,
     depthTest:true,depthWrite:true,flatShading:false
    });
    mat.onBeforeCompile=shader=>{
      shader.uniforms.dcdWrist={value:wrist};
      shader.uniforms.dcdTip={value:tip};
      shader.vertexShader=shader.vertexShader
        .replace('#include <common>','#include <common>\nvarying float vDcdHandY;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nvDcdHandY=position.y;');
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>','#include <common>\nvarying float vDcdHandY;\nuniform vec3 dcdWrist;\nuniform vec3 dcdTip;')
        .replace('#include <color_fragment>',
          '#include <color_fragment>\nfloat dcdWarm=smoothstep(1.4,19.5,vDcdHandY);\ndiffuseColor.rgb=mix(dcdWrist,dcdTip,dcdWarm);');
    };
    mat.customProgramCacheKey=()=>'dcd-rigged-hand-solid-front-gradient-v2';
    mesh.material=mat;
    ownedMaterials.push(mat);
    // Keep the native geometry/skeleton and original animation tracks.
    if(original)mesh.userData.dcdOriginalMaterial=original;
   });
   console.info('[DCD AR hand] Rig restored',{clips:clips.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length})),
     size:[size.x,size.y,size.z]});
  }catch(err){
   console.warn('[DCD AR hand] Cannot render rigged guide',err);
   el.style.opacity='0';
  }
 }
 function render(now){
  if(!active)return;
  raf=requestAnimationFrame(render);
  if(!renderer||!pivot||!['AR6','AR7'].includes(frame)||now<hiddenUntil){
   el.style.opacity='0';return;
  }
  if(now-last<33)return;last=now;
  el.style.display='block';el.style.opacity='1';el.style.transform='none';
  const t=(now-since)/1000;let x=0,y=0,z=1,pose=0,ry=0;
  if(frame==='AR6'){
   const u=t%4.6;
   const pull=ease((u-1.35)/.84)*(1-ease((u-2.85)/.38));
   pose=ease((u-.68)/.52)*(1-ease((u-3.2)/.42));
   x=mix(-16,78,pull);y=mix(-135,-38,pull);z=mix(.87,1.23,pull);
  }else{
   ry=Math.PI*ease(t/.62);
   const u=Math.max(0,t-.62)%4.65;
   const reach=ease(u/.78);
   const pull=ease((u-1.47)/.78)*(1-ease((u-2.9)/.52));
   const back=ease((u-3.58)/.7);
   pose=ease((u-.9)/.42)*(1-ease((u-2.62)/.36));
   x=mix(mix(90,22,reach)+108*pull,90,back);
   y=mix(mix(-188,22,reach)+105*pull,-188,back);
   z=mix(mix(.79,.94,reach)+.34*pull,.79,back);
  }
  // Drive all GLB animation tracks with the mixer, never manually
  // overwrite bone transforms from two sparse snapshots.
  if(mixer&&clip){
   const start=Math.min(.05,clip.duration*.02);
   const end=Math.min(1.95,clip.duration-.001);
   const time=start+(Math.max(start,end)-start)*pose;
   mixer.setTime(time);
  }
  pivot.position.set(x,y,0);
  pivot.rotation.set(0,ry,0);
  pivot.scale.setScalar(scale*z);
  renderer.render(scene,camera);
 }
 init();
 raf=requestAnimationFrame(render);
 return {setFrame,hideOnce,destroy(){
  active=false;cancelAnimationFrame(raf);
  mixer?.stopAllAction();
  for(const m of ownedMaterials)m.dispose();
  renderer?.dispose();renderer?.domElement?.remove();
  el.replaceChildren();el.style.display='none';
 }};
}
window.DCD_AR_HAND_GUIDE={create};
})();