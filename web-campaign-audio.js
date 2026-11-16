/* DCD approved promotional soundtrack. All assets were cut from user
 * supplied recordings. No animation assets or geometry are modified.
 * BGM starts only after a trusted gesture (mobile autoplay policy).
 */
(()=>{
'use strict';
const prefix='assets/audio/';
const sources={
 bgm:prefix+'dcd-fashion-advertising-promo.mp3',
 creak:prefix+'dcd-plastic-creak.ogg',
 burst:prefix+'dcd-blister-burst-1p5s.ogg',
 whoosh:prefix+'dcd-pack-whoosh.ogg'
};
const tracks={};
for(const [key,url] of Object.entries(sources)){
 const audio=new Audio();
 audio.preload='auto';
 audio.src=url;
 audio.playsInline=true;
 audio.addEventListener('error',()=>{
  console.warn('[DCD audio] Unavailable:',key,url,audio.error?.code);
 });
 tracks[key]=audio;
}
tracks.bgm.loop=true;
tracks.bgm.volume=.34;
tracks.creak.loop=true;
tracks.creak.volume=.47;
tracks.burst.volume=.8;
tracks.whoosh.volume=.66;
let allowed=false,phase='00',recentDuck=0;
function attempt(audio){
 if(!allowed)return;
 const promise=audio.play();
 promise?.catch?.(error=>console.warn('[DCD audio] Playback:',audio.src,error));
}
function gesture(){
 allowed=true;
 attempt(tracks.bgm);
 if(phase==='00')attempt(tracks.creak);
}
function setScene(page){
 phase=page;
 if(page==='00'){
  if(allowed)attempt(tracks.creak);
 }else{
  tracks.creak.pause();
  try{tracks.creak.currentTime=0;}catch{}
 }
 if(page==='arFace'||page==='arClose'){
  tracks.bgm.pause();
  tracks.creak.pause();
 }else if(allowed){
  attempt(tracks.bgm);
 }
}
function duck(duration){
 const id=++recentDuck;
 tracks.bgm.volume=.16;
 window.setTimeout(()=>{if(id===recentDuck)tracks.bgm.volume=.34;},duration);
}
function burst(kind='web'){
 if(!allowed)return;
 tracks.burst.pause();
 try{
  // WEB: original 9–12.5s recording is pitch-preserving
  // time-compressed to the approved 1.5s rupture GIF. The original
  // 12.0s transient lands around 1.29s into the animation.
  // AR: morph is 240ms, so cue the same transient at its last 240ms.
  tracks.burst.currentTime=kind==='ar'?1.04:0;
 }catch{}
 duck(kind==='ar'?700:1700);
 attempt(tracks.burst);
}
function whoosh(){
 if(!allowed)return;
 tracks.whoosh.pause();
 try{tracks.whoosh.currentTime=0;}catch{}
 duck(1350);
 attempt(tracks.whoosh);
}
function stop(){
 for(const audio of Object.values(tracks))audio.pause();
}
window.DCD_CAMPAIGN_AUDIO={gesture,setScene,burst,whoosh,stop,sources};
})();
