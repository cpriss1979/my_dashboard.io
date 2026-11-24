(function () {
  'use strict';

  if (new URLSearchParams(location.search).has('widget')) return;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function button(label, action) {
    const node = element('button', label);
    node.type = 'button';
    node.onclick = action;
    return node;
  }

  function icon(symbol, label, action) {
    const node = button(symbol, action);
    node.className = 'sticky-icon';
    node.setAttribute('aria-label', label);
    node.title = label;
    return node;
  }

  const appearance = {
    color: [['butter','Butter'],['rose','Rose'],['lavender','Lavender'],['mint','Mint'],
      ['sky','Sky'],['peach','Peach'],['cream','Cream'],['lilac','Lilac']],
    shape: [['rounded','Rounded'],['square','Square corners'],['wide','Wide memo'],['oval','Soft oval']],
    design: [['plain','Plain'],['lined','Ruled'],['dotted','Polka dots'],['grid','Graph paper'],['taped','Washi tape']]
  };

  function applyAppearance(card, note) {
    for (const [setting, options] of Object.entries(appearance)) {
      card.dataset[setting] = options.some(([value]) => value === note[setting])
        ? note[setting] : options[0][0];
    }
    if(note.customColor)card.style.setProperty('background-color',note.customColor,'important');
    else card.style.removeProperty('background-color');
    if(note.textColor)card.style.color=note.textColor;
    else card.style.removeProperty('color');
  }

  const layer = element('div', undefined, 'sticky-layer');
  const tray = element('dialog', undefined, 'sticky-dialog');
  const editor = element('dialog', undefined, 'sticky-dialog');
  const addMenu = element('dialog', undefined, 'sticky-dialog');
  const launcher = button('▤', () => {
    renderTray();
    tray.showModal();
  });
  launcher.className = 'secondary';
  launcher.title='Sticky Notes';
  launcher.setAttribute('aria-label','Sticky Notes');
  let trayTab='active';
  document.body.append(layer, tray, editor, addMenu);
  const settingsButton = document.querySelector('aside .glow-side-settings');
  if (settingsButton) {
    const toolbar = element('div', undefined, 'dashboard-utility-bar');
    settingsButton.before(toolbar);
    const timer = button('◷', () => go('Focus timer'));
    timer.className = 'secondary';
    timer.title='Timer';
    timer.setAttribute('aria-label','Timer');
    for(const [control, symbol] of [[launcher,'notes'],[timer,'timer']]){
      window.DashboardNavIcon?.(control,'',symbol);
      control.querySelector('.app-nav-label')?.remove();
    }
    toolbar.append(settingsButton, timer);
  }
  launcher.className='sticky-launcher';
  launcher.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 3h16v12l-6 6H4zM14 21v-6h6M8 8h8M8 12h5"/></svg>';
  document.body.append(launcher);
  tray.classList.add('sticky-tray'); editor.classList.add('sticky-editor');
  window.DashboardStickyNotes = {open:()=>launcher.click()};

  const mobile = matchMedia('(max-width: 760px)');
  const notes = () => Array.isArray(state.stickyNotes) ? state.stickyNotes : [];
  const financeView = () => window.dashboardFinanceView?.() || '';
  const visible = note => (note.page || 'Overview') === page &&
    (page !== 'Finances' || note.financeView == null || note.financeView === financeView());

  function makeNote() {
    editNote({
      id: crypto.randomUUID(), text: '', page, pin: 'page',
      financeView: page === 'Finances' ? financeView() : null,
      done: false
    });
  }

  function editNote(note) {
    const owner = state;
    const originPage = note.page || 'Overview';
    const originView = originPage === 'Finances' && page === 'Finances' ? financeView() : note.financeView;
    const title = element('h2', 'Sticky note');
    title.id = 'sticky-editor-title';
    editor.setAttribute('aria-labelledby', title.id);
    const text = element('textarea');
    text.value = note.text;
    text.rows = 5;
    text.maxLength = 600;
    text.setAttribute('aria-label', 'Note text');
    const pin = element('select');
    pin.add(new Option('Pin to this page', 'page'));
    if (originPage === 'Finances') {
      pin.add(new Option('Show in all finance views', 'finance'));
    }
    pin.value = note.page === 'Finances' && note.financeView === null && originPage === 'Finances' ? 'finance'
      : 'page';

    function store() {
      if (state !== owner || (!note.text && !notes().includes(note))) return;
      if (!Array.isArray(state.stickyNotes)) state.stickyNotes = [];
      if (!notes().includes(note)) state.stickyNotes.push(note);
      save();
    }

    const preview = element('div', undefined, 'sticky-card sticky-preview');
    const previewText = element('p');
    preview.append(previewText);
    function updatePreview() {
      applyAppearance(preview, note);
      previewText.textContent = note.text || 'Your note goes here';
    }

    text.oninput = () => {
      note.text = text.value;
      updatePreview();
      store();
    };
    pin.onchange = () => {
      note.pin = 'page';
      note.page = originPage;
      note.financeView = originPage === 'Finances' && pin.value === 'page' ? originView : null;
      store();
    };

    const label = element('label', 'Show note');
    label.append(pin);
    const styling = element('div', undefined, 'sticky-styling');
    const labels = {color: 'Color', shape: 'Shape', design: 'Design'};
    updatePreview();
    for (const [setting, options] of Object.entries(appearance)) {
      const control = element('select');
      for (const [value, name] of options) control.add(new Option(name, value));
      control.value = preview.dataset[setting];
      const field = element('label', labels[setting]);
      field.append(control);
      styling.append(field);
      control.onchange = () => {
        note[setting] = control.value;
        if(setting==='color')note.customColor='';
        updatePreview();
        store();
      };
    }
    const custom = element('details',undefined,'sticky-custom-colors');
    custom.append(element('summary','Custom colors'));
    const favorites = element('select');
    favorites.setAttribute('aria-label','Saved sticky note colors');
    function fillColors(){
      favorites.replaceChildren(new Option('Saved colors',''));
      for(const color of state.stickyPalette||[])favorites.add(new Option(color,color));
    }
    function customColor(key,value){
      note[key]=value;
      updatePreview();store();
    }
    if(window.DashboardColorFields){
      custom.append(window.DashboardColorFields('Note background',note.customColor,'#fff0ac',value=>customColor('customColor',value)),
        window.DashboardColorFields('Note text',note.textColor,'#3a2c37',value=>customColor('textColor',value)));
      fillColors();
      favorites.onchange=()=>{
        if(!favorites.value)return;
        const picker=custom.querySelector('input[type="color"]');
        picker.value=favorites.value;
        picker.dispatchEvent(new Event('input'));
      };
      custom.append(favorites,button('Save background to palette',()=>{
        if(state!==owner||!note.customColor)return;
        state.stickyPalette=[...new Set([...(state.stickyPalette||[]),note.customColor])];
        save();fillColors();
      }),button('Remove selected color',()=>{
        if(state!==owner||!favorites.value)return;
        state.stickyPalette=(state.stickyPalette||[]).filter(color=>color!==favorites.value);
        save();fillColors();
      }));
    }
    const close = button('Done editing', () => editor.close());
    editor.replaceChildren(title, text, ...(originPage === 'Finances' ? [label] : []), styling, custom, element('p', 'Preview', 'sticky-preview-label'), preview, close);
    if (tray.open) tray.close();
    editor.showModal();
    text.focus();
  }

  function setDone(note, done) {
    note.done = done;
    save();
    paintNotes();
    if (tray.open) renderTray();
  }

  function renderTray() {
    tray.replaceChildren(
      element('h2', 'Sticky notes'),
      element('p','Little reminders, right where you need them.','sticky-subtitle'),
      button('+ New note', makeNote),
      button('Close', () => tray.close())
    );
    const active=notes().filter(note=>!note.done&&visible(note));
    const done=notes().filter(note=>note.done);
    const tabs=element('div',undefined,'sticky-tray-tabs');
    for(const [key,title,count] of [['active','On this page',active.length],['done','Done',done.length]]){
      const tab=button(title+' · '+count,()=>{trayTab=key;renderTray();tray.querySelector('[aria-pressed="true"]')?.focus()});
      tab.setAttribute('aria-pressed',String(trayTab===key));
      tabs.append(tab);
    }
    tray.append(tabs);
    const list=trayTab==='done'?done:active;
    const group=element('section',undefined,'sticky-tray-grid');
    if(!list.length)group.append(element('p',trayTab==='done'?'No completed notes yet.':'No sticky notes on this page.'));
      for (const note of list) {
        const row = element('div', undefined, 'sticky-tray-row');
        const sample = element('div', undefined, 'sticky-card sticky-preview');
        applyAppearance(sample, note);
        sample.append(element('p', note.text || 'Empty note'));
        row.append(sample,
          ...(note.done ? [icon('↶', 'Restore note', () => setDone(note, false))]
            : [icon('✎', 'Edit note', () => editNote(note)), icon('✓', 'Mark done', () => setDone(note, true))]),
          icon('×', 'Delete note', () => deleteNote(note)));
        group.append(row);
      }
    tray.append(group);
  }

  function deleteNote(note) {
    if (!confirm('Delete this sticky note?')) return;
    state.stickyNotes = notes().filter(item => item.id !== note.id);
    save();
    paintNotes();
    if (tray.open) renderTray();
  }

  function paintNotes() {
    layer.replaceChildren();
    if (mobile.matches) return;
    for (const note of notes().filter(note => !note.done && visible(note))) {
      const card = element('article', undefined, 'sticky-card');
      applyAppearance(card, note);
      const controls = element('div', undefined, 'sticky-controls');
      controls.append(icon('✎', 'Edit note', () => editNote(note)),
        icon('✓', 'Mark done', () => setDone(note, true)),
        icon('×', 'Delete note', () => deleteNote(note)));
      const copy = button(note.text || 'Edit note', () => editNote(note));
      copy.className = 'sticky-copy';
      copy.setAttribute('aria-label', 'Edit sticky note: ' + (note.text || 'Empty note'));
      card.append(controls, copy);
      layer.append(card);

    }
  }

  editor.addEventListener('close', () => {
    paintNotes();
    launcher.focus();
  });
  mobile.addEventListener('change', paintNotes);
  window.addEventListener('resize', paintNotes);
  window.addEventListener('dashboard:account-changing', () => {
    for (const dialog of [editor, tray, addMenu]) if (dialog.open) dialog.close();
  });

  const previousAdd = openAdd;
  openAdd = function (kind) {
    if (kind) return previousAdd(kind);
    const choices = page === 'Finances' ? window.dashboardFinanceActions?.() : null;
    const actions = choices || [['Add a dashboard entry', () => previousAdd()]];
    addMenu.replaceChildren(element('h2', 'Quick add'));
    for (const [label, action] of [...actions, ['Sticky note', makeNote]]) {
      addMenu.append(button(label, () => {
        addMenu.close();
        action();
      }));
    }
    addMenu.append(button('Cancel', () => addMenu.close()));
    addMenu.showModal();
  };

  const previousRender = render;
  render = function () {
    previousRender();
    paintNotes();
  };
  paintNotes();
})();
