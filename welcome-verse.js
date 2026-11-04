/* A local, short NKJV verse collection. No network request is needed at startup. */
(function(){
 const verses=[
 {ref:'Psalm 56:3',text:'Whenever I am afraid, I will trust in You.'},
 {ref:'Philippians 4:13',text:'I can do all things through Christ who strengthens me.'},
 {ref:'1 Thessalonians 5:16',text:'Rejoice always,'},
 {ref:'Psalm 118:24',text:'This is the day the LORD has made; We will rejoice and be glad in it.'},
 {ref:'Proverbs 17:22',text:'A merry heart does good, like medicine, But a broken spirit dries the bones.'},
 {ref:'1 Peter 5:7',text:'casting all your care upon Him, for He cares for you.'}];let shown=false;
 function show(){if(shown||document.hidden||document.body.classList.contains('fb-account-locked')||document.querySelector('dialog[open]'))return;shown=true;const last=state.welcomeVerse?.ref,pool=verses.filter(v=>v.ref!==last),verse=pool[Math.floor(Math.random()*pool.length)];state.welcomeVerse={ref:verse.ref,shownAt:new Date().toISOString()};save();const d=document.createElement('dialog');d.id='welcomeVerse';d.setAttribute('aria-labelledby','welcomeVerseTitle');const small=document.createElement('small');small.textContent='A MOMENT OF ENCOURAGEMENT';const title=document.createElement('h2');title.id='welcomeVerseTitle';title.textContent='Welcome to a little peace';const quote=document.createElement('blockquote');quote.textContent=verse.text;const reference=document.createElement('p');reference.className='welcome-reference';reference.textContent=verse.ref+' · NKJV';const link=document.createElement('a');link.href='https://www.biblegateway.com/passage/?search='+encodeURIComponent(verse.ref)+'&version=NKJV';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Read in context ↗';const copyright=document.createElement('small');copyright.className='welcome-copyright';copyright.textContent='NKJV © 1982 by Thomas Nelson. All rights reserved.';const close=document.createElement('button');close.type='button';close.textContent='Continue to my day';close.onclick=()=>d.close();d.append(small,title,quote,reference,link,copyright,close);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();close.focus();clearInterval(timer)}
 const timer=setInterval(show,1000);document.addEventListener('visibilitychange',show);show();
})();
