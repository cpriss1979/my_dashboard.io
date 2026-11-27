/* Shared calendar entries and a consistent selected-tab state. */
(function(){
 const previousCalendar=cal;
 cal=function(){
  if(calendarView!=='day')return previousCalendar();
  const entries=calendarEventsOn(selected);
  const hours=Array.from({length:24},(_,hour)=>{
   const time=String(hour).padStart(2,'0')+':00';
   const items=entries.filter(event=>event.time&&Number(event.time.slice(0,2))===hour);
   return '<div class="day-hour"><small>'+calendarClockLabel(time)+'</small><div class="day-hour-events">'+items.map(event=>
    '<button type="button" onclick="DashboardMobileUI.eventDetails(\''+esc(event.id)+'\')">'+esc(calendarTimeRange(event))+' · '+esc(event.title)+'</button>'
   ).join('')+'</div><button type="button" aria-label="Add at '+calendarClockLabel(time)+'" onclick="openAdd(\'events\');form.elements.time.value=\''+time+'\'">+</button></div>';
  }).join('');
  const allDay=entries.filter(event=>!event.time).map(event=>'<button type="button" onclick="DashboardMobileUI.eventDetails(\''+esc(event.id)+'\')">'+esc(event.title)+' · All day</button>').join('');
  const holidays=holidaysOnDate(selected).map(holiday=>'<div class="day-holiday">'+esc(holiday.title)+' · All day</div>').join('');
  const tabs=['day','month','week','year'].map(view=>'<button type="button" class="view-tab" aria-pressed="'+(view==='day')+'" onclick="changeCalendarView(\''+view+'\')">'+view[0].toUpperCase()+view.slice(1)+'</button>').join('');
  return '<div class="calendar-controls"><div role="group" aria-label="Calendar view">'+tabs+'</div><button onclick="goToday()">Today</button></div><div class="day-heading"><button onclick="dashboardMoveDay(-1)">←</button><strong>'+esc(displayUSDate(selected))+'</strong><button onclick="dashboardMoveDay(1)">→</button></div><div class="day-all-day">'+allDay+holidays+'</div>'+hours;
 };
 render();
})();
