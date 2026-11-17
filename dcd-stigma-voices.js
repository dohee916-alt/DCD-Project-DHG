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
function stop(){
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
  current.buffer=decoded;volume.gain.value=.8;
  current.connect(volume);volume.connect(ctx.destination);
  node=current;gain=volume;
  current.onended=()=>{
   if(node===current){node=null;gain=null}
   try{current.disconnect();volume.disconnect()}catch{}
  };
  current.start(0,start,Math.min(duration,decoded.duration-start));
 }catch(e){console.warn('[DCD stigma voice playback]',e)}
}
window.DCD_STIGMA_VOICES={prime,play,stop,status:()=>({ready:!!decoded,armed,playing:!!node})};
})();