/* DCD AR6 — original rigged 3D hand, verified GLB structure.
   Source GLB (2026 Emma L. D. Lieker): mesh POSITION extents
   X[-2.96, 2.49], Y[-0.18,22.98], Z[-12.50,4.30].
   The visible hand spreads through Y/Z, not X/Y. Looking along Z,
   as the original renderer did, makes it a thin finger-shaped strip.
   This camera-facing correction is FIXED model orientation, never
   a sideways gesture in the instructional motion.
   Source contains Pose_OKHand (63 animated bone channels).
   Keep bone animation, use opaque depth-tested 3D material and
   render at device pixel ratio with antialiasing. */
(()=>{'use strict';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
const lerp=(a,b,t)=>a+(b-a)*t;
const SRC='assets/models/Do_Hand_DetailedRiggedAnimated_shared_16022026.glb';
function create(root){
 const el=root.querySelector('.ar-gesture-guide');
 let active=true,frame='',since=0,played=false,raf=0,last=0;
 let renderer=null,scene=null,camera=null,pivot=null,mixer=null,clip=null,THREE=null;
 let model=null,poseScale=1;
 const owned=[];
 function setFrame(name){
  frame=name;
  if(name==='AR6'&&!played)since=performance.now();
  if(name==='AR7')played=true;
  el.style.display=name==='AR6'&&!played?'block':'none';
  el.style.opacity='0';
 }
 function hideOnce(){
  played=true;
  el.style.opacity='0';
  el.style.display='none';
 }
 async function init(){
  try{
   THREE=await import('three');
   const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
   if(!active)return;
   const loaded=await new GLTFLoader().loadAsync(SRC);
   if(!active)return;
   model=loaded.scene;
   clip=loaded.animations.find(a=>a.name==='Pose_OKHand');
   if(!clip)throw Error('Expected Pose_OKHand clip is missing from original GLB');
   scene=new THREE.Scene();
   camera=new THREE.OrthographicCamera(-214,214,463,-463,.1,4000);
   camera.position.set(0,0,1200);
   camera.lookAt(0,0,0);
   renderer=new THREE.WebGLRenderer({
    alpha:true,antialias:true,depth:true,
    premultipliedAlpha:true,powerPreference:'high-performance'
   });
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
   renderer.setSize(428,926,false);
   renderer.setClearColor(0x000000,0);
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.toneMapping=THREE.NoToneMapping;
   el.replaceChildren(renderer.domElement);
   renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
   scene.add(new THREE.HemisphereLight(0xffe9dd,0xd3a99b,1.4));
   const key=new THREE.DirectionalLight(0xffffff,1.45);
   key.position.set(-6,10,16);scene.add(key);
   const fill=new THREE.DirectionalLight(0xffc8ad,.48);
   fill.position.set(7,2,-5);scene.add(fill);
   mixer=new THREE.AnimationMixer(model);
   const action=mixer.clipAction(clip);
   action.enabled=true;
   action.setLoop(THREE.LoopOnce,0);
   action.clampWhenFinished=true;
   action.play();
   mixer.setTime(.045);
   const centered=new THREE.Group();
   centered.add(model);
   pivot=new THREE.Group();
   pivot.add(centered);
   scene.add(pivot);
   // VERIFIED: the hand's widest horizontal axis in the GLB is Z.
   // Rotate the entire model by +90° about Y so original Z is
   // displayed horizontally; fingers retain their upright Y axis.
   // No gesture-driven Y rotation, ever.
   centered.rotation.y=Math.PI/2;
   centered.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(centered);
   const center=box.getCenter(new THREE.Vector3());
   const size=box.getSize(new THREE.Vector3());
   centered.position.sub(center);
   poseScale=207/Math.max(1,size.x,size.y);
   // Opaque double-sided material lets the original 3D skin keep its
   // correct surface/depth without transparent self-overdraw.
   // Gentle coral-to-apricot color is provided by the *actual* GLB
   // local hand height, not procedural noisy texture or PNG.
   const low=new THREE.Color('#ee8964');
   const high=new THREE.Color('#ffbf99');
   model.traverse(mesh=>{
    if(!mesh.isMesh)return;
    mesh.frustumCulled=false;
    const material=new THREE.MeshStandardMaterial({
     color:0xffffff,roughness:.9,metalness:0,flatShading:false,
     side:THREE.DoubleSide,transparent:false,opacity:1,
     depthTest:true,depthWrite:true
    });
    material.onBeforeCompile=shader=>{
     shader.uniforms.dcdLow={value:low};
     shader.uniforms.dcdHigh={value:high};
     shader.vertexShader=shader.vertexShader
      .replace('#include <common>',
       '#include <common>\nvarying float vDcdLocalY;')
      .replace('#include <begin_vertex>',
       '#include <begin_vertex>\nvDcdLocalY=position.y;');
     shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',
       '#include <common>\nvarying float vDcdLocalY;\nuniform vec3 dcdLow;\nuniform vec3 dcdHigh;')
      .replace('#include <color_fragment>',
       '#include <color_fragment>\nfloat dcdBlend=smoothstep(0.5,22.0,vDcdLocalY);\ndiffuseColor.rgb=mix(dcdLow,dcdHigh,dcdBlend);');
    };
    material.customProgramCacheKey=()=> 'dcd-source-glb-coral-opaque-front-v1';
    owned.push(material);
    mesh.material=material;
   });
   console.info('[DCD AR] Original rigged hand front-facing',{
    clip:clip.name,duration:clip.duration,
    tracks:clip.tracks.length,projected:[size.x,size.y,size.z]
   });
  }catch(error){
   console.warn('[DCD AR] Hand guide loading / rendering:',error);
   el.style.display='none';
  }
 }
 function render(now){
  if(!active)return;
  raf=requestAnimationFrame(render);
  if(!renderer||!pivot||frame!=='AR6'||played){
   el.style.opacity='0';el.style.display='none';return;
  }
  const u=(now-since)/1000;
  if(u>=4.6){
   hideOnce();return;
  }
  if(now-last<33)return;
  last=now;
  el.style.display='block';el.style.opacity='1';
  const reach=smooth((u-.25)/1.1);
  const pinch=smooth((u-1.15)/.55);
  const pull=smooth((u-2.45)/.84);
  const retreat=smooth((u-3.65)/.56);
  const pose=pinch*(1-smooth((u-3.5)/.65));
  // Start below the face, touch the face with index/thumb,
  // then pull outward. All motions are screen-forward, never
  // sideways hand rotation.
  const x=lerp(-47,2,reach)+42*pull-32*retreat;
  const y=lerp(-135,68,reach)-22*pull-70*retreat;
  const z=lerp(.77,1.03,reach)+.25*pull-.27*retreat;
  const time=.045+(Math.min(clip.duration-.01,2.15)-.045)*pose;
  mixer.setTime(time);
  pivot.position.set(x,y,0);
  pivot.rotation.set(0,0,-.20);
  pivot.scale.setScalar(poseScale*z);
  renderer.render(scene,camera);
 }
 init();
 raf=requestAnimationFrame(render);
 return {
  setFrame,hideOnce,
  destroy(){
   active=false;cancelAnimationFrame(raf);
   mixer?.stopAllAction();
   for(const m of owned)m.dispose();
   renderer?.dispose();
   renderer?.domElement?.remove();
   el.replaceChildren();el.style.display='none';
  }
 };
}
window.DCD_AR_HAND_GUIDE={create};
})();