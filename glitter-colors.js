(function () {
  'use strict';
  const settings = document.getElementById('appSettings');
  const themes = [
    ['glow', 'Original Glow'],
    ['midnight', 'Midnight Glitter'],
    ['ocean', 'Ocean'],
    ['dusk', 'Lavender Dusk'],
    ['sage', 'Sage Garden'],
    ['peach', 'Peach Sunrise'],
    ['honey', 'Honey Glow'],
    ['blueberry', 'Blueberry Dream'],
    ['citrus', 'Citrus Pop'],
    ['electric', 'Electric Bloom'],
    ['custom', 'Custom']
  ];
  const key = 'glowcode-dashboard-theme';
  const demo = document.body.hasAttribute('data-midnight-demo');
  const studioKey = demo ? 'midnight-glitter-preview' : 'glowcode-theme-studio';
  const intensities = [['off','Off'],['subtle','Subtle'],['dreamy','Dreamy'],['full','Full Glitter']];
  const accents = [['lavender','Lavender'],['pink','Pink'],['ice','Icy Blue'],['mint','Mint'],['peach','Soft Peach']];
  const glitterColors = [
    ['rainbow','Rainbow'], ['rose','Hot Pink'], ['gold','Gold'],
    ['cyan','Electric Blue'], ['lime','Lime'], ['violet','Violet'],
    ['silver','Silver'], ['coral','Coral']
  ];
  const customFields = [
    ['background', 'Page background', '#080b1e'],
    ['sidebar', 'Sidebar top', '#16102b'],
    ['sidebar-end', 'Sidebar bottom', '#090e24'],
    ['header', 'Top bar', '#0c1128'],
    ['accent', 'Active tab start', '#7637a4'],
    ['accent-end', 'Active tab end', '#285f9c'],
    ['page-panel', 'Page cards', '#e3edf8'],
    ['finance-panel', 'Finance panels', '#fff2dd'],
    ['light-text', 'Shell text', '#eef1fc'],
    ['panel-text', 'Card text', '#22334c'],
    ['glitter-one', 'Glitter color 1', '#f3c2ff'],
    ['glitter-two', 'Glitter color 2', '#81eaff'],
    ['glitter-three', 'Glitter color 3', '#ffd28e']
  ];
  function customPalette(saved) {
    return Object.fromEntries(customFields.map(([id, , fallback]) => [
      id, typeof saved?.[id] === 'string' && /^#[0-9a-f]{6}$/i.test(saved[id]) ? saved[id] : fallback
    ]));
  }
  function paintCustomPalette(element, colors) {
    for (const [id] of customFields) {
      const token = '--' + (id.startsWith('glitter-') ? id : 'theme-' + id);
      if (colors) element.style.setProperty(token, colors[id]);
      else element.style.removeProperty(token);
    }
  }

  const standardTheme = id => themes.some(([value]) => value === id && id !== 'midnight' && id !== 'custom');
  let base = 'glow';
  let applied = { theme: demo ? 'midnight' : base, intensity: demo ? 'dreamy' : 'off', motion: true, accent: 'lavender', glitterColor: 'rainbow', custom: customPalette() };
  try {
    const previous = localStorage.getItem(key);
    if (!demo && standardTheme(previous)) base = previous;
    if (!demo) applied.theme = base;
    const saved = JSON.parse(localStorage.getItem(studioKey) || 'null');
    if (saved) {
      applied.custom = customPalette(saved.custom);
      if (themes.some(([id]) => id === saved.theme)) applied.theme = saved.theme;
      if (intensities.some(([id]) => id === saved.intensity)) applied.intensity = saved.intensity;
      if (accents.some(([id]) => id === saved.accent)) applied.accent = saved.accent;
      if (glitterColors.some(([id]) => id === saved.glitterColor)) applied.glitterColor = saved.glitterColor;
      if (typeof saved.motion === 'boolean') applied.motion = saved.motion;
    }
  } catch {}

  const sparkleLayer = document.createElement('div');
  sparkleLayer.className = 'journal-magic-layer home-journal-sparkles';
  sparkleLayer.setAttribute('aria-hidden', 'true');
  document.body.append(sparkleLayer);

  function scatter(star, dot) {
    const random = (min, max) => min + Math.random() * (max - min);
    const duration = random(2.4, 6.2);
    const values = {
      x: random(2, 98) + '%',
      y: random(2, 98) + '%',
      size: (dot ? random(4, 8) : random(12, 24)) + 'px',
      duration: duration + 's',
      delay: -random(0, duration) + 's',
      'drift-x': random(-90, 90) + 'px',
      'drift-y': random(-110, 110) + 'px'
    };
    for (const [key, value] of Object.entries(values)) star.style.setProperty('--spark-' + key, value);
  }

  function refreshSparkles() {
    const counts = { off: 0, subtle: 18, dreamy: 36, full: 56 };
    const colors = ['one', 'two', 'three'];
    sparkleLayer.replaceChildren();
    for (let index = 0; index < counts[applied.intensity]; index++) {
      const dot = index % 2 === 1;
      const star = document.createElement('i');
      star.className = 'journal-magic-star' + (dot ? ' glitter-dot' : '');
      star.style.setProperty('--spark-color', 'var(--glitter-' + colors[index % colors.length] + ')');
      scatter(star, dot);
      star.addEventListener('animationiteration', event => {
        if (event.animationName === 'journalRandomFloat') {
          star.style.setProperty('--spark-x', (2 + Math.random() * 96) + '%');
          star.style.setProperty('--spark-y', (2 + Math.random() * 96) + '%');
        }
      });
      sparkleLayer.append(star);
    }
  }

  function applyAppearance() {
    const body = document.body;
    if (standardTheme(applied.theme)) base = applied.theme;
    body.dataset.dashboardTheme = applied.theme === 'custom' ? 'custom' : base;
    paintCustomPalette(body, applied.theme === 'custom' ? applied.custom : null);
    body.toggleAttribute('data-midnight-glitter', applied.theme === 'midnight');
    body.toggleAttribute('data-glitter-enabled', applied.intensity !== 'off');
    body.dataset.glitterIntensity = applied.intensity;
    body.dataset.glitterMotion = applied.motion ? 'on' : 'off';
    body.dataset.glitterAccent = applied.accent;
    body.dataset.glitterColor = applied.glitterColor;
    refreshSparkles();
  }

  applyAppearance();
  const main = document.querySelector('body > main');
  if (main) {
    const content = main.querySelector('#content');
    if (content) {
      const welcome = document.createElement('section');
      welcome.className = 'midnight-home-welcome';
      const label = document.createElement('p');
      label.className = 'midnight-home-kicker';
      label.textContent = 'Midnight Glitter';
      const title = document.createElement('h1');
      title.textContent = 'A little glow for your day.';
      const subtitle = document.createElement('p');
      subtitle.textContent = 'Your schedule, priorities, and favorite places together.';
      welcome.append(label, title, subtitle);
      if (settings) {
        const studio = document.createElement('button');
        studio.type = 'button';
        studio.className = 'secondary midnight-home-studio';
        studio.textContent = 'Theme Studio';
        studio.onclick = () => { if (!settings.open) settings.showModal(); };
        welcome.append(studio);
      }
      if (!demo) content.before(welcome);
    }
  }
  if (!settings) return;

  const appearance = document.createElement('fieldset');
  appearance.className = 'dashboard-appearance';
  const legend = document.createElement('legend');
  legend.textContent = 'Theme Studio';
  const grid = document.createElement('div');
  grid.className = 'theme-preview-grid';
  const choices = new Map();

  for (const [id, name] of themes) {
    const option = document.createElement('label');
    option.className = 'theme-preview-option';
    option.dataset.dashboardTheme = id;
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'dashboardAppearance';
    radio.value = id;
    radio.checked = id === applied.theme;
    choices.set(id, radio);

    const sample = document.createElement('span');
    sample.className = 'theme-preview-sample';
    sample.setAttribute('aria-hidden', 'true');
    for (const area of ['nav', 'header', 'panel']) {
      const part = document.createElement('span');
      part.className = 'theme-preview-' + area;
      sample.append(part);
    }
    option.append(radio, document.createTextNode(name), sample);
    grid.append(option);
  }

  const controls = document.createElement('div');
  controls.className = 'theme-studio-controls';
  function selectControl(label, options) {
    const wrapper = document.createElement('label');
    const select = document.createElement('select');
    wrapper.append(document.createTextNode(label), select);
    for (const [id, name] of options) select.add(new Option(name, id));
    controls.append(wrapper);
    return select;
  }
  const intensity = selectControl('Sparkle intensity', intensities);
  const accent = selectControl('Accent color', accents);
  const glitterColor = selectControl('Glitter color', glitterColors);
  const motionLabel = document.createElement('label');
  const motion = document.createElement('input');
  motion.type = 'checkbox';
  motionLabel.className = 'theme-studio-motion';
  motionLabel.append(motion, document.createTextNode('Animate sparkles'));
  controls.append(motionLabel);

  const palette = document.createElement('fieldset');
  palette.className = 'custom-theme-palette';
  const paletteTitle = document.createElement('legend');
  paletteTitle.textContent = 'Custom palette';
  const swatches = document.createElement('div');
  swatches.className = 'custom-theme-swatches';
  const colorInputs = new Map();
  function readColors() {
    return customPalette(Object.fromEntries([...colorInputs].map(([id, input]) => [id, input.value])));
  }
  function previewCustom() {
    paintCustomPalette(choices.get('custom').parentElement, readColors());
  }
  for (const [id, name] of customFields) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'color';
    input.value = applied.custom[id];
    input.addEventListener('input', previewCustom);
    colorInputs.set(id, input);
    label.append(input, document.createTextNode(name));
    swatches.append(label);
  }
  palette.append(paletteTitle, swatches);

  function updateControls() {
    const customSelected = choices.get('custom').checked;
    palette.hidden = !customSelected;
    glitterColor.disabled = customSelected;
    accent.disabled = customSelected;
    previewCustom();
    choices.get('midnight').parentElement.dataset.glitterAccent = accent.value;
  }
  for (const radio of choices.values()) radio.addEventListener('change', updateControls);
  accent.addEventListener('change', updateControls);

  const apply = document.createElement('button');
  apply.type = 'button';
  apply.className = 'secondary';
  apply.textContent = 'Apply theme and close';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const help = document.createElement('p');
  help.textContent = 'Sparkles work with every theme on Home and the sidebar. Choose Off to hide them, or turn animation off to keep them still.';

  function resetControls() {
    choices.get(applied.theme).checked = true;
    intensity.value = applied.intensity;
    accent.value = applied.accent;
    glitterColor.value = applied.glitterColor;
    motion.checked = applied.motion;
    for (const [id, input] of colorInputs) input.value = applied.custom[id];
    updateControls();
    status.textContent = '';
  }

  apply.onclick = () => {
    const selected = themes.find(([id]) => choices.get(id).checked);
    if (!selected) return;
    const [id, name] = selected;
    applied = { theme: id, intensity: intensity.value, accent: accent.value, glitterColor: glitterColor.value, motion: motion.checked, custom: readColors() };
    applyAppearance();
    try {
      localStorage.setItem(studioKey, JSON.stringify(applied));
      if (!demo) localStorage.setItem(key, base);
      settings.close();
    } catch {
      status.textContent = name + ' applied for this session.';
    }
  };

  settings.addEventListener('close', resetControls);
  resetControls();
  appearance.append(legend, help, grid, controls, palette, apply, status);
  const accountControls = document.getElementById('appSettingsContent');
  if (accountControls) accountControls.before(appearance);
  else settings.append(appearance);
})();
