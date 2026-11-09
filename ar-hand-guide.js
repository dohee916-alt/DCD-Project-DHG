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
 let ready=false,started=false,initialThumbIndex=[],foldedThumbIndex=[];
 let renderer=null,scene=null,camera=null,pivot=null,mixer=null,clip=null,THREE=null;
 let model=null,poseScale=1;
 const owned=[];
 function setFrame(name){
  const previous=frame;
  frame=name;
  // One uninterrupted demonstration from AR6 into AR7. Only a real first
  // fabric removal calls hideOnce(); changing stages must not stop it.
  if(name==='AR6'&&previous!=='AR6'&&previous!=='AR7'&&!played){
   since=0;started=false;
  }
  el.style.display=(name==='AR6'||name==='AR7')&&!played?'block':'none';
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
   clip=loaded.animations.find(a=>a.name==='Pose_OK');
   const openClip=loaded.animations.find(a=>a.name==='Pose_OKHand');
   if(!clip||!openClip)throw Error('Original GLB is missing one of the two required source poses');
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
   const openAction=mixer.clipAction(openClip);
   // The original GLB has TWO distinct poses. Pose_OKHand at its
   // start has an extended index and a separated thumb (joint gap ~10.4).
   // Pose_OK at its end has the curled three fingers and closer thumb/index
   // (joint gap ~5.2). Using Pose_OK's start for BOTH was the bug:
   // it does not show a clearly OPEN initial thumb/index silhouette.
   // Sample the OPEN pose from Pose_OKHand, while keeping the remaining
   // three fingers curled from Pose_OK.
   // Reset before sampling: .play() on an action that was previously
   // advanced does not guarantee a fresh first-frame pose.
   openAction.reset();
   openAction.enabled=true;
   openAction.setLoop(THREE.LoopOnce,0);
   openAction.clampWhenFinished=true;
   openAction.play();
   const sourceEnd=Math.max(.045,clip.duration-.025);
   const fingerNodes=[];
   model.traverse(node=>{
    if(node.isBone&&/^(thumb|index)_/.test(node.name))fingerNodes.push(node);
   });
   const poseSnap=time=>{
    mixer.setTime(time);
    model.updateMatrixWorld(true);
    return fingerNodes.map(node=>({
      node,position:node.position.clone(),rotation:node.quaternion.clone(),
      scale:node.scale.clone()
    }));
   };
   initialThumbIndex=poseSnap(.045);
   openAction.stop();
   action.reset();
   action.enabled=true;
   action.setLoop(THREE.LoopOnce,0);
   action.clampWhenFinished=true;
   action.play();
   foldedThumbIndex=poseSnap(sourceEnd);
   mixer.setTime(sourceEnd);
   // We cannot assume Pose_OKHand is visibly OPEN just from its name.
   // Build a truly separated OPEN thumb pose. Try outward thumb-base
   // rotations in the native Y/Z palm plane, then keep the direction
   // that increases real 3D thumb/index tip separation the most.
   // Only the source thumb base is adjusted; index stays extended,
   // ring/middle/pinky stay folded as authored in the GLB.
   const thumbBase=initialThumbIndex.find(p=>p.node.name==='thumb_trapez');
   const thumbTip=model.getObjectByName('thumb_dist');
   const indexTip=model.getObjectByName('index_dist');
   if(thumbBase&&thumbTip&&indexTip){
        for(const p of initialThumbIndex){
       p.node.position.copy(p.position);
       p.node.quaternion.copy(p.rotation);
       p.node.scale.copy(p.scale);
     }
     model.updateMatrixWorld(true);
     const gap=()=>{
       const a=thumbTip.getWorldPosition(new THREE.Vector3());
       const b=indexTip.getWorldPosition(new THREE.Vector3());
       return a.distanceTo(b);
     };
     const sourceGap=gap();
     let bestGap=sourceGap,bestRotation=thumbBase.rotation.clone();
     const original=thumbBase.node.quaternion.clone();
     const zAxis=new THREE.Vector3(0,0,1),xAxis=new THREE.Vector3(1,0,0);
     for(const axis of [xAxis,zAxis]){
       for(const angle of [-.65,-.45,-.25,.25,.45,.65]){
         thumbBase.node.quaternion.copy(original);
         thumbBase.node.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));
         model.updateMatrixWorld(true);
         const candidate=gap();
         if(candidate>bestGap){
           bestGap=candidate;
           bestRotation=thumbBase.node.rotation.clone();
         }
       }
     }
     thumbBase.node.rotation.copy(bestRotation);
     model.updateMatrixWorld(true);
     thumbBase.rotation.copy(thumbBase.node.quaternion);
     // Capture source OPEN finger transform after the objective correction,
     // then reapply the compact, curled hand as the steady background pose.
     for(const p of foldedThumbIndex){
       p.node.position.copy(p.position);
       p.node.quaternion.copy(p.rotation);
       p.node.scale.copy(p.scale);
     }
     model.updateMatrixWorld(true);
     console.info('[DCD AR] thumb/index OPEN correction',
       {sourceGap:sourceGap.toFixed(2),newGap:bestGap.toFixed(2),
        separateRatio:(bestGap/Math.max(.001,sourceGap)).toFixed(2)});
   }
   console.info('[DCD AR] Distinct open/closed finger animation sources',
     {open:openClip.name,closed:clip.name,
      openBones:initialThumbIndex.length,closedBones:foldedThumbIndex.length});
   const centered=new THREE.Group();
   centered.add(model);
   pivot=new THREE.Group();
   pivot.add(centered);
   scene.add(pivot);
   // VERIFIED: the hand's widest horizontal axis in the GLB is Z.
   // Rotate the entire model by -90° about Y so original Z is
   // displayed horizontally, with the palm side visible to the viewer.
   // Initial view presents the palm; the instructional sequence rotates
   // the visible palm toward the back of the hand after the intro hold.
   // Source hand is broad in Z, and the camera must see its palm
   // rather than the back of the pinching fingers.
   centered.rotation.y=-Math.PI/2;
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
  if(!renderer||!pivot||!['AR6','AR7'].includes(frame)||played){
   el.style.opacity='0';
   el.style.display='none';
   return;
  }
  // A slow GLB fetch must never consume the single demonstration before
  // the WebGL model has rendered its first frame.
  if(!started){since=now;started=true;}
  if(now-last<33)return;
  last=now;
  // Repeat the entire 5.1-second set until the FIRST fabric is removed.
  // Never restart the clock merely because AR6 advances to AR7.
  const t=((now-since)/1000)%5.10;
  // One complete gesture, with a clearly held start and endpoint:
  // 0.00–0.85  Palm faces viewer, index/thumb OPEN, other three FOLDED
  // 0.85–1.70  Rotate to show back of hand; fingers stay unchanged
  // 1.70–2.65  Move away from the screen, and pinch index/thumb together
  // 2.65–2.95  Hold the closed pinch at the far position
  // 2.95–3.35  RELEASE index/thumb while still far away
  // 3.45–4.35  Move closer with index/thumb ALREADY OPEN
  // 4.35–5.10 Hold the open pose; restart from the initial palm pose.
  // Only the real first mask removal can hide the guide.
  const rotate=smooth((t-.85)/.85);
  const recede=smooth((t-1.70)/.95);
  // The return movement starts only AFTER the release has finished.
  const approach=smooth((t-3.45)/.90);
  const pinch=smooth((t-1.70)/.95)*(1-smooth((t-2.95)/.40));
  // Open thumb/index = Pose_OKHand start; closed thumb/index = Pose_OK end.
  // Other three curled fingers remain locked at Pose_OK end. Critically,
  // the fully open pose is displayed at the START and again on RETURN.
  const foldedTime=Math.max(.045,clip.duration-.025);
  mixer.setTime(foldedTime);
  for(let n=0;n<initialThumbIndex.length;n++){
   const a=initialThumbIndex[n],b=foldedThumbIndex[n];
   const bone=a.node;
   bone.position.copy(a.position).lerp(b.position,pinch);
   bone.quaternion.copy(a.rotation).slerp(b.rotation,pinch);
   bone.scale.copy(a.scale).lerp(b.scale,pinch);
  }
  // Model-facing correction is fixed at -90 deg in the child.
  // Rotate the parent 180 deg to intentionally reveal the back of the
  // hand without mistakenly requiring the REAL user to rotate sideways.
  pivot.rotation.set(0,Math.PI*rotate,-.12*(1-rotate));
  pivot.position.set(-10,18+18*recede-18*approach,0);
  const far=1-.40*recede+.40*approach;
  pivot.scale.setScalar(poseScale*far);
  el.style.display='block';
  el.style.opacity='1';
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