/* Shared DCD audio transport. Native AudioBuffer normalization and real-gesture recovery. */
(()=>{
'use strict';
const C=window.AudioContext||window.webkitAudioContext;
let context=null,decoderPromise=null;
const listeners=new Set();
function get(){if(!context&&C){context=new C();context.addEventListener('statechange',()=>{if(context.state==='running')notify();});}return context;}
function notify(){for(const fn of listeners){try{fn()}catch(e){console.warn('[DCD audio recovery]',e);}}}
function resume(){const c=get();if(!c)return Promise.resolve(false);
 if(c.state==='running'){notify();return Promise.resolve(true);}
 try{return Promise.resolve(c.resume()).then(()=>{if(c.state==='running')notify();return c.state==='running';},()=>false);}catch{return Promise.resolve(false);}
}
function onRunning(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
async function decode(c,bytes){
 try{return await c.decodeAudioData(bytes.slice(0));}
 catch(nativeError){
  decoderPromise ||= import('https://cdn.jsdelivr.net/npm/audio-decode@3.12.0/+esm').catch(e=>{decoderPromise=null;throw e;});
  const mod=await decoderPromise;
  const result=await mod.default(bytes.slice(0));
  if(result&&typeof result.getChannelData==='function'&&Number.isFinite(result.duration)&&typeof AudioBuffer!=='undefined'&&result instanceof AudioBuffer)return result;
  const channels=result?.channelData||result?.channels;
  const count=result?.numberOfChannels||channels?.length;
  const rate=result?.sampleRate;
  const first=typeof result?.getChannelData==='function'?result.getChannelData(0):channels?.[0];
  if(!count||!rate||!first?.length)throw Error('Invalid decoded audio data');
  const out=c.createBuffer(count,first.length,rate);
  for(let i=0;i<count;i++){const data=typeof result.getChannelData==='function'?result.getChannelData(i):channels[i];out.copyToChannel(data instanceof Float32Array?data:Float32Array.from(data),i);}
  return out;
 }
}
function gesture(){
 resume();
 window.DCD_SCENE_AUDIO?.unlock?.();
 window.DCD_WEB_SFX?.unlock?.();
 window.DCD_CAMPAIGN_AUDIO?.gesture?.();
}
for(const name of ['pointerdown','touchend','click','keydown'])document.addEventListener(name,gesture,{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&context)resume();});
window.addEventListener('pageshow',()=>{if(context)resume();});
window.DCD_AUDIO={get,resume,decode,onRunning,status:()=>context?.state||'uninitialized'};
})();