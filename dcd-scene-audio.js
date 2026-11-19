/* DCD user-supplied effects: keep original WEB audio unchanged. */
(()=>{'use strict';
const PATH='assets/audio/dcd-';
const sounds={
 'workbench-ambience':{gain:.32},
 'prescription-typing':{gain:.58},
 'prescription-check':{gain:.72},
 'prescription-next':{gain:.75},
 'mask-arrive':{gain:.67},
 'mask-peel':{gain:.78},
 'mask-all-cleared':{gain:.82},
 'final-message':{gain:.46}
};
const AudioCtx=window.AudioContext||window.webkitAudioContext;
const workbenchPages=new Set(['03','workbench','08a','08b','09','10','11']);
let ctx=null,master=null,activePage='',enabled=false;
const decoded=new Map(),pending=new Map(),voices=new Map(),serials=new Map();
const loopLoads=new Set();
const instantSounds=new Set(['prescription-check','prescription-next']);
const onsetOffsets=new Map();
let primed=false;
const recovery=new Map();
function onset(buffer){
 const n=Math.min(buffer.length,Math.floor(buffer.sampleRate*.9)),step=Math.max(1,Math.floor(buffer.sampleRate*.002));
 const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
 let peak=0;for(let i=0;i<n;i++)for(const c of channels)peak=Math.max(peak,Math.abs(c[i]));
 if(peak<.0001)return 0;
 const threshold=Math.max(.001,peak*.035);
 for(let i=0;i<n;i+=step){let max=0;for(let j=i;j<Math.min(n,i+step);j++)for(const c of channels)max=Math.max(max,Math.abs(c[j]));if(max>=threshold)return Math.max(0,i/buffer.sampleRate-.006);}
 return 0;
}
function unlock(){
 if(!AudioCtx)return;
 enabled=true;
 if(!ctx){
  ctx=window.DCD_AUDIO.get();
  master=ctx.createGain();master.gain.value=.9;master.connect(ctx.destination);
 }
 ctx.resume()?.then(()=>{
  if(!primed){primed=true;for(const name of Object.keys(sounds))preload(name);}
  // The rotate/workbench scene may already have begun before the first
  // pointer gesture. Start that pending ambience right after unlocking.
  if(workbenchPages.has(activePage)&&!voices.has('workbench-ambience')&&!loopLoads.has('workbench-ambience'))
   play('workbench-ambience',{loop:true});
 }).catch(e=>console.warn('[DCD scene audio] resume:',e));
}
async function buffer(name){
 if(decoded.has(name))return decoded.get(name);
 if(pending.has(name))return pending.get(name);
 const promise=fetch(PATH+name+'.opus').then(async r=>{
  if(!r.ok)throw Error(name+' HTTP '+r.status);
  const data=await r.arrayBuffer();
  return window.DCD_AUDIO.decode(ctx,data);
 }).then(b=>{decoded.set(name,b);if(instantSounds.has(name))onsetOffsets.set(name,onset(b));pending.delete(name);return b})
   .catch(e=>{pending.delete(name);console.warn('[DCD scene audio] '+name,e);throw e});
 pending.set(name,promise);return promise;
}
function stop(name,fade=0){
 recovery.delete(name);
 serials.set(name,(serials.get(name)||0)+1);
 loopLoads.delete(name);
 const voice=voices.get(name);
 if(!voice)return;
 voices.delete(name);
 const {node,gain}=voice;
 try{
  if(fade>0&&ctx){
   const now=ctx.currentTime;
   gain.gain.cancelScheduledValues(now);
   gain.gain.setValueAtTime(gain.gain.value,now);
   gain.gain.linearRampToValueAtTime(0,now+fade);
   node.stop(now+fade+.04);
  }else node.stop();
 }catch{}
 if(!fade){try{node.disconnect();gain.disconnect()}catch{}}
}
async function play(name,options={}){
 if(!sounds[name])return;
 // Repeated pages must not restart ongoing atmospheric loops.
 if(options.loop&&(voices.has(name)||loopLoads.has(name)))return;
 if(options.loop)loopLoads.add(name);
 if(!options.loop)stop(name);
 const latest=(serials.get(name)||0)+1;
 serials.set(name,latest);
 try{
  if(!enabled){recovery.set(name,{options,page:activePage});return;}
  // Decoded clicks start synchronously in the original input handler.
  const cached=decoded.get(name);
  const b=cached||await buffer(name);
  if(serials.get(name)!==latest||!ctx)return;
  if(ctx.state!=='running'){recovery.set(name,{options,page:activePage});return;}
  recovery.delete(name);
  const node=ctx.createBufferSource(),gain=ctx.createGain();
  node.buffer=b;node.loop=!!options.loop;
  gain.gain.value=(options.gain??sounds[name].gain);
  node.connect(gain);gain.connect(master);
  const voice={node,gain};
  voices.set(name,voice);
  node.onended=()=>{if(voices.get(name)===voice)voices.delete(name);try{node.disconnect();gain.disconnect()}catch{}};
  node.start(0,instantSounds.has(name)?(onsetOffsets.get(name)||0):0);
 }catch(e){console.warn('[DCD scene audio] play:',name,e)}
 finally{if(options.loop)loopLoads.delete(name)}
}
function scene(page){
 if(page===activePage){
  // Re-rendering the rotate guide or workbench must not silence audio.
  if(workbenchPages.has(page)&&enabled&&!voices.has('workbench-ambience')&&!loopLoads.has('workbench-ambience'))
   play('workbench-ambience',{loop:true});
  return;
 }
 const previous=activePage;activePage=page;
 if(['09','10','11','12','13','14','14done'].includes(page)&&enabled){
  if(page==='11')preload('prescription-typing');
  for(const name of instantSounds)preload(name);
 }
 if(workbenchPages.has(page)){
  if(!workbenchPages.has(previous))play('workbench-ambience',{loop:true});
 }else if(workbenchPages.has(previous))stop('workbench-ambience',.5);
 // Typing is driven by the actual CSS reveal phases in app.js, including
 // the silent gap between the prompt and the first checkbox row.
 if(page!=='12'&&page!=='13')stop('prescription-typing',.08);
 if(page==='AR9'){
  play('final-message',{loop:false});
 }else if(page!=='AR10'&&previous==='AR9'||(page!=='AR9'&&page!=='AR10'&&previous==='AR10')){
  stop('final-message',.6);
 }
 if(page==='reel0'||page==='01')stop('mask-all-cleared');
}
function preload(name){if(!AudioCtx||!sounds[name])return;return buffer(name).catch(()=>{})}
window.DCD_AUDIO.onRunning(()=>{for(const [name,request] of [...recovery]){recovery.delete(name);if(request.page===activePage)play(name,request.options);}});
window.DCD_SCENE_AUDIO={unlock,play,stop,scene,preload,status:()=>({page:activePage,unlocked:enabled,playing:[...voices.keys()],ready:[...decoded.keys()]})};
})();