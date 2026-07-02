console.log('admin.js loaded');

const isAdminLoginPage = document.body.classList.contains('admin-login-page');
const token = localStorage.getItem('enkiamaAdminToken');
const adminName = localStorage.getItem('enkiamaAdminName') || 'Admin';

function setLoginMessage(message, type = 'error') {
  const node = document.getElementById('adminLoginMessage');
  if (!node) return;
  node.textContent = message || '';
  node.classList.toggle('is-error', type === 'error');
  node.classList.toggle('is-success', type === 'success');
}

async function setupAdminLogin() {
  const form = document.getElementById('adminLoginForm');
  console.log('login form found', Boolean(form));

  if (!form) return;

  if (token) {
    window.location.assign('/admin.html');
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    console.log('login submit triggered');

    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (!email || !password) {
      setLoginMessage('Enter your admin email and password.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Signing in...';
    }
    setLoginMessage('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({}));
      console.log('login API response', { ok: response.ok, status: response.status, success: payload.success });

      if (!response.ok || !payload.success || !payload.token) {
        throw new Error(payload.message || 'Unable to sign in. Check your credentials and try again.');
      }

      const displayName = `${payload.user?.firstName || ''} ${payload.user?.lastName || ''}`.trim() || payload.user?.email || 'Admin';
      localStorage.setItem('enkiamaAdminToken', payload.token);
      localStorage.setItem('enkiamaAdminName', displayName);
      setLoginMessage('Signed in. Opening dashboard...', 'success');
      window.location.assign('/admin.html');
    } catch (error) {
      setLoginMessage(error.message || 'Unable to sign in. Please try again.');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Sign In';
      }
    }
  });
}

if (!isAdminLoginPage && !token) {
  window.location.replace('/admin-login.html');
}

const state = {
  tables: [],
  activeTable: '',
  activeView: 'overview',
  cmsPage: 'home',
  cmsContent: [],
  loadedViews: new Set(),
  loadingViews: new Map(),
  cmsLoadedPages: new Set(),
  savingCmsSections: new Set(),
};

const CMS_PAGES = [
  { key: 'home', label: 'Home', url: 'index.html' },
  { key: 'about', label: 'About', url: 'about.html' },
  { key: 'programs', label: 'Programs', url: 'programs.html' },
  { key: 'impact', label: 'Impact', url: 'impact.html' },
  { key: 'heritage', label: 'Heritage', url: 'heritage.html' },
  { key: 'donate', label: 'Donate', url: 'get-involved.html#donate' },
  { key: 'get_involved', label: 'Get Involved', url: 'get-involved.html' },
  { key: 'contact', label: 'Contact', url: 'contact.html' },
];

const BASE_FIELDS = [
  {
    section: 'Hero Section',
    key: 'hero',
    fields: [
      { suffix: 'hero.title', label: 'Hero title', type: 'textarea' },
      { suffix: 'hero.subtitle', label: 'Hero subtitle', type: 'textarea' },
      { suffix: 'hero.image_url', label: 'Hero image URL', type: 'image' },
    ],
  },
  {
    section: 'Main Content',
    key: 'main',
    fields: [
      { suffix: 'main.heading', label: 'Main section heading', type: 'text' },
      { suffix: 'main.text', label: 'Main section text', type: 'textarea' },
      { suffix: 'main.image_url', label: 'Main content image URL', type: 'image' },
    ],
  },
  {
    section: 'Buttons / CTAs',
    key: 'cta',
    fields: [
      { suffix: 'hero.primary_button_text', label: 'Primary hero button text', type: 'text' },
      { suffix: 'hero.primary_button_link', label: 'Primary hero button link', type: 'url' },
      { suffix: 'hero.secondary_button_text', label: 'Secondary hero button text', type: 'text' },
      { suffix: 'hero.secondary_button_link', label: 'Secondary hero button link', type: 'url' },
      { suffix: 'cta.heading', label: 'CTA heading', type: 'textarea' },
      { suffix: 'cta.primary_text', label: 'CTA button text', type: 'text' },
      { suffix: 'cta.primary_link', label: 'CTA button link', type: 'url' },
    ],
  },
  {
    section: 'Images',
    key: 'images',
    fields: [
      { suffix: 'images.featured_1', label: 'Featured image 1', type: 'image' },
      { suffix: 'images.featured_2', label: 'Featured image 2', type: 'image' },
    ],
  },
];

const IMPACT_FIELDS = {
  section: 'Impact Numbers',
  key: 'impact',
  fields: [
    { suffix: 'impact.stat_1_label', label: 'Statistic 1 label', type: 'text' },
    { suffix: 'impact.stat_1_value', label: 'Statistic 1 value', type: 'text' },
    { suffix: 'impact.stat_2_label', label: 'Statistic 2 label', type: 'text' },
    { suffix: 'impact.stat_2_value', label: 'Statistic 2 value', type: 'text' },
    { suffix: 'impact.stat_3_label', label: 'Statistic 3 label', type: 'text' },
    { suffix: 'impact.stat_3_value', label: 'Statistic 3 value', type: 'text' },
  ],
};

function sectionsForPage(page) {
  const sections = BASE_FIELDS.map((section) => ({ ...section, fields: section.fields.map((field) => ({ ...field })) }));
  if (page === 'home' || page === 'impact') sections.splice(2, 0, IMPACT_FIELDS);
  return sections;
}

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function statusClass(message, type = 'success') {
  return `<span class="status-message status-message--${type}">${escapeHtml(message)}</span>`;
}

async function adminFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'Request failed');
  }
  return payload;
}

async function adminUpload(url, file) {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Upload failed');
  return payload;
}

function setView(view, options = {}) {
  const normalizedView = view === 'cms' ? 'content' : view;
  const logView = normalizedView === 'content' ? 'cms' : normalizedView;
  console.log(`clicked section: ${logView}`);

  state.activeView = normalizedView;
  $all('.admin-view').forEach((panel) => {
    const active = panel.id === `view-${normalizedView}`;
    panel.classList.toggle('is-active', active);
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
  $all('.admin-nav__item').forEach((button) => {
    const active = button.dataset.view === normalizedView;
    button.classList.toggle('is-active', active);
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });

  if (options.skipLoad || (state.loadedViews.has(normalizedView) && !options.force)) return;

  if (normalizedView === 'overview') loadStats(options);
  if (normalizedView === 'submissions') loadRecords(options);
  if (normalizedView === 'content') loadCmsContent(options);
  if (normalizedView === 'analytics') loadAnalytics(options);
  if (normalizedView === 'profile') loadProfile(options);
}

async function loadStats({ force = false } = {}) {
  const grid = $('#statsGrid');
  if (state.loadingViews.has('overview')) return state.loadingViews.get('overview');
  if (state.loadedViews.has('overview') && !force) return;

  const request = (async () => {
    grid.innerHTML = '<div class="admin-loading">Loading summary...</div>';
    try {
      const data = await adminFetch('/api/admin/stats');
      grid.innerHTML = data.cards
        .map((card) => `<article class="admin-stat"><span>${escapeHtml(card.label)}</span><strong>${card.count}</strong></article>`)
        .join('');
      state.loadedViews.add('overview');
    } catch (error) {
      grid.innerHTML = statusClass(error.message, 'error');
    } finally {
      state.loadingViews.delete('overview');
    }
  })();
  state.loadingViews.set('overview', request);
  return request;
}

async function loadTables() {
  const data = await adminFetch('/api/admin/tables');
  state.tables = data.tables;
  state.activeTable = state.activeTable || data.tables[0]?.name || '';
  const select = $('#tableSelect');
  select.innerHTML = data.tables.map((table) => `<option value="${table.name}">${escapeHtml(table.label)}</option>`).join('');
  select.value = state.activeTable;
}

function renderRecords(records, hasStatus) {
  const table = $('#recordsTable');
  if (!records.length) {
    table.innerHTML = '<tbody><tr><td>No records found.</td></tr></tbody>';
    return;
  }

  const columns = Object.keys(records[0]).filter((column) => !['updated_at'].includes(column)).slice(0, 10);
  table.innerHTML = `
    <thead>
      <tr>
        ${columns.map((column) => `<th>${escapeHtml(column.replace(/_/g, ' '))}</th>`).join('')}
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${records.map((record) => `
        <tr>
          ${columns.map((column) => {
            const value = column === 'created_at' ? formatDate(record[column]) : record[column];
            if (column === 'status' && hasStatus) {
              return `<td>
                <select class="status-select" data-id="${record.id}">
                  ${['new', 'pending', 'reviewed', 'approved', 'rejected', 'completed'].map((status) => `<option value="${status}" ${record.status === status ? 'selected' : ''}>${status}</option>`).join('')}
                </select>
              </td>`;
            }
            return `<td>${escapeHtml(value)}</td>`;
          }).join('')}
          <td><button class="table-action table-action--danger" type="button" data-delete="${record.id}">Delete</button></td>
        </tr>
      `).join('')}
    </tbody>
  `;
}

async function loadRecords({ force = false } = {}) {
  if (!state.activeTable) return;
  if (state.loadingViews.has('submissions')) return state.loadingViews.get('submissions');
  if (state.loadedViews.has('submissions') && !force && !$('#recordSearch').value.trim()) return;

  const request = (async () => {
    const table = $('#recordsTable');
    table.innerHTML = '<tbody><tr><td>Loading records...</td></tr></tbody>';
    const search = encodeURIComponent($('#recordSearch').value.trim());
    try {
      const data = await adminFetch(`/api/admin/records/${state.activeTable}?search=${search}`);
      renderRecords(data.records || [], data.hasStatus);
      state.loadedViews.add('submissions');
    } catch (error) {
      table.innerHTML = `<tbody><tr><td>${statusClass(error.message, 'error')}</td></tr></tbody>`;
    } finally {
      state.loadingViews.delete('submissions');
    }
  })();
  state.loadingViews.set('submissions', request);
  return request;
}

function cmsEntry(key) {
  return state.cmsContent.find((entry) => entry.content_key === key);
}

function valueFor(key) {
  return cmsEntry(key)?.content_value || '';
}

function pageConfig(page = state.cmsPage) {
  return CMS_PAGES.find((item) => item.key === page) || CMS_PAGES[0];
}

function renderCmsTabs() {
  const tabs = $('#cmsPageTabs');
  const select = $('#cmsPageSelect');
  tabs.innerHTML = CMS_PAGES.map((page) => `
    <button type="button" class="cms-tab ${page.key === state.cmsPage ? 'is-active' : ''}" data-page="${page.key}">${page.label}</button>
  `).join('');
  select.innerHTML = CMS_PAGES.map((page) => `<option value="${page.key}">${page.label}</option>`).join('');
  select.value = state.cmsPage;
  $('#viewCmsPageBtn').href = pageConfig().url;
}

function fieldInput(page, field) {
  const key = `${page}.${field.suffix}`;
  const value = valueFor(key);
  const inputId = `cms-${key.replace(/[^a-z0-9]/gi, '-')}`;
  const control = field.type === 'textarea'
    ? `<textarea id="${inputId}" data-key="${key}" data-type="${field.type}" rows="4">${escapeHtml(value)}</textarea>`
    : `<input id="${inputId}" data-key="${key}" data-type="${field.type}" type="${field.type === 'image' ? 'url' : field.type}" value="${escapeHtml(value)}">`;

  const imageTools = field.type === 'image'
    ? `<div class="cms-image-tools">
        <img src="${escapeHtml(value)}" alt="" class="cms-image-preview" data-preview="${key}" ${value ? '' : 'hidden'}>
        <label class="upload-inline">
          Upload image
          <input type="file" accept="image/*" data-upload-for="${key}">
        </label>
      </div>`
    : '';

  return `
    <label class="cms-field">
      <span>${escapeHtml(field.label)}</span>
      ${control}
      ${imageTools}
    </label>
  `;
}

function renderCmsSections() {
  renderCmsTabs();
  const container = $('#cmsSections');
  container.innerHTML = sectionsForPage(state.cmsPage).map((section) => `
    <article class="cms-card" data-section="${section.key}">
      <div class="cms-card__heading">
        <h3>${escapeHtml(section.section)}</h3>
        <button class="btn btn-primary" type="button" data-save-section="${section.key}">Save Section</button>
      </div>
      <div class="cms-card__fields">
        ${section.fields.map((field) => fieldInput(state.cmsPage, field)).join('')}
      </div>
      <div class="form-message" data-section-message="${section.key}" aria-live="polite"></div>
    </article>
  `).join('');

  renderContentTable();
}

function renderContentTable() {
  const table = $('#contentTable');
  const entries = state.cmsContent.slice().sort((a, b) => a.content_key.localeCompare(b.content_key));
  if (!entries.length) {
    table.innerHTML = '<tbody><tr><td>No saved content for this page yet.</td></tr></tbody>';
    return;
  }
  table.innerHTML = `
    <thead>
      <tr><th>Key</th><th>Type</th><th>Value</th><th>Updated</th><th>Actions</th></tr>
    </thead>
    <tbody>
      ${entries.map((entry) => `
        <tr>
          <td>${escapeHtml(entry.content_key)}</td>
          <td>${escapeHtml(entry.content_type)}</td>
          <td>${escapeHtml(entry.content_value).slice(0, 180)}</td>
          <td>${formatDate(entry.updated_at || entry.created_at)}</td>
          <td><button class="table-action table-action--danger" type="button" data-delete-content="${entry.id}">Delete</button></td>
        </tr>
      `).join('')}
    </tbody>
  `;
}

function setCmsStatus(message, type = 'success') {
  $('#cmsStatus').innerHTML = message ? statusClass(message, type) : '';
}

async function loadCmsContent({ force = false } = {}) {
  const cacheKey = `content:${state.cmsPage}`;
  if (state.loadingViews.has(cacheKey)) return state.loadingViews.get(cacheKey);
  if (state.cmsLoadedPages.has(state.cmsPage) && !force) {
    renderCmsSections();
    state.loadedViews.add('content');
    return;
  }

  const request = (async () => {
    setCmsStatus('');
    try {
      const data = await adminFetch(`/api/admin/site-content?page=${state.cmsPage}`);
      state.cmsContent = data.content || [];
      state.cmsLoadedPages.add(state.cmsPage);
      state.loadedViews.add('content');
      renderCmsSections();
    } catch (error) {
      setCmsStatus(error.message, 'error');
    } finally {
      state.loadingViews.delete(cacheKey);
    }
  })();
  state.loadingViews.set(cacheKey, request);
  return request;
}

async function saveCmsSection(sectionKey) {
  const savingKey = `${state.cmsPage}:${sectionKey}`;
  if (state.savingCmsSections.has(savingKey)) return;
  const definition = sectionsForPage(state.cmsPage).find((section) => section.key === sectionKey);
  if (!definition) return;
  state.savingCmsSections.add(savingKey);
  const card = $(`[data-section="${sectionKey}"]`);
  const message = $(`[data-section-message="${sectionKey}"]`);
  const saveButton = $(`[data-save-section="${sectionKey}"]`, card);
  if (saveButton) saveButton.disabled = true;
  message.innerHTML = statusClass('Saving...', 'info');

  try {
    const fields = definition.fields.map((field) => {
      const key = `${state.cmsPage}.${field.suffix}`;
      const input = $(`[data-key="${key}"]`, card);
      return {
        page: state.cmsPage,
        section: definition.key,
        content_key: key,
        content_value: input ? input.value.trim() : '',
        content_type: field.type,
      };
    });

    for (const payload of fields) {
      await adminFetch('/api/admin/site-content', { method: 'POST', body: JSON.stringify(payload) });
    }

    message.innerHTML = statusClass('Saved. Refresh the public page to see the update.');
    state.cmsLoadedPages.delete(state.cmsPage);
    await loadCmsContent({ force: true });
  } catch (error) {
    message.innerHTML = statusClass(error.message, 'error');
  } finally {
    state.savingCmsSections.delete(savingKey);
    if (saveButton) saveButton.disabled = false;
  }
}

async function uploadCmsImage(input) {
  const file = input.files?.[0];
  if (!file) return;
  const key = input.dataset.uploadFor;
  setCmsStatus('Uploading image...', 'info');
  try {
    const data = await adminUpload('/api/admin/site-assets', file);
    const textInput = $(`[data-key="${key}"]`);
    if (textInput) textInput.value = data.url;
    const preview = $(`[data-preview="${key}"]`);
    if (preview) {
      preview.src = data.url;
      preview.hidden = false;
    }
    setCmsStatus('Image uploaded. Save the section to publish it.');
  } catch (error) {
    setCmsStatus(error.message, 'error');
  } finally {
    input.value = '';
  }
}

async function deleteContent(id) {
  if (!confirm('Delete this CMS entry?')) return;
  try {
    await adminFetch(`/api/admin/site-content/${id}`, { method: 'DELETE' });
    await loadCmsContent();
    setCmsStatus('Content entry deleted.');
  } catch (error) {
    setCmsStatus(error.message, 'error');
  }
}

async function loadAnalytics({ force = false } = {}) {
  if (state.loadingViews.has('analytics')) return state.loadingViews.get('analytics');
  if (state.loadedViews.has('analytics') && !force) return;

  const request = (async () => {
    const stats = $('#analyticsStats');
    const pageViews = $('#pageViewsList');
    const visitsTable = $('#visitsTable');
    stats.innerHTML = '<div class="admin-loading">Loading analytics...</div>';
    pageViews.innerHTML = '';
    visitsTable.innerHTML = '';
    try {
      const data = await adminFetch('/api/admin/analytics/visits');
    const summary = [
      ['Total visits', data.summary.totalVisits],
      ['Today', data.summary.visitsToday],
      ['This week', data.summary.visitsThisWeek],
      ['This month', data.summary.visitsThisMonth],
    ];
    stats.innerHTML = summary.map(([label, value]) => `<article class="admin-stat"><span>${label}</span><strong>${value}</strong></article>`).join('');
    pageViews.innerHTML = (data.pageViews || []).length
      ? data.pageViews.map((item) => `<div class="page-view-row"><span>${escapeHtml(item.page)}</span><strong>${item.count}</strong></div>`).join('')
      : '<p class="admin-muted">No page views recorded yet.</p>';
    visitsTable.innerHTML = `
      <thead><tr><th>Page</th><th>Path</th><th>Referrer</th><th>Date</th></tr></thead>
      <tbody>
        ${(data.recent || []).map((visit) => `
          <tr>
            <td>${escapeHtml(visit.page)}</td>
            <td>${escapeHtml(visit.path)}</td>
            <td>${escapeHtml(visit.referrer || 'Direct')}</td>
            <td>${formatDate(visit.created_at)}</td>
          </tr>
        `).join('') || '<tr><td colspan="4">No recent visits.</td></tr>'}
      </tbody>
    `;
      state.loadedViews.add('analytics');
    } catch (error) {
      stats.innerHTML = statusClass(error.message, 'error');
    } finally {
      state.loadingViews.delete('analytics');
    }
  })();
  state.loadingViews.set('analytics', request);
  return request;
}

async function loadProfile({ force = false } = {}) {
  if (state.loadingViews.has('profile')) return state.loadingViews.get('profile');
  if (state.loadedViews.has('profile') && !force) return;

  const request = (async () => {
    const message = $('#profileMessage');
    message.innerHTML = '';
    try {
      const data = await adminFetch('/api/admin/profile');
    const profile = data.profile;
    $('#profileFirstName').value = profile.firstName || '';
    $('#profileLastName').value = profile.lastName || '';
    $('#profileEmail').value = profile.email || '';
    $('#profilePhone').value = profile.phone || '';
    $('#profileAvatar').value = profile.avatar || '';
      updateAvatarPreview(profile.avatar);
      state.loadedViews.add('profile');
    } catch (error) {
      message.innerHTML = statusClass(error.message, 'error');
    } finally {
      state.loadingViews.delete('profile');
    }
  })();
  state.loadingViews.set('profile', request);
  return request;
}

function updateAvatarPreview(url) {
  const img = $('#profileAvatarPreview');
  if (url) {
    img.src = url;
    img.hidden = false;
  } else {
    img.removeAttribute('src');
    img.hidden = true;
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const message = $('#profileMessage');
  message.innerHTML = statusClass('Saving profile...', 'info');
  try {
    const payload = {
      firstName: $('#profileFirstName').value.trim(),
      lastName: $('#profileLastName').value.trim(),
      email: $('#profileEmail').value.trim(),
      phone: $('#profilePhone').value.trim(),
      avatar: $('#profileAvatar').value.trim(),
    };
    const data = await adminFetch('/api/admin/profile', { method: 'PUT', body: JSON.stringify(payload) });
    if (data.token) localStorage.setItem('enkiamaAdminToken', data.token);
    localStorage.setItem('enkiamaAdminName', `${data.profile.firstName || ''} ${data.profile.lastName || ''}`.trim() || data.profile.email);
    $('#adminUser').textContent = localStorage.getItem('enkiamaAdminName');
    updateAvatarPreview(data.profile.avatar);
    message.innerHTML = statusClass('Profile updated.');
  } catch (error) {
    message.innerHTML = statusClass(error.message, 'error');
  }
}

async function savePassword(event) {
  event.preventDefault();
  const message = $('#passwordMessage');
  message.innerHTML = statusClass('Updating password...', 'info');
  try {
    await adminFetch('/api/admin/profile/password', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword: $('#currentPassword').value,
        newPassword: $('#newPassword').value,
      }),
    });
    $('#passwordForm').reset();
    message.innerHTML = statusClass('Password updated.');
  } catch (error) {
    message.innerHTML = statusClass(error.message, 'error');
  }
}

function wireEvents() {
  $('#adminUser').textContent = adminName;
  $all('.admin-nav__item').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });
  console.log('dashboard nav initialized');
  $('#logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('enkiamaAdminToken');
    localStorage.removeItem('enkiamaAdminName');
    window.location.assign('/admin-login.html');
  });
  $('#refreshStatsBtn').addEventListener('click', () => loadStats({ force: true }));
  $('#refreshRecordsBtn').addEventListener('click', () => loadRecords({ force: true }));
  $('#refreshAnalyticsBtn').addEventListener('click', () => loadAnalytics({ force: true }));
  $('#tableSelect').addEventListener('change', (event) => {
    state.activeTable = event.target.value;
    state.loadedViews.delete('submissions');
    loadRecords({ force: true });
  });
  $('#recordSearch').addEventListener('input', () => {
    clearTimeout(window.recordSearchTimer);
    state.loadedViews.delete('submissions');
    window.recordSearchTimer = setTimeout(() => loadRecords({ force: true }), 350);
  });
  $('#recordsTable').addEventListener('change', async (event) => {
    if (!event.target.matches('.status-select')) return;
    await adminFetch(`/api/admin/records/${state.activeTable}/${event.target.dataset.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: event.target.value }),
    });
  });
  $('#recordsTable').addEventListener('click', async (event) => {
    const id = event.target.dataset.delete;
    if (!id || !confirm('Delete this record?')) return;
    await adminFetch(`/api/admin/records/${state.activeTable}/${id}`, { method: 'DELETE' });
    state.loadedViews.delete('submissions');
    state.loadedViews.delete('overview');
    loadRecords({ force: true });
    loadStats({ force: true });
  });
  $('#cmsPageTabs').addEventListener('click', (event) => {
    const page = event.target.dataset.page;
    if (!page) return;
    state.cmsPage = page;
    loadCmsContent();
  });
  $('#cmsPageSelect').addEventListener('change', (event) => {
    state.cmsPage = event.target.value;
    loadCmsContent();
  });
  $('#cmsSections').addEventListener('click', (event) => {
    const section = event.target.dataset.saveSection;
    if (section) saveCmsSection(section);
  });
  $('#cmsSections').addEventListener('change', (event) => {
    if (event.target.dataset.uploadFor) uploadCmsImage(event.target);
    const key = event.target.dataset.key;
    if (key && event.target.dataset.type === 'image') {
      const preview = $(`[data-preview="${key}"]`);
      if (preview) {
        preview.src = event.target.value;
        preview.hidden = !event.target.value;
      }
    }
  });
  $('#contentTable').addEventListener('click', (event) => {
    const id = event.target.dataset.deleteContent;
    if (id) deleteContent(id);
  });
  $('#profileForm').addEventListener('submit', saveProfile);
  $('#passwordForm').addEventListener('submit', savePassword);
  $('#profileAvatar').addEventListener('input', (event) => updateAvatarPreview(event.target.value.trim()));
  $('#profileAvatarUpload').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const message = $('#profileMessage');
    message.innerHTML = statusClass('Uploading avatar...', 'info');
    try {
      const data = await adminUpload('/api/admin/site-assets', file);
      $('#profileAvatar').value = data.url;
      updateAvatarPreview(data.url);
      message.innerHTML = statusClass('Avatar uploaded. Save profile to keep it.');
    } catch (error) {
      message.innerHTML = statusClass(error.message, 'error');
    } finally {
      event.target.value = '';
    }
  });
}

async function init() {
  console.log('admin dashboard loaded');
  wireEvents();
  setView('overview', { skipLoad: true });
  try {
    await loadTables();
    renderCmsTabs();
    await loadStats({ force: true });
  } catch (error) {
    console.warn('Admin dashboard setup failed:', error.message);
  }
}

function startAdminScript() {
  if (isAdminLoginPage) {
    setupAdminLogin();
    return;
  }

  if (token) {
    init();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startAdminScript);
} else {
  startAdminScript();
}
