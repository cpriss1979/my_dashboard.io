import {createSound} from './sound-engine.mjs?v=20261026-themes2';
import {button,canvas,point,help} from './relax-tools.mjs?v=20261026-themes2';
export {button,canvas,point,help};
export function kit(root,ctx,model){
 const d=root.ownerDocument,w=d.defaultView;model.reduced=typeof model.reduced==='boolean'?model.reduced:!!ctx.reducedMotion;model.volume=Math.max(0,Math.min(1,Number(model.volume??.55)));model.paused=false;
 const soundEngine=createSound(root);soundEngine.setVolume(model.volume);
 let alive=true,frame=0,last=0,step=()=>{},paint=()=>{},needed=()=>false,audio=null,sound=false,lastSound=-1e9;const off=[];
 function save(){const {paused,...copy}=model;ctx.persist(copy)}
 function listen(target,event,fn,options){target.addEventListener(event,fn,options);off.push(()=>target.removeEventListener(event,fn,options));return fn}
 function tick(time){frame=0;if(!alive||model.paused||d.hidden)return;const dt=last?Math.min(.05,(time-last)/1000):0;last=time;step(dt);paint();if(needed())frame=w.requestAnimationFrame(tick)}
 function wake(){w.cancelAnimationFrame(frame);frame=0;last=0;paint();if(alive&&!model.paused&&!d.hidden&&needed())frame=w.requestAnimationFrame(tick)}
 function run(update,draw,when){step=update;paint=draw;needed=when;wake()}
 function mute(){soundEngine.stop()}
 async function toggleSound(){return soundEngine.toggle()}
 function play(kind='soft'){soundEngine.setVolume(model.volume);soundEngine.tone(kind)}
 const bar=d.createElement('div');bar.className='activity-toolbar originals-toolbar';root.append(bar);
 const pause=button(d,'Pause',()=>{model.paused=!model.paused;pause.textContent=model.paused?'Resume':'Pause';save();wake()});
 const motion=d.createElement('label');motion.className='activity-check';const reduced=d.createElement('input');reduced.type='checkbox';reduced.checked=model.reduced;reduced.onchange=()=>{model.reduced=reduced.checked;save();wake()};motion.append(reduced,d.createTextNode('Reduced motion'));
 const audioNote=d.createElement('span');audioNote.className='sound-feedback';audioNote.setAttribute('role','status');const audioButton=button(d,'Sound off',async()=>{const on=await toggleSound();audioNote.textContent=on?'Confirmation chime played.':soundEngine.enabled?'':'Sound is off. Tap to enable; check device/media volume if you hear no chime.';audioButton.textContent=on?'Sound on':'Sound off';audioButton.setAttribute('aria-pressed',String(on));audioButton.title=on?'Sound enabled — use volume to adjust':'Tap to enable sound. If silent, check device/media volume and mute settings.'});audioButton.setAttribute('aria-pressed','false');
 const volume=d.createElement('label');volume.textContent='Volume';const range=d.createElement('input');range.type='range';range.min='0';range.max='100';range.value=model.volume*100;range.oninput=()=>{model.volume=Number(range.value)/100;soundEngine.setVolume(model.volume);save()};volume.append(range);bar.append(pause,motion,audioButton,volume,button(d,'Test sound',async()=>{if(!soundEngine.enabled){const on=await toggleSound();audioButton.textContent=on?'Sound on':'Sound off';audioButton.setAttribute('aria-pressed',String(on));audioNote.textContent=on?'Confirmation chime played.':'Sound could not start. Check device/media volume and try again.'}else soundEngine.tone('test',true)}),audioNote);
 listen(d,'visibilitychange',()=>{if(d.hidden){mute();audioButton.textContent='Sound off';audioButton.setAttribute('aria-pressed','false');save()}wake()});
 function dispose(){save();alive=false;w.cancelAnimationFrame(frame);mute();off.forEach(fn=>fn())}
 return {d,w,bar,model,save,listen,run,wake,play,pause,dispose,get alive(){return alive},get active(){return alive&&!model.paused&&!d.hidden}};
}
export function select(doc,label,choices,value,change){const l=doc.createElement('label');l.textContent=label;const s=doc.createElement('select');for(const [id,text] of choices){const o=doc.createElement('option');o.value=id;o.textContent=text;s.append(o)}s.value=value;s.onchange=()=>change(s.value);l.append(s);return l}
export function range(doc,label,min,max,value,change){const l=doc.createElement('label');l.textContent=label;const r=doc.createElement('input');r.type='range';r.min=min;r.max=max;r.value=value;r.oninput=()=>change(Number(r.value));l.append(r);return l}
