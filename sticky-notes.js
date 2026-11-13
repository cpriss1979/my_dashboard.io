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
  }

  const layer = element('div', undefined, 'sticky-layer');
  const tray = element('dialog', undefined, 'sticky-dialog');
  const editor = element('dialog', undefined, 'sticky-dialog');
  const addMenu = element('dialog', undefined, 'sticky-dialog');
  const launcher = button('Sticky notes', () => {
    renderTray();
    tray.showModal();
  });
  launcher.className = 'sticky-launcher';
  document.body.append(layer, launcher, tray, editor, addMenu);

  const mobile = matchMedia('(max-width: 760px)');
  const notes = () => Array.isArray(state.stickyNotes) ? state.stickyNotes : [];
  const financeView = () => window.dashboardFinanceView?.() || '';
  const visible = note => note.pin === 'always' || (
    note.page === page &&
    (page !== 'Finances' || note.financeView === null || note.financeView === financeView())
  );

  function makeNote() {
    editNote({
      id: crypto.randomUUID(), text: '', page, pin: 'page',
      financeView: page === 'Finances' ? financeView() : null,
      done: false
    });
  }

  function editNote(note) {
    const owner = state;
    const originPage = note.pin === 'page' ? note.page : page;
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
    pin.add(new Option('Always visible', 'always'));
    pin.value = note.pin === 'always' ? 'always'
      : note.page === 'Finances' && note.financeView === null && originPage === 'Finances' ? 'finance'
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
      note.pin = pin.value === 'always' ? 'always' : 'page';
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
        updatePreview();
        store();
      };
    }
    const close = button('Done editing', () => editor.close());
    editor.replaceChildren(title, text, label, styling, element('p', 'Preview', 'sticky-preview-label'), preview, close);
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
      button('New note', makeNote),
      button('Close', () => tray.close())
    );
    for (const [heading, list] of [
      ['On this page', notes().filter(note => !note.done && visible(note))],
      ['Done', notes().filter(note => note.done)]
    ]) {
      if (!list.length) continue;
      const group = element('details');
      group.open = heading === 'On this page';
      group.append(element('summary', heading));
      for (const note of list) {
        const row = element('div', undefined, 'sticky-tray-row');
        const sample = element('div', undefined, 'sticky-card sticky-preview');
        applyAppearance(sample, note);
        sample.append(element('p', note.text || 'Empty note'));
        row.append(sample,
          ...(note.done ? [button('Restore', () => setDone(note, false))]
            : [button('Edit', () => editNote(note)), button('Done', () => setDone(note, true))]));
        group.append(row);
      }
      tray.append(group);
    }
  }

  function dragNote(handle, card, note) {
    handle.onpointerdown = event => {
      if (event.button !== 0) return;
      const start = card.getBoundingClientRect();
      const bounds = layer.getBoundingClientRect();
      const owner = state;
      const x = event.clientX;
      const y = event.clientY;
      let moved = false;
      handle.setPointerCapture(event.pointerId);
      handle.onpointermove = move => {
        if (state !== owner) return;
        const dx = move.clientX - x;
        const dy = move.clientY - y;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        moved = true;
        card.style.left = Math.max(0, Math.min(bounds.width - card.offsetWidth, start.left - bounds.left + dx)) + 'px';
        card.style.top = Math.max(0, Math.min(bounds.height - card.offsetHeight, start.top - bounds.top + dy)) + 'px';
      };
      handle.onlostpointercapture = () => {
        handle.onpointermove = null;
        if (!moved || state !== owner) return;
        note.x = parseFloat(card.style.left);
        note.y = parseFloat(card.style.top);
        save();
      };
    };
  }

  function paintNotes() {
    layer.replaceChildren();
    if (mobile.matches) return;
    for (const [index, note] of notes().filter(note => !note.done && visible(note)).entries()) {
      const card = element('article', undefined, 'sticky-card');
      applyAppearance(card, note);
      const controls = element('div', undefined, 'sticky-controls');
      if (note.pin === 'page') {
        const handle = element('span', 'Drag to move', 'sticky-handle');
        dragNote(handle, card, note);
        controls.append(handle);
      } else {
        controls.append(element('span', 'Always visible'));
      }
      controls.append(button('Done', () => setDone(note, true)));
      const copy = button(note.text || 'Edit note', () => editNote(note));
      copy.className = 'sticky-copy';
      copy.setAttribute('aria-label', 'Edit sticky note: ' + (note.text || 'Empty note'));
      card.append(controls, copy);
      layer.append(card);
      const maxX = Math.max(0, layer.clientWidth - card.offsetWidth);
      const maxY = Math.max(0, layer.clientHeight - card.offsetHeight);
      card.style.left = Math.max(0, Math.min(maxX, note.pin === 'page' ? note.x ?? maxX - 18 : maxX - 18)) + 'px';
      card.style.top = Math.max(0, Math.min(maxY, note.pin === 'page' ? note.y ?? index * 150 : index * 150)) + 'px';
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
