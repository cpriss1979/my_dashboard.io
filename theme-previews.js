(function () {
  'use strict';
  const settings = document.getElementById('appSettings');
  const themes = [
    ['glow', 'Original Glow'],
    ['midnight', 'Midnight Glitter'],
    ['ocean', 'Ocean'],
    ['dusk', 'Lavender Dusk']
  ];
  const key = 'glowcode-dashboard-theme';
  const demo = document.body.hasAttribute('data-midnight-demo');
  const studioKey = demo ? 'midnight-glitter-preview' : 'glowcode-theme-studio';
  const intensities = [['off','Off'],['subtle','Subtle'],['dreamy','Dreamy'],['full','Full Glitter']];
  const accents = [['lavender','Lavender'],['pink','Pink'],['ice','Icy Blue'],['mint','Mint'],['peach','Soft Peach']];
  const standardTheme = id => themes.some(([value]) => value === id && id !== 'midnight');
  let base = 'glow';
  let applied = { theme: demo ? 'midnight' : base, intensity: 'dreamy', motion: true, accent: 'lavender' };
  try {
    const previous = localStorage.getItem(key);
    if (!demo && standardTheme(previous)) base = previous;
    if (!demo) applied.theme = base;
    const saved = JSON.parse(localStorage.getItem(studioKey) || 'null');
    if (saved) {
      if (themes.some(([id]) => id === saved.theme)) applied.theme = saved.theme;
      if (intensities.some(([id]) => id === saved.intensity)) applied.intensity = saved.intensity;
      if (accents.some(([id]) => id === saved.accent)) applied.accent = saved.accent;
      if (typeof saved.motion === 'boolean') applied.motion = saved.motion;
    }
  } catch {}

  function applyAppearance() {
    const body = document.body;
    if (applied.theme !== 'midnight') base = applied.theme;
    body.dataset.dashboardTheme = base;
    body.toggleAttribute('data-midnight-glitter', applied.theme === 'midnight');
    body.dataset.glitterIntensity = applied.intensity;
    body.dataset.glitterMotion = applied.motion ? 'on' : 'off';
    body.dataset.glitterAccent = applied.accent;
  }

  applyAppearance();
  const main = document.querySelector('body > main');
  if (main) {
    const ornaments = document.createElement('div');
    ornaments.className = 'midnight-ornaments';
    ornaments.setAttribute('aria-hidden', 'true');
    for (const symbol of ['✦', '♡', '🦋', '✧']) {
      const ornament = document.createElement('span');
      ornament.textContent = symbol;
      ornaments.append(ornament);
    }
    main.prepend(ornaments);
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
  const motionLabel = document.createElement('label');
  const motion = document.createElement('input');
  motion.type = 'checkbox';
  motionLabel.className = 'theme-studio-motion';
  motionLabel.append(motion, document.createTextNode('Animate Midnight Glitter'));
  controls.append(motionLabel);

  const apply = document.createElement('button');
  apply.type = 'button';
  apply.className = 'secondary';
  apply.textContent = 'Apply theme';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const help = document.createElement('p');
  help.textContent = 'Midnight Glitter preview styles Home and the sidebar. Motion follows your device’s reduced-motion setting.';

  function resetControls() {
    choices.get(applied.theme).checked = true;
    intensity.value = applied.intensity;
    accent.value = applied.accent;
    motion.checked = applied.motion;
    status.textContent = '';
  }

  apply.onclick = () => {
    const selected = themes.find(([id]) => choices.get(id).checked);
    if (!selected) return;
    const [id, name] = selected;
    applied = { theme: id, intensity: intensity.value, accent: accent.value, motion: motion.checked };
    applyAppearance();
    try {
      localStorage.setItem(studioKey, JSON.stringify(applied));
      if (!demo) localStorage.setItem(key, base);
      status.textContent = name + ' applied.';
    } catch {
      status.textContent = name + ' applied for this session.';
    }
  };

  settings.addEventListener('close', resetControls);
  resetControls();
  appearance.append(legend, help, grid, controls, apply, status);
  settings.append(appearance);
})();
