/* Ten user-named stigma voices, in their authored scene order.
 * A single small Opus audio sprite avoids ten asynchronous sound requests.
 * Keeps the original murmurs and fabric SFX fully independent. */
(()=>{'use strict';
const AUDIO='assets/audio/dcd-stigma-voices.opus';
const CUES=[
 [0.2,1.802], [2.402,1.672], [4.474,1.672], [6.546,1.985], [8.931,1.672],
 [11.003,2.508], [13.911,1.698], [16.009,3.161], [19.570,2.273], [22.242,2.038]
];
const AudioCtx=window.AudioContext||window.webkitAudioContext;
let ctx=null,decoded=null,loading=null,node=null,gain=null,revision=0,armed=false;
let surroundNodes=[],surroundBus=null,surroundCompressor=null,surroundTimer=0,surroundFx=[],surroundVariant=null;
function stopSurround(){
 clearInterval(surroundTimer);surroundTimer=0;surroundVariant=null;
 for(const n of surroundNodes){try{n.stop()}catch{}try{n.disconnect()}catch{}}surroundNodes=[];
 for(const n of surroundFx){try{n.disconnect()}catch{}}surroundFx=[];
 if(surroundBus){try{surroundBus.disconnect()}catch{}surroundBus=null;}
 if(surroundCompressor){try{surroundCompressor.disconnect()}catch{}surroundCompressor=null;}
}
function surroundLevel(n){
 if(!surroundBus||!ctx)return;
 const levels=[0,.10,.22,.43,.72,1];
 surroundBus.gain.setTargetAtTime(.78*levels[Math.max(0,Math.min(5,n))],ctx.currentTime,.18);
}
function stop(){
 stopSurround();
 revision++;
 if(node){try{node.stop()}catch{}try{node.disconnect()}catch{}node=null}
 if(gain){try{gain.disconnect()}catch{}gain=null}
}
function prime(){
 if(!AudioCtx)return Promise.resolve();
 try{
  if(!ctx)ctx=new AudioCtx();
  armed=true;
  ctx.resume()?.catch(()=>{});
  if(!loading)loading=fetch(AUDIO).then(async r=>{
   if(!r.ok)throw Error('Stigma voices HTTP '+r.status);
   const data=await r.arrayBuffer();
   try{return await ctx.decodeAudioData(data.slice(0))}
   catch(error){
    const decoder=await import('https://cdn.jsdelivr.net/npm/audio-decode@3.12.0/+esm');
    return decoder.default(data.slice(0));
   }
  }).then(b=>{decoded=b;return b}).catch(e=>{
   loading=null;console.error('[DCD stigma voices]',e);return null;
  });
  return loading;
 }catch(e){console.warn('[DCD stigma voices]',e);return Promise.resolve()}
}
async function play(variant,index){
 const idx=(variant==='replacement'?5:0)+Number(index);
 if(!Number.isInteger(idx)||idx<0||idx>=CUES.length)return;
 stop();const ticket=revision;
 try{
  await prime();
  if(ticket!==revision||!decoded||!ctx||!armed)return;
  await ctx.resume();
  if(ticket!==revision)return;
  const [start,duration]=CUES[idx];
  const current=ctx.createBufferSource(),volume=ctx.createGain();
  // Distant, blurry speech: soften harsh consonants with low-pass filtering,
  // blend in two quiet, staggered reflections, and retain intelligibility.
  const softened=ctx.createBiquadFilter();
  softened.type='lowpass';softened.frequency.value=2100;softened.Q.value=.55;
  const dry=ctx.createGain();dry.gain.value=.56;
  const early=ctx.createDelay(.7);early.delayTime.value=.16;
  const late=ctx.createDelay(.7);late.delayTime.value=.33;
  const earlyGain=ctx.createGain();earlyGain.gain.value=.25;
  const lateGain=ctx.createGain();lateGain.gain.value=.14;
  current.buffer=decoded;volume.gain.value=.73;
  current.connect(softened);softened.connect(volume);
  volume.connect(dry);dry.connect(ctx.destination);
  volume.connect(early);early.connect(earlyGain);earlyGain.connect(ctx.destination);
  volume.connect(late);late.connect(lateGain);lateGain.connect(ctx.destination);
  node=current;gain=volume;
  current.onended=()=>{
   if(node===current){node=null;gain=null}
   // Let delayed reflections finish before cleaning up the audio graph.
   const cleanup=()=>{try{current.disconnect();softened.disconnect();volume.disconnect();
     dry.disconnect();early.disconnect();late.disconnect();
     earlyGain.disconnect();lateGain.disconnect()}catch{}};
   setTimeout(cleanup,540);
  };
  current.start(0,start,Math.min(duration,decoded.duration-start));
 }catch(e){console.warn('[DCD stigma voice playback]',e)}
}
async function surround(variant){
 stop();const ticket=revision;surroundVariant=variant;
 await prime();if(ticket!==revision||!decoded||!ctx)return;
 await ctx.resume();if(ticket!==revision)return;
 const base=variant==='replacement'?5:0;
 const bus=ctx.createGain(),compressor=ctx.createDynamicsCompressor();
 bus.gain.value=.78;compressor.threshold.value=-22;compressor.ratio.value=5;
 const dry=ctx.createGain();dry.gain.value=.58;
 bus.connect(dry);dry.connect(compressor);
 // Diffuse reflections make individual words less sharply separated.
 for(const [seconds,amount] of [[.15,.25],[.29,.19],[.49,.13]]){
  const d=ctx.createDelay(.8),g=ctx.createGain();d.delayTime.value=seconds;g.gain.value=amount;
  bus.connect(d);d.connect(g);g.connect(compressor);surroundFx.push(d,g);
 }
 surroundFx.push(dry);compressor.connect(ctx.destination);surroundBus=bus;surroundCompressor=compressor;
 const events=[{i:0,t:0,p:-.85},{i:2,t:.26,p:.83},{i:1,t:.52,p:-.38},{i:4,t:.74,p:.44},{i:3,t:1.0,p:0},{i:2,t:2.12,p:-.7},{i:0,t:2.42,p:.76},{i:4,t:2.68,p:-.4},{i:1,t:3.0,p:.63},{i:3,t:3.22,p:-.12}];
 let nextStart=ctx.currentTime+.08;
 function schedule(){
  if(ticket!==revision||surroundBus!==bus)return;
  if(nextStart<ctx.currentTime)nextStart=ctx.currentTime+.04;
  while(nextStart<ctx.currentTime+.8){
   const start=nextStart;nextStart+=4.0;
   for(let j=0;j<events.length;j++){
    const e=events[j],cue=CUES[base+e.i],n=ctx.createBufferSource(),g=ctx.createGain(),filter=ctx.createBiquadFilter(),p=ctx.createStereoPanner?ctx.createStereoPanner():null;
    n.buffer=decoded;filter.type='lowpass';filter.frequency.value=j<5?1150:800;filter.Q.value=.55;
    const at=start+e.t,d=Math.min(cue[1],decoded.duration-cue[0]);if(d<=0)continue;
    const amount=j<5?.25:.19;
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(amount,at+.15);g.gain.setValueAtTime(amount,at+Math.max(.16,d-.25));g.gain.linearRampToValueAtTime(0,at+d);
    n.connect(filter);filter.connect(g);
    if(p){p.pan.setValueAtTime(e.p,at);p.pan.linearRampToValueAtTime(-e.p*.65,at+d);g.connect(p);p.connect(bus);}else g.connect(bus);
    surroundNodes.push(n);n.onended=()=>{surroundNodes=surroundNodes.filter(v=>v!==n);try{n.disconnect();filter.disconnect();g.disconnect();p?.disconnect()}catch{}};
    n.start(at,cue[0],d);
   }
  }
 }
 schedule();surroundTimer=setInterval(schedule,180);
}
window.DCD_STIGMA_VOICES={prime,play,stop,surround,surroundLevel,status:()=>({ready:!!decoded,armed,playing:!!node||surroundNodes.length>0})};
})();