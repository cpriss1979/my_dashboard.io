export function button(doc,text,fn){const b=doc.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;return b}
export function audioTools(root){
 const w=root.ownerDocument.defaultView;let audio=null,enabled=false,volume=.25;
 return {get enabled(){return enabled},setVolume(v){volume=Math.max(0,Math.min(1,v))},async toggle(){if(enabled){enabled=false;await audio?.suspend();return false}const Audio=w.AudioContext||w.webkitAudioContext;if(!Audio)return false;try{audio??=new Audio();await audio.resume();enabled=audio.state==='running';return enabled}catch{return false}},tone(frequency=330){if(!enabled||!audio||volume<=0)return;const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume*.035,now+.04);gain.gain.exponentialRampToValueAtTime(.0001,now+.8);osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+.85)},stop(){enabled=false;audio?.close().catch(()=>{});audio=null}};
}
export function controls(root,state,handlers){
 const d=root.ownerDocument,bar=d.createElement('div');bar.className='activity-toolbar relax-toolbar';
 const pause=button(d,'Pause',()=>{state.paused=!state.paused;pause.textContent=state.paused?'Resume':'Pause';handlers.pause()});
 const motion=d.createElement('label');motion.className='activity-check';const check=d.createElement('input');check.type='checkbox';check.checked=state.reduced;check.onchange=()=>{state.reduced=check.checked;handlers.motion()};motion.append(check,d.createTextNode('Reduced motion'));
 const sound=button(d,'Sound off',async()=>{const enabled=await handlers.sound();sound.textContent=enabled?'Sound on':'Sound off';sound.setAttribute('aria-pressed',String(enabled))});sound.setAttribute('aria-pressed','false');
 const volume=d.createElement('label');volume.textContent='Volume';const input=d.createElement('input');input.type='range';input.min='0';input.max='100';input.value=Math.round(state.volume*100);input.oninput=()=>{state.volume=Number(input.value)/100;handlers.volume()};volume.append(input);
 bar.append(pause,button(d,'Restart',handlers.restart),motion,sound,volume);root.append(bar);return {bar,pause,sound};
}
export function canvas(root,label){const d=root.ownerDocument,c=d.createElement('canvas');c.width=720;c.height=440;c.className='relax-canvas';c.tabIndex=0;c.setAttribute('aria-label',label);c.setAttribute('role','application');root.append(c);return c}
export function point(canvas,event){const rect=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/(rect.width||720))),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/(rect.height||440)))}}
export function help(root,text){const d=root.ownerDocument,details=d.createElement('details');const summary=d.createElement('summary');summary.textContent='How to play';const p=d.createElement('p');p.textContent=text;details.append(summary,p);root.append(details)}
export function rounded(n){return Math.round(n*1000)/1000}
