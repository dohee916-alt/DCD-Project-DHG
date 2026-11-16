/* DCD sound cues from user-approved source recordings.
 * Separate high-quality Ogg sprite for syringe suction/injection and actual
 * signature ink. Previous very-low-bitrate MP3 is retained ONLY for pack
 * insertion and machine until those originals are replaced.
 */
(()=>{
'use strict';
const PATH='assets/audio/';
const parts=Array.from({length:8},(_,i)=>PATH+'dcd-fixed-sfx-part'+(i+1)+'.txt');
const legacy=PATH+'dcd-approved-workbench-cues.mp3.b64';
const clips={
 suction:{source:'hq',start:0,duration:1.33,gain:.85},
 injection:{source:'hq',start:1.48,duration:1.04,gain:.85},
 signature:{source:'hq',start:2.67,duration:1.36,gain:.65},
 pack:{source:'legacy',start:4.68,duration:.456,gain:.70},
 'machine-in':{source:'legacy',start:5.336,duration:1.45,gain:.72},
 'machine-out':{source:'legacy',start:5.336,duration:2.214,gain:.74}
};
let context=null,bus=null,loadHQ=null,loadLegacy=null;
const buffers={hq:null,legacy:null};
const voices=new Map(),pending=new Map();
const AudioCtx=window.AudioContext||window.webkitAudioContext;
async function fetchText(url){
 const r=await fetch(url);if(!r.ok)throw Error('SFX '+r.status+' '+url);return r.text();
}
function bytesFromBase64(b64,expected){
 const raw=atob(b64.trim()),bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 if(expected&&bytes.length!==expected)throw Error('SFX size mismatch: '+bytes.length);
 return bytes.buffer;
}
async function decode(data){
 try{return await context.decodeAudioData(data.slice(0));}
 catch(error){
   console.warn('[DCD SFX] Native decoder unavailable, using JS decoder:',error);
   const module=await import('https://cdn.jsdelivr.net/npm/audio-decode@3.12.0/+esm');
   return module.default(data.slice(0));
 }
}
function stop(id){
 pending.delete(id);
 const voice=voices.get(id);if(!voice)return;
 voices.delete(id);
 try{voice.node.stop();}catch{}
 voice.node.disconnect();voice.gain.disconnect();
}
function start(id,options={}){
 const clip=clips[id],buffer=buffers[clip?.source];
 if(!buffer||!context||context.state!=='running')return false;
 stop(id);
 const node=context.createBufferSource(),gain=context.createGain();
 node.buffer=buffer;
 gain.gain.value=clip.gain;
 node.connect(gain);gain.connect(bus);
 if(options.loop){
  node.loop=true;node.loopStart=clip.start;node.loopEnd=clip.start+clip.duration;
  node.start(0,clip.start);
 }else node.start(0,clip.start,clip.duration);
 const voice={node,gain};voices.set(id,voice);
 node.onended=()=>{if(voices.get(id)===voice){voices.delete(id);node.disconnect();gain.disconnect();}};
 return true;
}
function flush(source){
 for(const [id,options] of [...pending]){
  if(clips[id]?.source!==source)continue;
  pending.delete(id);start(id,options);
 }
}
function unlock(){
 if(!AudioCtx)return;
 try{
  if(!context){
    context=new AudioCtx();
    bus=context.createGain();bus.gain.value=.87;bus.connect(context.destination);
  }
  context.resume()?.catch(error=>console.warn('[DCD SFX] Resume:',error));
  if(!loadHQ){
   loadHQ=fetch(PATH+'dcd-fixed-sfx.ogg').then(async response=>{
       if(!response.ok)throw Error('Original SFX HTTP '+response.status);
       const data=await response.arrayBuffer();
       if(data.byteLength!==19493)throw Error('Original SFX media corrupted');
       return data;
     }).catch(async error=>{
       console.warn('[DCD SFX] Using verified text backup:',error);
       const arr=await Promise.all(parts.map(fetchText));
       return bytesFromBase64(arr.join(''),19493);
     }).then(decode).then(buffer=>{
       buffers.hq=buffer;console.info('[DCD SFX] Syringe+signature HD ready,',buffer.duration.toFixed(2),'s');
       flush('hq');
     }).catch(error=>{console.error('[DCD SFX] High-quality sound:',error);loadHQ=null;});
  }
  if(!loadLegacy){
   loadLegacy=fetchText(legacy).then(text=>bytesFromBase64(text,9692))
     .then(decode).then(buffer=>{buffers.legacy=buffer;flush('legacy');})
     .catch(error=>{console.error('[DCD SFX] Pack machine:',error);loadLegacy=null;});
  }
 }catch(error){console.warn('[DCD SFX] Setup:',error);}
}
function play(id,options={}){
 if(!clips[id])return;
 unlock();
 if(!start(id,options)){
  pending.set(id,options);
  context?.resume()?.then(()=>{
   if(pending.has(id)&&buffers[clips[id].source]){
    const next=pending.get(id);pending.delete(id);start(id,next);
   }
  });
 }
}
window.DCD_WEB_SFX={unlock,play,stop,clips,status:()=>({
 context:context?.state,hd:!!buffers.hq,legacy:!!buffers.legacy,
 durationHQ:buffers.hq?.duration,durationLegacy:buffers.legacy?.duration
})};
})();