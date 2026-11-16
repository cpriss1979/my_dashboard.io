/* Visible navigation labels only; existing routes and saved records stay intact. */
(function(){
 const home=['Overview','Home','home'];
 const groups=[
  ['Planner',[['Calendar','Calendar','calendar'],['Daily priorities','Tasks','tasks'],['Projects','Projects','projects'],['Quick notes','Notes','notes']]],
  ['Household',[['Chores','Chores','chores'],['Shopping List','Shopping List','tasks']]],
  ['Kitchen',[['Meal Planner','Meal Planner','calendar'],['Recipes','Recipes','bible']]],
  ['Travel',[['Packing Checklist','Packing Checklist','tasks']]],
  ['Money',[['Finances','Finances','finances'],['Amortization','Amortization','calendar']]],
  ['Personal',[['Wish List','Wish List','bookmarks'],['Collections','Collections','projects'],['Journal','Journal','journal'],['Habit Tracker','Habit Tracker','habit'],['Bible','Bible','bible'],['Time for You','Little Joys','sun'],['Games','Games','games'],['Badges','Badges','badges']]],
  ['Links',[['Bookmarks','Bookmarks','bookmarks']]]
 ];
 const entries=groups.flatMap(([,links])=>links);
 const previousNames={Planner:'Plan & organize',Household:'Lists',Personal:'Personal Time',Links:'Quick links'};
 let openGroup=null,lastPage,lastState;
 const paths={timer:'M10 2h4M12 2v3M18 6l2-2M12 9v4l2 2M20 13a8 8 0 1 1-16 0 8 8 0 1 1 16 0',chores:'m14 3 7 7-2 2-7-7zM12 5l-3 8m10-1-8 7-7-7 5 1M4 12l-1 4 5 5 3-2M5 17l2-2',sharing:'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m3-4a4 4 0 0 1 0 8',link:'M10 13a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-2 2m2 6a4 4 0 0 0-6 0l-4 4a4 4 0 0 0 6 6l2-2',bible:'M3 4c4-1 7 0 9 2 2-2 5-3 9-2v16c-4-1-7 0-9 2-2-2-5-3-9-2zM12 6v16',home:'M3 10 12 3l9 7v11h-6v-7H9v7H3z',calendar:'M4 5h16v16H4zM8 2v6M16 2v6M4 10h16',tasks:'m3 6 2 2 4-4M12 6h9M3 13l2 2 4-4M12 13h9M4 21h17',projects:'M3 6h7l2 3h9v12H3z',notes:'M5 3h14v18H5zM8 8h8M8 12h8M8 16h5',bookmarks:'M6 3h12v18l-6-4-6 4z',finances:'M3 5h18v15H3zM3 9h18M16 14h2',sun:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2',habit:'M20 7a9 9 0 1 1-5-4M8 11l3 3 9-10',journal:'M4 3h15v18H4zM8 3v18M11 7h5M11 11h5',games:'M7 8h10c4 0 6 12 2 12l-4-4H9l-4 4C1 20 3 8 7 8zM6 11v4M4 13h4M16 12h.1M18 14h.1',badges:'m12 2 3 5 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1z'};
 function icon(name){const span=document.createElement('span');span.className='app-nav-icon';span.setAttribute('aria-hidden','true');span.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="'+paths[name]+'"/></svg>';return span}
 function outline(node,label,symbol){
  const text=document.createElement('span');text.className='app-nav-label';text.textContent=label;
  node.replaceChildren(icon(symbol),text);
 }
 window.DashboardNavIcon=outline;
 function hidden(target){return window.DashboardNavigation?.isHidden(target)===true}
 function groupLabel(key){
  const names=state.sidebarPreferences?.groups||{};
  return names[key]||names[previousNames[key]]||key;
 }
 function pageLink([target,label,symbol],pin=false){
  const button=document.createElement('button');
  button.type='button';button.className='app-nav-link';
  button.dataset.page=target;
  if(pin)button.dataset.pinnedPage='';
  if(target==='Bible')button.dataset.bibleNav='';
  outline(button,label,symbol);
  button.classList.toggle('active',target===page);
  if(target===page)button.setAttribute('aria-current','page');
  button.onclick=()=>{go(target);window.scrollTo(0,0)};
  if(target==='Daily priorities'){
   const count=state.priorities.filter(item=>!item.done&&item.date===localDate(new Date())).length;
   if(count){
    const badge=document.createElement('span');badge.className='app-nav-count';badge.textContent=count;
    badge.setAttribute('aria-label',count+' tasks due today');button.append(badge);
   }
  }
  return button;
 }
 function organize(){
  const sidebar=document.querySelector('body > aside nav');
  if(!sidebar)return;
  const activeGroup=groups.find(([,links])=>links.some(([target])=>target===page))?.[0]||null;
  if(lastPage!==page||lastState!==state)openGroup=activeGroup;
  lastPage=page;lastState=state;
  sidebar.replaceChildren(pageLink(home));
  for(const key of (state.sidebarPreferences?.pins||[]).slice(0,3)){
   const entry=entries.find(([target])=>target===key);
   if(entry&&!hidden(key))sidebar.append(pageLink(entry,true));
  }
  for(const [key,links] of groups){
   const section=document.createElement('details');section.className='app-nav-group';section.dataset.householdGroup=key;
   section.open=key===openGroup;
   const heading=document.createElement('summary');heading.textContent=groupLabel(key);
   heading.onclick=event=>{
    event.preventDefault();
    openGroup=section.open?null:key;
    for(const group of sidebar.querySelectorAll('details[data-household-group]'))group.open=group===section&&openGroup===key;
   };
   const list=document.createElement('div');
   for(const entry of links){
    const link=pageLink(entry);
    if(hidden(entry[0])){link.hidden=true;link.style.setProperty('display','none','important')}
    list.append(link);
   }
   const shortcuts=key==='Links'&&!hidden('Quick links')?(window.DashboardQuickLinks?.rows()||[]):[];
   list.append(...shortcuts);
   section.hidden=links.every(([target])=>hidden(target))&&!shortcuts.length;
   section.append(heading,list);sidebar.append(section);
  }
  if(page==='Daily priorities'){
   const title=document.querySelector('#content .cardhead h2');
   if(title)title.textContent='Tasks';
  }
 }
 window.DashboardSidebar={organize,groups,groupLabel};
})();
