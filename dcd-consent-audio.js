/* DCD consent: original 0-7s, hold 6.5-7s until YES, then impact. */
(()=>{'use strict';
const FILE='assets/audio/dcd-consent-original.mp3',HOLD_START=6.5,HOLD_END=7,IMPACT_START=11.85;
const AudioCtx=window.AudioContext||window.webkitAudioContext;
let ctx=null,loading=null,buffer=null,node=null,phase='idle',revision=0;
function halt(){if(!node)return;try{node.stop()}catch{}try{node.disconnect()}catch{}node=null}
async function load(){
 if(!AudioCtx)throw Error('AudioContext unavailable');
 if(!ctx)ctx=new AudioCtx();
 await ctx.resume();
 if(!loading)loading=fetch(FILE).then(r=>{if(!r.ok)throw Error('Consent audio HTTP '+r.status);return r.arrayBuffer()}).then(b=>ctx.decodeAudioData(b)).then(b=>buffer=b).catch(e=>{loading=null;throw e});
 await loading;return buffer;
}
function source(){const s=ctx.createBufferSource();s.buffer=buffer;s.connect(ctx.destination);return s}
async function start(){
 if(phase==='intro'||phase==='yes')return;
 const token=++revision;halt();phase='intro';
 try{await load();if(token!==revision||phase!=='intro')return;
  node=source();node.loop=true;node.loopStart=HOLD_START;node.loopEnd=HOLD_END;node.start(0,0)
 }catch(e){console.error('[DCD consent] intro',e)}
}
async function yes(){
 const token=++revision;phase='yes';halt();
 try{await load();if(token!==revision||phase!=='yes')return;
  const playing=source();node=playing;playing.start(0,IMPACT_START);
  playing.onended=()=>{if(node===playing){node=null;phase='done';playing.disconnect()}}
 }catch(e){console.error('[DCD consent] impact',e)}
}
function no(){revision++;phase='no';halt()}
function preload(){return load().catch(e=>console.warn('[DCD consent] preload',e))}
window.DCD_CONSENT_AUDIO={start,yes,no,stop:no,preload,status:()=>phase};
})();