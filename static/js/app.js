import { state, t, setLanguage, setTheme } from './state.js';
import { APIClient } from './api.js';
import { generateSecurePassword, copyToClipboard } from './crypto_utils.js';

// SVG Icons
const icons = {
  shield: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  key: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  dashboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`,
  trash: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  copy: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  eye: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  external: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  copyCard: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,
  folder: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  refresh: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  upload: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  download: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  menu: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`
};

export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container") || createToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

function createToastContainer() {
  const container = document.createElement("div");
  container.id = "toast-container";
  container.className = "toast-container";
  document.body.appendChild(container);
  return container;
}

// App Initialization
export async function initApp() {
  setLanguage(state.lang);
  setTheme(state.theme);

  window.addEventListener("vault:unauthorized", () => {
    state.user = null;
    renderAuthModal();
  });

  window.addEventListener("vault:state_changed", () => {
    renderApp();
  });

  try {
    const user = await APIClient.getMe();
    state.user = user;
    state.viewMode = user.view_preference || state.viewMode;
    state.sortMode = user.sort_preference || state.sortMode;
    state.lang = user.language || state.lang;
    state.theme = user.theme || state.theme;
    setLanguage(state.lang);
    setTheme(state.theme);
  } catch (err) {
    state.user = null;
  }

  renderApp();
}

// Main Render Loop
export function renderApp() {
  const root = document.getElementById("app-root");
  if (!root) return;

  if (!state.user) {
    root.innerHTML = "";
    renderAuthModal();
    return;
  }

  // Remove auth modal if present
  const existingModal = document.getElementById("auth-modal");
  if (existingModal) existingModal.remove();

  root.innerHTML = `
    <div class="app-container">
      ${renderSidebar()}
      <div class="main-wrapper">
        ${renderTopBar()}
        <main class="content-container" id="main-content">
          ${renderTabContent()}
        </main>
      </div>
    </div>
  `;

  bindNavigationEvents();
  bindTabEvents();
}

function renderSidebar() {
  const currentTab = state.activeTab;
  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: icons.dashboard },
    { id: 'vault', label: t('vault'), icon: icons.key, count: state.entries.length },
    { id: 'trash', label: t('trash'), icon: icons.trash, count: state.trash.length },
    { id: 'security_center', label: t('security_center'), icon: icons.shield },
    { id: 'generator', label: t('generator'), icon: icons.refresh },
    { id: 'settings', label: t('settings'), icon: icons.settings }
  ];

  return `
    <aside class="sidebar" id="app-sidebar">
      <div class="sidebar-header">
        <div class="brand-logo">${icons.shield}</div>
        <span class="brand-title">${t('app_name')}</span>
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(item => `
          <a class="nav-item ${currentTab === item.id ? 'active' : ''}" data-tab="${item.id}">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
            ${item.count !== undefined && item.count > 0 ? `<span class="nav-badge">${item.count}</span>` : ''}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="user-profile-badge">
          <div class="user-avatar">${(state.user.name || 'U').charAt(0).toUpperCase()}</div>
          <div class="user-details">
            <span class="user-name">${escapeHTML(state.user.name)}</span>
            <span class="user-email">${escapeHTML(state.user.email)}</span>
          </div>
        </div>
        <button class="btn-icon" id="logout-btn" title="${t('logout')}">
          ${icons.trash}
        </button>
      </div>
    </aside>
  `;
}

function renderTopBar() {
  return `
    <header class="top-bar">
      <div class="top-bar-left">
        <button class="mobile-menu-btn" id="mobile-toggle">${icons.menu}</button>
        <h1 class="page-title">${t(state.activeTab)}</h1>
      </div>
      <div class="top-bar-right">
        ${state.activeTab === 'vault' ? `
          <button class="btn btn-secondary btn-sm" id="import-csv-btn">
            ${icons.upload} <span>${t('import_csv')}</span>
          </button>
          <button class="btn btn-secondary btn-sm" id="export-csv-btn">
            ${icons.download} <span>${t('export_csv')}</span>
          </button>
          <button class="btn btn-primary btn-sm" id="add-entry-btn">
            ${icons.plus} <span>${t('add_entry')}</span>
          </button>
        ` : ''}
      </div>
    </header>
  `;
}

function renderTabContent() {
  switch (state.activeTab) {
    case 'dashboard': return renderDashboard();
    case 'vault': return renderVault();
    case 'trash': return renderTrash();
    case 'security_center': return renderSecurityCenter();
    case 'generator': return renderGenerator();
    case 'settings': return renderSettings();
    default: return renderDashboard();
  }
}

// ---------------- DASHBOARD ----------------
function renderDashboard() {
  const d = state.dashboardData;
  if (!d) {
    loadDashboardData();
    return `<div class="empty-state">${icons.refresh} <p>Loading dashboard...</p></div>`;
  }

  const statusClass = d.security_status === 'Secure' ? 'badge-secure' : (d.security_status === 'Warning' ? 'badge-warning' : 'badge-critical');

  return `
    <div class="dashboard-view">
      <div class="security-banner">
        <div>
          <span class="security-badge ${statusClass}">
            ${d.security_status === 'Secure' ? '🛡️' : '⚠️'} ${t('status_' + d.security_status.toLowerCase())}
          </span>
          <h2 style="margin-top: 10px; font-size: 1.3rem;">
            ${d.total_security_issues === 0 ? t('no_issues_found') : `${d.total_security_issues} security issues detected`}
          </h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
            ${d.issues_breakdown.compromised_count > 0 ? t('compromised_detected') : 'Review weak, reused, or outdated passwords to keep your vault safe.'}
          </p>
        </div>
        <button class="btn btn-primary" id="open-security-center-btn">
          ${t('open_security_center')}
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon-wrapper">${icons.key}</div>
          <div>
            <div class="stat-number">${d.total_entries}</div>
            <div class="stat-label">${t('total_entries')}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrapper">${icons.folder}</div>
          <div>
            <div class="stat-number">${d.categories_count}</div>
            <div class="stat-label">${t('categories_count')}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrapper">${icons.trash}</div>
          <div>
            <div class="stat-number">${d.trash_count}</div>
            <div class="stat-label">${t('trash_count')}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadDashboardData() {
  try {
    const data = await APIClient.getDashboardSummary();
    state.dashboardData = data;
    renderApp();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ---------------- VAULT VIEW ----------------
function renderVault() {
  return `
    <div class="vault-view">
      <div class="vault-toolbar">
        <div class="search-box">
          <span class="search-icon">${icons.search}</span>
          <input type="text" class="search-input" id="vault-search-input"
                 placeholder="${t('search_vault')}" value="${escapeHTML(state.searchTerm)}">
        </div>
        <div class="toolbar-actions">
          <select class="form-select" id="sort-select" style="width: auto;">
            <option value="name_asc" ${state.sortMode === 'name_asc' ? 'selected' : ''}>${t('sort_name_asc')}</option>
            <option value="name_desc" ${state.sortMode === 'name_desc' ? 'selected' : ''}>${t('sort_name_desc')}</option>
            <option value="recently_added_desc" ${state.sortMode === 'recently_added_desc' ? 'selected' : ''}>${t('sort_added_desc')}</option>
            <option value="recently_added_asc" ${state.sortMode === 'recently_added_asc' ? 'selected' : ''}>${t('sort_added_asc')}</option>
            <option value="recently_updated_desc" ${state.sortMode === 'recently_updated_desc' ? 'selected' : ''}>${t('sort_updated_desc')}</option>
            <option value="category" ${state.sortMode === 'category' ? 'selected' : ''}>${t('sort_category')}</option>
            <option value="custom" ${state.sortMode === 'custom' ? 'selected' : ''}>${t('sort_custom')}</option>
          </select>
          <button class="btn btn-secondary btn-icon" id="toggle-view-btn" title="${state.viewMode === 'cards' ? t('view_list') : t('view_cards')}">
            ${state.viewMode === 'cards' ? icons.dashboard : icons.key}
          </button>
        </div>
      </div>

      <div class="category-tabs" id="category-tabs-container">
        <button class="cat-tab ${state.activeCategoryFilter === null ? 'active' : ''}" data-cat-id="">
          ${t('all_categories')}
        </button>
        ${state.categories.map(c => `
          <button class="cat-tab ${state.activeCategoryFilter === c.id ? 'active' : ''}" data-cat-id="${c.id}">
            ${escapeHTML(c.name)} (${c.entry_count})
          </button>
        `).join('')}
        <button class="cat-tab" id="add-category-btn">+ ${t('add_category')}</button>
      </div>

      <div id="vault-entries-container">
        ${state.entries.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">${icons.key}</div>
            <h3>No password entries found</h3>
            <p>Click "${t('add_entry')}" or "${t('import_csv')}" to get started.</p>
          </div>
        ` : (state.viewMode === 'cards' ? renderCardsView() : renderListView())}
      </div>
    </div>
  `;
}

function renderCardsView() {
  return `
    <div class="entries-grid" id="entries-grid">
      ${state.entries.map((e, idx) => `
        <div class="entry-card" draggable="${state.sortMode === 'custom'}" data-id="${e.id}" data-index="${idx}">
          <div class="entry-card-header">
            <div class="entry-title-group">
              <a href="${escapeHTML(e.url)}" target="_blank" rel="noopener noreferrer" class="entry-name">
                ${escapeHTML(e.name)}
              </a>
              <a href="${escapeHTML(e.url)}" target="_blank" rel="noopener noreferrer" class="entry-url">
                ${escapeHTML(e.url)}
              </a>
            </div>
            <span class="cat-tab" style="font-size: 0.75rem; padding: 2px 8px;">
              ${escapeHTML(e.category_name || t('uncategorized'))}
            </span>
          </div>

          <div class="entry-card-fields">
            <div class="field-row">
              <span class="field-label">${t('username')}:</span>
              <span class="field-value">${escapeHTML(e.username)}</span>
              <div class="field-actions">
                <button class="btn-icon copy-user-btn" data-username="${escapeHTML(e.username)}" title="${t('copy_username')}">
                  ${icons.copy}
                </button>
              </div>
            </div>

            <div class="field-row">
              <span class="field-label">${t('password')}:</span>
              <span class="field-value password-val" data-id="${e.id}">
                ${state.revealedPasswords[e.id] ? escapeHTML(state.revealedPasswords[e.id]) : '••••••••'}
              </span>
              <div class="field-actions">
                <button class="btn-icon toggle-pw-btn" data-id="${e.id}" title="${state.revealedPasswords[e.id] ? t('hide_password') : t('show_password')}">
                  ${state.revealedPasswords[e.id] ? icons.eyeOff : icons.eye}
                </button>
                <button class="btn-icon copy-pw-btn" data-id="${e.id}" title="${t('copy_password')}">
                  ${icons.copy}
                </button>
              </div>
            </div>
          </div>

          ${e.note ? `
            <div style="font-size: 0.8rem; color: var(--text-secondary); background: var(--bg-main); padding: 8px; border-radius: var(--radius-sm); max-height: 60px; overflow-y: auto;">
              ${escapeHTML(e.note)}
            </div>
          ` : ''}

          <div class="entry-card-footer">
            <div class="entry-card-actions">
              <button class="btn-icon edit-entry-btn" data-id="${e.id}" title="${t('edit_entry')}">${icons.edit}</button>
              <button class="btn-icon duplicate-entry-btn" data-id="${e.id}" title="${t('duplicate')}">${icons.copyCard}</button>
              <button class="btn-icon move-cat-btn" data-id="${e.id}" title="${t('move_category')}">${icons.folder}</button>
              <a href="${escapeHTML(e.url)}" target="_blank" rel="noopener noreferrer" class="btn-icon" title="${t('open_url')}">${icons.external}</a>
            </div>
            <button class="btn-icon delete-entry-btn" data-id="${e.id}" title="${t('delete_entry')}" style="color: var(--status-critical);">
              ${icons.trash}
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderListView() {
  return `
    <div class="entries-table-wrapper">
      <table class="entries-table">
        <thead>
          <tr>
            <th>${t('website_name')}</th>
            <th>${t('username')}</th>
            <th>${t('password')}</th>
            <th>${t('category')}</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="entries-table-body">
          ${state.entries.map((e, idx) => `
            <tr draggable="${state.sortMode === 'custom'}" data-id="${e.id}" data-index="${idx}">
              <td>
                <div style="font-weight: 600;">${escapeHTML(e.name)}</div>
                <a href="${escapeHTML(e.url)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.8rem; color: var(--highlight-blue);">
                  ${escapeHTML(e.url)}
                </a>
              </td>
              <td>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span>${escapeHTML(e.username)}</span>
                  <button class="btn-icon copy-user-btn" data-username="${escapeHTML(e.username)}">${icons.copy}</button>
                </div>
              </td>
              <td>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="password-val" data-id="${e.id}">
                    ${state.revealedPasswords[e.id] ? escapeHTML(state.revealedPasswords[e.id]) : '••••••••'}
                  </span>
                  <button class="btn-icon toggle-pw-btn" data-id="${e.id}">${state.revealedPasswords[e.id] ? icons.eyeOff : icons.eye}</button>
                  <button class="btn-icon copy-pw-btn" data-id="${e.id}">${icons.copy}</button>
                </div>
              </td>
              <td><span class="cat-tab" style="padding: 2px 8px; font-size: 0.75rem;">${escapeHTML(e.category_name)}</span></td>
              <td>
                <div style="display: flex; gap: 4px;">
                  <button class="btn-icon edit-entry-btn" data-id="${e.id}">${icons.edit}</button>
                  <button class="btn-icon duplicate-entry-btn" data-id="${e.id}">${icons.copyCard}</button>
                  <button class="btn-icon move-cat-btn" data-id="${e.id}">${icons.folder}</button>
                  <button class="btn-icon delete-entry-btn" data-id="${e.id}" style="color: var(--status-critical);">${icons.trash}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ---------------- TRASH VIEW ----------------
function renderTrash() {
  return `
    <div class="trash-view">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <p style="color: var(--text-secondary); font-size: 0.9rem;">
          Deleted entries are kept for <strong>7 days</strong> before permanent automatic server-side deletion.
        </p>
        ${state.trash.length > 0 ? `
          <button class="btn btn-danger btn-sm" id="empty-trash-btn">
            ${icons.trash} <span>${t('empty_trash')}</span>
          </button>
        ` : ''}
      </div>

      ${state.trash.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icons.trash}</div>
          <h3>${t('trash')} is empty</h3>
          <p>No deleted password entries currently in Trash.</p>
        </div>
      ` : `
        <div class="entries-table-wrapper">
          <table class="entries-table">
            <thead>
              <tr>
                <th>${t('website_name')}</th>
                <th>${t('username')}</th>
                <th>Deleted On</th>
                <th>Retention</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${state.trash.map(tItem => `
                <tr>
                  <td><strong>${escapeHTML(tItem.name)}</strong></td>
                  <td>${escapeHTML(tItem.username)}</td>
                  <td>${new Date(tItem.deleted_at).toLocaleDateString()}</td>
                  <td>
                    <span style="color: var(--status-warning); font-weight: 600;">
                      ${tItem.days_remaining} ${t('days_left')}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 8px;">
                      <button class="btn btn-secondary btn-sm restore-trash-btn" data-id="${tItem.id}">
                        ${t('restore_entry')}
                      </button>
                      <button class="btn btn-danger btn-sm delete-perm-btn" data-id="${tItem.id}">
                        ${t('delete_permanently')}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ---------------- SECURITY CENTER VIEW ----------------
function renderSecurityCenter() {
  const audit = state.securityData;
  if (!audit) {
    loadSecurityAudit();
    return `<div class="empty-state">${icons.refresh} <p>Running security audit...</p></div>`;
  }

  const statusClass = audit.status === 'Secure' ? 'badge-secure' : (audit.status === 'Warning' ? 'badge-warning' : 'badge-critical');

  return `
    <div class="security-center-view">
      <div class="security-banner">
        <div>
          <span class="security-badge ${statusClass}">
            ${audit.status === 'Secure' ? '🛡️' : '⚠️'} ${t('status_' + audit.status.toLowerCase())}
          </span>
          <h2 style="margin-top: 10px;">Security Evaluation</h2>
          <p style="color: var(--text-secondary); margin-top: 4px;">
            ${audit.total_issues === 0 ? t('no_issues_found') : `${audit.total_issues} security vulnerabilities detected.`}
          </p>
        </div>
        <button class="btn btn-secondary" id="refresh-audit-btn">
          ${icons.refresh} <span>${t('refresh')}</span>
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Compromised Passwords -->
        <div class="card" style="border-left: 4px solid var(--status-critical);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="color: var(--status-critical); font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
              ⚠️ ${t('compromised_passwords')}
            </h3>
            <span class="nav-badge" style="background: var(--status-critical);">${audit.issues.compromised.count}</span>
          </div>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 12px;">
            Checked against known breaches via Have I Been Pwned using k-anonymity privacy hashing.
          </p>
          ${audit.issues.compromised.count === 0 ? `<p style="color: var(--status-secure); font-size: 0.9rem;">✓ No compromised passwords detected.</p>` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${audit.issues.compromised.entries.map(e => `
                <div class="field-row">
                  <div>
                    <strong>${escapeHTML(e.name)}</strong> (${escapeHTML(e.username)})
                    <span style="color: var(--status-critical); font-size: 0.8rem; margin-left: 8px;">Exposed in ${e.breach_count.toLocaleString()} breaches</span>
                  </div>
                  <button class="btn btn-secondary btn-sm edit-entry-btn" data-id="${e.id}">Fix Password</button>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Weak Passwords -->
        <div class="card" style="border-left: 4px solid var(--status-warning);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="color: var(--status-warning); font-size: 1.1rem;">${t('weak_passwords')}</h3>
            <span class="nav-badge" style="background: var(--status-warning);">${audit.issues.weak.count}</span>
          </div>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 12px;">
            Passwords with length under 10 or lacking character complexity.
          </p>
          ${audit.issues.weak.count === 0 ? `<p style="color: var(--status-secure); font-size: 0.9rem;">✓ All passwords meet strength criteria.</p>` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${audit.issues.weak.entries.map(e => `
                <div class="field-row">
                  <div><strong>${escapeHTML(e.name)}</strong> (${escapeHTML(e.username)})</div>
                  <button class="btn btn-secondary btn-sm edit-entry-btn" data-id="${e.id}">Strengthen</button>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Reused Passwords -->
        <div class="card" style="border-left: 4px solid var(--status-warning);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="color: var(--status-warning); font-size: 1.1rem;">${t('reused_passwords')}</h3>
            <span class="nav-badge" style="background: var(--status-warning);">${audit.issues.reused.count}</span>
          </div>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 12px;">
            Entries sharing identical passwords. Passwords are never exposed in this review.
          </p>
          ${audit.issues.reused.count === 0 ? `<p style="color: var(--status-secure); font-size: 0.9rem;">✓ No reused passwords detected.</p>` : `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${audit.issues.reused.groups.map(g => `
                <div style="background: var(--bg-main); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                  <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; color: var(--text-secondary);">
                    Reused across ${g.count} accounts:
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${g.entries.map(e => `
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span><strong>${escapeHTML(e.name)}</strong> (${escapeHTML(e.username)})</span>
                        <button class="btn btn-secondary btn-sm edit-entry-btn" data-id="${e.id}">Change</button>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Old Passwords -->
        <div class="card" style="border-left: 4px solid var(--highlight-blue);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="color: var(--highlight-blue); font-size: 1.1rem;">${t('old_passwords')}</h3>
            <span class="nav-badge">${audit.issues.old.count}</span>
          </div>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 12px;">
            Passwords unchanged for 90 days or longer.
          </p>
          ${audit.issues.old.count === 0 ? `<p style="color: var(--status-secure); font-size: 0.9rem;">✓ No outdated passwords.</p>` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${audit.issues.old.entries.map(e => `
                <div class="field-row">
                  <div>
                    <strong>${escapeHTML(e.name)}</strong> (${escapeHTML(e.username)})
                    <span style="color: var(--text-secondary); font-size: 0.8rem; margin-left: 8px;">${e.days_old} days old</span>
                  </div>
                  <button class="btn btn-secondary btn-sm edit-entry-btn" data-id="${e.id}">Rotate</button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

async function loadSecurityAudit() {
  try {
    const data = await APIClient.getSecurityAudit();
    state.securityData = data;
    renderApp();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ---------------- PASSWORD GENERATOR VIEW ----------------
function renderGenerator() {
  // Generate default password if not set
  if (!state.generatedPassword) {
    state.generatedPassword = generateSecurePassword({
      length: 8,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: true
    });
  }

  return `
    <div class="generator-view" style="max-width: 600px; margin: 0 auto;">
      <div class="card" style="padding: 30px;">
        <h2 style="margin-bottom: 20px; font-size: 1.3rem;">${t('generator')}</h2>

        <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <span style="font-family: var(--font-mono); font-size: 1.3rem; font-weight: 700; color: var(--highlight-blue); letter-spacing: 0.05em; word-break: break-all;" id="gen-password-display">
            ${escapeHTML(state.generatedPassword)}
          </span>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-icon" id="gen-refresh-btn" title="${t('refresh')}">
              ${icons.refresh}
            </button>
            <button class="btn btn-primary" id="gen-copy-btn">
              ${icons.copy} <span>${t('copy_password')}</span>
            </button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 18px;">
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">${t('password_length')}:</label>
              <strong id="gen-len-label">8</strong>
            </div>
            <input type="range" min="6" max="28" value="8" id="gen-len-range" style="accent-color: var(--highlight-blue); cursor: pointer;">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer;">
              <input type="checkbox" id="gen-opt-upper" checked style="accent-color: var(--highlight-blue);">
              <span>${t('uppercase')}</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer;">
              <input type="checkbox" id="gen-opt-lower" checked style="accent-color: var(--highlight-blue);">
              <span>${t('lowercase')}</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer;">
              <input type="checkbox" id="gen-opt-num" checked style="accent-color: var(--highlight-blue);">
              <span>${t('numbers')}</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer;">
              <input type="checkbox" id="gen-opt-sym" checked style="accent-color: var(--highlight-blue);">
              <span>${t('symbols')}</span>
            </label>
          </div>

          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; padding-top: 6px; border-top: 1px solid var(--border-color);">
            <input type="checkbox" id="gen-opt-ambig" checked style="accent-color: var(--highlight-blue);">
            <span>${t('exclude_ambiguous')}</span>
          </label>

          <button class="btn btn-secondary" id="gen-action-btn" style="margin-top: 10px;">
            ${icons.refresh} <span>${t('refresh')}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---------------- SETTINGS VIEW ----------------
function renderSettings() {
  const isGoogleOnly = state.user.auth_provider === 'google';

  return `
    <div class="settings-view" style="display: flex; flex-direction: column; gap: 24px; max-width: 800px;">
      <!-- Profile Settings -->
      <div class="card">
        <h3 style="margin-bottom: 16px;">${t('account_settings')}</h3>
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label">${t('name')}</label>
          <div class="input-with-button">
            <input type="text" class="form-input" id="settings-name-input" value="${escapeHTML(state.user.name)}">
            <button class="btn btn-primary" id="save-name-btn">${t('save')}</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">${t('change_email')}</label>
          <div class="input-with-button">
            <input type="email" class="form-input" id="settings-email-input" value="${escapeHTML(state.user.email)}">
            <button class="btn btn-secondary" id="request-email-btn">${t('save')}</button>
          </div>
          <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
            Current email remains active until the confirmation link sent to the new email is verified.
          </span>
        </div>
      </div>

      <!-- Password Settings -->
      ${!isGoogleOnly ? `
        <div class="card">
          <h3 style="margin-bottom: 16px;">${t('change_password')}</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div class="form-group">
              <label class="form-label">${t('current_password')}</label>
              <input type="password" class="form-input" id="current-pw-input">
            </div>
            <div class="form-group">
              <label class="form-label">${t('new_password')}</label>
              <input type="password" class="form-input" id="new-pw-input">
            </div>
            <div class="form-group">
              <label class="form-label">${t('confirm_password')}</label>
              <input type="password" class="form-input" id="confirm-new-pw-input">
            </div>
            <button class="btn btn-primary" id="change-pw-btn" style="align-self: flex-start; margin-top: 6px;">
              ${t('change_password')}
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Preferences -->
      <div class="card">
        <h3 style="margin-bottom: 16px;">Preferences</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label class="form-label">${t('language')}</label>
            <select class="form-select" id="pref-lang-select">
              <option value="en" ${state.lang === 'en' ? 'selected' : ''}>English (LTR)</option>
              <option value="ar" ${state.lang === 'ar' ? 'selected' : ''}>العربية (RTL)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('theme')}</label>
            <select class="form-select" id="pref-theme-select">
              <option value="system" ${state.theme === 'system' ? 'selected' : ''}>${t('theme_system')}</option>
              <option value="dark" ${state.theme === 'dark' ? 'selected' : ''}>${t('theme_dark')}</option>
              <option value="light" ${state.theme === 'light' ? 'selected' : ''}>${t('theme_light')}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Active Sessions / Devices -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3>${t('active_sessions')}</h3>
          <button class="btn btn-secondary btn-sm" id="logout-other-sessions-btn">
            ${t('logout_all_devices')}
          </button>
        </div>
        <div id="sessions-list-container" style="display: flex; flex-direction: column; gap: 10px;">
          <div class="empty-state">${icons.refresh} <p>Loading sessions...</p></div>
        </div>
      </div>

      <!-- Delete Account -->
      <div class="card" style="border-color: rgba(239, 68, 68, 0.4);">
        <h3 style="color: var(--status-critical); margin-bottom: 8px;">${t('delete_account')}</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 14px;">
          ${t('delete_account_warning')}
        </p>
        <button class="btn btn-danger" id="open-delete-account-modal">
          ${t('delete_account')}
        </button>
      </div>
    </div>
  `;
}

// ---------------- EVENT BINDINGS ----------------
function bindNavigationEvents() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const tab = item.dataset.tab;
      state.activeTab = tab;
      if (tab === 'vault') loadVaultData();
      if (tab === 'trash') loadTrashData();
      if (tab === 'security_center') loadSecurityAudit();
      if (tab === 'dashboard') loadDashboardData();
      renderApp();
    });
  });

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await APIClient.logout();
        state.user = null;
        renderApp();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  const mobileToggle = document.getElementById("mobile-toggle");
  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      document.getElementById("app-sidebar").classList.toggle("open");
    });
  }
}

function bindTabEvents() {
  // Vault Events
  if (state.activeTab === 'vault') {
    const addBtn = document.getElementById("add-entry-btn");
    if (addBtn) addBtn.addEventListener("click", () => renderEntryModal());

    const importBtn = document.getElementById("import-csv-btn");
    if (importBtn) importBtn.addEventListener("click", () => renderCSVImportModal());

    const exportBtn = document.getElementById("export-csv-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        window.location.href = "/api/csv/export";
      });
    }

    const searchInput = document.getElementById("vault-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.searchTerm = e.target.value;
        loadVaultData();
      });
    }

    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", async (e) => {
        state.sortMode = e.target.value;
        await APIClient.updatePreferences({ sort_preference: state.sortMode });
        loadVaultData();
      });
    }

    const toggleViewBtn = document.getElementById("toggle-view-btn");
    if (toggleViewBtn) {
      toggleViewBtn.addEventListener("click", async () => {
        state.viewMode = state.viewMode === 'cards' ? 'list' : 'cards';
        await APIClient.updatePreferences({ view_preference: state.viewMode });
        renderApp();
      });
    }

    const addCatBtn = document.getElementById("add-category-btn");
    if (addCatBtn) addCatBtn.addEventListener("click", () => renderAddCategoryModal());

    document.querySelectorAll(".cat-tab[data-cat-id]").forEach(tab => {
      tab.addEventListener("click", () => {
        state.activeCategoryFilter = tab.dataset.catId || null;
        loadVaultData();
      });
    });

    bindEntryActionButtons();
    bindDragAndDropSort();
  }

  // Security Center Events
  if (state.activeTab === 'security_center') {
    const refreshAuditBtn = document.getElementById("refresh-audit-btn");
    if (refreshAuditBtn) {
      refreshAuditBtn.addEventListener("click", () => loadSecurityAudit());
    }
    document.querySelectorAll(".edit-entry-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        renderEntryModal(id);
      });
    });
  }

  // Dashboard Events
  if (state.activeTab === 'dashboard') {
    const openSecBtn = document.getElementById("open-security-center-btn");
    if (openSecBtn) {
      openSecBtn.addEventListener("click", () => {
        state.activeTab = 'security_center';
        loadSecurityAudit();
        renderApp();
      });
    }
  }

  // Trash Events
  if (state.activeTab === 'trash') {
    const emptyBtn = document.getElementById("empty-trash-btn");
    if (emptyBtn) {
      emptyBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to permanently delete all items in Trash?")) {
          try {
            await APIClient.emptyTrash();
            showToast("Trash emptied", "success");
            loadTrashData();
          } catch (err) {
            showToast(err.message, "error");
          }
        }
      });
    }

    document.querySelectorAll(".restore-trash-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          await APIClient.restoreTrash(btn.dataset.id);
          showToast(t('restore_entry'), "success");
          loadTrashData();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    });

    document.querySelectorAll(".delete-perm-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm("Permanently delete this entry?")) {
          try {
            await APIClient.deletePermanently(btn.dataset.id);
            showToast(t('delete_permanently'), "success");
            loadTrashData();
          } catch (err) {
            showToast(err.message, "error");
          }
        }
      });
    });
  }

  // Generator Events
  if (state.activeTab === 'generator') {
    bindGeneratorEvents();
  }

  // Settings Events
  if (state.activeTab === 'settings') {
    bindSettingsEvents();
    loadSessions();
  }
}

function bindEntryActionButtons() {
  // Copy Username
  document.querySelectorAll(".copy-user-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const u = btn.dataset.username;
      await copyToClipboard(u, false);
      showToast(t('copied_username'), "success");
    });
  });

  // Toggle Password
  document.querySelectorAll(".toggle-pw-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (state.revealedPasswords[id]) {
        delete state.revealedPasswords[id];
        renderApp();
      } else {
        try {
          const res = await APIClient.getEntryPassword(id);
          state.revealedPasswords[id] = res.password;
          renderApp();
        } catch (err) {
          showToast(err.message, "error");
        }
      }
    });
  });

  // Copy Password
  document.querySelectorAll(".copy-pw-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      try {
        let pw = state.revealedPasswords[id];
        if (!pw) {
          const res = await APIClient.getEntryPassword(id);
          pw = res.password;
        }
        await copyToClipboard(pw, true);
        showToast(t('copied_password'), "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  // Edit Entry
  document.querySelectorAll(".edit-entry-btn").forEach(btn => {
    btn.addEventListener("click", () => renderEntryModal(btn.dataset.id));
  });

  // Duplicate Entry
  document.querySelectorAll(".duplicate-entry-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await APIClient.duplicateEntry(btn.dataset.id);
        showToast("Entry duplicated", "success");
        loadVaultData();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  // Move Category
  document.querySelectorAll(".move-cat-btn").forEach(btn => {
    btn.addEventListener("click", () => renderMoveCategoryModal(btn.dataset.id));
  });

  // Delete Entry
  document.querySelectorAll(".delete-entry-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await APIClient.deleteEntry(btn.dataset.id);
        showToast(t('delete_entry'), "success");
        loadVaultData();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });
}

function bindDragAndDropSort() {
  if (state.sortMode !== 'custom') return;
  const container = document.getElementById("entries-grid") || document.getElementById("entries-table-body");
  if (!container) return;

  let draggedItem = null;

  container.querySelectorAll("[draggable='true']").forEach(elem => {
    elem.addEventListener("dragstart", (e) => {
      draggedItem = elem;
      elem.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    elem.addEventListener("dragend", () => {
      elem.classList.remove("dragging");
      draggedItem = null;
    });

    elem.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const target = elem;
      if (target && target !== draggedItem) {
        const rect = target.getBoundingClientRect();
        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
        container.insertBefore(draggedItem, next ? target.nextSibling : target);
      }
    });

    elem.addEventListener("drop", async (e) => {
      e.preventDefault();
      const newOrder = Array.from(container.children).map(c => c.dataset.id);
      try {
        await APIClient.updateOrder(newOrder);
        showToast("Custom order updated", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });
}

// ---------------- DATA LOADERS ----------------
async function loadVaultData() {
  try {
    const [entriesRes, categoriesRes] = await Promise.all([
      APIClient.getEntries({
        search: state.searchTerm || undefined,
        category_id: state.activeCategoryFilter || undefined,
        sort_by: state.sortMode || undefined
      }),
      APIClient.getCategories()
    ]);
    state.entries = entriesRes.entries;
    state.categories = categoriesRes.categories;
    renderApp();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadTrashData() {
  try {
    const res = await APIClient.getTrash();
    state.trash = res.trash;
    renderApp();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ---------------- GENERATOR LOGIC ----------------
function bindGeneratorEvents() {
  const lenRange = document.getElementById("gen-len-range");
  const lenLabel = document.getElementById("gen-len-label");
  const disp = document.getElementById("gen-password-display");

  function regenerate() {
    try {
      const len = parseInt(lenRange.value, 10);
      lenLabel.textContent = len;
      const pw = generateSecurePassword({
        length: len,
        uppercase: document.getElementById("gen-opt-upper").checked,
        lowercase: document.getElementById("gen-opt-lower").checked,
        numbers: document.getElementById("gen-opt-num").checked,
        symbols: document.getElementById("gen-opt-sym").checked,
        excludeAmbiguous: document.getElementById("gen-opt-ambig").checked
      });
      state.generatedPassword = pw;
      disp.textContent = pw;
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (lenRange) lenRange.addEventListener("input", regenerate);
  ["gen-opt-upper", "gen-opt-lower", "gen-opt-num", "gen-opt-sym", "gen-opt-ambig"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", regenerate);
  });

  const refreshBtn = document.getElementById("gen-refresh-btn");
  const actionBtn = document.getElementById("gen-action-btn");
  if (refreshBtn) refreshBtn.addEventListener("click", regenerate);
  if (actionBtn) actionBtn.addEventListener("click", regenerate);

  const copyBtn = document.getElementById("gen-copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      await copyToClipboard(state.generatedPassword, true);
      showToast(t('copied_password'), "success");
    });
  }
}

// ---------------- SETTINGS LOGIC ----------------
function bindSettingsEvents() {
  const saveNameBtn = document.getElementById("save-name-btn");
  if (saveNameBtn) {
    saveNameBtn.addEventListener("click", async () => {
      const name = document.getElementById("settings-name-input").value.trim();
      if (!name) return showToast("Name cannot be empty", "error");
      try {
        await APIClient.updateProfile(name);
        state.user.name = name;
        showToast("Profile name updated", "success");
        renderApp();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  const reqEmailBtn = document.getElementById("request-email-btn");
  if (reqEmailBtn) {
    reqEmailBtn.addEventListener("click", async () => {
      const newEmail = document.getElementById("settings-email-input").value.trim();
      try {
        const res = await APIClient.requestEmailChange(newEmail);
        renderConfirmEmailChangeModal(res.confirmation_token);
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  const changePwBtn = document.getElementById("change-pw-btn");
  if (changePwBtn) {
    changePwBtn.addEventListener("click", async () => {
      const cur = document.getElementById("current-pw-input").value;
      const nw = document.getElementById("new-pw-input").value;
      const cf = document.getElementById("confirm-new-pw-input").value;
      try {
        await APIClient.changePassword({ current_password: cur, new_password: nw, confirm_new_password: cf });
        showToast("Password updated successfully", "success");
        document.getElementById("current-pw-input").value = "";
        document.getElementById("new-pw-input").value = "";
        document.getElementById("confirm-new-pw-input").value = "";
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  const langSelect = document.getElementById("pref-lang-select");
  if (langSelect) {
    langSelect.addEventListener("change", async (e) => {
      setLanguage(e.target.value);
      await APIClient.updatePreferences({ language: e.target.value });
    });
  }

  const themeSelect = document.getElementById("pref-theme-select");
  if (themeSelect) {
    themeSelect.addEventListener("change", async (e) => {
      setTheme(e.target.value);
      await APIClient.updatePreferences({ theme: e.target.value });
    });
  }

  const logoutOtherBtn = document.getElementById("logout-other-sessions-btn");
  if (logoutOtherBtn) {
    logoutOtherBtn.addEventListener("click", async () => {
      try {
        await APIClient.revokeAllOtherSessions();
        showToast("Logged out of all other devices", "success");
        loadSessions();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  const openDelBtn = document.getElementById("open-delete-account-modal");
  if (openDelBtn) {
    openDelBtn.addEventListener("click", () => renderDeleteAccountModal());
  }
}

async function loadSessions() {
  const container = document.getElementById("sessions-list-container");
  if (!container) return;

  try {
    const res = await APIClient.getSessions();
    state.sessions = res.sessions;
    container.innerHTML = res.sessions.map(s => `
      <div class="field-row" style="padding: 12px;">
        <div>
          <div style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <span>${escapeHTML(s.device_type)} • ${escapeHTML(s.browser)} on ${escapeHTML(s.os)}</span>
            ${s.is_current ? `<span class="nav-badge" style="background: var(--status-secure);">${t('current_session')}</span>` : ''}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
            IP: ${escapeHTML(s.ip_address)} • Location: ${escapeHTML(s.approx_location)} • ${t('last_active')}: ${new Date(s.last_active).toLocaleString()}
          </div>
        </div>
        ${!s.is_current ? `
          <button class="btn btn-secondary btn-sm revoke-session-btn" data-id="${s.id}">
            ${t('logout')}
          </button>
        ` : ''}
      </div>
    `).join('');

    container.querySelectorAll(".revoke-session-btn").forEach(b => {
      b.addEventListener("click", async () => {
        try {
          await APIClient.revokeSession(b.dataset.id);
          showToast("Session revoked", "success");
          loadSessions();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<p style="color: var(--status-critical);">${escapeHTML(err.message)}</p>`;
  }
}

// ---------------- MODALS ----------------

// Add / Edit Entry Modal
async function renderEntryModal(entryId = null) {
  let entry = { name: '', url: '', username: '', password: '', note: '', category_id: '' };
  if (entryId) {
    try {
      entry = await APIClient.getEntry(entryId, true);
    } catch (err) {
      return showToast(err.message, "error");
    }
  }

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${entryId ? t('edit_entry') : t('add_entry')}</h3>
        <button class="modal-close" id="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">${t('website_name')} *</label>
          <input type="text" class="form-input" id="entry-name" value="${escapeHTML(entry.name)}" required>
        </div>
        <div class="form-group">
          <label class="form-label">${t('website_url')}</label>
          <input type="url" class="form-input" id="entry-url" value="${escapeHTML(entry.url)}">
        </div>
        <div class="form-group">
          <label class="form-label">${t('username')} *</label>
          <input type="text" class="form-input" id="entry-username" value="${escapeHTML(entry.username)}" required>
        </div>
        <div class="form-group">
          <label class="form-label">${t('password')} *</label>
          <div class="input-with-button">
            <input type="password" class="form-input" id="entry-password" value="${escapeHTML(entry.password)}" required>
            <button class="btn btn-secondary btn-sm" type="button" id="modal-gen-pw-btn">${icons.refresh}</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('category')}</label>
          <select class="form-select" id="entry-category">
            <option value="">${t('uncategorized')}</option>
            ${state.categories.map(c => `
              <option value="${c.id}" ${entry.category_id === c.id ? 'selected' : ''}>${escapeHTML(c.name)}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('notes')}</label>
          <textarea class="form-textarea" id="entry-note">${escapeHTML(entry.note || '')}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel-btn">${t('cancel')}</button>
        <button class="btn btn-primary" id="modal-save-btn">${t('save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector("#modal-close-btn").addEventListener("click", close);
  modal.querySelector("#modal-cancel-btn").addEventListener("click", close);

  modal.querySelector("#modal-gen-pw-btn").addEventListener("click", () => {
    const pw = generateSecurePassword({ length: 16 });
    const pwInput = modal.querySelector("#entry-password");
    pwInput.value = pw;
    pwInput.type = "text";
  });

  modal.querySelector("#modal-save-btn").addEventListener("click", async () => {
    const payload = {
      name: modal.querySelector("#entry-name").value.trim(),
      url: modal.querySelector("#entry-url").value.trim(),
      username: modal.querySelector("#entry-username").value.trim(),
      password: modal.querySelector("#entry-password").value,
      category_id: modal.querySelector("#entry-category").value || null,
      note: modal.querySelector("#entry-note").value
    };

    if (!payload.name || !payload.username || !payload.password) {
      return showToast("Please fill in Website Name, Username and Password", "error");
    }

    try {
      if (entryId) {
        await APIClient.updateEntry(entryId, payload);
        showToast("Entry updated", "success");
      } else {
        await APIClient.createEntry(payload);
        showToast("Entry added to Vault", "success");
      }
      close();
      loadVaultData();
      if (state.activeTab === 'security_center') loadSecurityAudit();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// Move Category Modal
function renderMoveCategoryModal(entryId) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 400px;">
      <div class="modal-header">
        <h3 class="modal-title">${t('move_category')}</h3>
        <button class="modal-close" id="move-cat-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">${t('category')}</label>
          <select class="form-select" id="move-cat-select">
            <option value="">${t('uncategorized')}</option>
            ${state.categories.map(c => `
              <option value="${c.id}">${escapeHTML(c.name)}</option>
            `).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="move-cat-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="move-cat-confirm">${t('save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector("#move-cat-close").addEventListener("click", close);
  modal.querySelector("#move-cat-cancel").addEventListener("click", close);

  modal.querySelector("#move-cat-confirm").addEventListener("click", async () => {
    const catId = modal.querySelector("#move-cat-select").value || null;
    try {
      await APIClient.moveEntryCategory(entryId, catId);
      showToast("Category moved", "success");
      close();
      loadVaultData();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// Add Custom Category Modal
function renderAddCategoryModal() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 400px;">
      <div class="modal-header">
        <h3 class="modal-title">${t('add_category')}</h3>
        <button class="modal-close" id="add-cat-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">${t('category_name')}</label>
          <input type="text" class="form-input" id="new-cat-name" required>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="add-cat-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="add-cat-confirm">${t('save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector("#add-cat-close").addEventListener("click", close);
  modal.querySelector("#add-cat-cancel").addEventListener("click", close);

  modal.querySelector("#add-cat-confirm").addEventListener("click", async () => {
    const name = modal.querySelector("#new-cat-name").value.trim();
    if (!name) return showToast("Category name required", "error");
    try {
      await APIClient.createCategory(name);
      showToast("Category created", "success");
      close();
      loadVaultData();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// CSV Import Modal with Preview and Duplicate Detection
function renderCSVImportModal() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 650px;">
      <div class="modal-header">
        <h3 class="modal-title">${t('csv_import_title')}</h3>
        <button class="modal-close" id="csv-close">&times;</button>
      </div>
      <div class="modal-body" id="csv-modal-body">
        <p style="color: var(--text-secondary); font-size: 0.88rem;">
          Strict CSV Format: <code>name,url,username,password,note</code><br>
          Protected against spreadsheet formula injection. Categories are safely assigned to General.
        </p>

        <div style="border: 2px dashed var(--border-color); border-radius: var(--radius-md); padding: 30px; text-align: center; cursor: pointer; background: var(--bg-main);" id="csv-dropzone">
          <div style="font-size: 2rem; color: var(--highlight-blue); margin-bottom: 8px;">${icons.upload}</div>
          <p><strong>Click to choose file</strong> or drag & drop CSV file here</p>
          <input type="file" id="csv-file-input" accept=".csv,text/csv" style="display: none;">
        </div>

        <div id="csv-preview-area" style="display: none;"></div>
      </div>
      <div class="modal-footer" id="csv-modal-footer">
        <button class="btn btn-secondary" id="csv-cancel">${t('cancel')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector("#csv-close").addEventListener("click", close);
  modal.querySelector("#csv-cancel").addEventListener("click", close);

  const dropzone = modal.querySelector("#csv-dropzone");
  const fileInput = modal.querySelector("#csv-file-input");
  dropzone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    try {
      const preview = await APIClient.previewCSV(fd);
      renderCSVPreviewArea(modal, preview);
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

function renderCSVPreviewArea(modal, preview) {
  const area = modal.querySelector("#csv-preview-area");
  const dropzone = modal.querySelector("#csv-dropzone");
  const footer = modal.querySelector("#csv-modal-footer");
  dropzone.style.display = "none";
  area.style.display = "block";

  area.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <h4>${t('csv_preview')}: ${escapeHTML(preview.filename)}</h4>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
        <div class="field-row"><span>${t('detected_rows')}:</span><strong>${preview.total_rows}</strong></div>
        <div class="field-row"><span>${t('valid_rows')}:</span><strong style="color: var(--status-secure);">${preview.valid_rows_count}</strong></div>
        <div class="field-row"><span>${t('invalid_rows')}:</span><strong style="color: var(--status-critical);">${preview.invalid_rows_count}</strong></div>
        <div class="field-row"><span>${t('duplicates_detected')}:</span><strong style="color: var(--status-warning);">${preview.duplicates_count}</strong></div>
      </div>

      ${preview.errors.length > 0 ? `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); padding: 10px; max-height: 120px; overflow-y: auto;">
          <strong style="color: var(--status-critical); font-size: 0.85rem;">Validation Errors:</strong>
          <ul style="font-size: 0.8rem; margin-left: 20px; color: var(--text-main);">
            ${preview.errors.map(err => `<li>Row ${err.row_number}: ${escapeHTML(err.error)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${preview.duplicates_count > 0 ? `
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer;">
          <input type="checkbox" id="skip-duplicates-chk" checked style="accent-color: var(--highlight-blue);">
          <span>${t('skip_duplicates')} (${preview.duplicates_count} items)</span>
        </label>
      ` : ''}
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary" id="csv-cancel-2">${t('cancel')}</button>
    <button class="btn btn-primary" id="csv-confirm-import-btn" ${preview.valid_rows_count === 0 ? 'disabled' : ''}>
      ${t('confirm_import')} (${preview.valid_rows_count})
    </button>
  `;

  modal.querySelector("#csv-cancel-2").addEventListener("click", () => modal.remove());
  modal.querySelector("#csv-confirm-import-btn").addEventListener("click", async () => {
    const skipDuplicates = modal.querySelector("#skip-duplicates-chk") ? modal.querySelector("#skip-duplicates-chk").checked : false;
    try {
      const res = await APIClient.confirmCSV({
        entries: preview.raw_valid,
        skip_duplicates: skipDuplicates
      });
      showToast(res.message, "success");
      modal.remove();
      loadVaultData();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// Delete Account Modal
function renderDeleteAccountModal() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 450px;">
      <div class="modal-header">
        <h3 class="modal-title" style="color: var(--status-critical);">${t('delete_account')}</h3>
        <button class="modal-close" id="del-acc-close">&times;</button>
      </div>
      <div class="modal-body">
        <p style="color: var(--text-secondary); font-size: 0.9rem;">
          ${t('delete_account_warning')}
        </p>
        <div class="form-group">
          <label class="form-label">${t('delete_confirm_prompt')}</label>
          <input type="text" class="form-input" id="del-acc-input" placeholder="DELETE" autocomplete="off">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="del-acc-cancel">${t('cancel')}</button>
        <button class="btn btn-danger" id="del-acc-confirm">${t('delete_permanently')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector("#del-acc-close").addEventListener("click", close);
  modal.querySelector("#del-acc-cancel").addEventListener("click", close);

  modal.querySelector("#del-acc-confirm").addEventListener("click", async () => {
    const val = modal.querySelector("#del-acc-input").value.trim();
    if (val !== "DELETE") {
      return showToast("Please type DELETE to confirm", "error");
    }
    try {
      await APIClient.deleteAccount(val);
      showToast("Account deleted", "success");
      close();
      state.user = null;
      renderApp();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// Confirm Email Change Modal
function renderConfirmEmailChangeModal(token = "") {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 400px;">
      <div class="modal-header">
        <h3 class="modal-title">Confirm Email Change</h3>
        <button class="modal-close" id="conf-em-close">&times;</button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.88rem; color: var(--text-secondary);">
          Enter the confirmation token sent to your new email address:
        </p>
        <div class="form-group">
          <label class="form-label">Confirmation Token</label>
          <input type="text" class="form-input" id="conf-em-token" value="${token}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="conf-em-cancel">${t('cancel')}</button>
        <button class="btn btn-primary" id="conf-em-btn">${t('save')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector("#conf-em-close").addEventListener("click", close);
  modal.querySelector("#conf-em-cancel").addEventListener("click", close);

  modal.querySelector("#conf-em-btn").addEventListener("click", async () => {
    const tok = modal.querySelector("#conf-em-token").value.trim();
    try {
      const res = await APIClient.confirmEmailChange(tok);
      showToast("Email address updated", "success");
      state.user.email = res.email;
      close();
      renderApp();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// Auth Modal
function renderAuthModal() {
  if (document.getElementById("auth-modal")) return;

  const modal = document.createElement("div");
  modal.id = "auth-modal";
  modal.className = "modal-overlay";

  let mode = "login"; // login, register, forgot, verify

  function updateView() {
    modal.innerHTML = `
      <div class="modal" style="max-width: 420px; padding: 10px;">
        <div class="modal-header" style="border: none; padding-bottom: 0;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="brand-logo">${icons.shield}</div>
            <h2 class="modal-title">${t('app_name')}</h2>
          </div>
        </div>

        <div class="modal-body">
          ${mode === 'login' ? `
            <h3 style="font-size: 1.15rem; margin-bottom: 4px;">${t('login')}</h3>
            <div class="form-group">
              <label class="form-label">${t('email')}</label>
              <input type="email" class="form-input" id="auth-email" required>
            </div>
            <div class="form-group">
              <label class="form-label">${t('password')}</label>
              <input type="password" class="form-input" id="auth-password" required>
            </div>
            <div style="display: flex; justify-content: flex-end;">
              <a href="#" id="goto-forgot" style="font-size: 0.8rem; color: var(--highlight-blue); text-decoration: none;">${t('forgot_password')}</a>
            </div>
            <button class="btn btn-primary" id="auth-login-btn" style="width: 100%; margin-top: 6px;">${t('login')}</button>

            <div style="text-align: center; margin: 12px 0; color: var(--text-secondary); font-size: 0.85rem;">or</div>

            <button class="btn btn-secondary" id="auth-google-btn" style="width: 100%;">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
              <span>${t('sign_in_google')}</span>
            </button>

            <div style="text-align: center; margin-top: 14px; font-size: 0.85rem; color: var(--text-secondary);">
              Don't have an account? <a href="#" id="goto-register" style="color: var(--highlight-blue); text-decoration: none; font-weight: 600;">${t('register')}</a>
            </div>
          ` : (mode === 'register' ? `
            <h3 style="font-size: 1.15rem; margin-bottom: 4px;">${t('register')}</h3>
            <div class="form-group">
              <label class="form-label">${t('name')}</label>
              <input type="text" class="form-input" id="auth-name" required>
            </div>
            <div class="form-group">
              <label class="form-label">${t('email')}</label>
              <input type="email" class="form-input" id="auth-email" required>
            </div>
            <div class="form-group">
              <label class="form-label">${t('password')}</label>
              <input type="password" class="form-input" id="auth-password" required minlength="8">
            </div>
            <button class="btn btn-primary" id="auth-register-btn" style="width: 100%; margin-top: 6px;">${t('register')}</button>

            <div style="text-align: center; margin-top: 14px; font-size: 0.85rem; color: var(--text-secondary);">
              Already have an account? <a href="#" id="goto-login" style="color: var(--highlight-blue); text-decoration: none; font-weight: 600;">${t('login')}</a>
            </div>
          ` : (mode === 'verify' ? `
            <h3 style="font-size: 1.15rem; margin-bottom: 4px;">${t('verify_email')}</h3>
            <p style="color: var(--text-secondary); font-size: 0.88rem;">
              Please enter the verification token received for your account:
            </p>
            <div class="form-group">
              <label class="form-label">Verification Token</label>
              <input type="text" class="form-input" id="auth-token-input" required>
            </div>
            <button class="btn btn-primary" id="auth-verify-btn" style="width: 100%;">${t('verify_email')}</button>
            <div style="text-align: center; margin-top: 12px;">
              <a href="#" id="goto-login-v" style="font-size: 0.85rem; color: var(--highlight-blue); text-decoration: none;">Return to Login</a>
            </div>
          ` : `
            <h3 style="font-size: 1.15rem; margin-bottom: 4px;">${t('forgot_password')}</h3>
            <p style="color: var(--text-secondary); font-size: 0.88rem;">Enter your email to receive password reset instructions.</p>
            <div class="form-group">
              <label class="form-label">${t('email')}</label>
              <input type="email" class="form-input" id="auth-forgot-email" required>
            </div>
            <button class="btn btn-primary" id="auth-forgot-btn" style="width: 100%;">${t('forgot_password')}</button>
            <div style="text-align: center; margin-top: 12px;">
              <a href="#" id="goto-login-f" style="font-size: 0.85rem; color: var(--highlight-blue); text-decoration: none;">Back to Login</a>
            </div>
          `))}
        </div>
      </div>
    `;

    bindAuthEvents();
  }

  function bindAuthEvents() {
    const toReg = modal.querySelector("#goto-register");
    if (toReg) toReg.addEventListener("click", (e) => { e.preventDefault(); mode = "register"; updateView(); });

    const toLog = modal.querySelector("#goto-login") || modal.querySelector("#goto-login-v") || modal.querySelector("#goto-login-f");
    if (toLog) toLog.addEventListener("click", (e) => { e.preventDefault(); mode = "login"; updateView(); });

    const toForg = modal.querySelector("#goto-forgot");
    if (toForg) toForg.addEventListener("click", (e) => { e.preventDefault(); mode = "forgot"; updateView(); });

    // Login Action
    const logBtn = modal.querySelector("#auth-login-btn");
    if (logBtn) {
      logBtn.addEventListener("click", async () => {
        const email = modal.querySelector("#auth-email").value.trim();
        const password = modal.querySelector("#auth-password").value;
        try {
          const res = await APIClient.login({ email, password });
          state.user = res.user;
          modal.remove();
          showToast("Welcome back!", "success");
          loadDashboardData();
          renderApp();
        } catch (err) {
          if (err.message.includes("Email verification is required")) {
            showToast("Please verify your email address", "error");
            mode = "verify";
            updateView();
          } else {
            showToast(err.message, "error");
          }
        }
      });
    }

    // Google Login Action
    const gBtn = modal.querySelector("#auth-google-btn");
    if (gBtn) {
      gBtn.addEventListener("click", async () => {
        const email = prompt("Enter Google Account Email for OAuth sign in:", "user@gmail.com");
        if (!email) return;
        try {
          const res = await APIClient.googleLogin({ email, name: email.split('@')[0] });
          state.user = res.user;
          modal.remove();
          showToast("Signed in with Google", "success");
          loadDashboardData();
          renderApp();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }

    // Register Action
    const regBtn = modal.querySelector("#auth-register-btn");
    if (regBtn) {
      regBtn.addEventListener("click", async () => {
        const name = modal.querySelector("#auth-name").value.trim();
        const email = modal.querySelector("#auth-email").value.trim();
        const password = modal.querySelector("#auth-password").value;
        try {
          const res = await APIClient.register({ name, email, password });
          showToast(res.message, "success");
          mode = "verify";
          updateView();
          if (res.verification_token) {
            modal.querySelector("#auth-token-input").value = res.verification_token;
          }
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }

    // Verify Action
    const vBtn = modal.querySelector("#auth-verify-btn");
    if (vBtn) {
      vBtn.addEventListener("click", async () => {
        const token = modal.querySelector("#auth-token-input").value.trim();
        try {
          await APIClient.verifyEmail(token);
          showToast("Email verified successfully! You may now log in.", "success");
          mode = "login";
          updateView();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }

    // Forgot Password Action
    const forgBtn = modal.querySelector("#auth-forgot-btn");
    if (forgBtn) {
      forgBtn.addEventListener("click", async () => {
        const email = modal.querySelector("#auth-forgot-email").value.trim();
        try {
          const res = await APIClient.forgotPassword(email);
          showToast(res.message, "info");
          if (res.reset_token) {
            const newPw = prompt(`Password reset token: ${res.reset_token}\nEnter your new password:`);
            if (newPw) {
              await APIClient.resetPassword({ token: res.reset_token, new_password: newPw });
              showToast("Password has been reset. Please log in.", "success");
              mode = "login";
              updateView();
            }
          }
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }
  }

  updateView();
  document.body.appendChild(modal);
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Bootstrap on DOM ready
document.addEventListener("DOMContentLoaded", initApp);
