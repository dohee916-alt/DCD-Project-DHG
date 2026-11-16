/* DCD opening audio: Safari-safe, gesture-started MP3 playback.
 * WEB00: background music + plastic creak.
 * WEB01: creak only. Burst/whoosh remain independent one-shot effects.
 */
(()=>{
'use strict';
const BASE='assets/audio/';
const music=new Audio(BASE+'dcd-fashion-loop.mp3');
music.loop=true;music.preload='auto';music.volume=.48;
const FX={
 creak:new Audio(BASE+'dcd-plastic-creak.mp3'),
 burst:new Audio(BASE+'dcd-blister-burst-1p5s.mp3'),
 whoosh:new Audio(BASE+'dcd-pack-whoosh.mp3')
};
FX.creak.loop=true;FX.creak.volume=.65;
FX.burst.volume=.8;FX.whoosh.volume=.7;
Object.values(FX).forEach(audio=>{audio.preload='auto';});
let allowed=false,scene='00',duckTimer=0;
function attempt(audio){
 if(!allowed)return;
 try{
   const result=audio.play();
   result?.catch?.(error=>console.warn('[DCD audio] Playback:',audio.src,error));
 }catch(error){console.warn('[DCD audio] Playback:',audio.src,error);}
}
function startMusic(){
 if(allowed&&scene==='00'&&music.paused)attempt(music);
}
function stopMusic(){
 music.pause();
 try{music.currentTime=0;}catch{}
}
function gesture(){
 allowed=true;
 if(scene==='00')startMusic();
 if((scene==='00'||scene==='01')&&FX.creak.paused)attempt(FX.creak);
}
function enableOnGesture(){gesture();}
document.addEventListener('touchstart',enableOnGesture,{capture:true,passive:true});
document.addEventListener('pointerdown',enableOnGesture,{capture:true,passive:true});
document.addEventListener('keydown',enableOnGesture,{capture:true});
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible'&&allowed)gesture();
});
window.addEventListener('pageshow',()=>{if(allowed)gesture();});
function setScene(page){
 scene=page;
 if(page==='00'||page==='01'){
   if(allowed&&FX.creak.paused)attempt(FX.creak);
 }else{
   FX.creak.pause();
   try{FX.creak.currentTime=0;}catch{}
 }
 if(page==='00')startMusic();
 else stopMusic();
}
function duck(ms){
 clearTimeout(duckTimer);
 if(!music.paused)music.volume=.24;
 duckTimer=setTimeout(()=>{music.volume=.48;},ms);
}
function burst(kind='web'){
 gesture();
 const audio=FX.burst;
 audio.pause();try{audio.currentTime=kind==='ar'?1.04:0;}catch{}
 duck(kind==='ar'?700:1700);attempt(audio);
}
function whoosh(){
 gesture();
 FX.whoosh.pause();try{FX.whoosh.currentTime=0;}catch{}
 duck(1300);attempt(FX.whoosh);
}
function stop(){
 stopMusic();Object.values(FX).forEach(a=>a.pause());
}
window.DCD_CAMPAIGN_AUDIO={
 gesture,setScene,burst,whoosh,stop,fx:FX,
 musicReady:()=>music.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA
};
setScene('00');
})();