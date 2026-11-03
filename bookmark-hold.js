(function(){
const installed=new WeakSet();
function install(){if(!['Bookmarks','Overview'].includes(page))return;
for(const body of document.querySelectorAll('#content .glow-bookmark-grid')){
const rows=[...body.children].filter(r=>r.dataset.bookmarkId);
function commit(id){const ids=[...body.children].map(r=>r.dataset.bookmarkId).filter(Boolean),set=new Set(ids),map=new Map(state.bookmarks.map(b=>[b.id,b]));let i=0;state.bookmarks=state.bookmarks.map(b=>set.has(b.id)?map.get(ids[i++]):b);save();render();[...document.querySelectorAll('[data-bookmark-id]')].find(r=>r.dataset.bookmarkId===id)?.focus();notify('Bookmark order saved')}
 rows.forEach(row=>{if(installed.has(row))return;installed.add(row);row.querySelectorAll('a,img').forEach(el=>el.draggable=false);const id=row.dataset.bookmarkId;row.tabIndex=0;row.setAttribute('aria-label',(row.querySelector('strong')?.textContent||'Bookmark')+'. Hold to move; use Up or Down arrow keys to reorder.');
 row.onkeydown=e=>{if(e.target!==row||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const target=e.key==='ArrowUp'?row.previousElementSibling:row.nextElementSibling;if(!target?.dataset.bookmarkId)return;body.insertBefore(row,e.key==='ArrowUp'?target:target.nextSibling);commit(id)};
 const startDrag=e=>{if(e.button!==0)return;e.preventDefault();const original=[...body.children];let changed=false;row.dataset.suppressLink='yes';row.classList.add('bookmark-moving');
 const move=ev=>{if(ev.pointerId!==e.pointerId||!row.isConnected)return;const target=[...body.children].find(r=>r!==row&&r.dataset.bookmarkId&&ev.clientY>=r.getBoundingClientRect().top&&ev.clientY<=r.getBoundingClientRect().bottom&&ev.clientX>=r.getBoundingClientRect().left&&ev.clientX<=r.getBoundingClientRect().right);if(target){const rect=target.getBoundingClientRect(),before=Math.abs(row.getBoundingClientRect().top-rect.top)<5?ev.clientX<rect.left+rect.width/2:ev.clientY<rect.top+rect.height/2;const prior=[...body.children];body.insertBefore(row,before?target:target.nextSibling);changed=changed||prior.some((r,i)=>body.children[i]!==r)}if(ev.clientY<100)scrollBy(0,-20);else if(ev.clientY>innerHeight-100)scrollBy(0,20)};
 function finish(ev,cancel=false){if(ev&&ev.pointerId!==e.pointerId)return;document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',cancelled);document.removeEventListener('keydown',escape);row.classList.remove('bookmark-moving');setTimeout(()=>delete row.dataset.suppressLink,100);document.removeEventListener('touchmove',touchMove);document.removeEventListener('touchend',touchEnd);document.removeEventListener('touchcancel',touchCancel);if(!row.isConnected)return;if(cancel)original.forEach(r=>body.append(r));else if(changed)commit(id)}
 const touchMove=ev=>{if(!ev.touches.length)return;ev.preventDefault();move({clientX:ev.touches[0].clientX,clientY:ev.touches[0].clientY})},touchEnd=()=>finish(null),touchCancel=()=>finish(null,true);if(e.pointerId===undefined){document.addEventListener('touchmove',touchMove,{passive:false});document.addEventListener('touchend',touchEnd);document.addEventListener('touchcancel',touchCancel)}
 const up=ev=>finish(ev),cancelled=ev=>finish(ev,true),escape=ev=>{if(ev.key==='Escape'){ev.preventDefault();finish(null,true)}};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',cancelled);document.addEventListener('keydown',escape);
 };
 let hold=0,pending=false,startX=0,startY=0;
 const interactive=target=>target.closest('button,input,label,select,textarea');
 function clearHold(){clearTimeout(hold);hold=0;pending=false}
 row.addEventListener('pointerdown',ev=>{if(ev.pointerType==='touch'||ev.button!==0||interactive(ev.target))return;ev.preventDefault();clearHold();pending=true;row._dragStart=ev;startX=ev.clientX;startY=ev.clientY;hold=setTimeout(()=>{pending=false;if(row.isConnected)startDrag(ev)},400)});
 row.addEventListener('pointermove',ev=>{if(pending&&Math.hypot(ev.clientX-startX,ev.clientY-startY)>5){const down=row._dragStart;clearHold();if(row.isConnected)startDrag(down)}});
 row.addEventListener('pointerup',clearHold);row.addEventListener('pointercancel',clearHold);
 row.addEventListener('touchstart',ev=>{if(ev.touches.length!==1){clearHold();return}if(interactive(ev.target))return;clearHold();const t=ev.touches[0];startX=t.clientX;startY=t.clientY;pending=true;hold=setTimeout(()=>{pending=false;if(row.isConnected)startDrag({button:0,preventDefault(){}})},400)},{passive:true});
 row.addEventListener('touchmove',ev=>{if(pending&&ev.touches.length&&Math.hypot(ev.touches[0].clientX-startX,ev.touches[0].clientY-startY)>8)clearHold()},{passive:true});
 row.addEventListener('touchend',clearHold);row.addEventListener('touchcancel',clearHold);
 row.addEventListener('contextmenu',ev=>{if(!interactive(ev.target))ev.preventDefault()});
 });
}
}
const previous=render;render=function(){previous();install()};
document.addEventListener('click',e=>{if(e.target.closest('[data-suppress-link="yes"]')){e.preventDefault();e.stopImmediatePropagation()}},true);
const observer=new MutationObserver(()=>{if(['Bookmarks','Overview'].includes(page))install()});observer.observe(document.querySelector('#content'),{childList:true,subtree:true});
install();
})();