import {button,canvas,point,help} from './relax-tools.mjs';
export {button,canvas,point,help};
export function kit(root,ctx,model){
 const d=root.ownerDocument,w=d.defaultView;model.reduced=typeof model.reduced==='boolean'?model.reduced:!!ctx.reducedMotion;model.volume=Math.max(0,Math.min(1,Number(model.volume??.2)));model.paused=false;
 let alive=true,frame=0,last=0,step=()=>{},paint=()=>{},needed=()=>false,audio=null,sound=false,lastSound=-1e9;const off=[];
 function save(){const {paused,...copy}=model;ctx.persist(copy)}
 function listen(target,event,fn,options){target.addEventListener(event,fn,options);off.push(()=>target.removeEventListener(event,fn,options));return fn}
 function tick(time){frame=0;if(!alive||model.paused||d.hidden)return;const dt=last?Math.min(.05,(time-last)/1000):0;last=time;step(dt);paint();if(needed())frame=w.requestAnimationFrame(tick)}
 function wake(){w.cancelAnimationFrame(frame);frame=0;last=0;paint();if(alive&&!model.paused&&!d.hidden&&needed())frame=w.requestAnimationFrame(tick)}
 function run(update,draw,when){step=update;paint=draw;needed=when;wake()}
 async function mute(){sound=false;await audio?.close().catch(()=>{});audio=null}
 async function toggleSound(){if(sound){await mute();return false}const Audio=w.AudioContext||w.webkitAudioContext;if(!Audio)return false;try{audio=new Audio();await audio.resume();if(!alive){await mute();return false}sound=true;return true}catch{return false}}
 function play(kind='soft'){if(!sound||!audio||!model.volume||w.performance.now()-lastSound<100)return;lastSound=w.performance.now();const now=audio.currentTime,gain=audio.createGain();gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(model.volume*.025,now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+.14);gain.connect(audio.destination);const tone=audio.createOscillator();tone.type='sine';tone.frequency.setValueAtTime(kind==='pop'?190:kind==='water'?110:kind==='star'?520:260,now);tone.frequency.exponentialRampToValueAtTime(kind==='star'?660:90,now+.13);tone.connect(gain);tone.start(now);tone.stop(now+.16)}
 const bar=d.createElement('div');bar.className='activity-toolbar originals-toolbar';root.append(bar);
 const pause=button(d,'Pause',()=>{model.paused=!model.paused;pause.textContent=model.paused?'Resume':'Pause';save();wake()});
 const motion=d.createElement('label');motion.className='activity-check';const reduced=d.createElement('input');reduced.type='checkbox';reduced.checked=model.reduced;reduced.onchange=()=>{model.reduced=reduced.checked;save();wake()};motion.append(reduced,d.createTextNode('Reduced motion'));
 const audioButton=button(d,'Sound off',async()=>{const on=await toggleSound();audioButton.textContent=on?'Sound on':'Sound off';audioButton.setAttribute('aria-pressed',String(on))});audioButton.setAttribute('aria-pressed','false');
 const volume=d.createElement('label');volume.textContent='Volume';const range=d.createElement('input');range.type='range';range.min='0';range.max='100';range.value=model.volume*100;range.oninput=()=>{model.volume=Number(range.value)/100;save()};volume.append(range);bar.append(pause,motion,audioButton,volume);
 listen(d,'visibilitychange',()=>{if(d.hidden){mute();audioButton.textContent='Sound off';audioButton.setAttribute('aria-pressed','false');save()}wake()});
 function dispose(){save();alive=false;w.cancelAnimationFrame(frame);mute();off.forEach(fn=>fn())}
 return {d,w,bar,model,save,listen,run,wake,play,pause,dispose,get alive(){return alive},get active(){return alive&&!model.paused&&!d.hidden}};
}
export function select(doc,label,choices,value,change){const l=doc.createElement('label');l.textContent=label;const s=doc.createElement('select');for(const [id,text] of choices){const o=doc.createElement('option');o.value=id;o.textContent=text;s.append(o)}s.value=value;s.onchange=()=>change(s.value);l.append(s);return l}
export function range(doc,label,min,max,value,change){const l=doc.createElement('label');l.textContent=label;const r=doc.createElement('input');r.type='range';r.min=min;r.max=max;r.value=value;r.oninput=()=>change(Number(r.value));l.append(r);return l}
