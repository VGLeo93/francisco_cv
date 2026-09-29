'use strict';

(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let savedTheme;
  try { savedTheme = localStorage.getItem('theme'); } catch (_) {}
  let explicitChoice = savedTheme === 'dark' || savedTheme === 'light';

  function applyTheme(dark) {
    root.dataset.theme = dark ? 'dark' : 'light';
    if (!toggle) return;
    const label = dark ? 'Use light theme' : 'Use dark theme';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    const text = toggle.querySelector('.theme-label');
    if (text) text.textContent = label;
  }

  applyTheme(explicitChoice ? savedTheme === 'dark' : systemTheme.matches);
  if (toggle) {
    toggle.addEventListener('click', () => {
      const dark = root.dataset.theme !== 'dark';
      explicitChoice = true;
      applyTheme(dark);
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (_) {}
    });
  }
  systemTheme.addEventListener('change', event => {
    if (!explicitChoice) applyTheme(event.matches);
  });

  // Include the full certificate list when printing, then restore the reader's view.
  let printState = null;
  window.addEventListener('beforeprint', () => {
    if (printState) return;
    printState = Array.from(document.querySelectorAll('details'), element => [element, element.open]);
    printState.forEach(([element]) => { element.open = true; });
  });
  window.addEventListener('afterprint', () => {
    if (!printState) return;
    printState.forEach(([element, open]) => { element.open = open; });
    printState = null;
  });
})();
