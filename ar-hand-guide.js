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
   // The previous hardcoded 1.95-second snapshot bends the thumb across
   // the palm. Instead inspect the ACTUAL fingertip positions throughout
   // the authored Pose_OKHand animation to find its real pinch frame.
   // The thumb is never manually rotated: only source animation keyframes.
   const thumbTip=model.getObjectByName('thumb_dist');
   const indexTip=model.getObjectByName('index_dist');
   if(!thumbTip||!indexTip)throw Error('Hand fingertip bones missing');
   let bestTime=.05,bestGap=Infinity;
   const thumbWorld=new THREE.Vector3(),indexWorld=new THREE.Vector3();
   for(let step=1;step<200;step++){
    const sampleTime=openClip.duration*step/200;
    mixer.setTime(sampleTime);
    model.updateMatrixWorld(true);
    thumbTip.getWorldPosition(thumbWorld);
    indexTip.getWorldPosition(indexWorld);
    const gap=thumbWorld.distanceTo(indexWorld);
    if(gap<bestGap){bestGap=gap;bestTime=sampleTime;}
   }
   const naturalPinch=poseSnap(bestTime);
   console.info('[DCD AR] Native fingertip pinch candidate',
     {time:bestTime.toFixed(3),boneGap:bestGap.toFixed(3)});
   openAction.stop();
   action.reset();
   action.enabled=true;
   action.setLoop(THREE.LoopOnce,0);
   action.clampWhenFinished=true;
   action.play();
   foldedThumbIndex=poseSnap(sourceEnd);
   for(let n=0;n<foldedThumbIndex.length;n++){
    if(foldedThumbIndex[n].node.name.startsWith('thumb_')){
     foldedThumbIndex[n]=naturalPinch[n];
    }
   }
   mixer.setTime(sourceEnd);
   // Restore the GLB's unmodified thumb from the early native pose.
   // Never rotate thumb_trapez by a guessed axis or maximize distance.
   // Its four original joints stay together as a single authored chain.
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
  // One discrete demonstration. The hand never travels back toward the
  // viewer at the end. It DISAPPEARS in the distance and a fresh OPEN hand
  // appears at the original front position at the next loop boundary.
  // Continue until the first successful physical mask peel.
  const cycle=3.85;
  const t=((now-since)/1000)%cycle;
  // 0.00–0.65: front-facing hand, thumb/index OPEN, other fingers CURLED
  // 0.65–1.45: rotate to show back of hand; thumb/index stay OPEN
  // 1.45–1.95: PINCH thumb/index while stationary, already back-facing
  // 1.95–3.05: move AWAY from the screen, keeping pinch CLOSED
  // 2.70–3.20: fade out at the distant position
  // 3.20–3.85: invisible gap before next fresh front-facing appearance
  const rotate=smooth((t-.65)/.80);
  const pinch=smooth((t-1.45)/.50);
  const recede=smooth((t-1.95)/1.10);
  const fadeIn=smooth(t/.20);
  const fadeOut=1-smooth((t-2.70)/.50);
  const visibility=fadeIn*fadeOut;
  // Open thumb/index = Pose_OKHand start; closed thumb/index = Pose_OK end.
  // Other three curled fingers remain locked at Pose_OK end. Critically,
  // the fully open pose is displayed at the START and again on RETURN.
  const foldedTime=Math.max(.045,clip.duration-.025);
  mixer.setTime(foldedTime);
  for(let n=0;n<initialThumbIndex.length;n++){
   const a=initialThumbIndex[n],b=foldedThumbIndex[n];
   const bone=a.node;
   // Use the same authored Pose_OKHand open/closed thumb joints.
   // Restore actual thumb flexion, without the old deformed optimizer.
   const amount=pinch;
   bone.position.copy(a.position).lerp(b.position,amount);
   bone.quaternion.copy(a.rotation).slerp(b.rotation,amount);
   bone.scale.copy(a.scale).lerp(b.scale,amount);
  }
  // Fixed model correction + deliberate turn from palm to hand back.
  // No approach/return segment: recede, fade, and restart from the front.
  pivot.rotation.set(0,Math.PI*rotate,-.12*(1-rotate));
  pivot.position.set(-10,18+27*recede,0);
  const distanceScale=1-.57*recede;
  pivot.scale.setScalar(poseScale*distanceScale);
  el.style.display=visibility>.002?'block':'none';
  el.style.opacity=String(visibility);
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