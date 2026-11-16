/* DCD approved user-supplied sound effect cues, packed into one MP3 sprite.
   These offsets are measured in the assembled 16 kHz mono sprite:
   suction 15.0-17.5s source; injection 43.8-45.58s source;
   pack approved UI click; machine original 0-2.214s; signature 0.16-1.60s.
   Browser receives mp3 data as text because Github repository asset writes
   accept UTF-8 only. No remote audio service or login is needed. */
(()=>{
'use strict';
const url='assets/audio/dcd-approved-workbench-cues.mp3.b64?v=20261117';
const clips={
 suction:{start:0,duration:2.5,gain:.48},
 injection:{start:2.7,duration:1.78,gain:.52},
 pack:{start:4.68,duration:.456,gain:.58},
 'machine-in':{start:5.336,duration:1.45,gain:.65},
 'machine-out':{start:5.336,duration:2.214,gain:.67},
 signature:{start:7.75,duration:1.44,gain:.44}
};
let context=null,bus=null,decoded=null,loadPromise=null,payloadPromise=null;
const voices=new Map(),pending=new Map();
const Context=window.AudioContext||window.webkitAudioContext;
function getPayload(){
 if(!payloadPromise)payloadPromise=fetch(url).then(async response=>{
  if(!response.ok)throw Error('Sound sprite HTTP '+response.status);
  const encoded=(await response.text()).trim();
  if(!/^[A-Za-z0-9+/=]+$/.test(encoded))throw Error('Invalid sound sprite');
  const binary=atob(encoded),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes.buffer;
 }).catch(error=>{payloadPromise=null;console.warn('[DCD SFX] Loading:',error);throw error;});
 return payloadPromise;
}
function unlock(){
 if(!Context)return;
 try{
  if(!context){
   context=new Context();
   bus=context.createGain();bus.gain.value=.9;bus.connect(context.destination);
  }
  context.resume()?.catch?.(e=>console.warn('[DCD SFX] Unlock:',e));
  if(!loadPromise){
   loadPromise=getPayload().then(data=>context.decodeAudioData(data.slice(0)))
    .then(buffer=>{decoded=buffer;for(const [id,option] of pending){pending.delete(id);start(id,option);}})
    .catch(error=>{loadPromise=null;console.warn('[DCD SFX] Decode:',error);});
  }
 }catch(error){console.warn('[DCD SFX] Context:',error);}
}
function stop(id){
 pending.delete(id);
 const v=voices.get(id);
 if(!v)return;
 voices.delete(id);
 try{v.source.stop();}catch{}
 try{v.source.disconnect();v.gain.disconnect();}catch{}
}
function start(id,options={}){
 const clip=clips[id];if(!clip||!decoded||!context||context.state!=='running')return;
 stop(id);
 const source=context.createBufferSource();
 const gain=context.createGain();
 source.buffer=decoded;
 gain.gain.value=clip.gain;
 source.connect(gain);gain.connect(bus);
 if(options.loop){
   source.loop=true;source.loopStart=clip.start;source.loopEnd=clip.start+clip.duration;
   source.start(0,clip.start);
 }else{
   source.start(0,clip.start,clip.duration);
 }
 const voice={source,gain};
 voices.set(id,voice);
 source.onended=()=>{if(voices.get(id)===voice){voices.delete(id);source.disconnect();gain.disconnect();}};
}
function play(id,options={}){
 if(!clips[id])return;
 unlock();
 if(decoded&&context?.state==='running')start(id,options);
 else{pending.set(id,options);context?.resume()?.then(()=>{
   if(decoded&&pending.has(id)){const next=pending.get(id);pending.delete(id);start(id,next);}
 });}
}
getPayload().catch(()=>{});
window.DCD_WEB_SFX={unlock,play,stop,clips};
})();