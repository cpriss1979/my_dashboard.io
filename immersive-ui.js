(function () {
  'use strict';

  const sounds = [
    ['white','White noise'], ['fan','Fan'], ['rain','Rain'],
    ['storm','Thunderstorm'], ['ocean','Ocean']
  ];
  const soundPages = new Set(['Journal','Bible','Time for You','Wellness Plan','Focus timer']);
  let context, player, panel, activePage, playRequest=0;
  let selected='rain', volume=.22;

  function syncControls() {
    if(!panel?.isConnected)return;
    panel.querySelector('select').value=selected;
    panel.querySelector('input').value=volume;
    const toggle=panel.querySelector('button');
    toggle.textContent=player?'Stop sound':'Play sound';
    toggle.setAttribute('aria-pressed',String(Boolean(player)));
  }

  function stop() {
    playRequest++;
    if(player){
      for(const source of player.sources)source.stop();
      for(const node of player.nodes)node.disconnect();
      player=undefined;
    }
    syncControls();
  }

  function buildSound(kind) {
    const noise=context.createBufferSource();
    const buffer=context.createBuffer(1,context.sampleRate*5,context.sampleRate);
    const samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.72;
    noise.buffer=buffer;noise.loop=true;
    const master=context.createGain(),texture=context.createGain();
    master.gain.value=volume;
    texture.gain.value=kind==='white'?.33:kind==='rain'?.7:.56;
    master.connect(context.destination);texture.connect(master);
    const sources=[noise],nodes=[noise,master,texture];
    function filter(source,type,frequency,destination){
      const node=context.createBiquadFilter();node.type=type;node.frequency.value=frequency;
      source.connect(node);node.connect(destination);nodes.push(node);
    }
    function modulate(target,frequency,depth){
      const osc=context.createOscillator(),gain=context.createGain();
      osc.frequency.value=frequency;gain.gain.value=depth;osc.connect(gain);gain.connect(target);
      sources.push(osc);nodes.push(osc,gain);
    }
    if(kind==='white')noise.connect(texture);
    if(kind==='fan'){filter(noise,'lowpass',420,texture);modulate(texture.gain,22,.045);}
    if(kind==='rain'||kind==='storm')filter(noise,'highpass',kind==='rain'?950:630,texture);
    if(kind==='ocean'){filter(noise,'lowpass',620,texture);modulate(texture.gain,.12,.43);}
    if(kind==='storm'){
      const rumble=context.createGain();rumble.gain.value=.20;
      rumble.connect(master);nodes.push(rumble);
      filter(noise,'lowpass',85,rumble);modulate(rumble.gain,.09,.16);
    }
    for(const source of sources)source.start();
    return {sources,nodes,master};
  }

  async function play() {
    const request=++playRequest;
    const route=page;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw Error('Audio is unavailable in this browser.');
      context??=new Audio();
      await context.resume();
      if(request!==playRequest||page!==route||document.hidden)return;
      player=buildSound(selected);activePage=page;syncControls();
    }catch(error){
      if(request===playRequest&&panel?.isConnected)panel.querySelector('small').textContent=error.message;
    }
  }

  function addSoundControls(){
    if(player&&page!==activePage)stop();
    if(!soundPages.has(page))return;
    const content=document.getElementById('content');
    if(!content||content.querySelector('.ambient-sound-controls'))return;
    panel=document.createElement('div');panel.className='ambient-sound-controls';
    const choice=document.createElement('select');
    choice.setAttribute('aria-label','Relaxing sound');
    sounds.forEach(([id,label])=>choice.add(new Option(label,id)));
    choice.onchange=()=>{selected=choice.value;if(player){stop();void play();}};
    const toggle=document.createElement('button');toggle.type='button';toggle.className='secondary';
    toggle.onclick=()=>{panel.querySelector('small').textContent='';if(player)stop();else void play();};
    const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=.7;slider.step=.01;
    slider.setAttribute('aria-label','Sound volume');
    slider.oninput=()=>{volume=Number(slider.value);if(player)player.master.gain.value=volume;};
    const status=document.createElement('small');status.setAttribute('role','status');
    panel.append(choice,toggle,slider,status);
    const anchor=page==='Bible'?content.querySelector('.bible-hero'):null;
    if(anchor)anchor.append(panel);else content.prepend(panel);
    syncControls();
  }

  function decorateGames(){
    if(page!=='Games')return;
    document.querySelectorAll('.glow-game-tile').forEach(tile=>{
      const id=tile.dataset.libraryId;
      tile.dataset.gameTint=String([...id].reduce((n,c)=>n+c.charCodeAt(0),0)%6);
      const span=tile.querySelector(':scope>span');
      if(span&&!span.querySelector('img')){
        const image=document.createElement('img');
        image.src='./assets/game-icons/'+id+'.svg';image.alt='';image.width=image.height=48;
        span.replaceChildren(image);
      }
    });
  }

  const previous=render;
  render=function(){
    previous();
    decorateGames();
    queueMicrotask(addSoundControls);
  };
  const content=document.getElementById('content');
  if(content)new MutationObserver(addSoundControls).observe(content,{childList:true});
  addEventListener('pagehide',stop);
  addEventListener('dashboard:account-changing',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  decorateGames();
  addSoundControls();
})();
