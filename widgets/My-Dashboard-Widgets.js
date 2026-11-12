// Install as one Scriptable script. Set each widget’s Parameter to a section key.
const base = 'https://cpriss1979.github.io/my_dashboard.io/';
const sections = {
  calendar: ['Calendar', 'calendar', '#9ACDFF', 'Upcoming schedule'],
  games: ['Games', 'gamecontroller.fill', '#CDB4FF', 'Open your game library'],
  projects: ['Projects', 'folder.fill', '#FFB8D6', 'Open your project boards'],
  tasks: ['Tasks', 'checklist', '#A6E7CA', 'Open your priorities'],
  notes: ['Notes', 'note.text', '#FFE1A3', 'Open your notes'],
  finances: ['Finances', 'chart.bar.fill', '#A1DDEA', 'Open your budget planner'],
  'time-for-you': ['Time for You', 'sun.max.fill', '#FFCAA2', 'Open your activity ideas'],
  'habit-tracker': ['Habit Tracker', 'checkmark.circle.fill', '#B9EB9E', 'Open your habits'],
  journal: ['Journal', 'book.fill', '#F9B8E7', 'Open your journal'],
  themes: ['Themes', 'paintpalette.fill', '#C8B6FF', 'Open your appearance settings']
};
const files = FileManager.local();
const scheduleFile = files.joinPath(files.documentsDirectory(), 'my-dashboard-widget-schedule.json');

function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
function dateAt(day, time = '12:00') { return new Date(day + 'T' + time + ':00'); }
function scheduleRows(snapshot, now) {
  const day = dateKey(now);
  return snapshot.days
    .filter(event => event.date > day || event.date === day &&
      (!event.time || dateAt(event.date, event.endTime || event.time) >= now))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}
function readSchedule() {
  try { return JSON.parse(files.readString(scheduleFile)); } catch { return null; }
}
function validSchedule(snapshot) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  return snapshot?.type === 'my-dashboard-calendar-widget' && Number.isFinite(Date.parse(snapshot.exportedAt)) &&
    Array.isArray(snapshot.days) && snapshot.days.every(event => event && datePattern.test(event.date) &&
      typeof event.title === 'string' && typeof event.time === 'string' &&
      typeof event.endTime === 'string' && (!event.time || timePattern.test(event.time)) &&
      (!event.endTime || timePattern.test(event.endTime)));
}
function text(stack, value, font, color, lines = 1) {
  const item = stack.addText(value);
  item.font = font;
  item.textColor = new Color(color);
  item.lineLimit = lines;
  item.minimumScaleFactor = 0.8;
  return item;
}
function makeWidget(key, large, now = new Date()) {
  const [label, symbol, accent, description] = sections[key];
  const widget = new ListWidget();
  widget.url = base + '?widget=' + key;
  widget.setPadding(14, 14, 14, 14);
  const gradient = new LinearGradient();
  gradient.colors = [new Color('#181933'), new Color('#30224B')];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
  const top = widget.addStack();
  top.centerAlignContent();
  const icon = top.addImage(SFSymbol.named(symbol).image);
  icon.imageSize = new Size(large ? 22 : 16, large ? 22 : 16);
  icon.tintColor = new Color(accent);
  top.addSpacer(7);
  text(top, label, Font.semiboldSystemFont(large ? 21 : 15), '#FFFFFF');
  widget.addSpacer(large ? 12 : 7);

  if (key === 'calendar') {
    const snapshot = readSchedule();
    const rows = validSchedule(snapshot) ? scheduleRows(snapshot, now) : [];
    const date = new DateFormatter(); date.dateFormat = 'EEE, MMM d';
    const time = new DateFormatter(); time.useShortTimeStyle();
    if (!validSchedule(snapshot)) text(widget, 'Import a schedule in Scriptable.', Font.systemFont(12), '#E1D8EE', 2);
    else if (!rows.length) {
      const expired = now.getTime() - Date.parse(snapshot.exportedAt) >= 59 * 86400000;
      text(widget, expired ? 'Import a fresh schedule.' : 'No upcoming events in this export.', Font.systemFont(12), '#E1D8EE', 3);
    }
    const limit = large ? 4 : 2;
    for (const event of rows.slice(0, limit)) {
      const day = date.string(dateAt(event.date));
      const clock = event.time ? time.string(dateAt(event.date, event.time)) : 'All day';
      text(widget, day + ' · ' + clock, Font.semiboldSystemFont(large ? 12 : 10), accent);
      text(widget, event.title, Font.semiboldSystemFont(large ? 16 : 12), '#FFFFFF');
      if (large && event.location) text(widget, event.location, Font.systemFont(12), '#E1D8EE');
      widget.addSpacer(large ? 8 : 4);
    }
    widget.addSpacer();
    if (large && validSchedule(snapshot)) text(widget, 'Exported ' + date.string(new Date(snapshot.exportedAt)), Font.systemFont(10), '#D0C5E1');
    widget.refreshAfterDate = new Date(now.getTime() + 20 * 60 * 1000);
  } else {
    widget.addSpacer();
    if (large) text(widget, description, Font.systemFont(17), '#E1D8EE', 2);
    text(widget, 'Open ' + label + ' ↗', Font.semiboldSystemFont(large ? 16 : 11), accent, 2);
  }
  return widget;
}

async function setup() {
  const menu = new Alert();
  menu.title = 'My Dashboard Widgets';
  menu.message = 'Import a Calendar export or preview a widget. On the Home Screen, set each widget’s Parameter to a section key.';
  menu.addAction('Import Calendar schedule');
  menu.addAction('Preview a widget');
  menu.addCancelAction('Cancel');
  const choice = await menu.presentSheet();
  if (choice === 0) {
    const [path] = await DocumentPicker.open(['public.json']);
    if (!path) return;
    try {
      const snapshot = JSON.parse(files.readString(path));
      if (!validSchedule(snapshot)) throw new Error('Invalid schedule');
      files.writeString(scheduleFile, JSON.stringify(snapshot));
      await makeWidget('calendar', true).presentLarge();
    } catch {
      const error = new Alert();
      error.title = 'Couldn’t import schedule';
      error.message = 'Choose the JSON file from Calendar → Export widget schedule.';
      error.addAction('OK');
      await error.presentAlert();
    }
  } else if (choice === 1) {
    const picker = new Alert(); picker.title = 'Choose a section';
    const keys = Object.keys(sections);
    for (const key of keys) picker.addAction(sections[key][0]);
    picker.addCancelAction('Cancel');
    const section = await picker.presentSheet();
    if (section < 0) return;
    const sizes = new Alert(); sizes.title = 'Choose a size';
    sizes.addAction('Small'); sizes.addAction('Large'); sizes.addCancelAction('Cancel');
    const size = await sizes.presentSheet();
    if (size === 0) await makeWidget(keys[section], false).presentSmall();
    if (size === 1) await makeWidget(keys[section], true).presentLarge();
  }
}

if (config.runsInWidget) {
  const parameter = String(args.widgetParameter || '').trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(sections, parameter)) {
    Script.setWidget(makeWidget(parameter, config.widgetFamily === 'large'));
  } else {
    const widget = new ListWidget();
    widget.addText('Set the widget’s Parameter to a section key.');
    Script.setWidget(widget);
  }
} else {
  await setup();
}
Script.complete();
