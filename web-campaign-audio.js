/* DCD campaign soundtrack: the approved user-supplied fashion music is
   bundled as an 8s encoded excerpt so it is actually served by GitHub Pages.
   No missing MP3 URL. The user-approved creak, burst and whoosh remain intact.
*/
(()=>{
'use strict';
const BASE='assets/audio/';
const FX={
 creak:new Audio(BASE+'dcd-plastic-creak.ogg'),
 burst:new Audio(BASE+'dcd-blister-burst-1p5s.ogg'),
 whoosh:new Audio(BASE+'dcd-pack-whoosh.ogg')
};
FX.creak.loop=true;FX.creak.volume=.65;
FX.burst.volume=.8;FX.whoosh.volume=.7;
let allowed=false,scene='00',musicContext=null,musicGain=null,musicSource=null,musicBuffer=null;
let musicLoading=null,duckTimer=0;
const Context=window.AudioContext||window.webkitAudioContext;
const PARTS=[1,2,3,4,5].map(n=>BASE+'dcd-fashion-loop-part'+n+'.txt');
let packedMusic=Promise.all(PARTS.map(async url=>{
 const response=await fetch(url);if(!response.ok)throw Error('Fashion BGM '+response.status+' '+url);
 return response.text();
})).then(parts=>{
 const text=parts.join('').trim(),raw=atob(text),data=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)data[i]=raw.charCodeAt(i);
 if(data.length!==10756)throw Error('Unexpected DCD Fashion Music length '+data.length);
 return data.buffer;
}).catch(error=>{console.warn('[DCD BGM] Bundled audio:',error);return null;});
function unlockMusic(){
 if(!Context)return;
 if(!musicContext){
  musicContext=new Context();
  musicGain=musicContext.createGain();musicGain.gain.value=.48;
  musicGain.connect(musicContext.destination);
 }
 musicContext.resume()?.catch(error=>console.warn('[DCD BGM] Unlock:',error));
 if(!musicLoading)musicLoading=packedMusic.then(async data=>{
   if(!data)return;
   try{musicBuffer=await musicContext.decodeAudioData(data.slice(0));}
   catch(error){
    // Browsers lacking native Ogg/Opus decode can use a JS decoder.
    console.info('[DCD BGM] Native Opus unavailable:',error);
    const mod=await import('https://cdn.jsdelivr.net/npm/audio-decode@3.12.0/+esm');
    musicBuffer=await mod.default(data.slice(0));
   }
   if(allowed)startMusic();
 }).catch(error=>console.warn('[DCD BGM] Decode:',error));
}
function startMusic(){
 if(!allowed||!musicContext||!musicBuffer||musicSource||scene==='arFace'||scene==='arClose')return;
 const source=musicContext.createBufferSource();
 source.buffer=musicBuffer;source.loop=true;source.connect(musicGain);source.start();
 musicSource=source;source.onended=()=>{if(musicSource===source)musicSource=null;};
}
function stopMusic(){
 if(!musicSource)return;try{musicSource.stop();}catch{}
 musicSource.disconnect();musicSource=null;
}
function attempt(audio){
 if(!allowed)return;
 const result=audio.play();result?.catch?.(error=>console.warn('[DCD audio] Effect:',audio.src,error));
}
function gesture(){
 allowed=true;unlockMusic();startMusic();
 if(['00','01'].includes(scene)&&FX.creak.paused)attempt(FX.creak);
}
function setScene(page){
 scene=page;
 if(page==='00'||page==='01'){
  if(allowed&&FX.creak.paused)attempt(FX.creak);
 }else{FX.creak.pause();try{FX.creak.currentTime=0;}catch{}}
 if(page==='arFace'||page==='arClose'){stopMusic();}
 else{startMusic();}
}
function duck(ms){
 if(!musicGain)return;
 clearTimeout(duckTimer);
 musicGain.gain.setTargetAtTime(.24,musicContext.currentTime,.035);
 duckTimer=setTimeout(()=>{
  if(musicGain&&musicContext)musicGain.gain.setTargetAtTime(.48,musicContext.currentTime,.20);
 },ms);
}
function burst(kind='web'){
 gesture();
 const audio=FX.burst;audio.pause();try{audio.currentTime=kind==='ar'?1.04:0;}catch{}
 duck(kind==='ar'?700:1700);attempt(audio);
}
function whoosh(){
 gesture();FX.whoosh.pause();try{FX.whoosh.currentTime=0;}catch{}
 duck(1300);attempt(FX.whoosh);
}
function stop(){
 stopMusic();Object.values(FX).forEach(a=>a.pause());
}
window.DCD_CAMPAIGN_AUDIO={gesture,setScene,burst,whoosh,stop,fx:FX,musicReady:()=>!!musicBuffer};
})();