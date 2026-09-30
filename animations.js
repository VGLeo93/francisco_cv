'use strict';

(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionToggle = document.getElementById('motion-toggle');
  const workflow = document.querySelector('.workflow-visual');
  const runWorkflow = document.getElementById('run-workflow');
  const workflowStatus = document.getElementById('workflow-status');
  const workflowInput = document.getElementById('workflow-input');
  const workflowOutput = document.getElementById('workflow-output');
  const workflowDisclosure = document.querySelector('.workflow-wrap');
  const compactWorkflow = window.matchMedia('(max-width: 700px)');
  const stages = ['receive', 'transform', 'deliver'].map(stage =>
    document.querySelector('.workflow-node[data-flow-stage="' + stage + '"]'));
  const revealAnimations = new Map();
  let savedTheme;
  let savedMotion;
  try { savedTheme = localStorage.getItem('theme'); } catch (_) {}
  try { savedMotion = localStorage.getItem('motion'); } catch (_) {}
  let explicitChoice = savedTheme === 'dark' || savedTheme === 'light';
  let userPaused = savedMotion === 'paused';
  let printing = false;
  let backgrounded = document.visibilityState === 'hidden';
  let workflowTimer = null;
  let workflowRunning = false;
  let pendingResult = null;
  let mobileDemoExpanded = false;

  function listen(media, callback) {
    if (media.addEventListener) media.addEventListener('change', callback);
    else if (media.addListener) media.addListener(callback);
  }

  // Mobile readers reach work first; opening the demo is a native keyboard/touch action.
  function layoutWorkflow() {
    if (!workflowDisclosure) return;
    const focusInside = workflowDisclosure.contains(document.activeElement) &&
      document.activeElement !== workflowDisclosure.querySelector('summary');
    workflowDisclosure.open = !compactWorkflow.matches || mobileDemoExpanded || focusInside;
  }
  if (workflowDisclosure) {
    const summary = workflowDisclosure.querySelector('summary');
    if (summary) summary.addEventListener('click', () => {
      mobileDemoExpanded = !workflowDisclosure.open;
    });
    workflowDisclosure.addEventListener('toggle', queueReadingPosition);
  }
  layoutWorkflow();
  listen(compactWorkflow, layoutWorkflow);

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
  listen(systemTheme, event => {
    if (!explicitChoice) applyTheme(event.matches);
  });

  function cancelReveals() {
    revealAnimations.forEach(animation => animation.cancel());
    revealAnimations.clear();
  }

  function clearStages() {
    stages.forEach(node => {
      if (!node) return;
      delete node.dataset.active;
      delete node.dataset.complete;
    });
  }

  function stopWorkflow(message) {
    if (workflowTimer !== null) window.clearTimeout(workflowTimer);
    workflowTimer = null;
    const wasRunning = workflowRunning;
    workflowRunning = false;
    pendingResult = null;
    if (runWorkflow) runWorkflow.disabled = false;
    if (workflowInput) workflowInput.readOnly = false;
    if (workflow) {
      workflow.setAttribute('aria-busy', 'false');
      if (wasRunning) workflow.dataset.state = 'idle';
    }
    if (wasRunning) {
      clearStages();
      if (workflowOutput) workflowOutput.textContent = 'Run the sample to see the routed message.';
      if (workflowStatus) workflowStatus.textContent = message;
    }
  }

  function motionRunning() {
    return root.dataset.motion === 'running' && !printing && !backgrounded;
  }

  function applyMotion() {
    const mode = printing || backgrounded ? 'paused' : reducedMotion.matches ? 'reduced' : userPaused ? 'paused' : 'running';
    root.dataset.motion = mode;
    if (motionToggle) {
      const label = mode === 'reduced' ? 'Reduced motion' : mode === 'running' ? 'Pause motion' : 'Resume motion';
      motionToggle.setAttribute('aria-pressed', String(mode !== 'running'));
      motionToggle.setAttribute('aria-label', label);
      motionToggle.setAttribute('aria-disabled', String(mode === 'reduced'));
      motionToggle.title = mode === 'reduced' ? 'Your system reduced-motion setting is active.' : label;
      const text = motionToggle.querySelector('.motion-label');
      if (text) text.textContent = mode === 'reduced' ? 'Reduced motion' : 'Motion: ' + (mode === 'running' ? 'on' : 'off');
    }
    if (mode !== 'running') {
      cancelReveals();
      stopWorkflow(backgrounded ? 'Demo paused while tab is hidden' :
        mode === 'reduced' ? 'Reduced motion enabled — ready to run' : 'Motion paused');
    } else if (workflow && workflowStatus && !workflowRunning &&
               !['complete', 'error'].includes(workflow.dataset.state)) {
      // Resume optional motion, not a cancelled demo; announce the real idle state.
      workflowStatus.textContent = 'Ready to run';
    }
  }

  applyMotion();
  if (motionToggle) {
    motionToggle.addEventListener('click', () => {
      // An explicit site preference never overrides the operating-system opt-out.
      if (reducedMotion.matches) return;
      userPaused = !userPaused;
      try { localStorage.setItem('motion', userPaused ? 'paused' : 'running'); } catch (_) {}
      applyMotion();
    });
  }
  listen(reducedMotion, applyMotion);

  // A deterministic, browser-only example. No credentials, network calls or real services.
  function transformPayload(raw) {
    let payload;
    try { payload = JSON.parse(raw); } catch (_) {
      throw new Error('Enter valid JSON with requester, topic and priority.');
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        typeof payload.requester !== 'string' || !payload.requester.trim() || payload.requester.length > 60 ||
        typeof payload.topic !== 'string' || !payload.topic.trim() || payload.topic.length > 120 ||
        !['high', 'normal'].includes(payload.priority)) {
      throw new Error('Use requester (1–60 characters), topic (1–120 characters) and priority "high" or "normal".');
    }
    return {
      channel: payload.priority === 'high' ? '#support-priority' : '#support',
      text: '[' + payload.priority.toUpperCase() + '] ' + payload.requester.trim() + ': ' + payload.topic.trim(),
    };
  }

  function finishWorkflow() {
    workflowTimer = null;
    workflowRunning = false;
    clearStages();
    stages.forEach(node => { if (node) node.dataset.complete = 'true'; });
    workflow.dataset.state = 'complete';
    workflow.setAttribute('aria-busy', 'false');
    workflowStatus.textContent = 'Workflow complete';
    workflowOutput.textContent = JSON.stringify(pendingResult, null, 2);
    workflowInput.readOnly = false;
    pendingResult = null;
    runWorkflow.disabled = false;
  }

  if (workflow && runWorkflow && workflowStatus && workflowInput && workflowOutput && stages.every(Boolean)) {
    workflow.dataset.state = 'idle';
    workflow.setAttribute('aria-busy', 'false');
    workflowInput.addEventListener('input', () => {
      if (workflowRunning) return;
      clearStages();
      workflow.dataset.state = 'idle';
      workflowInput.removeAttribute('aria-invalid');
      workflowInput.setAttribute('aria-describedby', 'workflow-help');
      workflowStatus.textContent = 'Ready to run';
      workflowOutput.textContent = 'Run the sample to see the routed message.';
    });
    runWorkflow.addEventListener('click', () => {
      if (workflowRunning) return;
      clearStages();
      workflowInput.removeAttribute('aria-invalid');
      workflowInput.setAttribute('aria-describedby', 'workflow-help');
      try {
        pendingResult = transformPayload(workflowInput.value);
      } catch (error) {
        workflow.dataset.state = 'error';
        workflowInput.setAttribute('aria-invalid', 'true');
        workflowInput.setAttribute('aria-describedby', 'workflow-help workflow-status');
        workflowStatus.textContent = error.message;
        workflowOutput.textContent = 'Correct the payload, then run it again.';
        return;
      }
      workflowRunning = true;
      workflow.dataset.state = 'running';
      workflow.setAttribute('aria-busy', 'true');
      runWorkflow.disabled = true;
      workflowInput.readOnly = true;
      workflowOutput.textContent = 'Processing the sample…';
      // Reduced or paused motion keeps the demo useful without timed movement.
      if (!motionRunning()) {
        finishWorkflow();
        return;
      }
      const labels = ['Receiving data…', 'Transforming data…', 'Preparing preview…'];
      function showStage(index) {
        stages.forEach(node => { delete node.dataset.active; });
        stages[index].dataset.active = 'true';
        workflowStatus.textContent = labels[index];
        workflowTimer = window.setTimeout(() => {
          if (index + 1 < stages.length) showStage(index + 1);
          else finishWorkflow();
        }, 450);
      }
      showStage(0);
    });
  }

  // Content is visible in the source. These finite enhancements never gate reading.
  const reveals = Array.from(document.querySelectorAll('[data-reveal]'));
  function reveal(element) {
    if (element.dataset.revealed === 'true') return;
    element.dataset.revealed = 'true';
    if (!motionRunning() || !element.animate) return;
    const delay = Math.min(300, Math.max(0, Number(element.dataset.revealDelay) || 0));
    const animation = element.animate([
      { opacity: 0, transform: 'translate3d(0, 22px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    ], { duration: 600, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'none' });
    revealAnimations.set(element, animation);
    animation.finished.then(() => {
      if (revealAnimations.get(element) === animation) revealAnimations.delete(element);
    }, () => {});
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    reveals.forEach(element => observer.observe(element));
  } else {
    reveals.forEach(element => { element.dataset.revealed = 'true'; });
  }
  document.addEventListener('focusin', event => {
    const element = event.target.closest('[data-reveal]');
    const animation = revealAnimations.get(element);
    if (animation) {
      animation.cancel();
      revealAnimations.delete(element);
    }
  });

  const progress = document.getElementById('reading-progress');
  const navTargets = Array.from(document.querySelectorAll('.navigation a[href^="#"]')).map(link => ({
    link, section: document.getElementById(link.getAttribute('href').slice(1)),
  })).filter(target => target.section);
  let scrollFrame = null;
  function updateReadingPosition() {
    scrollFrame = null;
    const range = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const value = range ? Math.max(0, Math.min(1, window.scrollY / range)) : 1;
    root.style.setProperty('--reading-progress', String(value));
    if (progress) {
      progress.style.setProperty('--reading-progress', String(value));
      if (progress.tagName === 'PROGRESS') {
        progress.max = 1;
        progress.value = value;
      }
    }
    const header = document.querySelector('.site-header');
    const checkpoint = Math.max((header ? header.getBoundingClientRect().height : 0) + 24,
      parseFloat(window.getComputedStyle(root).scrollPaddingTop) || 0) + 2;
    const ordered = navTargets.slice().sort((a, b) =>
      a.section.getBoundingClientRect().top - b.section.getBoundingClientRect().top);
    let current = null;
    ordered.forEach(target => {
      if (target.section.getBoundingClientRect().top <= checkpoint) current = target;
    });
    if (range > 0 && window.scrollY >= range - 2) current = ordered[ordered.length - 1] || current;
    navTargets.forEach(target => {
      if (target === current) target.link.setAttribute('aria-current', 'location');
      else target.link.removeAttribute('aria-current');
    });
  }
  function queueReadingPosition() {
    if (!backgrounded && scrollFrame === null) scrollFrame = window.requestAnimationFrame(updateReadingPosition);
  }
  window.addEventListener('scroll', queueReadingPosition, { passive: true });
  window.addEventListener('resize', queueReadingPosition, { passive: true });
  window.addEventListener('hashchange', queueReadingPosition);
  window.addEventListener('load', queueReadingPosition);
  document.addEventListener('visibilitychange', () => {
    backgrounded = document.visibilityState === 'hidden';
    if (backgrounded && scrollFrame !== null) {
      window.cancelAnimationFrame(scrollFrame);
      scrollFrame = null;
    }
    applyMotion();
    if (!backgrounded) queueReadingPosition();
  });
  if (document.fonts) document.fonts.ready.then(queueReadingPosition);
  updateReadingPosition();
  root.classList.add('enhanced');

  // Include the full certificate list when printing, then restore the reader's view.
  let printState = null;
  window.addEventListener('beforeprint', () => {
    if (printState) return;
    printing = true;
    applyMotion();
    printState = Array.from(document.querySelectorAll('details'), element => [element, element.open]);
    printState.forEach(([element]) => { element.open = true; });
  });
  window.addEventListener('afterprint', () => {
    if (!printState) return;
    printState.forEach(([element, open]) => { element.open = open; });
    printState = null;
    printing = false;
    applyMotion();
    queueReadingPosition();
  });
})();
