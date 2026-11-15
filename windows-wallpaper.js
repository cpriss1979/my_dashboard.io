(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('wallpaper') !== 'windows') return;
  document.documentElement.classList.add('windows-wallpaper');
  const controls = document.createElement('div');
  controls.className = 'windows-wallpaper-scroll';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Wallpaper scrolling');
  const gate = document.getElementById('fbAccountGate');

  function scroll(direction) {
    const target = gate && !gate.hidden ? gate : document.scrollingElement;
    if (!target) return;
    const step = Math.max(120, Math.floor(target.clientHeight * .67));
    target.scrollBy({top: direction * step, behavior: 'auto'});
  }

  for (const [direction, symbol, label] of [[-1, '↑', 'Scroll up'], [1, '↓', 'Scroll down']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = symbol;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.onclick = () => scroll(direction);
    controls.append(button);
  }
  document.body.append(controls);
})();
