export const collection=[
 {id:'first',name:'First Spark',detail:'Celebrate your first little win.',art:'first',color:'gold',goal:1},
 {id:'five',name:'Five Bright Moments',detail:'Celebrate five little wins.',art:'five',color:'pink',goal:5},
 {id:'ten',name:'Pocket of Sunshine',detail:'Celebrate ten little wins.',art:'sunshine',color:'amber',goal:10},
 {id:'variety',name:'Curious Explorer',detail:'Try three different quests.',art:'variety',color:'blue'},
 {id:'creative',name:'Your Own Path',detail:'Celebrate a quest you created.',art:'creative',color:'purple'},
 {id:'growth',name:'Growing Strong',detail:'Celebrate 25 little wins.',art:'growth',color:'green',goal:25},
 {id:'art',name:'Creative Spark',detail:'Complete a creative quest.',art:'art',color:'coral'},
 {id:'pause',name:'Gentle Pause',detail:'Complete a break or relaxation quest.',art:'pause',color:'lavender'},
 {id:'butterfly',name:'Butterfly Steps',detail:'Celebrate 50 little wins.',art:'butterfly',color:'teal',goal:50},
 {id:'hundred',name:'A Hundred Little Wins',detail:'Celebrate 100 little wins.',art:'hundred',color:'rose-gold',goal:100},
 {id:'two',name:'Double Delight',detail:'Celebrate 2 little wins.',art:'first',color:'gold',goal:2,icon:'💗'},
 {id:'three',name:'Tiny Bouquet',detail:'Celebrate 3 little wins.',art:'first',color:'gold',goal:3,icon:'🌸'},
 {id:'fifteen',name:'Sweet Fifteen',detail:'Celebrate 15 little wins.',art:'first',color:'gold',goal:15,icon:'🍬'},
 {id:'twenty',name:'Twinkling Twenty',detail:'Celebrate 20 little wins.',art:'first',color:'gold',goal:20,icon:'✨'},
 {id:'forty',name:'Flower Trail',detail:'Celebrate 40 little wins.',art:'first',color:'gold',goal:40,icon:'🌷'},
 {id:'seventy-five',name:'Candy Celebration',detail:'Celebrate 75 little wins.',art:'first',color:'gold',goal:75,icon:'🍭'},
 {id:'one-fifty',name:'Heart of Gold',detail:'Celebrate 150 little wins.',art:'first',color:'gold',goal:150,icon:'💛'},
 {id:'two-hundred',name:'Garden of Wins',detail:'Celebrate 200 little wins.',art:'first',color:'gold',goal:200,icon:'🌻'},
 {id:'two-fifty',name:'Starlight Collection',detail:'Celebrate 250 little wins.',art:'first',color:'gold',goal:250,icon:'🌟'},
 {id:'five-hundred',name:'Treasury of Joy',detail:'Celebrate 500 little wins.',art:'first',color:'gold',goal:500,icon:'💝'}
];
export const kinds=['general','creative','rest'];
export function facts(model){const previous=model.achievementTracking||{},ids=new Set((Array.isArray(previous.questIds)?previous.questIds:[]).filter(v=>typeof v==='string'&&v));let creative=previous.creative===true,rest=previous.rest===true,custom=previous.custom===true;
 for(const win of Array.isArray(model.wins)?model.wins:[]){if(!win||typeof win.questId!=='string'||!win.questId)continue;ids.add(win.questId);custom ||= win.authored===true||win.questId.startsWith('custom-');
 // Old records stored only a quest ID and title. Only the known original quest/title combinations count; never infer from keywords in custom text.
 creative ||= win.kind==='creative'||(!win.kind&&win.questId==='create'&&win.title==='Make a little something');
 rest ||= win.kind==='rest'||(!win.kind&&win.questId==='break'&&win.title==='A moment away');
 }
 return {questIds:[...ids],creative,rest,custom};
}
export function badges(model){const f=facts(model),awards=Array.isArray(model.awards)?model.awards:[];return collection.map(b=>({...b,src:new URL('../assets/medals/'+b.art+'.svg',import.meta.url).href,earned:awards.includes(b.id)||(b.goal?model.stars>=b.goal:b.id==='variety'?f.questIds.length>=3:b.id==='creative'?f.custom:b.id==='art'?f.creative:b.id==='pause'?f.rest:false)}))}
export function remember(model){model.achievementTracking=facts(model);model.awards=[...new Set([...(Array.isArray(model.awards)?model.awards:[]),...badges(model).filter(b=>b.earned).map(b=>b.id)])];}
const medalColors=['#e9ad38','#e686b1','#8cb8eb','#b59be2','#7bbda0','#e8a477','#78bec2','#dc8ea7','#aebc66','#c48ac7','#f0b975','#86b2da','#da8f83','#8bc3b6','#b2a0db','#d1b15f','#78b4be','#d896be','#94bd7a','#d3a27d'];
const medalIcons=['✨','⭐','☀️','🧭','🌠','🌱','🎨','☁️','🦋','💖'];
export function renderMedals(root,model,doc,onToggle,expanded=false){const section=doc.createElement('section');section.className='little-wins-collection';const all=badges(model),heading=doc.createElement('h3');heading.textContent='Little Wins badges · '+all.filter(b=>b.earned).length+'/20';section.append(heading);const grid=doc.createElement('div');grid.className='achievement-grid';grid.id='littleWinsMedalGrid';all.forEach((badge,i)=>{const card=doc.createElement('article');card.className='achievement-tile '+(badge.earned?'earned':'locked');card.hidden=!expanded&&i>=5;const medal=doc.createElement('div');medal.className='achievement-medal';medal.style.setProperty('--medal',medalColors[i]);medal.setAttribute('aria-hidden','true');medal.textContent=badge.icon||medalIcons[i];const title=doc.createElement('h3');title.textContent=badge.name;const text=doc.createElement('p');text.textContent=badge.detail;const status=doc.createElement('small');status.textContent=badge.earned?'Earned':'🔒 Locked';card.append(medal,title,text,status);grid.append(card)});section.append(grid);const toggle=doc.createElement('button');toggle.type='button';toggle.className='medal-collection-toggle';toggle.textContent=expanded?'Show fewer badges':'Show all 20 badges';toggle.setAttribute('aria-expanded',String(expanded));toggle.onclick=onToggle;section.append(toggle);root.append(section);return toggle}
