/* DCD AR high-quality on-device portrait matting.
   Longpipe replaces only the visible portrait composite. The untouched camera
   continues to feed MediaPipe face/hand tracking. If this experimental SDK,
   device GPU, weights or playback fails, the existing SelfieSegmenter remains.
   No camera frames are uploaded to the project servers. */
(() => {
  'use strict';
  const LONGPIPE_URL='https://cdn.jsdelivr.net/npm/longpipe@0.0.14/+esm';
  const instances=new WeakMap();
  function create(root,stream){
    if(!root||!stream)return null;
    const video=root.querySelector('.ar-matting-video');
    if(!video)return null;
    let stopped=false,pipe=null,ready=false;
    const state={ready:false,starting:true,stop,video,mode:'fallback'};
    instances.set(root,state);
    async function begin(){
      try{
        const {EffectsPipeline}=await import(LONGPIPE_URL);
        if(stopped)return;
        pipe=new EffectsPipeline(stream,{
          background:{color:'#e5edf6'},
          preset:'auto'
        });
        await pipe.ready;
        if(stopped)return;
        if(!pipe.stream||!pipe.stream.getVideoTracks().length)throw Error('No processed video track');
        video.srcObject=pipe.stream;
        await video.play();
        if(stopped)return;
        // Wait until an actual processed frame is available before swapping
        // layers, otherwise a black flash would replace the previous fallback.
        if(video.readyState<2){
          await new Promise((resolve,reject)=>{
            let timeout=setTimeout(()=>reject(Error('Matting first-frame timeout')),4000);
            const onReady=()=>{clearTimeout(timeout);video.removeEventListener('loadeddata',onReady);resolve();};
            video.addEventListener('loadeddata',onReady,{once:true});
          });
        }
        if(stopped)return;
        root.classList.add('ar-matting-active');
        state.ready=true;state.mode='longpipe';
        console.info('[DCD AR] Longpipe portrait matting active');
      }catch(error){
        if(!stopped)console.warn('[DCD AR] Using MediaPipe portrait fallback:',error);
        state.mode='fallback';
        stop();
      }finally{state.starting=false;}
    }
    function stop(){
      if(stopped)return;
      stopped=true;
      root.classList.remove('ar-matting-active');
      video.pause();video.srcObject=null;
      try{pipe?.destroy();}catch(e){console.warn('[DCD AR] Matting cleanup:',e);}
      pipe=null;
    }
    begin();
    return state;
  }
  window.DCD_AR_MATTING={create};
})();