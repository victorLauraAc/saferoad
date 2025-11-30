// main.js - Principal JS para Safaroad

(function () {
  'use strict';

  // Utils
  const $ = (sel, parent = document) => parent.querySelector(sel);
  const $$ = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));

  const STORAGE_KEYS = {
    INCIDENTS: 'safaroadIncidents',
    CHATS: 'safaroadChats',
    DRAFTS: 'safaroadDrafts',
    ACTIONS: 'safaroadActions',
    NOTIFICATIONS: 'safaroadNotifications',
    USERS: 'safaroadUsers',
  };

  function isAppPage(){
    try { const p = window.location.pathname || ''; return p.endsWith('/app.html') || p.endsWith('app.html') || window.location.href.includes('app.html'); } catch(e){ return false; }
  }

  // Sample users and data
  function ensureSampleData() {
    if (!localStorage.getItem(STORAGE_KEYS.INCIDENTS)) {
      const sample = [
        {
          id: genId(),
          type: 'huayco',
          severity: 'prioritario',
          title: 'Huayco detectado',
          description: 'Huayco en Carretera Central - km 45',
          lat: -12.0,
          lng: -75.0,
          date: Date.now() - 1000 * 60 * 60 * 24,
          image: 'img2/huayco.jpg',
          audio: null,
          user: 'admin',
          comments: [],
          resolved: false,
        },
        {
          id: genId(),
          type: 'derrumbe',
          severity: 'normal',
          title: 'Derrumbe moderado',
          description: 'Deslizamiento en Cusco - Ollantaytambo',
          lat: -13.0,
          lng: -72.27,
          date: Date.now() - 1000 * 60 * 60 * 48,
          image: 'img2/derrumbe.jpg',
          audio: null,
          user: 'user1',
          comments: [],
          resolved: false,
        },
      ];
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(sample));
    }

    if (!localStorage.getItem(STORAGE_KEYS.CHATS)) {
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      const users = [{ username: 'admin', password: 'admin', role: 'admin' }];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    if (!localStorage.getItem(STORAGE_KEYS.ACTIONS)) {
      localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify([]));
    }
  }

  function genId() {
    return 's_' + Math.random().toString(36).slice(2, 10);
  }

  function nowStr(ts = Date.now()) {
    return new Date(ts).toLocaleString();
  }

  // Actions log
  function logAction(action) {
    const actions = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIONS) || '[]');
    actions.unshift({ id: genId(), action, ts: Date.now() });
    localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(actions.slice(0, 50)));
    renderActions();
  }

  function renderActions() {
    const area = document.getElementById('recent-actions');
    if (!area) return;
    const actions = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIONS) || '[]');
    // hide routine notification-only logs so the action list isn't spammy
    const filtered = actions.filter(a => !String(a.action).startsWith('Notificación:'));
    area.innerHTML = filtered.map(a => `<div class="action">${nowStr(a.ts)} - ${escapeHtml(a.action)}</div>`).join('');
    // When there are no actions, mark empty and hide the area to avoid blank white rectangle
    const collapsed = localStorage.getItem('recentActionsCollapsed') === 'true';
    if (filtered.length === 0) {
      area.classList.add('empty');
      area.classList.add('hidden');
    } else {
      area.classList.remove('empty');
      if (!collapsed) {
        area.classList.remove('hidden');
      }
    }
    // Update toggle arrow if present
    const toggle = document.getElementById('toggle-actions'); if (toggle) toggle.innerText = area.classList.contains('hidden') ? '▶' : '◀';
  }

  function setupActionsToggle(){
    const toggle = document.getElementById('toggle-actions');
    const area = document.getElementById('recent-actions');
    if (!toggle || !area) return;
    const setVisible = (visible) => { area.classList.toggle('hidden', !visible); area.setAttribute('aria-hidden', (!visible).toString()); };
    let collapsed = localStorage.getItem('recentActionsCollapsed') === 'true';
    const isEmpty = area.classList.contains('empty');
    setVisible(!collapsed && !isEmpty);
    toggle.innerText = (collapsed || isEmpty) ? '▶' : '◀';
    toggle.addEventListener('click', ()=>{
      collapsed = !collapsed; localStorage.setItem('recentActionsCollapsed', collapsed ? 'true' : 'false');
      const nowEmpty = area.classList.contains('empty');
      setVisible(!collapsed && !nowEmpty);
      toggle.innerText = (collapsed || nowEmpty) ? '▶' : '◀';
    });
  }

  function escapeHtml(str='') { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Notifications
  function pushNotification(text, level = 'info', autoHide = true) {
    const collection = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    const note = { id: genId(), text, level, ts: Date.now() };
    collection.unshift(note);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(collection.slice(0, 10)));
    // render UI
    renderNotifications();
    // toast notification (transient)
    showToast(text, level, autoHide);
    if (autoHide) setTimeout(() => removeNotification(note.id), 6000);
    // avoid spamming actions log with info-only notifications
    if (level === 'error' || level === 'success') logAction(`Notificación: ${text}`);
  }

  // Toast UI (transient alerts)
  function showToast(text, level='info', autoHide=true, ms=5000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container);
    }
    const toast = document.createElement('div'); toast.className = 'toast ' + level; toast.innerText = text; container.appendChild(toast);
    // small delay to allow CSS transition
    setTimeout(()=> toast.classList.add('show'), 20);
    if (autoHide) setTimeout(()=>{ toast.classList.remove('show'); setTimeout(()=> toast.remove(), 220); }, ms);
    return toast;
  }

  function renderNotifications() {
    const container = document.getElementById('notifications');
    if (!container) return;
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
    container.innerHTML = items.map(i => `<div class="notification ${i.level}" data-id="${i.id}">${escapeHtml(i.text)} <button class="notification-close" aria-label="Cerrar">×</button></div>`).join('');
  }

  function removeNotification(id) {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)||'[]').filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(items));
    renderNotifications();
  }

  // Incidents store
  function getIncidents() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.INCIDENTS) || '[]');
  }
  function saveIncidents(arr) { localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(arr)); }

  // Render incidents to incident-list
  function renderIncidents({ filter = '', type = 'all', nearby = false, userLocation = null } = {}) {
    const list = document.getElementById('incident-list');
    if (!list) return;
    let incidents = getIncidents() || [];
    if (filter) incidents = incidents.filter(i => (i.title + i.description).toLowerCase().includes(filter.toLowerCase()));
    if (type !== 'all') incidents = incidents.filter(i => i.type === type);
    if (nearby && userLocation) {
      incidents = incidents.filter(i => distanceKm(userLocation.lat, userLocation.lng, i.lat, i.lng) <= 50);
    }
    // sort by date desc
    incidents = incidents.sort((a,b)=>b.date-a.date);
    list.innerHTML = incidents.map(i=> incidentCard(i)).join('');
    // attach events for comment, edit
    attachIncidentEvents();
  }

  function incidentCard(i) {
    return `
      <article class="incident-card ${i.severity === 'prioritario' ? 'prioritario' : ''}" data-id="${i.id}">
        <div class="card-left">
          <img src="${i.image || 'img2/placeholder.png'}" alt="Incidente imagen" />
        </div>
        <div class="card-right">
          <h3>${escapeHtml(i.title || capitalize(i.type))}</h3>
          <div class="meta">${escapeHtml(i.description || '')}</div>
          <div class="meta"><strong>Ubicación:</strong> ${i.lat || '?'} , ${i.lng || '?'}</div>
          <div class="meta"><strong>Fecha:</strong> ${nowStr(i.date)}</div>
          <div class="meta">Reportado por: ${escapeHtml(i.user || 'anónimo')}</div>
          ${i.audio ? '<audio controls src="' + i.audio + '"></audio>' : ''}
          <div class="card-actions">
            <button class="btn-comment">🗨️ Comentar</button>
            <button class="btn-edit">✏️ Editar</button>
            <button class="btn-export-detail">📤 Exportar</button>
            <label><input type="checkbox" class="select-incident" aria-label="Seleccionar incidente" /> Seleccionar</label>
          </div>
          <div class="comments" data-id="${i.id}">
            ${i.comments.map(c=> '<div class="comment"><strong>' + escapeHtml(c.user||'anónimo') + ':</strong> ' + escapeHtml(c.text) + ' <span class="time">' + nowStr(c.ts) + '</span></div>').join('')}
          </div>
        </div>
      </article>`;
  }

  function attachIncidentEvents() {
    document.querySelectorAll('.btn-comment').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.target.closest('.incident-card').dataset.id;
        const text = prompt('Escribe tu comentario:');
        if (text) {
          const incidents = getIncidents();
          const inc = incidents.find(it=> it.id === id);
          const user = localStorage.getItem('safaroadUser') || 'invitado';
          inc.comments.push({ text, user, ts: Date.now() });
          saveIncidents(incidents);
          renderIncidents({ filter: $('#search')?.value || '' , type: $('#filter-type')?.value || 'all' });
          logAction(`Comentó en incidente: ${inc.title}`);
        }
      }
    });

    document.querySelectorAll('.btn-edit').forEach(btn=> btn.onclick = (e) => {
      const id = e.target.closest('.incident-card').dataset.id;
      const incidents = getIncidents();
      const inc = incidents.find(it=> it.id === id);
      const title = prompt('Nuevo título', inc.title);
      const desc = prompt('Nueva descripción', inc.description);
      if (title !== null) inc.title = title;
      if (desc !== null) inc.description = desc;
      saveIncidents(incidents);
      renderIncidents({ filter: $('#search')?.value || '' , type: $('#filter-type')?.value || 'all' });
      logAction(`Editó incidente: ${inc.title}`);
    });

    document.querySelectorAll('.btn-export-detail').forEach(btn=> btn.onclick = (e)=>{
      const id = e.target.closest('.incident-card').dataset.id;
      exportIncidentById(id);
    });
  }

  function exportIncidentById(id) {
    const incidents = getIncidents();
    const inc = incidents.find(i => i.id === id);
    if (!inc) return pushNotification('Incidente no encontrado', 'error');
    downloadJSON(inc, `incident-${inc.id}.json`);
    logAction(`Exportó incidente ${inc.title}`);
  }

  function downloadJSON(obj, filename='data.json'){
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  function downloadCSV(array, filename='data.csv'){
    if (!array.length) return pushNotification('No hay datos para exportar', 'warning');
    const header = Object.keys(array[0]).join(',');
    const rows = array.map(r => Object.values(r).map(v => '"' + String(v).replace(/"/g,'') + '"').join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  // Chat
  function setupChat() {
    const form = document.getElementById('chat-form');
    const messages = document.getElementById('chat-messages');
    if (!form) return;
    form.addEventListener('submit', e => { e.preventDefault(); const input = $('#chat-input'); if (!input.value.trim()) return; const msg = { id: genId(), user: localStorage.getItem('safaroadUser') || 'anon', text: input.value.trim(), ts: Date.now() }; const arr = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHATS)||'[]'); arr.push(msg); localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(arr)); input.value=''; renderChats(); logAction('Envió mensaje de chat'); });
    renderChats();
  }
  function renderChats(){
    const msgs = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHATS)||'[]');
    const container = document.getElementById('chat-messages');
    if (container) {
      container.innerHTML = msgs.map(m=>`<div class="chat-msg"><b>${escapeHtml(m.user)}:</b> ${escapeHtml(m.text)} <span class="time">${nowStr(m.ts)}</span></div>`).join('');
      container.scrollTop = container.scrollHeight;
    }
  }

  // Dark mode
  function applyTheme() {
    const dark = localStorage.getItem('safaroadTheme') === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const t = document.getElementById('theme-toggle'); if (t) t.checked = dark;
  }

  function toggleTheme() { const current = localStorage.getItem('safaroadTheme') || 'light'; localStorage.setItem('safaroadTheme', current === 'light' ? 'dark' : 'light'); applyTheme(); logAction('Cambio de tema'); }

  // Audio recording
  let mediaRecorder = null; let audioChunks = [];
  function setupRecorder() {
    const recordBtn = document.getElementById('record-btn');
    const stopBtn = document.getElementById('stop-btn');
    const audioPlay = document.getElementById('audio-play');
    if (!recordBtn) return;
    recordBtn.addEventListener('click', async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        pushNotification('Grabación no disponible en este navegador', 'warning');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        audioPlay.src = url; audioPlay.hidden = false;
        audioPlay.dataset.blob = url; // store URL for report
        // Simulated transcription
        const transcription = 'Transcripción simulada: sonido detectado, por favor describe en el campo de texto.';
        $('#description').value = $('#description').value ? $('#description').value + '\n' + transcription : transcription;
        pushNotification('Grabación lista. Transcripción simulada agregada', 'info');
      };
      mediaRecorder.start(); recordBtn.disabled = true; stopBtn.disabled = false; pushNotification('Grabando...', 'info');
    });

    stopBtn.addEventListener('click', () => { if (mediaRecorder) { mediaRecorder.stop(); mediaRecorder = null; } recordBtn.disabled = false; stopBtn.disabled = true; logAction('Grabó audio'); });
  }

  // Photo preview
  function setupPhotoPreview() { const input = document.getElementById('photo'); const preview = document.getElementById('photo-preview'); if (!input) return; input.addEventListener('change', e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { preview.innerHTML = `<img src="${reader.result}" alt="Previsualización" />`; preview.dataset.file = reader.result; }; reader.readAsDataURL(file); }); }

  // Geo
  function setupLocation() { const btn = document.getElementById('get-location'); if (!btn) return; btn.addEventListener('click', () => {
    if (!navigator.geolocation) return pushNotification('Geolocalización no soportada', 'warning');
    navigator.geolocation.getCurrentPosition(p => { $('#lat').value = p.coords.latitude; $('#lng').value = p.coords.longitude; pushNotification('Ubicación obtenida', 'info'); }, e => pushNotification('No fue posible obtener ubicación', 'error'));
  }); }

  // Map rendering (simple simulation)
  function initMap() {
    const map = document.getElementById('map'); if (!map) return;
    const incidents = getIncidents();
    renderMap(incidents);
  }
  function renderMap(incidents = []) {
    const map = document.getElementById('map'); if (!map) return;
    map.innerHTML = '';
    // compute bounds
    const lats = incidents.map(i=>i.lat).filter(Boolean); const lngs = incidents.map(i=>i.lng).filter(Boolean);
    const minLat = Math.min(...(lats.length?lats:[-90])); const maxLat = Math.max(...(lats.length?lats:[90]));
    const minLng = Math.min(...(lngs.length?lngs:[-180])); const maxLng = Math.max(...(lngs.length?lngs:[180]));
    const pad = 0.1;
    const latSpan = (maxLat - minLat) || 10; const lngSpan = (maxLng - minLng) || 10;
    incidents.forEach(i => {
      const el = document.createElement('button'); el.className = 'map-marker'; el.title = `${i.title} (${i.type})`;
      const x = ((i.lng - minLng) / lngSpan) * 100;
      const y = (1 - (i.lat - minLat) / latSpan) * 100;
      el.style.left = `${x}%`; el.style.top = `${y}%`;
      el.onclick = () => { alert(`${i.title}\n${i.description}\nLat: ${i.lat} Lng: ${i.lng}`); };
      map.appendChild(el);
    });
  }

  // Add report
  function setupReport() {
    const btn = document.getElementById('btn-report');
    const form = document.getElementById('report-form');
    const modal = document.getElementById('report-modal');
    const close = document.getElementById('modal-close');
    if (btn && modal) {
      btn.addEventListener('click', () => { openModal(modal); prepareReportForm(); });
      close?.addEventListener('click', () => closeModal(modal));
    }
    if (!form) return;
    form.addEventListener('submit', e => { 
      e.preventDefault();
      if (!confirm('¿Confirmas el envío del reporte?')) return;
      const type = $('#type').value;
      const severity = $('#severity').value;
      const description = $('#description').value;
      const photo = document.getElementById('photo-preview').dataset.file || null;
      const audio = document.getElementById('audio-play').dataset.blob || null;
      const lat = parseFloat($('#lat').value) || null;
      const lng = parseFloat($('#lng').value) || null;
      const user = localStorage.getItem('safaroadUser') || 'anon';
      const newInc = { id: genId(), type, severity, title: `${capitalize(type)} reportado`, description, image: photo, audio, lat, lng, date: Date.now(), user, comments: [], resolved: false };
      const offline = localStorage.getItem('safaroadOffline') === 'true';
      if (offline) {
        saveDraft(newInc);
        pushNotification('Guardado localmente (offline)', 'warning');
        closeModal(modal);
        return;
      }
      const incidents = getIncidents();
      incidents.push(newInc);
      saveIncidents(incidents);
      renderIncidents({ filter: $('#search')?.value || '', type: $('#filter-type')?.value });
      renderMap(incidents);
      pushNotification('Reporte enviado con éxito', 'success');
      logAction('Envió nuevo reporte');
      if (modal) closeModal(modal);
    });

    document.getElementById('draft-btn').addEventListener('click', ()=>{ const form = document.getElementById('report-form'); const data = { id: genId(), type: $('#type').value, severity: $('#severity').value, title: `${capitalize($('#type').value)} (Borrador)`, description: $('#description').value, image: document.getElementById('photo-preview').dataset.file || null, audio: document.getElementById('audio-play').dataset.blob || null, lat: parseFloat($('#lat').value) || null, lng: parseFloat($('#lng').value) || null, date: Date.now(), user: localStorage.getItem('safaroadUser')||'anon', comments: [], resolved: false }; saveDraft(data); pushNotification('Borrador guardado', 'info'); logAction('Guardó borrador'); });
  }

  function prepareReportForm(){ document.getElementById('report-form').reset(); $('#photo-preview').innerHTML=''; $('#audio-play').src=''; $('#audio-play').hidden=true; $('#lat').value=''; $('#lng').value=''; }

  function openModal(modal){ if(!modal) return; modal.style.display='block'; modal.setAttribute('aria-hidden','false'); }
  function closeModal(modal){ if(!modal) return; modal.style.display='none'; modal.setAttribute('aria-hidden','true'); }

  function saveDraft(data) { const drafts = JSON.parse(localStorage.getItem(STORAGE_KEYS.DRAFTS) || '[]'); drafts.unshift(data); localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts)); }

  // Filters and search
  function setupFilters() {
    const search = document.getElementById('search'); const type = document.getElementById('filter-type'); const nearbyBtn = document.getElementById('filter-nearby');
    let userLocation = null;
    search?.addEventListener('input', () => renderIncidents({ filter: search.value, type: type.value, nearby: false, userLocation }));
    type?.addEventListener('change', () => renderIncidents({ filter: search.value, type: type.value, nearby: false, userLocation }));
    nearbyBtn?.addEventListener('click', () => {
      if (!navigator.geolocation) return pushNotification('Geolocation no soportada', 'warning');
      navigator.geolocation.getCurrentPosition(p=>{ userLocation = { lat: p.coords.latitude, lng: p.coords.longitude }; renderIncidents({ filter: search.value, type: type.value, nearby: true, userLocation }); }, ()=>pushNotification('No se obtuvo ubicación', 'error'));
    });
  }

  // Export all incidents
  function setupExport() { const btn = document.getElementById('btn-export'); if (!btn) return; btn.addEventListener('click', ()=> { const inc = getIncidents(); downloadJSON(inc, 'incidentes.json'); downloadCSV(inc, 'incidentes.csv'); pushNotification('Exportado JSON y CSV', 'success'); logAction('Exportó datos'); }); }

  // Admin panel
  function setupAdmin() {
    const adminBtn = document.getElementById('btn-admin');
    const panel = document.getElementById('side-panel');
    const adminPanel = document.getElementById('admin-panel');
    const chatPanel = document.getElementById('chat-panel');
    const historyPanel = document.getElementById('history-panel');
    const resolveBtn = document.getElementById('btn-resolve-selected');
    const deleteBtn = document.getElementById('btn-delete-selected');
    // If admin button exists, toggle side panel (legacy)
    if (adminBtn && panel) {
      adminBtn.addEventListener('click', ()=> { panel.style.display = panel.style.display==='block' ? 'none' : 'block'; panel.setAttribute('aria-hidden', panel.style.display !== 'block'); renderAdminList(); renderHistory(); });
    }
    // tab switching
    document.getElementById('panel-tabs')?.addEventListener('click', e=>{ const tab = e.target.dataset.tab; $$('#panel-tabs .tab').forEach(t=>t.classList.remove('active')); e.target.classList.add('active'); $('#chat-panel').hidden = tab !== 'chat'; $('#admin-panel').hidden = tab !== 'admin'; $('#history-panel').hidden = tab !== 'history'; });

    // Bind resolve/delete buttons (admin page) if present
    resolveBtn?.addEventListener('click', ()=> { const checks = document.querySelectorAll('.select-incident'); const ids = Array.from(checks).filter(c=>c.checked).map(c=>c.closest('.incident-card').dataset.id); if (!ids.length) return pushNotification('Seleccione al menos uno', 'warning'); const incidents = getIncidents(); incidents.forEach(i=>{ if (ids.includes(i.id)) i.resolved = true; }); saveIncidents(incidents); renderAdminList(); renderIncidents({}); pushNotification('Marcado como resuelto', 'success'); logAction('Marcó como resueltos'); });
    deleteBtn?.addEventListener('click', ()=> { const checks = document.querySelectorAll('.select-incident'); const ids = Array.from(checks).filter(c=>c.checked).map(c=>c.closest('.incident-card').dataset.id); if (!ids.length) return pushNotification('Seleccione al menos uno', 'warning'); let incidents = getIncidents(); incidents = incidents.filter(i=>!ids.includes(i.id)); saveIncidents(incidents); renderAdminList(); renderIncidents({}); pushNotification('Eliminado','info'); logAction('Eliminó incidentes'); });
  }

  function setupProfilePage(){
    const form = document.getElementById('profile-form');
    if (!form) return;
    const user = localStorage.getItem('safaroadUser');
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)||'[]') || JSON.parse(localStorage.getItem('safaroadUsers')||'[]');
    const u = users.find(uu=>uu.username===user);
    if (!u) return;
    document.getElementById('profile-username').value = u.username;
    document.getElementById('profile-email').value = u.email || '';
    document.getElementById('profile-role').value = u.role || 'usuario';
    form.addEventListener('submit', (e)=>{ e.preventDefault(); u.email = $('#profile-email').value; u.role = $('#profile-role').value; localStorage.setItem('safaroadUsers', JSON.stringify(users)); pushNotification('Perfil actualizado', 'success'); logAction('Actualizó perfil'); });
  }

  function setupThemeToggles(){
    const toggles = [document.getElementById('theme-toggle'), document.getElementById('theme-toggle-index')];
    toggles.forEach(t => { if (!t) return; t.checked = localStorage.getItem('safaroadTheme') === 'dark'; t.addEventListener('change', toggleTheme); });
  }

  function renderAdminList(){ const container = document.getElementById('admin-incident-list'); if (!container) return; const incidents = getIncidents(); container.innerHTML = incidents.map(i => `<div class="admin-item"><label><input type="checkbox" data-id="${i.id}" /> ${capitalize(i.type)} - ${escapeHtml(i.title)} - ${i.resolved ? '<span class="resolved">Resuelto</span>' : '<span class="open">Abierto</span>'}</label></div>`).join(''); }

  // History
  function renderHistory(){ const container = document.getElementById('user-history'); if (!container) return; const inc = getIncidents(); container.innerHTML = inc.map(i => `<div class="history-item"><strong>${escapeHtml(i.title)}</strong> - ${nowStr(i.date)} - ${i.user}</div>`).join(''); }

  function capitalize(s='') { return s.charAt(0).toUpperCase() + s.slice(1); }

  // Search 'load more' (mock)
  function setupLoadMore() { $('#load-more')?.addEventListener('click', ()=>{ // simulate pagination by duplicating incidents
    const inc = getIncidents(); const clone = inc.map(i => ({...i, id: genId(), date: Date.now()- Math.floor(Math.random()*10000000)})); const all = inc.concat(clone); saveIncidents(all); renderIncidents({}); renderMap(all); pushNotification('Cargados más incidentes (simulado)', 'info'); }); }

  // Chat toggle
  function setupChatToggle() { const btn = document.getElementById('btn-chat'); const panel = document.getElementById('side-panel'); if (!btn) return; btn.addEventListener('click', ()=>{ panel.style.display = panel.style.display==='block' ? 'none' : 'block'; panel.setAttribute('aria-hidden', panel.style.display !== 'block'); $('#panel-tabs button[data-tab="chat"]').click(); }); }

  // Chat bot
  function setupChatbot(){ const toggle = document.getElementById('chatbot-toggle'); const win = document.querySelector('.chatbot-window'); const messages = document.querySelector('.bot-messages'); if (!toggle) return; toggle.addEventListener('click', ()=>{ win.hidden = !win.hidden; });
    document.querySelectorAll('.bot-suggestion').forEach(b => b.addEventListener('click', e=>{ const text = e.target.innerText; messages.innerHTML += `<div class="bot-msg user">${escapeHtml(text)}</div>`; setTimeout(()=>{ messages.innerHTML += `<div class="bot-msg">${escapeHtml(fakeBot(text))}</div>`; }, 800); })); }
  function fakeBot(text) { if (text.includes('report')) return 'Para reportar pulsa el botón "Reportar incidente" y completa los campos.'; if (text.includes('Cómo')) return 'Safaroad te permite reportar incidentes, chatear con otros conductores y exportar datos.'; return '¿En qué puedo ayudarte?'; }

  // Recent actions render
  function setupRecentActions() { renderActions(); }

  // Charts (simple counts by type)
  function renderStats() {
    const canvas = document.getElementById('incident-stats'); if (!canvas) return; const ctx = canvas.getContext('2d'); const inc = getIncidents(); const counts = inc.reduce((acc,cur)=>{ acc[cur.type] = (acc[cur.type]||0)+1; return acc; }, {});
    const types = Object.keys(counts); const values = types.map(t=>counts[t]); const maxVal = Math.max(...values,1); canvas.width = 300; canvas.height = 150; ctx.clearRect(0,0,canvas.width,canvas.height); types.forEach((t,i)=>{ const w = 40; const gap = 20; const x = i*(w+gap)+20; const h = (values[i]/maxVal) * 100; ctx.fillStyle = '#0077b6'; ctx.fillRect(x, canvas.height - h - 20, w, h); ctx.fillStyle = '#333'; ctx.fillText(t, x, canvas.height - 5); ctx.fillText(values[i], x+10, canvas.height - h - 25); }); }

  // Export by CSV/JSON
  // Download helpers already defined

  // Distance using haversine
  function distanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lat2 || !lon1 || !lon2) return Infinity;
    const R = 6371; const dLat = toRad(lat2 - lat1); const dLon = toRad(lon2 - lon1); const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); return R * c; }
  function toRad(x){ return x*Math.PI/180; }

  // Accessibility focus trap for modals
  function trapFocus(modal){ const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'); const first = focusable[0]; const last = focusable[focusable.length-1]; modal.addEventListener('keydown', e=>{ if (e.key === 'Tab') { if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } } else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } } } }); }

  // Initialize app if in app.html
  function initApp() {
    ensureSampleData(); applyTheme();
    // create recent actions container only on app.html
    if (isAppPage()) {
      if (!document.getElementById('recent-actions')) { const recent = document.createElement('div'); recent.id='recent-actions'; recent.className = 'recent-actions'; document.body.appendChild(recent); }
      setupActionsToggle();
    } else {
      // Ensure no leftover panel on other pages
      const old = document.getElementById('recent-actions'); if (old) old.remove();
    }
    setupRecorder(); setupPhotoPreview(); setupLocation(); initMap(); setupReport(); setupFilters(); setupExport(); setupChat(); setupAdmin(); setupLoadMore(); setupChatToggle(); setupChatbot(); setupRecentActions(); renderIncidents({}); renderMap(getIncidents()); renderAdminList(); renderHistory(); renderNotifications(); renderStats(); renderActions();
    // wire up theme toggle
    document.getElementById('theme-toggle')?.addEventListener('change', toggleTheme);
    // export individual
    document.addEventListener('click', (e)=>{ 
      if (e.target.classList.contains('btn-export-detail')) { const id = e.target.closest('.incident-card').dataset.id; exportIncidentById(id); }
      if (e.target.classList.contains('notification-close')) { const id = e.target.closest('.notification').dataset.id; removeNotification(id); }
    });

    // show user and logout (and role-specific UI)
    const user = localStorage.getItem('safaroadUser'); const role = localStorage.getItem('safaroadUserRole') || 'usuario'; const userArea = document.getElementById('user-area'); if (user && userArea) userArea.innerHTML = `<span class="user-name">👤 ${user} <small class="user-role">${role}</small></span><button id="logout" class="logout-btn">Cerrar sesión</button>`;
    // hide admin for non-admins
    if (role !== 'admin') { document.getElementById('btn-admin')?.setAttribute('disabled','true'); }
    document.addEventListener('click', e=>{ if (e.target && e.target.id === 'logout') { localStorage.removeItem('safaroadUser'); window.location.href = 'index.html'; } });

    // recent actions container handled above only on app page

    // offline mode toggle
    const offToggle = document.getElementById('offline-toggle'); if (offToggle) { offToggle.checked = localStorage.getItem('safaroadOffline') === 'true'; offToggle.addEventListener('change', ()=>{ const val = offToggle.checked ? 'true' : 'false'; localStorage.setItem('safaroadOffline', val); pushNotification(`Modo offline: ${offToggle.checked ? 'activo' : 'desactivado'}`, 'info'); logAction('Cambiado modo offline'); if (val === 'false') { // sync drafts
        const drafts = JSON.parse(localStorage.getItem(STORAGE_KEYS.DRAFTS)||'[]'); if (drafts.length) { const incidents = getIncidents(); const moved = []; drafts.forEach(d=> { incidents.push({...d, id: genId(), date: Date.now()}); moved.push(d.id); }); saveIncidents(incidents); localStorage.removeItem(STORAGE_KEYS.DRAFTS); renderIncidents({}); renderMap(incidents); pushNotification('Borradores sincronizados', 'success'); logAction('Sincronizó borradores'); }
      } }); }

    // profile edit modal
    const profileBtn = document.getElementById('btn-edit-profile'); if (profileBtn) { profileBtn.addEventListener('click', ()=>{ const modal = document.getElementById('profile-modal'); openModal(modal); const user = localStorage.getItem('safaroadUser'); if (!user) return; const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)||'[]') || JSON.parse(localStorage.getItem('safaroadUsers')||'[]'); const u = users.find(uu=>uu.username===user); $('#profile-username').value = u.username; $('#profile-email').value = u.email || ''; $('#profile-role').value = u.role || 'usuario'; }); }
    document.getElementById('profile-close')?.addEventListener('click', ()=> closeModal(document.getElementById('profile-modal')));
    document.getElementById('profile-form')?.addEventListener('submit', (e)=>{ e.preventDefault(); const users = JSON.parse(localStorage.getItem('safaroadUsers')||'[]'); const user = localStorage.getItem('safaroadUser'); const u = users.find(uu=>uu.username===user); if (!u) return; u.email = $('#profile-email').value; u.role = $('#profile-role').value; localStorage.setItem('safaroadUsers', JSON.stringify(users)); closeModal(document.getElementById('profile-modal')); pushNotification('Perfil actualizado', 'success'); logAction('Actualizó perfil'); });

    // populate profile page if present
    setupProfilePage();

    // unify theme toggle across pages
    setupThemeToggles();

    // map marker interactivity (re-render upon adding new incidents)
    const observer = new MutationObserver(()=>{ renderMap(getIncidents()); renderStats(); });
    observer.observe(document.getElementById('incident-list'), { childList: true });

    // Auto-gen notifications periodically (simulation)
    setInterval(()=>{
      const msgs = ['Atención: lluvia intensa en ruta', 'Corte de tráfico en carretera', 'Mejora el clima en zona de la sierra', 'Nuevo reporte de derrumbe'];
      const msg = msgs[Math.floor(Math.random()*msgs.length)]; pushNotification(msg, 'info');
    }, 15000);
  }

  // Init on DOMContent if we're in app.html
  // Always initialize the app JS; functions will detect which elements exist on each page
  document.addEventListener('DOMContentLoaded', initApp);

  // Small helpers
  window.safaroad = { renderIncidents };

})();
