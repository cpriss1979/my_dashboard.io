const clone=b=>b.map(x=>[...x]);
export function solved(board){return board.every(b=>!b.length||b.length===4&&b.every(c=>c===b[0]))}
export function pour(board,from,to){
 if(from===to||!board[from]?.length||!board[to]||board[to].length===4)return null;
 const color=board[from].at(-1);if(board[to].length&&board[to].at(-1)!==color)return null;
 let n=0;for(let i=board[from].length-1;i>=0&&board[from][i]===color;i--)n++;
 n=Math.min(n,4-board[to].length);const next=clone(board);next[from].splice(-n);next[to].push(...Array(n).fill(color));return next;
}
function rng(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
export function generate(level=1,seed=level*7919){
 const random=rng(seed),colors=Math.min(4,3+Math.floor((level-1)/5));let board=Array.from({length:colors},(_,c)=>Array(4).fill(c)).concat([[],[]]),reverse=[];
 for(let step=0;step<24+Math.min(level,20)*3;step++){
  const choices=[];
  for(let a=0;a<board.length;a++){const source=board[a];if(!source.length)continue;const color=source.at(-1);let run=0;for(let k=source.length-1;k>=0&&source[k]===color;k--)run++;
   for(let b=0;b<board.length;b++)if(a!==b&&board[b].length<4&&board[b].at(-1)!==color)for(let count=1;count<=Math.min(run,4-board[b].length);count++){
    // Inverse pour must leave a matching top (or empty), and must not merge at the receiving top.
    if(source.length===count||source[source.length-count-1]===color)choices.push([a,b,count]);
   }
  }
  if(!choices.length)break;const [a,b,n]=choices[Math.floor(random()*choices.length)];board=clone(board);board[b].push(...board[a].splice(-n));reverse.push([b,a]);
 }
 if(solved(board))return generate(level,seed+1);
 return {board,solution:reverse.reverse(),level,seed};
}
const key=b=>b.map(x=>x.join('')).sort().join('|');
export function solve(board,limit=100000){
 if(solved(board))return [];
 const nodes=[{board:clone(board),parent:-1,move:null}],seen=new Set([key(board)]);
 for(let head=0;head<nodes.length&&nodes.length<limit;head++){
  const node=nodes[head];
  for(let a=0;a<board.length;a++)for(let b=0;b<board.length;b++){
   if(!node.board[a].length||a===b)continue;
   if(!node.board[b].length&&node.board[a].every(c=>c===node.board[a][0]))continue;
   const next=pour(node.board,a,b);if(!next)continue;const k=key(next);if(seen.has(k))continue;seen.add(k);
   const i=nodes.push({board:next,parent:head,move:[a,b]})-1;
   if(solved(next)){const path=[];for(let n=i;nodes[n].parent!==-1;n=nodes[n].parent)path.push(nodes[n].move);return path.reverse()}
  }
 }
 return null;
}
export function valid(board){if(!Array.isArray(board)||![5,6].includes(board.length)||board.some(b=>!Array.isArray(b)||b.length>4||b.some(c=>!Number.isInteger(c)||c<0||c>=board.length-2)))return false;const count=Array(board.length-2).fill(0);board.flat().forEach(c=>count[c]++);return count.every(n=>n===4)}
export function mount(root,ctx){
 const d=root.ownerDocument;let state=ctx.initial;
 if(!state||!valid(state.board)||!valid(state.initial)){const level=1,g=generate(level);state={level,board:g.board,initial:clone(g.board),history:[],moves:0}}
 state.history=Array.isArray(state.history)?state.history.filter(valid).slice(-100):[];state.moves=Math.max(0,Number(state.moves)||0);state.level=Math.max(1,Math.floor(Number(state.level)||1));
 let selected=-1,hint=null,message='',paused=false;
 const names=['Cyan','Purple','Pink','Gold'],colors=['#40cadd','#9b78ed','#ef8cc0','#ecc367'];
 function save(){ctx.persist(state)}
 function btn(text,fn){const b=d.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;return b}
 function render(){const focused=d.activeElement?.dataset.bottleIndex;root.replaceChildren();const tools=d.createElement('div');tools.className='activity-toolbar';tools.append(btn(paused?'Resume':'Pause',()=>{paused=!paused;render()}),btn('Undo',()=>{if(paused||!state.history.length)return;state.board=state.history.pop();state.moves=Math.max(0,state.moves-1);hint=null;message='Move undone.';save();render()}),btn('Hint',()=>{if(paused)return;const path=solve(state.board);hint=path?.[0]||null;message=hint?'Try bottle '+(hint[0]+1)+' → '+(hint[1]+1)+'.':solved(state.board)?'All colors sorted!':'Try Undo or Restart to return to a clearer route.';render()}),btn('Restart',restart));tools.children[1].disabled=paused||!state.history.length;tools.children[2].disabled=paused||solved(state.board);root.append(tools);
  const status=d.createElement('p');status.className='activity-status';status.setAttribute('role','status');status.textContent='Level '+state.level+' · '+state.moves+' moves'+(paused?' · Paused':solved(state.board)?' · Beautifully sorted!':'');root.append(status);
  const field=d.createElement('div');field.className='water-bottles';field.setAttribute('aria-label','Color bottles');
  state.board.forEach((b,i)=>{const bottle=btn('',()=>{if(paused||solved(state.board))return;if(selected===-1){selected=i;message='Choose a matching or empty bottle.'}else{const next=pour(state.board,selected,i);if(next){state.history.push(clone(state.board));state.history=state.history.slice(-100);state.board=next;state.moves++;hint=null;message=solved(next)?'All colors sorted. Ready for another level?':'Nice pour.';save()}else message='Pour onto the same color or into an empty bottle.';selected=-1}render()});bottle.dataset.bottleIndex=String(i);bottle.className='water-bottle'+(selected===i?' selected':'')+(hint?.includes(i)?' hinted':'');bottle.disabled=paused;bottle.setAttribute('aria-label','Bottle '+(i+1)+': '+(b.length?b.map(c=>names[c]).join(', ')+' from bottom to top':'empty'));bottle.setAttribute('aria-pressed',String(selected===i));
   const glass=d.createElement('span');glass.className='water-glass';for(let k=0;k<4;k++){const layer=d.createElement('span');layer.className='water-layer';if(b[k]!==undefined){layer.style.background=colors[b[k]];layer.textContent=names[b[k]][0]}glass.append(layer)}const label=d.createElement('span');label.className='water-label';label.textContent=i+1;bottle.append(glass,label);field.append(bottle)});root.append(field);
  if(message){const p=d.createElement('p');p.textContent=message;p.className='activity-message';p.setAttribute('aria-live','polite');root.append(p)}
  if(solved(state.board))root.append(btn('Next level',()=>{const g=generate(state.level+1);state={level:g.level,board:g.board,initial:clone(g.board),history:[],moves:0};selected=-1;hint=null;message='A fresh set of colors.';save();render()}));
  const help=d.createElement('details');help.innerHTML='<summary>How to play</summary><p>Select a bottle, then a matching or empty bottle. Only the top matching color moves, and bottles hold four layers. Sort each color into a full bottle. Tab and Enter work on every bottle. Undo, hints, and restart are always available.</p>';root.append(help);if(focused!==undefined)root.querySelectorAll('.water-bottle')[Number(focused)]?.focus();
 }
 function restart(){state.board=clone(state.initial);state.history=[];state.moves=0;selected=-1;hint=null;message='Same level, fresh start.';save();render()}
 render();return()=>{};
}
