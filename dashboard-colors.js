(function () {
  'use strict';
  const sections = [
    ['Calendar','Calendar'], ['Daily priorities','Tasks'], ['Projects','Projects'],
    ['Quick notes','Notes'], ['Bookmarks','Bookmarks'], ['Finances','Finances'],
    ['Time for You','Little Joys'], ['Habit Tracker','Habit Tracker'], ['Journal','Journal'],
    ['Games','Games'], ['Badges','Badges'], ['Bible','Bible']
  ];
  const presets = [
    ['Rose','#e65c95'], ['Red','#dc5252'], ['Orange','#e0823b'], ['Gold','#d6a627'],
    ['Lime','#9ba932'], ['Green','#459b63'], ['Teal','#279f9a'], ['Blue','#4d86dc'],
    ['Lavender','#9869dc'], ['Slate','#687d99']
  ];
  const validHex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  const prefs = () => state.dashboardColors || {};
  function record() {
    return state.dashboardColors ??= { sections: {}, custom: {}, holidays: {} };
  }
  function colorFor(id) {
    const index = /^preset-[0-9]$/.test(id) ? Number(id.slice(-1)) : -1;
    const color = index >= 0 ? presets[index][1] : prefs().custom?.[id];
    return validHex(color) ? color : '';
  }
  function el(tag, text) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, action) {
    const node = el('button', text);
    node.type = 'button';
    node.className = 'secondary';
    node.onclick = action;
    return node;
  }
  function holidayKey(event) {
    return event.title.replace(/ \(observed\)$/i, '');
  }
  function paint(node, event) {
    if(event.emoji&&!node.querySelector('.bre-calendar-sticker')){
      const sticker=el('span',event.emoji+' ');
      sticker.className='bre-calendar-sticker';
      (node.querySelector('b')||node).prepend(sticker);
    }
    const color = colorFor(event.id ? event.calendarColor : prefs().holidays?.[holidayKey(event)]);
    node.classList.toggle('calendar-colored-entry', Boolean(color));
    if (color) {
      node.style.setProperty('--calendar-entry-color', color);
      node.style.setProperty('background', 'color-mix(in srgb, '+color+' 30%, white)', 'important');
      node.style.setProperty('border-inline-start', '5px solid '+color, 'important');
      node.style.setProperty('color', '#18243a', 'important');
    }
    return node;
  }
  function colorSelect(value = '') {
    const select = el('select');
    select.add(new Option('Theme default', ''));
    presets.forEach(([name, hex], index) => {
      select.add(new Option(name+' · '+hex, 'preset-'+index));
    });
    for (let i = 1; i <= 10; i++) {
      const id = 'custom-'+i;
      const hex = colorFor(id);
      if (hex) select.add(new Option('Custom '+i+' · '+hex, id));
    }
    select.value = colorFor(value) ? value : '';
    return select;
  }
  function holidayDetails(event) {
    const dialog = el('dialog');
    dialog.className = 'app-action-dialog';
    const title = el('h2', event.title);
    dialog.setAttribute('aria-label', event.title);
    const label = el('label', 'Holiday color');
    const key = holidayKey(event);
    const select = colorSelect(prefs().holidays?.[key]);
    label.append(select);
    const owner = state;
    dialog.append(title, el('p', calendarDateRange(event)+' · All day'),
      el('p', 'This color applies to this holiday each year, including observed dates.'), label,
      button('Save color', () => {
        if (owner === state) {
          (record().holidays ??= {})[key] = select.value;
          save();
          render();
        }
        dialog.close();
      }), button('Close', () => dialog.close()));
    dialog.addEventListener('close', () => dialog.remove(), {once:true});
    addEventListener('dashboard:account-changing', () => { if (dialog.open) dialog.close(); },
      {signal: abortOnClose(dialog)});
    document.body.append(dialog);
    dialog.showModal();
  }
  function abortOnClose(dialog) {
    const controller = new AbortController();
    dialog.addEventListener('close', () => controller.abort(), {once:true});
    return controller.signal;
  }
  window.DashboardColors = { paint, holidayDetails };
  function paintSection() {
    const color = sections.some(([id]) => id === page) ? prefs().sections?.[page] : '';
    document.body.toggleAttribute('data-section-color', validHex(color));
    if (validHex(color)) document.body.style.setProperty('--dashboard-section-color', color);
    else document.body.style.removeProperty('--dashboard-section-color');
  }

  const originalFields = fieldsFor;
  fieldsFor = function () {
    originalFields();
    if (kind.value !== 'events') return;
    const label = el('label', 'Event color');
    const select = colorSelect();
    select.name = 'calendarColor';
    label.append(select);
    fields.append(label);
  };
  kind.onchange = fieldsFor;

  const originalEdit = editEntry;
  editEntry = function (type, id) {
    const result = originalEdit(type,id);
    if (type === 'events' && form.elements.calendarColor) {
      const value = state.events.find(event => event.id === id)?.calendarColor;
      form.elements.calendarColor.value = colorFor(value) ? value : '';
    }
    return result;
  };

  const themes = document.getElementById('dashboardThemes');
  if (themes) {
    const options = el('details');
    options.className = 'dashboard-color-settings';
    options.append(el('summary', 'Section container colors'));
    const grid = el('div');
    grid.className = 'dashboard-color-grid';
    options.append(grid);
    const palette = el('details');
    palette.className = 'dashboard-color-settings';
    palette.append(el('summary','Calendar custom colors'),
      el('p','Set up to 10 custom colors. They appear in the color menu for events and holidays.'));
    const customGrid = el('div');
    customGrid.className = 'dashboard-color-grid';
    palette.append(customGrid);
    function colorSetting(grid, name, value, fallback, update) {
      const item = el('div');
      const label = el('label',name);
      const input = el('input');
      input.type = 'color';
      input.value = validHex(value) ? value : fallback;
      const code=el('input');
      code.type='text';
      code.value=validHex(value)?value:'';
      code.placeholder=fallback;
      code.maxLength=7;
      code.setAttribute('aria-label',name+' hex color');
      input.oninput=()=>{code.value=input.value;code.setCustomValidity('')};
      code.oninput=()=>code.setCustomValidity('');
      label.append(input);
      item.append(label,code,button('Save',()=>{
        const next=code.value.trim()||input.value;
        code.setCustomValidity(validHex(next)?'':'Enter a color like #ff80c0.');
        if(code.reportValidity()){input.value=next;update(next)}
      }));
      const reset = button('Reset', () => {update('');input.value=fallback;code.value='';code.setCustomValidity('');});
      item.append(reset);
      grid.append(item);
    }
    function fillSettings() {
      grid.replaceChildren();
      customGrid.replaceChildren();
      for (const [id,name] of sections) {
        colorSetting(grid,name,prefs().sections?.[id],'#a8c1ee',color => {
          (record().sections ??= {})[id] = color;
          save();
          paintSection();
        });
      }
      for (let i = 1; i <= 10; i++) {
        const id = 'custom-'+i;
        colorSetting(customGrid,'Custom '+i,prefs().custom?.[id],'#ad83dc',color => {
          (record().custom ??= {})[id] = color;
          save();
          if (page === 'Calendar' || page === 'Overview') render();
        });
      }
    }
    themes.querySelector('.dashboard-appearance')?.before(options,palette);
    themes.addEventListener('close',fillSettings);
    addEventListener('dashboard:data-applied',fillSettings);
    fillSettings();
  }
  const originalRender = render;
  render = function () {
    originalRender();
    paintSection();
  };
  paintSection();
  if (page === 'Calendar' || page === 'Overview') render();
})();
