/* Local-calendar-day styling only; saved entries and navigation remain unchanged. */
(function(){
 function resetSelection(){const now=new Date();selected=localDate(now);month=new Date(now.getFullYear(),now.getMonth(),1)}
 addEventListener('dashboard:account-changing',resetSelection);
 const previousGo=go;
 go=function(target){
  if(target==='Calendar'&&page!=='Calendar'){
   const date=new Date(selected+'T12:00:00');
   month=new Date(date.getFullYear(),date.getMonth(),1);
  }
  return previousGo(target);
 };
 const previousSelectDate=selectDate;
 selectDate=function(date){
  previousSelectDate(date);
  document.querySelector('#content button[data-calendar-date="'+date+'"]')?.focus({preventScroll:true});
 };
 const previousMoveMonth=moveMonth;
 moveMonth=function(offset){
  const arrow=document.activeElement?.getAttribute('aria-label');
  previousMoveMonth(offset);
  if(arrow==='Previous month'||arrow==='Next month'){
   document.querySelector('#content button[aria-label="'+arrow+'"]')?.focus({preventScroll:true});
  }
 };
 const originalCalendar=cal;let dayKey=localDate(new Date()),timer=0;
 function decorate(holder){const today=localDate(new Date());holder.querySelectorAll('button[onclick]').forEach(button=>{const match=button.getAttribute('onclick').match(/(?:selectDate|chooseYearCalendarDay)\('([0-9]{4}-[0-9]{2}-[0-9]{2})'\)/);if(!match)return;const date=match[1],hasPlans=calendarHasPlans(date);button.dataset.calendarDate=date;button.classList.add('overview-date');button.classList.toggle('overview-today',date===today);button.classList.toggle('overview-plan',hasPlans);button.type='button';button.setAttribute('aria-pressed',String(date===selected));button.setAttribute('aria-label',displayUSDate(date)+(hasPlans?' · Has plans':''));button.classList.toggle('overview-holiday',holidaysOnDate(date).length>0);if(holidaysOnDate(date).length)button.title=holidaysOnDate(date).map(h=>h.title).join(' · ');button.classList.remove('calendar-date-past','calendar-date-today','calendar-date-future');button.removeAttribute('aria-current');if(date===today)button.setAttribute('aria-current','date');const strong=button.querySelector('strong');if(strong)strong.classList.add('calendar-date-number');else{for(const node of [...button.childNodes])if(node.nodeType===Node.TEXT_NODE&&/^\s*\d{1,2}\s*$/.test(node.textContent)){const number=document.createElement('span');number.className='calendar-date-number';number.textContent=node.textContent;node.replaceWith(number)}}})}
 cal=function(){const holder=document.createElement('div');holder.innerHTML=originalCalendar();decorate(holder);const legend=holder.querySelector('.year-legend');if(legend)legend.textContent='Blue tile with white number: today · Blue number: plans · Select a date to open its month.';return holder.innerHTML};
 function cells(){holidayEntries();decorate(document.querySelector('#content')||document);document.querySelectorAll('[data-calendar-date]').forEach(button=>{const cell=button.closest('.glow-month-cell,.week-day');if(cell){cell.classList.toggle('calendar-past-cell',button.classList.contains('calendar-date-past'));cell.classList.toggle('calendar-today-cell',button.classList.contains('calendar-date-today'))}})}
 function holidayEntries(){
  const content=document.querySelector('#content');if(!content)return;
  content.querySelectorAll('.calendar-holiday-entry,.us-holiday-tags,.us-holiday-key,.us-holiday-list').forEach(el=>el.remove());
  function entry(h,kind){const el=document.createElement(kind==='month'?'button':'div');el.className='calendar-holiday-entry '+(kind==='month'?'glow-month-event':kind==='week'?'week-event':'glow-event');if(kind==='month'){el.type='button';el.textContent=h.title;el.onclick=()=>selectDate(h.date)}else{const time=document.createElement(kind==='week'?'span':'small');time.className='calendar-event-time';time.textContent='All day';const title=document.createElement(kind==='week'?'b':'strong');title.textContent=h.title;el.append(time,title)}return el}
  content.querySelectorAll('.glow-month-cell').forEach(cell=>{const date=cell.querySelector('button[onclick]')?.getAttribute('onclick')?.match(/selectDate\('([^']+)'/)?.[1];if(date)holidaysOnDate(date).forEach(h=>cell.append(entry(h,'month')))});
  content.querySelectorAll('.week-day').forEach(cell=>{const date=cell.querySelector('.week-date')?.getAttribute('onclick')?.match(/selectDate\('([^']+)'/)?.[1];if(date){const holidays=holidaysOnDate(date);if(holidays.length)cell.querySelector('.week-empty')?.remove();holidays.forEach(h=>cell.append(entry(h,'week')))}});

 }
 const previousRender=render;render=function(){previousRender();cells()};
 function refreshDay(){const next=localDate(new Date());if(next!==dayKey){dayKey=next;if(page==='Calendar'||page==='Overview')render()}}
 function schedule(){clearTimeout(timer);const now=new Date(),midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);timer=setTimeout(()=>{refreshDay();schedule()},midnight-now+100)}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshDay();schedule()}});addEventListener('focus',refreshDay);addEventListener('pagehide',()=>clearTimeout(timer));schedule();render();
})();
