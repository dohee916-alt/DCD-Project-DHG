/* DCD consent: original 0-7s, then a filtered musical bridge into AR. */
(()=>{'use strict';
const FILE='assets/audio/dcd-consent-original.mp3',HOLD_START=6.5,HOLD_END=7;
const AudioCtx=window.AudioContext||window.webkitAudioContext;
let ctx=null,loading=null,buffer=null,node=null,phase='idle',revision=0;
let filter=null,dry=null,wet=null,master=null,fx=[];
function halt(){
 if(node){try{node.stop()}catch{}try{node.disconnect()}catch{}node=null}
 for(const n of fx){try{n.disconnect()}catch{}}
 fx=[];filter=dry=wet=master=null;
}
async function load(){
 if(!AudioCtx)throw Error('AudioContext unavailable');
 if(!ctx)ctx=new AudioCtx();
 await ctx.resume();
 if(!loading)loading=fetch(FILE).then(r=>{if(!r.ok)throw Error('Consent audio HTTP '+r.status);return r.arrayBuffer()}).then(b=>ctx.decodeAudioData(b)).then(b=>buffer=b).catch(e=>{loading=null;throw e});
 await loading;return buffer;
}
function source(){
 const s=ctx.createBufferSource();s.buffer=buffer;
 filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=20000;filter.Q.value=.45;
 dry=ctx.createGain();dry.gain.value=1;wet=ctx.createGain();wet.gain.value=0;
 master=ctx.createGain();master.gain.value=1;
 s.connect(filter);filter.connect(dry);dry.connect(master);
 for(const [seconds,amount] of [[.13,.48],[.31,.32],[.59,.20]]){
   const d=ctx.createDelay(.8),g=ctx.createGain();d.delayTime.value=seconds;g.gain.value=amount;
   filter.connect(d);d.connect(g);g.connect(wet);fx.push(d,g);
 }
 wet.connect(master);master.connect(ctx.destination);fx.push(filter,dry,wet,master);
 return s;
}
function hold(p,now){if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(now);else{const v=p.value;p.cancelScheduledValues(now);p.setValueAtTime(v,now);}}
function bridge(){
 if(!node||!ctx||!master)return;
 const t=ctx.currentTime;
 for(const p of [filter.frequency,dry.gain,wet.gain,master.gain])hold(p,t);
 filter.frequency.exponentialRampToValueAtTime(2100,t+.65);
 filter.frequency.exponentialRampToValueAtTime(490,t+2.6);
 filter.frequency.exponentialRampToValueAtTime(340,t+4.2);
 dry.gain.linearRampToValueAtTime(.58,t+2.8);
 wet.gain.linearRampToValueAtTime(.62,t+2.8);
 master.gain.linearRampToValueAtTime(.55,t+.9);
 master.gain.linearRampToValueAtTime(.19,t+3.2);
}
async function start(){
 if(phase==='intro'||phase==='yes'||phase==='opening')return;
 const token=++revision;halt();phase='intro';
 try{await load();if(token!==revision||!['intro','yes'].includes(phase))return;
  node=source();node.loop=true;node.loopStart=HOLD_START;node.loopEnd=HOLD_END;
  node.start(0,phase==='yes'?HOLD_START:0);
  if(phase==='yes')bridge();
 }catch(e){console.error('[DCD consent] intro',e)}
}
function yes(){if(phase==='yes'||phase==='opening')return;phase='yes';bridge();}
function open(){
 if(phase!=='yes')return;
 phase='opening';const token=++revision;
 if(!node||!ctx||!master){halt();phase='done';return;}
 const t=ctx.currentTime;
 for(const p of [filter.frequency,dry.gain,wet.gain,master.gain])hold(p,t);
 filter.frequency.exponentialRampToValueAtTime(230,t+.65);
 dry.gain.linearRampToValueAtTime(.12,t+.85);
 wet.gain.linearRampToValueAtTime(.8,t+.7);
 master.gain.linearRampToValueAtTime(0,t+2.3);
 const ending=node;
 try{ending.stop(t+2.35)}catch{}
 ending.onended=()=>{if(token===revision&&node===ending){halt();phase='done';}};
}
function finish(){
 if(phase==='yes')open();
}
function no(){revision++;phase='no';halt()}
function preload(){return load().catch(e=>console.warn('[DCD consent] preload',e))}
window.DCD_CONSENT_AUDIO={start,yes,open,finish,no,stop:no,preload,status:()=>phase};
})();