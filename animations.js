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
  const workflowForm = document.getElementById('workflow-form');
  const workflowRequester = document.getElementById('workflow-requester');
  const workflowExample = document.getElementById('workflow-example');
  const workflowPriority = document.getElementById('workflow-priority');
  const workflowCard = document.getElementById('workflow-card');
  const workflowEmpty = document.getElementById('workflow-empty');
  const formFields = [workflowExample, workflowRequester, workflowPriority, workflowInput].filter(Boolean);
  const emptyMessage = 'Your organized request will appear here, with a team, a next step, and a reply draft.';
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

  function lockForm(locked) {
    formFields.forEach(field => {
      if (field.tagName === 'SELECT') field.disabled = locked;
      else field.readOnly = locked;
    });
  }

  function clearResult(message = emptyMessage) {
    if (workflowCard) {
      workflowCard.hidden = true;
      workflowCard.querySelectorAll('[id^="result-"]').forEach(element => { element.textContent = ''; });
    }
    if (workflowEmpty) {
      workflowEmpty.hidden = false;
      workflowEmpty.textContent = message;
    }
    if (workflowOutput) delete workflowOutput.dataset.priority;
  }

  function clearValidation() {
    formFields.forEach(field => {
      field.removeAttribute('aria-invalid');
      field.setAttribute('aria-describedby', 'workflow-help');
    });
  }

  function stopWorkflow(message) {
    if (workflowTimer !== null) window.clearTimeout(workflowTimer);
    workflowTimer = null;
    const wasRunning = workflowRunning;
    workflowRunning = false;
    pendingResult = null;
    if (runWorkflow) runWorkflow.disabled = false;
    lockForm(false);
    if (workflow) {
      workflow.setAttribute('aria-busy', 'false');
      if (wasRunning) workflow.dataset.state = 'idle';
    }
    if (wasRunning) {
      clearStages();
      clearResult();
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
        mode === 'reduced' ? 'Reduced motion enabled — ready to try' : 'Motion paused');
    } else if (workflow && workflowStatus && !workflowRunning &&
               !['complete', 'error'].includes(workflow.dataset.state)) {
      // Resume optional motion, not a cancelled demo; announce the real idle state.
      workflowStatus.textContent = 'Ready to try';
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

  // Rules and templates run entirely in the browser. No backend or AI service is simulated.
  const examples = {
    support: {
      topic: 'Help signing in', priority: 'high', team: 'Technical support',
      normal: 'Add to the support queue for review.',
      high: 'Move the request to the priority support queue.',
    },
    onboarding: {
      topic: 'Set up a new account', priority: 'normal', team: 'Onboarding',
      normal: 'Prepare the account setup checklist.',
      high: 'Flag the setup request for priority review.',
    },
    billing: {
      topic: 'Check an invoice', priority: 'normal', team: 'Billing',
      normal: 'Review the invoice and payment details.',
      high: 'Flag the invoice for priority review.',
    },
  };

  function invalidField(field, message) {
    const error = new Error(message);
    error.field = field;
    return error;
  }

  function prepareRequest() {
    const requester = workflowRequester.value.trim();
    const topic = workflowInput.value.trim();
    const kind = workflowExample.value;
    const priority = workflowPriority.value;
    if (!requester || requester.length > 60) {
      throw invalidField(workflowRequester, 'Add a name using 1–60 characters.');
    }
    if (!topic || topic.length > 120) {
      throw invalidField(workflowInput, 'Describe the request using 1–120 characters.');
    }
    if (!['support', 'onboarding', 'billing'].includes(kind)) {
      throw invalidField(workflowExample, 'Choose one of the example requests.');
    }
    if (!['normal', 'high'].includes(priority)) {
      throw invalidField(workflowPriority, 'Choose Normal or Urgent.');
    }
    const example = examples[kind];
    return {
      requester, topic, priority: priority === 'high' ? 'Urgent' : 'Normal',
      team: example.team, action: example[priority],
      reply: 'Hi ' + requester + ', thanks for sharing "' + topic + '". ' +
        (priority === 'high' ? 'This is marked urgent for ' : 'This is ready for ') +
        example.team + ' to review.',
    };
  }

  function finishWorkflow() {
    workflowTimer = null;
    workflowRunning = false;
    clearStages();
    stages.forEach(node => { if (node) node.dataset.complete = 'true'; });
    workflow.dataset.state = 'complete';
    workflow.setAttribute('aria-busy', 'false');
    workflowStatus.textContent = 'Request prepared';
    Object.entries(pendingResult).forEach(([key, value]) => {
      document.getElementById('result-' + key).textContent = value;
    });
    workflowOutput.dataset.priority = pendingResult.priority.toLowerCase();
    workflowCard.hidden = false;
    workflowEmpty.hidden = true;
    lockForm(false);
    pendingResult = null;
    runWorkflow.disabled = false;
  }

  if (workflow && runWorkflow && workflowStatus && workflowForm && formFields.length === 4 &&
      workflowOutput && workflowCard && workflowEmpty && stages.every(Boolean)) {
    workflow.dataset.state = 'idle';
    workflow.setAttribute('aria-busy', 'false');
    function resetPreview() {
      if (workflowRunning) return;
      clearStages();
      workflow.dataset.state = 'idle';
      clearValidation();
      workflowStatus.textContent = 'Ready to try';
      clearResult();
    }
    workflowForm.addEventListener('input', resetPreview);
    workflowPriority.addEventListener('change', resetPreview);
    workflowExample.addEventListener('change', () => {
      if (workflowRunning || !Object.prototype.hasOwnProperty.call(examples, workflowExample.value)) return;
      const example = examples[workflowExample.value];
      workflowInput.value = example.topic;
      workflowPriority.value = example.priority;
      resetPreview();
    });
    workflowForm.addEventListener('submit', event => {
      event.preventDefault();
      if (workflowRunning) return;
      clearStages();
      clearValidation();
      try {
        pendingResult = prepareRequest();
      } catch (error) {
        workflow.dataset.state = 'error';
        error.field.setAttribute('aria-invalid', 'true');
        error.field.setAttribute('aria-describedby', 'workflow-help workflow-status');
        workflowStatus.textContent = error.message;
        clearResult('Fix the highlighted field, then try again.');
        error.field.focus();
        return;
      }
      workflowRunning = true;
      workflow.dataset.state = 'running';
      workflow.setAttribute('aria-busy', 'true');
      runWorkflow.disabled = true;
      lockForm(true);
      clearResult('Organizing the request…');
      // Reduced or paused motion keeps the demo useful without timed movement.
      if (!motionRunning()) {
        finishWorkflow();
        return;
      }
      const labels = ['Checking the details…', 'Choosing the next step…', 'Preparing a reply draft…'];
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
