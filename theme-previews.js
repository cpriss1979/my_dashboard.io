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
    ['electric', 'Electric Bloom']
  ];
  const key = 'glowcode-dashboard-theme';
  const demo = document.body.hasAttribute('data-midnight-demo');
  const studioKey = demo ? 'midnight-glitter-preview' : 'glowcode-theme-studio';
  const intensities = [['off','Off'],['subtle','Subtle'],['dreamy','Dreamy'],['full','Full Glitter']];
  const accents = [['lavender','Lavender'],['pink','Pink'],['ice','Icy Blue'],['mint','Mint'],['peach','Soft Peach']];
  const standardTheme = id => themes.some(([value]) => value === id && id !== 'midnight');
  let base = 'glow';
  let applied = { theme: demo ? 'midnight' : base, intensity: demo ? 'dreamy' : 'off', motion: true, accent: 'lavender' };
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
    body.toggleAttribute('data-glitter-enabled', applied.intensity !== 'off');
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
    const content = main.querySelector('#content');
    if (content) {
      const sparkleBand = document.createElement('div');
      sparkleBand.className = 'midnight-sparkle-band';
      sparkleBand.setAttribute('aria-hidden', 'true');
      for (const symbol of ['✧', '✦', '·', '♡', '✧', '·', '✦', '✧', '·', '✦', '♡', '✧']) {
        const sparkle = document.createElement('span');
        sparkle.textContent = symbol;
        sparkleBand.append(sparkle);
      }
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
      content.before(sparkleBand, welcome);
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
  const motionLabel = document.createElement('label');
  const motion = document.createElement('input');
  motion.type = 'checkbox';
  motionLabel.className = 'theme-studio-motion';
  motionLabel.append(motion, document.createTextNode('Animate sparkles'));
  controls.append(motionLabel);

  function updateControls() {
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
    motion.checked = applied.motion;
    updateControls();
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
      settings.close();
    } catch {
      status.textContent = name + ' applied for this session.';
    }
  };

  settings.addEventListener('close', resetControls);
  resetControls();
  appearance.append(legend, help, grid, controls, apply, status);
  const accountControls = document.getElementById('appSettingsContent');
  if (accountControls) accountControls.before(appearance);
  else settings.append(appearance);
})();
