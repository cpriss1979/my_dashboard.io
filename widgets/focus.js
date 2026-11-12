(function () {
  const routes = new Map([
    ['calendar', 'Calendar'], ['games', 'Games'], ['projects', 'Projects'],
    ['tasks', 'Daily priorities'], ['notes', 'Quick notes'], ['finances', 'Finances'],
    ['time-for-you', 'Time for You'], ['habit-tracker', 'Habit Tracker'],
    ['journal', 'Journal'], ['themes', 'Themes'], ['money-tracker', 'Finances'], ['bible', 'Bible']
  ]);
  const key = new URLSearchParams(location.search).get('widget');
  if (!routes.has(key)) return;
  const target = routes.get(key);
  const title = ({tasks: 'Tasks', notes: 'Notes', 'money-tracker': 'Savings'})[key] || target;
  document.title = title + ' · My Dashboard';

  const header = document.createElement('header');
  header.className = 'widget-section-header';
  const brand = document.createElement('p');
  brand.textContent = 'My Dashboard';
  const heading = document.createElement('h1');
  heading.textContent = title;
  header.append(brand, heading);
  content.before(header);

  function exportSchedule() {
    const days = [];
    const start = new Date();
    for (let offset = 0; offset < 60; offset++) {
      const date = localDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset));
      const plans = [...holidaysOnDate(date), ...calendarEventsOn(date)];
      for (const event of plans) {
        days.push({
          date, title: event.title, time: event.time || '',
          endTime: event.endTime || '', location: event.location || ''
        });
      }
    }
    const data = JSON.stringify({type: 'my-dashboard-calendar-widget', exportedAt: new Date().toISOString(), days});
    const url = URL.createObjectURL(new Blob([data], {type: 'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'my-dashboard-schedule.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  if (key === 'calendar') {
    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'secondary';
    exportButton.textContent = 'Export widget schedule';
    exportButton.onclick = exportSchedule;
    header.append(exportButton);
  }

  const previousGo = go;
  go = function (destination) {
    if (destination === target) previousGo(destination);
  };
  if (key === 'themes') {
    const appearance = document.querySelector('#dashboardThemes .dashboard-appearance');
    if (appearance) {
      const apply = [...appearance.querySelectorAll('button')].find(button => button.textContent === 'Apply theme and close');
      if (apply) apply.textContent = 'Apply theme';
      render = function () { content.replaceChildren(appearance); };
      page = target;
      render();
      return;
    }
    content.textContent = 'Theme settings are unavailable. Reload this page to try again.';
    return;
  }
  previousGo(target);
})();
