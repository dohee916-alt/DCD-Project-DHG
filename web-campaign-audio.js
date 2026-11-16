/* DCD: Safari-safe opening music with an overlap-crossfaded, gapless PCM loop.
 * WEB00: music + creak. WEB01: creak only; BGM fades out.
 * Approved MP3 assets remain unchanged. */
(()=>{
'use strict';
const BASE='assets/audio/';
const musicFallback=new Audio(BASE+'dcd-fashion-loop.mp3');
musicFallback.loop=true;musicFallback.preload='auto';musicFallback.volume=.48;
const FX={
 creak:new Audio(BASE+'dcd-plastic-creak.mp3'),
 burst:new Audio(BASE+'dcd-blister-burst-1p5s.mp3'),
 whoosh:new Audio(BASE+'dcd-pack-whoosh.mp3')
};
FX.creak.loop=true;FX.creak.volume=.65;
FX.burst.volume=.8;FX.whoosh.volume=.7;
Object.values(FX).forEach(audio=>{audio.preload='auto';});
const AudioCtx=window.AudioContext||window.webkitAudioContext;
let allowed=false,scene='00',duckTimer=0,ctx=null,bus=null,source=null,decoded=null;
let loading=null,stopping=false;
const VOLUME=.48;
function attempt(audio){
 if(!allowed)return;
 try{audio.play()?.catch?.(error=>console.warn('[DCD audio] Playback:',audio.src,error));}
 catch(error){console.warn('[DCD audio] Playback:',audio.src,error);}
}
function buildSeamlessLoop(buffer){
 const channels=buffer.numberOfChannels,n=buffer.length,rate=buffer.sampleRate;
 const overlap=Math.min(Math.round(rate*.95),Math.floor(n/5));
 if(overlap<64)return buffer;
 // Remove the tail and blend it over the first overlap. On repeat,
 // the last retained frame is contiguous with the original tail's first
 // frame; the blend ends contiguous with the original intro after 0.95 s.
 const length=n-overlap,out=ctx.createBuffer(channels,length,rate);
 for(let ch=0;ch<channels;ch++){
  const src=buffer.getChannelData(ch),dest=out.getChannelData(ch);
  dest.set(src.subarray(overlap,length),overlap);
  for(let i=0;i<overlap;i++){
   const t=i/(overlap-1);
   const theta=t*Math.PI/2;
   dest[i]=src[length+i]*Math.cos(theta)+src[i]*Math.sin(theta);
  }
 }
 return out;
}
async function preload(){
 if(loading)return loading;
 loading=fetch(BASE+'dcd-fashion-loop.mp3').then(async r=>{
  if(!r.ok)throw Error('Music MP3 HTTP '+r.status);
  const bytes=await r.arrayBuffer();
  if(bytes.byteLength<50000)throw Error('Music MP3 truncated');
  if(!ctx)return null;
  return ctx.decodeAudioData(bytes.slice(0));
 }).then(buffer=>{
  if(buffer&&ctx){
   decoded=buildSeamlessLoop(buffer);
   if(allowed&&scene==='00')startMusic();
  }
 }).catch(error=>{
  console.warn('[DCD BGM] Seamless decode unavailable, original MP3 fallback:',error);
  if(allowed&&scene==='00')attempt(musicFallback);
 });
 return loading;
}
function startMusic(){
 if(!allowed||scene!=='00')return;
 if(source&&!stopping)return;
 if(!AudioCtx){if(musicFallback.paused)attempt(musicFallback);return;}
 if(!ctx){
  try{ctx=new AudioCtx();bus=ctx.createGain();bus.gain.value=VOLUME;bus.connect(ctx.destination);}
  catch(error){console.warn('[DCD BGM] AudioContext:',error);attempt(musicFallback);return;}
 }
 ctx.resume()?.catch(error=>console.warn('[DCD BGM] Resume:',error));
 if(!decoded){preload();return;}
 // In case a fade-out is still underway, stop it and build a fresh source.
 if(source){try{source.stop();source.disconnect();}catch{}source=null;}
 stopping=false;
 const next=ctx.createBufferSource();next.buffer=decoded;next.loop=true;
 next.connect(bus);
 bus.gain.cancelScheduledValues(ctx.currentTime);
 bus.gain.setValueAtTime(0,ctx.currentTime);
 bus.gain.linearRampToValueAtTime(VOLUME,ctx.currentTime+.22);
 next.start();source=next;
 next.onended=()=>{if(source===next){source=null;stopping=false;}try{next.disconnect();}catch{}};
 if(!musicFallback.paused)musicFallback.pause();
}
function stopMusic(fade=.62){
 if(source&&ctx&&bus){
  const now=ctx.currentTime;
  bus.gain.cancelScheduledValues(now);
  bus.gain.setValueAtTime(bus.gain.value,now);
  bus.gain.linearRampToValueAtTime(0,now+fade);
  if(!stopping){stopping=true;try{source.stop(now+fade+.04);}catch{}}
 }
 if(!musicFallback.paused){
  const from=musicFallback.volume,start=performance.now();
  const fadeFallback=()=>{
   if(scene==='00')return;
   const t=Math.min(1,(performance.now()-start)/(fade*1000));
   musicFallback.volume=from*(1-t);
   if(t<1)requestAnimationFrame(fadeFallback);
   else{musicFallback.pause();musicFallback.currentTime=0;musicFallback.volume=VOLUME;}
  };requestAnimationFrame(fadeFallback);
 }
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
  FX.creak.pause();try{FX.creak.currentTime=0;}catch{}
 }
 if(page==='00')startMusic();
 else stopMusic();
}
function duck(ms){
 clearTimeout(duckTimer);
 if(bus&&ctx&&source&&!stopping)bus.gain.setTargetAtTime(.24,ctx.currentTime,.035);
 if(!musicFallback.paused)musicFallback.volume=.24;
 duckTimer=setTimeout(()=>{
  if(bus&&ctx&&source&&!stopping&&scene==='00')
   bus.gain.setTargetAtTime(VOLUME,ctx.currentTime,.2);
  if(scene==='00')musicFallback.volume=VOLUME;
 },ms);
}
function burst(kind='web'){
 gesture();const audio=FX.burst;
 audio.pause();try{audio.currentTime=kind==='ar'?1.04:0;}catch{}
 duck(kind==='ar'?700:1700);attempt(audio);
}
function whoosh(){
 gesture();FX.whoosh.pause();try{FX.whoosh.currentTime=0;}catch{}
 duck(1300);attempt(FX.whoosh);
}
function stop(){
 stopMusic(.15);Object.values(FX).forEach(a=>a.pause());
}
window.DCD_CAMPAIGN_AUDIO={gesture,setScene,burst,whoosh,stop,fx:FX,musicReady:()=>!!decoded||musicFallback.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA};
setScene('00');
// Prefetch bytes on page load; decoded output starts only after the
// first deliberate user interaction (Safari audio permission).
})();
