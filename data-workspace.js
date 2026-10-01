'use strict';

(() => {
  const dialog = document.getElementById('data-workspace');
  const launch = document.getElementById('open-workspace');
  if (!dialog || !launch) return;

  const sample = [
    { id: 'c1', name: '  Maya Chen  ', company: 'Northstar Studio', email: 'MAYA@EXAMPLE.COM ' },
    { id: 'c2', name: 'Maya Chen', company: 'Northstar Studio', email: 'maya@example.com' },
    { id: 'c3', name: 'Luis Ortega', company: 'Cedar Works', email: 'luis@example.com' },
    { id: 'c4', name: 'Nora Patel', company: 'Harbor Labs', email: '' },
    { id: 'c5', name: 'Amir Hassan', company: '', email: 'amir@example.com' },
    { id: 'c6', name: 'Sofia Rivera', company: 'Fieldwork', email: 'sofia.example.com' },
  ];
  const labels = { raw: 'Not checked', ready: 'Ready', review: 'Needs review', duplicate: 'Duplicate' };
  const fields = Object.fromEntries(['name', 'company', 'email'].map(key => [key, document.getElementById('record-' + key)]));
  const list = document.getElementById('record-list');
  const form = document.getElementById('record-form');
  const exportButton = document.getElementById('export-records');
  const status = document.getElementById('workspace-status');
  let records;
  let results;
  let processed = false;
  let selected = 'c1';
  let filter = 'all';

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function tidy(value) { return value.trim().replace(/\s+/g, ' '); }

  function checkRecords() {
    const keptEmails = new Map();
    return records.map(record => {
      const next = { ...record, name: tidy(record.name), company: tidy(record.company), email: record.email.trim().toLowerCase(), errors: {}, notes: [] };
      if (!next.name) next.errors.name = 'Add a name.';
      if (!next.company) next.errors.company = 'Add a company.';
      if (!next.email) next.errors.email = 'Add an email address.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) next.errors.email = 'Check the email format, for example nora@example.com.';
      next.notes = Object.values(next.errors);
      if (next.notes.length) {
        next.state = 'review';
      } else if (keptEmails.has(next.email)) {
        next.state = 'duplicate';
        next.notes.push('Same email as ' + keptEmails.get(next.email) + '. The first complete record is kept for export.');
      } else {
        next.state = 'ready';
        keptEmails.set(next.email, next.name);
        next.notes.push('Required details are present and this email is unique in the ready list.');
      }
      if (next.name !== record.name || next.company !== record.company || next.email !== record.email) {
        next.notes.push('Extra spaces or email capitalization were cleaned up.');
      }
      return next;
    });
  }

  function totals() {
    return Object.fromEntries(['ready', 'review', 'duplicate'].map(key => [key, results.filter(record => record.state === key).length]));
  }

  function announce(prefix) {
    const counts = totals();
    status.textContent = prefix + ' ' + counts.ready + ' ready, ' + counts.review + ' needing review, ' + counts.duplicate + ' duplicate' + (counts.duplicate === 1 ? '.' : 's.');
  }

  function renderInspector() {
    const record = results.find(row => row.id === selected);
    form.hidden = !record;
    document.getElementById('inspector-empty').hidden = !!record;
    if (!record) return;
    const state = document.getElementById('record-state');
    state.textContent = labels[record.state];
    state.dataset.state = record.state;
    const notes = document.getElementById('record-notes');
    notes.replaceChildren(...record.notes.map(text => node('li', '', text)));
    document.getElementById('record-fields').disabled = !processed;
    Object.entries(fields).forEach(([key, input]) => {
      input.value = record[key];
      input.setAttribute('aria-invalid', String(!!record.errors[key]));
    });
  }

  function render() {
    const counts = totals();
    document.getElementById('count-total').textContent = String(results.length);
    ['ready', 'review', 'duplicate'].forEach(key => {
      document.getElementById('count-' + key).textContent = processed ? String(counts[key]) : '—';
    });
    exportButton.disabled = !processed || counts.ready === 0;
    document.querySelectorAll('[data-filter]').forEach(button => {
      button.disabled = !processed && button.dataset.filter !== 'all';
      button.setAttribute('aria-pressed', String(filter === button.dataset.filter));
    });
    const visible = results.filter(row => filter === 'all' || row.state === filter);
    if (!visible.some(row => row.id === selected)) selected = visible[0]?.id || null;
    document.getElementById('records-empty').hidden = visible.length > 0;
    list.replaceChildren(...visible.map(record => {
      const li = node('li');
      const button = node('button', 'record-button');
      button.type = 'button';
      button.dataset.record = record.id;
      button.setAttribute('aria-pressed', String(selected === record.id));
      const identity = node('span', 'record-identity');
      identity.append(node('span', 'record-person', record.name.trim() || 'Name missing'), node('span', 'record-company', record.company || 'Company missing'));
      const badge = node('span', 'record-badge', labels[record.state]);
      badge.dataset.state = record.state;
      button.append(identity, node('span', 'record-email', record.email || 'Email missing'), badge);
      li.append(button);
      return li;
    }));
    renderInspector();
  }

  function reset() {
    records = sample.map(record => ({ ...record }));
    results = records.map(record => ({ ...record, state: 'raw', errors: {}, notes: ['Run cleanup to see the checks and edit this record.'] }));
    processed = false;
    selected = 'c1';
    filter = 'all';
    render();
    status.textContent = 'Start with “Clean sample data” to find formatting issues, missing details and duplicates.';
  }

  launch.addEventListener('click', () => {
    dialog.showModal();
    document.documentElement.classList.add('workspace-open');
  });
  document.getElementById('close-workspace').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('workspace-open');
    launch.focus({ preventScroll: true });
  });
  document.getElementById('clean-records').addEventListener('click', () => {
    processed = true;
    filter = 'all';
    results = checkRecords();
    selected = results.find(row => row.state === 'review')?.id || results[0].id;
    render();
    announce('Cleanup complete.');
  });
  document.getElementById('reset-records').addEventListener('click', reset);
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    render();
  }));
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-record]');
    if (!button) return;
    selected = button.dataset.record;
    // Keep the clicked button in the DOM so keyboard focus is preserved.
    list.querySelectorAll('[data-record]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    renderInspector();
    if (window.matchMedia('(max-width: 800px)').matches) {
      const heading = document.getElementById('inspector-heading');
      heading.scrollIntoView({ behavior: 'instant', block: 'start' });
      heading.focus({ preventScroll: true });
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!processed || !selected) return;
    const record = records.find(row => row.id === selected);
    Object.entries(fields).forEach(([key, input]) => { record[key] = input.value.slice(0, input.maxLength); });
    results = checkRecords();
    filter = 'all';
    render();
    announce('Record updated and checked.');
  });

  function csvCell(value) {
    // Quoting preserves commas/quotes; a prefix keeps spreadsheet formulas inert.
    const text = /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  exportButton.addEventListener('click', () => {
    if (!processed) return;
    const ready = results.filter(record => record.state === 'ready');
    if (!ready.length) return;
    const csv = [['Name', 'Company', 'Email'], ...ready.map(record => [record.name, record.company, record.email])]
      .map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
    const href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = node('a');
    link.href = href;
    link.download = 'fictional-contacts-cleaned.csv';
    dialog.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    status.textContent = 'CSV prepared with ' + ready.length + ' ready contacts. Duplicates and records needing review are excluded.';
  });
  reset();
  launch.disabled = false;
})();
