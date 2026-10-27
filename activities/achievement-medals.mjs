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
 {id:'hundred',name:'A Hundred Little Wins',detail:'Celebrate 100 little wins.',art:'hundred',color:'rose-gold',goal:100}
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
export function renderMedals(root,model,doc,onToggle,expanded=false){const collectionSection=doc.createElement('section');collectionSection.className='medal-collection';const header=doc.createElement('div');header.className='medal-collection-heading';const h=doc.createElement('h3');h.textContent='Your achievement medals';const summary=doc.createElement('p'),all=badges(model);summary.textContent=all.filter(b=>b.earned).length+' of '+all.length+' earned · Yours to keep, at your own pace.';header.append(h,summary);collectionSection.append(header);const grid=doc.createElement('div');grid.className='medal-grid';grid.id='littleWinsMedalGrid';
 for(const [index,badge] of all.entries()){const card=doc.createElement('article');card.className='achievement-medal-card '+(badge.earned?'is-earned':'is-locked');card.dataset.medal=badge.id;card.dataset.color=badge.color;card.hidden=!expanded&&index>=5;const art=doc.createElement('div');art.className='achievement-medal-art';const img=doc.createElement('img');img.src=badge.src;img.alt='';img.width=100;img.height=116;img.draggable=false;art.append(img);const state=doc.createElement('span');state.className='achievement-medal-state';state.textContent=badge.earned?'✦ Earned':'Locked';const title=doc.createElement('h4');title.textContent=badge.name;const description=doc.createElement('p');description.textContent=badge.detail;card.append(art,state,title,description);grid.append(card)}collectionSection.append(grid);
 const toggle=doc.createElement('button');toggle.type='button';toggle.className='medal-collection-toggle';toggle.textContent=expanded?'Show fewer badges':'Show all badges (10)';toggle.setAttribute('aria-expanded',String(expanded));toggle.setAttribute('aria-controls',grid.id);toggle.onclick=onToggle;collectionSection.append(toggle);root.append(collectionSection);return toggle;
}
