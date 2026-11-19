(() => {
  'use strict';
  const STORAGE_KEY = 'reclaim.workspace.v1';
  const defaults = { inventory: [], actions: [], activity: [], watching: true };
  let state = loadState();
  let toastTimer;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { ...defaults, ...saved, inventory: Array.isArray(saved.inventory) ? saved.inventory : [], actions: Array.isArray(saved.actions) ? saved.actions : [], activity: Array.isArray(saved.activity) ? saved.activity : [] };
    } catch { return { ...defaults, inventory: [], actions: [], activity: [] }; }
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { showToast('Could not save. Your browser storage may be full.', true); }
  }
  function showToast(message, error = false) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.toggle('error', error); toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }
  function timestamp() { return new Date().toISOString(); }
  function logActivity(title, detail, alert = false) {
    state.activity.unshift({ id: crypto.randomUUID?.() || String(Date.now()), title, detail, at: timestamp(), alert });
    state.activity = state.activity.slice(0, 40); persist(); renderActivity();
  }
  function formatTime(iso) {
    const date = new Date(iso); if (Number.isNaN(date.getTime())) return 'now';
    const mins = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (mins < 1) return 'now'; if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function dateLabel() { $('#todayLabel').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase(); }

  function render() {
    renderInventory(); renderActions(); renderActivity(); renderMetrics();
    $('#watchToggle').setAttribute('aria-checked', String(state.watching));
    $('#watchIndicator').classList.toggle('paused', !state.watching);
    $('#watchIndicator').innerHTML = `<i></i> ${state.watching ? 'READY' : 'PAUSED'}`;
    $('#watchDescription').textContent = state.watching ? 'Record activity you notice. This app cannot inspect traffic from other tabs.' : 'Local reminders paused. Your notes and inventory are unchanged.';
  }
  function renderInventory() {
    const list = $('#inventoryList'); list.replaceChildren();
    state.inventory.slice(0, 5).forEach(item => {
      const node = $('#inventoryItemTemplate').content.firstElementChild.cloneNode(true);
      $('.data-icon', node).textContent = item.icon || '◈'; $('.inventory-name b', node).textContent = item.name;
      $('.inventory-name small', node).textContent = item.source || 'Added manually'; $('.inventory-count', node).textContent = item.count > 1 ? `${item.count} found` : '1 found';
      $('.remove-item', node).addEventListener('click', () => { state.inventory = state.inventory.filter(entry => entry.id !== item.id); persist(); render(); showToast('Inventory item removed.'); });
      list.append(node);
    });
    $('#inventoryEmpty').hidden = state.inventory.length > 0;
    $('#inventoryNavCount').textContent = String(state.inventory.length);
    $('#clearInventoryButton').hidden = state.inventory.length === 0;
  }
  function renderActions() {
    const list = $('#actionList'); list.replaceChildren();
    state.actions.slice(0, 5).forEach(action => {
      const node = $('#actionItemTemplate').content.firstElementChild.cloneNode(true);
      node.classList.toggle('completed', action.done); $('.action-copy b', node).textContent = action.title;
      $('.action-copy small', node).textContent = [action.service, action.notes].filter(Boolean).join(' · ') || 'No notes';
      $('.action-type', node).textContent = action.type;
      $('.check-action', node).setAttribute('aria-label', action.done ? 'Mark action incomplete' : 'Mark action complete');
      $('.check-action', node).addEventListener('click', () => { action.done = !action.done; persist(); render(); logActivity(action.done ? 'Action completed' : 'Action reopened', action.title); });
      $('.delete-action', node).addEventListener('click', () => { state.actions = state.actions.filter(entry => entry.id !== action.id); persist(); render(); showToast('Action removed.'); });
      list.append(node);
    });
    $('#actionsEmpty').hidden = state.actions.length > 0;
  }
  function renderActivity() {
    const list = $('#activityList'); list.replaceChildren();
    state.activity.slice(0, 6).forEach(entry => {
      const node = $('#activityItemTemplate').content.firstElementChild.cloneNode(true);
      node.classList.toggle('alert', !!entry.alert); $('.activity-copy b', node).textContent = entry.title;
      $('.activity-copy small', node).textContent = entry.detail; $('time', node).textContent = formatTime(entry.at); list.append(node);
    });
    $('#activityEmpty').hidden = state.activity.length > 0;
    $('#alertNavCount').textContent = String(state.activity.filter(item => item.alert).length);
  }
  function renderMetrics() {
    const points = state.inventory.reduce((sum, item) => sum + (Number(item.count) || 1), 0);
    const done = state.actions.filter(action => action.done).length;
    const progress = state.actions.length ? Math.round(done / state.actions.length * 100) : 0;
    $('#dataPointsMetric').textContent = String(points); $('#progressMetric').textContent = String(progress);
    $('#progressBar').style.width = `${progress}%`; $('#completedCount').textContent = `${done} completed`;
    $('#totalActions').textContent = `${state.actions.length} action${state.actions.length === 1 ? '' : 's'}`;
    $('#privacyScore').textContent = state.inventory.length ? String(Math.min(95, 35 + state.inventory.length * 8 + done * 4)) : '--';
    const score = state.inventory.length ? Math.min(95, 35 + state.inventory.length * 8 + done * 4) : 0;
    $('#scoreRing').style.background = `conic-gradient(var(--lime) ${score * 3.6}deg, #394239 0)`;
    $('#scoreStatus').textContent = state.inventory.length ? (score >= 70 ? 'Taking control' : 'Good start') : 'Building your picture';
    $('#scoreDescription').textContent = state.inventory.length ? `${state.inventory.length} categories in your local inventory. Keep taking small steps.` : 'Import an account export to start your personal inventory.';
    $('#scoreUpdated').textContent = state.activity.length ? 'RECENT ACTIVITY' : 'JUST NOW';
  }

  function makeId() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function mask(value) {
    const trimmed = value.trim();
    if (trimmed.includes('@')) { const [user, domain] = trimmed.split('@'); return `${user.slice(0, 1)}•••@${domain}`; }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 7) return `•••${digits.slice(-4)}`;
    return `${trimmed.slice(0, 1)}•••`;
  }
  function extractFindings(text, fileName) {
    const patterns = [
      { name: 'Email addresses', icon: '✉', regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
      { name: 'Phone numbers', icon: '⌕', regex: /(?:\+?\d[\d\s().-]{7,}\d)/g },
      { name: 'IP addresses', icon: '⌘', regex: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g }
    ];
    const found = [];
    for (const pattern of patterns) {
      const matches = [...new Set(text.match(pattern.regex) || [])].map(value => value.trim()).filter(value => pattern.name !== 'Phone numbers' || value.replace(/\D/g, '').length >= 8);
      if (matches.length) found.push({ id: makeId(), name: pattern.name, icon: pattern.icon, count: matches.length, source: `${fileName} · example ${mask(matches[0])}` });
    }
    return found;
  }
  async function importFile(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast('Please choose a file smaller than 10 MB.', true); return; }
    try {
      const content = await file.text();
      if (file.name.toLowerCase().endsWith('.json')) JSON.parse(content);
      const found = extractFindings(content, file.name);
      if (!found.length) { logActivity('Import checked', `${file.name} · no supported identifiers found`); showToast('No email, phone, or IPv4 patterns found.'); return; }
      for (const item of found) {
        const existing = state.inventory.find(entry => entry.name === item.name);
        if (existing) { existing.count += item.count; existing.source = item.source; }
        else state.inventory.unshift(item);
      }
      persist(); render();
      logActivity('Local import scanned', `${file.name} · ${found.length} data categories`, true);
      showToast(`Found ${found.length} categories. Raw file contents were discarded.`);
    } catch { showToast('Could not read that file. Try a valid JSON, text, or CSV export.', true); }
  }
  function addAction(data) {
    state.actions.unshift({ id: makeId(), title: data.title.trim(), service: data.service.trim(), type: data.type, notes: data.notes.trim(), done: false, createdAt: timestamp() });
    persist(); render(); logActivity('Reclaim action added', `${data.type}${data.service ? ` · ${data.service}` : ''}`); showToast('Action added to your private checklist.');
  }
  function openActionDialog() { $('#actionDialog').showModal(); }

  const actionDialog = $('#actionDialog');
  $('#actionForm').addEventListener('submit', event => {
    if (event.submitter?.value !== 'save') return;
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!data.title.trim()) return; addAction(data); event.currentTarget.reset(); actionDialog.close();
  });
  $('#activityForm').addEventListener('submit', event => {
    if (event.submitter?.value !== 'save') return;
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    logActivity(data.event, `${data.service}${data.details ? ` · ${data.details}` : ''}`, data.event.includes('alert')); event.currentTarget.reset(); $('#activityDialog').close(); showToast('Note saved on this device.');
  });
  $('#quickImportButton').addEventListener('click', () => $('#fileInput').click());
  $('#emptyImportButton').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', event => { importFile(event.target.files[0]); event.target.value = ''; });
  $('#addActionButton').addEventListener('click', openActionDialog); $('#createActionEmpty').addEventListener('click', openActionDialog);
  $('#addActivityButton').addEventListener('click', () => $('#activityDialog').showModal());
  $('#watchToggle').addEventListener('click', event => {
    state.watching = !state.watching; persist(); render();
    logActivity(state.watching ? 'Local reminders enabled' : 'Local reminders paused', 'Manual activity log only · no traffic captured');
    showToast(state.watching ? 'Local reminders enabled.' : 'Local reminders paused.');
  });
  $('#settingsButton').addEventListener('click', () => $('#settingsDialog').showModal());
  $('#clearInventoryButton').addEventListener('click', () => {
    if (!state.inventory.length || !confirm('Clear all inventory categories from this browser?')) return;
    state.inventory = []; persist(); render(); logActivity('Inventory cleared', 'Removed all saved categories'); showToast('Inventory cleared.');
  });
  $('#clearActivityButton').addEventListener('click', () => {
    if (!state.activity.length || !confirm('Clear the local activity log?')) return;
    state.activity = []; persist(); render(); showToast('Activity log cleared.');
  });
  $('#viewInventoryButton').addEventListener('click', () => document.querySelector('#inventory').scrollIntoView({ behavior: 'smooth' }));
  $('#exportButton').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ app: 'RECLAIM', exportedAt: timestamp(), ...state }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `reclaim-workspace-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href);
    logActivity('Workspace exported', 'A JSON backup was downloaded'); showToast('Workspace backup downloaded. Store it carefully.');
  });
  $('#wipeWorkspaceButton').addEventListener('click', () => {
    if (!confirm('Erase your entire RECLAIM workspace from this browser? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY); state = { ...defaults, inventory: [], actions: [], activity: [] }; render(); $('#settingsDialog').close(); showToast('Local workspace erased.');
  });

  const requestDialog = $('#requestDialog');
  function requestText() {
    const name = $('#requestName').value.trim() || '[Your name]'; const service = $('#requestService').value.trim() || '[Organization]';
    const kind = $('#requestType').value;
    const body = kind === 'delete'
      ? `Hello ${service} Privacy Team,\n\nI am writing to request deletion of the personal data associated with my account and identifying information. Please also let me know whether any data has been shared with third parties and whether deletion can be propagated to those recipients.\n\nPlease confirm when this request has been completed, or let me know what information you need to verify my identity. I am happy to use your official secure verification process.\n\nRegards,\n${name}`
      : kind === 'access'
      ? `Hello ${service} Privacy Team,\n\nI would like to request a copy of the personal data associated with my account, including the categories and sources of the data, purposes of processing, retention periods, and recipients with whom it has been shared. Please provide the information through your official secure process.\n\nPlease let me know if you need additional information to locate my account or verify my identity.\n\nRegards,\n${name}`
      : `Hello ${service} Privacy Team,\n\nPlease record my preference to opt out of using my personal information to train or improve AI models, where this choice is available. Please also let me know how this preference applies to data already collected and any data shared with service providers.\n\nPlease confirm this preference and let me know if you need additional information to locate my account.\n\nRegards,\n${name}`;
    return body;
  }
  function updateRequestPreview() { $('#requestPreview').textContent = requestText(); }
  $('#requestService').addEventListener('input', updateRequestPreview); $('#requestName').addEventListener('input', updateRequestPreview); $('#requestType').addEventListener('change', updateRequestPreview);
  $('#copyRequestButton').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(requestText()); showToast('Request copied. Review it before sending.'); }
    catch { const area = document.createElement('textarea'); area.value = requestText(); document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); showToast('Request copied. Review it before sending.'); }
    $('#requestDialog').close();
  });
  document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => {
    $$('.nav-link').forEach(item => item.classList.remove('active')); link.classList.add('active');
  }));
  // Attach request preparation to deletion-type checklist items without auto-submitting anything.
  $('#actionList').addEventListener('click', event => {
    const row = event.target.closest('.action-item');
    if (!row || event.target.closest('button')) return;
    const title = $('.action-copy b', row)?.textContent || '';
    if (/delet|access|opt.?out|request/i.test(title)) {
      $('#requestService').value = $('.action-copy small', row)?.textContent.split(' · ')[0] || '';
      updateRequestPreview(); requestDialog.showModal();
    }
  });
  dateLabel(); render();
})();
