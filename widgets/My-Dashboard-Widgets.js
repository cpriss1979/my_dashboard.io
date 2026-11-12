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
  'money-tracker': ['Money Tracker', 'banknote.fill', '#A6E7CA', 'Open Savings'],
  bible: ['Bible', 'book.closed.fill', '#FFE1A3', 'Open Bible'],
  themes: ['Themes', 'paintpalette.fill', '#C8B6FF', 'Open your appearance settings']
};
const pairingKey = 'my-dashboard.widget.pairing';
const cacheKey = 'my-dashboard.widget.cache';
const hideKey = 'my-dashboard.widget.hide-balances';
const verseKey = 'my-dashboard.widget.verse';
const verses = [
  ['The LORD is my shepherd; I shall not want.', 'Psalm 23:1'],
  ['Thy word is a lamp unto my feet, and a light unto my path.', 'Psalm 119:105'],
  ['Pray without ceasing.', '1 Thessalonians 5:17'],
  ['Rejoice evermore.', '1 Thessalonians 5:16'],
  ['The LORD is good to all: and his tender mercies are over all his works.', 'Psalm 145:9'],
  ['Be still, and know that I am God.', 'Psalm 46:10 (excerpt)'],
  ['I can do all things through Christ which strengtheneth me.', 'Philippians 4:13'],
  ['Casting all your care upon him; for he careth for you.', '1 Peter 5:7'],
  ['Jesus Christ the same yesterday, and to day, and for ever.', 'Hebrews 13:8'],
  ['We love him, because he first loved us.', '1 John 4:19'],
  ['Blessed are the peacemakers: for they shall be called the children of God.', 'Matthew 5:9'],
  ['For with God nothing shall be impossible.', 'Luke 1:37']
];
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
function forget(key) { if (Keychain.contains(key)) Keychain.remove(key); }
function pairing(code) {
  const match = /^([a-z][a-z0-9-]+)\.([A-Za-z0-9_-]{1,128})\.([0-9a-f]{64})$/.exec(code.trim());
  return match && match.slice(1);
}
async function privatePreview() {
  if (!Keychain.contains(pairingKey)) return null;
  const code = Keychain.get(pairingKey);
  const parts = pairing(code);
  if (!parts) return null;
  const [project, owner, token] = parts;
  const url = 'https://firestore.googleapis.com/v1/projects/' + project +
    '/databases/(default)/documents/widgetPreviews/' + owner + '/connections/' + token;
  try {
    const request = new Request(url);
    request.timeoutInterval = 8;
    const response = JSON.parse(await request.loadString());
    const status = request.response.statusCode;
    if ([401, 403, 404].includes(status)) {
      forget(cacheKey);
      return {disconnected: true};
    }
    const fields = response.fields;
    if (status !== 200 || !fields || !fields.updatedAt?.timestampValue) throw Error('Unavailable');
    const cents = field => field?.integerValue === undefined ? null : Number(field.integerValue);
    const data = {
      saved: cents(fields.savedCents), checking: cents(fields.clearedCheckingCents),
      tasks: (fields.tasks?.arrayValue?.values || []).slice(0, 3).map(value => ({
        title: value.mapValue.fields.title.stringValue, due: value.mapValue.fields.due.stringValue
      })),
      syncedAt: new Date().toISOString()
    };
    Keychain.set(cacheKey, JSON.stringify(data));
    return data;
  } catch {
    try { return {...JSON.parse(Keychain.get(cacheKey)), cached: true}; }
    catch { return {unavailable: true}; }
  }
}
function verseFor(now) {
  const slot = Math.floor(now.getTime() / 10800000);
  let prior;
  try { prior = JSON.parse(Keychain.get(verseKey)); } catch {}
  if (prior?.slot === slot && verses[prior.index]) return verses[prior.index];
  const choices = verses.map((_, index) => index).filter(index => index !== prior?.index);
  const index = choices[Math.floor(Math.random() * choices.length)];
  Keychain.set(verseKey, JSON.stringify({slot, index}));
  return verses[index];
}
function widgetPreview(widget, key, family, data, now, accent) {
  if (!data || data.disconnected || data.unavailable) {
    text(widget, data?.unavailable ? 'Could not sync.' : 'Pair from Scriptable.', Font.systemFont(12), '#E1D8EE', 2);
    return;
  }
  if (key === 'tasks') {
    const tasks = data.tasks.slice(0, family === 'small' ? 1 : 3);
    if (!tasks.length) text(widget, 'No unfinished tasks', Font.systemFont(13), '#E1D8EE', 2);
    for (const task of tasks) {
      const overdue = task.due && task.due < dateKey(now);
      text(widget, (overdue ? 'Overdue · ' : '') + task.title, Font.semiboldSystemFont(12), overdue ? '#FFADBA' : '#FFFFFF', family === 'small' ? 2 : 1);
      if (task.due && family === 'large') text(widget, task.due, Font.systemFont(11), accent);
      widget.addSpacer(3);
    }
  } else {
    const savings = key === 'money-tracker';
    text(widget, savings ? 'Total saved' : 'Total cleared in checking', Font.systemFont(11), accent, 2);
    const value = savings ? data.saved : data.checking;
    const label = Keychain.contains(hideKey) ? 'Hidden' : Number.isSafeInteger(value)
      ? new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(value / 100) : 'Set starting balances';
    text(widget, label, Font.semiboldSystemFont(19), '#FFFFFF', 2);
  }
  if (data.cached) {
    widget.addSpacer();
    const date = new DateFormatter(); date.dateFormat = 'MMM d, h:mm a';
    text(widget, 'Cached · ' + date.string(new Date(data.syncedAt)), Font.systemFont(9), '#D0C5E1', 2);
  }
}

async function makeWidget(key, family, now = new Date()) {
  const large = family === 'large';
  const iconFocus = ['notes','games','journal','time-for-you'].includes(key);
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
  const iconSize = iconFocus ? (large ? 78 : 42) : large ? 22 : 16;
  icon.imageSize = new Size(iconSize, iconSize);
  icon.tintColor = new Color(accent);
  if (iconFocus) {
    widget.addSpacer(9);
    text(widget, label, Font.semiboldSystemFont(large ? 25 : 15), '#FFFFFF');
  } else {
    top.addSpacer(7);
    text(top, label, Font.semiboldSystemFont(large ? 21 : 15), '#FFFFFF');
  }
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
  } else if (['money-tracker', 'finances', 'tasks'].includes(key)) {
    await widgetPreview(widget, key, family, await privatePreview(), now, accent);
    widget.refreshAfterDate = new Date(now.getTime() + 20 * 60000);
  } else if (key === 'bible') {
    const [verse, reference] = verseFor(now);
    text(widget, verse, Font.systemFont(large ? 22 : 12), '#FFFFFF', large ? 9 : family === 'medium' ? 4 : 5);
    widget.addSpacer(6);
    text(widget, reference + ' · KJV', Font.semiboldSystemFont(10), accent, 2);
    widget.refreshAfterDate = new Date(now.getTime() + 10800000);
  } else {
    widget.addSpacer();
    if (large && !iconFocus) text(widget, description, Font.systemFont(17), '#E1D8EE', 2);
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
  menu.addAction('Pair private widgets');
  menu.addAction(Keychain.contains(hideKey) ? 'Show balances' : 'Hide balances');
  menu.addDestructiveAction('Forget pairing on this iPhone');
  menu.addCancelAction('Cancel');
  const choice = await menu.presentSheet();
  if (choice === 0) {
    const [path] = await DocumentPicker.open(['public.json']);
    if (!path) return;
    try {
      const snapshot = JSON.parse(files.readString(path));
      if (!validSchedule(snapshot)) throw new Error('Invalid schedule');
      files.writeString(scheduleFile, JSON.stringify(snapshot));
      await (await makeWidget('calendar', 'large')).presentLarge();
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
    sizes.addAction('Small'); sizes.addAction('Medium'); sizes.addAction('Large'); sizes.addCancelAction('Cancel');
    const size = await sizes.presentSheet();
    if (size < 0) return;
    const family = ['small','medium','large'][size];
    const widget = await makeWidget(keys[section], family);
    await widget[['presentSmall','presentMedium','presentLarge'][size]]();
  } else if (choice === 2) {
    const prompt = new Alert();
    prompt.title = 'Pair private widgets';
    prompt.message = 'In My Dashboard, open Settings → Widget connections → Create pairing code. Paste it below.';
    prompt.addSecureTextField('Pairing code');
    prompt.addAction('Pair'); prompt.addCancelAction('Cancel');
    if (await prompt.presentAlert() < 0) return;
    const code = prompt.textFieldValue(0).trim();
    const result = new Alert();
    result.addAction('OK');
    if (!pairing(code)) {
      result.title = 'Pairing code not recognized';
    } else {
      forget(cacheKey);
      Keychain.set(pairingKey, code);
      const data = await privatePreview();
      result.title = data?.syncedAt ? 'Widgets paired' : 'Connection unavailable';
      if (!data?.syncedAt) result.message = 'Check your pairing code and the dashboard’s widget connection setup.';
    }
    await result.presentAlert();
  } else if (choice === 3) {
    if (Keychain.contains(hideKey)) forget(hideKey);
    else Keychain.set(hideKey, '1');
  } else if (choice === 4) {
    forget(pairingKey); forget(cacheKey);
  }
}

if (config.runsInWidget) {
  const parameter = String(args.widgetParameter || '').trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(sections, parameter)) {
    Script.setWidget(await makeWidget(parameter, config.widgetFamily));
  } else {
    const widget = new ListWidget();
    widget.addText('Set the widget’s Parameter to a section key.');
    Script.setWidget(widget);
  }
} else {
  await setup();
}
Script.complete();
