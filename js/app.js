import { state, t, setLanguage, setTheme } from './state.js';
import { APIClient } from './api.js';
import { generateSecurePassword, copyToClipboard } from './crypto_utils.js';

// HeroUI Icons
const icons = {
  shield: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  key: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  dashboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></svg>`,
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
  }, 3500);
}

function createToastContainer() {
  const container = document.createElement("div");
  container.id = "toast-container";
  container.className = "toast-container";
  document.body.appendChild(container);
  return container;
}

// App Initialization - Direct Vault Access (No login gate)
export async function initApp() {
  setLanguage(state.lang);
  setTheme(state.theme);

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
    // Default fallback
    state.user = {
      id: "usr_default",
      name: "Vault Owner",
      email: "user@vaultsafe.local",
      auth_provider: "local"
    };
  }

  // Initial load
  await Promise.all([loadVaultData(), loadDashboardData()]);
  renderApp();
}

// Main Render Loop
export function renderApp() {
  const root = document.getElementById("app-root");
  if (!root) return;

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
          <div class="user-avatar">${(state.user?.name || 'V').charAt(0).toUpperCase()}</div>
          <div class="user-details">
            <span class="user-name">${escapeHTML(state.user?.name || 'Vault Owner')}</span>
            <span class="user-email">${escapeHTML(state.user?.email || 'user@vaultsafe.local')}</span>
          </div>
        </div>
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
    return `<div class="empty-state">${icons.refresh} <p>Loading dashboard...</p></div>`;
  }

  const statusChipClass = d.security_status === 'Secure' ? 'chip-secure' : (d.security_status === 'Warning' ? 'chip-warning' : 'chip-critical');

  return `
    <div class="dashboard-view">
      <div class="security-banner">
        <div>
          <span class="chip ${statusChipClass}">
            ${d.security_status === 'Secure' ? '🛡️' : '⚠️'} ${t('status_' + d.security_status.toLowerCase())}
          </span>
          <h2 style="margin-top: 14px; font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em;">
            ${d.total_security_issues === 0 ? t('no_issues_found') : `${d.total_security_issues} security issues detected`}
          </h2>
          <p style="color: var(--heroui-text-secondary); font-size: 0.92rem; margin-top: 6px;">
            ${d.issues_breakdown.compromised_count > 0 ? t('compromised_detected') : 'HeroUI Security audit monitors weak, reused, or outdated passwords to keep your vault safe.'}
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
  } catch (err) {
    // Fallback data
    state.dashboardData = {
      total_entries: state.entries.length,
      categories_count: state.categories.length,
      trash_count: state.trash.length,
      security_status: "Secure",
      total_security_issues: 0,
      issues_breakdown: { compromised_count: 0, weak_count: 0, reused_count: 0, old_count: 0 }
    };
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
          <select class="form-select" id="sort-select" style="width: auto; border-radius: var(--radius-full);">
            <option value="name_asc" ${state.sortMode === 'name_asc' ? 'selected' : ''}>${t('sort_name_asc')}</option>
            <option value="name_desc" ${state.sortMode === 'name_desc' ? 'selected' : ''}>${t('sort_name_desc')}</option>
            <option value="recently_added_desc" ${state.sortMode === 'recently_added_desc' ? 'selected' : ''}>${t('sort_added_desc')}</option>
            <option value="recently_added_asc" ${state.sortMode === 'recently_added_asc' ? 'selected' : ''}>${t('sort_added_asc')}</option>
            <option value="recently_updated_desc" ${state.sortMode === 'recently_updated_desc' ? 'selected' : ''}>${t('sort_updated_desc')}</option>
            <option value="category" ${state.sortMode === 'category' ? 'selected' : ''}>${t('sort_category')}</option>
            <option value="custom" ${state.sortMode === 'custom' ? 'selected' : ''}>${t('sort_custom')}</option>
          </select>
          <button class="btn btn-secondary btn-icon" id="toggle-view-btn" style="border-radius: var(--radius-full);" title="${state.viewMode === 'cards' ? t('view_list') : t('view_cards')}">
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
            <p>Click "${t('add_entry')}" or "${t('import_csv')}" to add your first password entry.</p>
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
            <div style="display: flex; flex-direction: column;">
              <a href="${escapeHTML(e.url)}" target="_blank" rel="noopener noreferrer" class="entry-name">
                ${escapeHTML(e.name)}
              </a>
              <a href="${escapeHTML(e.url)}" target="_blank" rel="noopener noreferrer" class="entry-url">
                ${escapeHTML(e.url)}
              </a>
            </div>
            <span class="chip" style="background: rgba(255, 255, 255, 0.08); color: var(--heroui-text-secondary); font-size: 0.75rem;">
              ${escapeHTML(e.category_name || t('uncategorized'))}
            </span>
          </div>

          <div class="entry-card-fields">
            <div class="field-row">
              <span class="field-label">${t('username')}</span>
              <span class="field-value">${escapeHTML(e.username)}</span>
              <div class="field-actions">
                <button class="btn-icon copy-user-btn" data-username="${escapeHTML(e.username)}" title="${t('copy_username')}">
                  ${icons.copy}
                </button>
              </div>
            </div>

            <div class="field-row">
              <span class="field-label">${t('password')}</span>
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
            <div style="font-size: 0.82rem; color: var(--heroui-text-secondary); background: var(--heroui-bg-secondary); padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--heroui-border); max-height: 65px; overflow-y: auto;">
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
            <button class="btn-icon delete-entry-btn" data-id="${e.id}" title="${t('delete_entry')}" style="color: var(--heroui-danger);">
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
                <div style="font-weight: 700;">${escapeHTML(e.name)}</div>
                <a href="${escapeHTML(e.url)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.8rem; color: var(--heroui-highlight);">
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
              <td><span class="chip" style="background: rgba(255, 255, 255, 0.08); font-size: 0.75rem;">${escapeHTML(e.category_name)}</span></td>
              <td>
                <div style="display: flex; gap: 4px;">
                  <button class="btn-icon edit-entry-btn" data-id="${e.id}">${icons.edit}</button>
                  <button class="btn-icon duplicate-entry-btn" data-id="${e.id}">${icons.copyCard}</button>
                  <button class="btn-icon move-cat-btn" data-id="${e.id}">${icons.folder}</button>
                  <button class="btn-icon delete-entry-btn" data-id="${e.id}" style="color: var(--heroui-danger);">${icons.trash}</button>
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
        <p style="color: var(--heroui-text-secondary); font-size: 0.92rem;">
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
                    <span style="color: var(--heroui-warning); font-weight: 700;">
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

  const statusChipClass = audit.status === 'Secure' ? 'chip-secure' : (audit.status === 'Warning' ? 'chip-warning' : 'chip-critical');

  return `
    <div class="security-center-view">
      <div class="security-banner">
        <div>
          <span class="chip ${statusChipClass}">
            ${audit.status === 'Secure' ? '🛡️' : '⚠️'} ${t('status_' + audit.status.toLowerCase())}
          </span>
          <h2 style="margin-top: 12px; font-size: 1.35rem; font-weight: 700;">Security Center</h2>
          <p style="color: var(--heroui-text-secondary); margin-top: 4px;">
            ${audit.total_issues === 0 ? t('no_issues_found') : `${audit.total_issues} security vulnerabilities detected.`}
          </p>
        </div>
        <button class="btn btn-secondary" id="refresh-audit-btn">
          ${icons.refresh} <span>${t('refresh')}</span>
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- Compromised Passwords -->
        <div class="card" style="border-left: 4px solid var(--heroui-danger);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="color: var(--heroui-danger); font-size: 1.15rem; display: flex; align-items: center; gap: 8px;">
              ⚠️ ${t('compromised_passwords')}
            </h3>
            <span class="chip chip-critical">${audit.issues.compromised.count}</span>
          </div>
          <p style="color: var(--heroui-text-secondary); font-size: 0.85rem; margin-bottom: 12px;">
            Checked against known breaches via Have I Been Pwned using k-anonymity privacy hashing.
          </p>
          ${audit.issues.compromised.count === 0 ? `<p style="color: var(--heroui-success); font-size: 0.9rem;">✓ No compromised passwords detected.</p>` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${audit.issues.compromised.entries.map(e => `
                <div class="field-row">
                  <div>
                    <strong>${escapeHTML(e.name)}</strong> (${escapeHTML(e.username)})
                    <span style="color: var(--heroui-danger); font-size: 0.8rem; margin-left: 8px;">Exposed in ${e.breach_count.toLocaleString()} breaches</span>
                  </div>
                  <button class="btn btn-secondary btn-sm edit-entry-btn" data-id="${e.id}">Fix Password</button>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Weak Passwords -->
        <div class="card" style="border-left: 4px solid var(--heroui-warning);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="color: var(--heroui-warning); font-size: 1.15rem;">${t('weak_passwords')}</h3>
            <span class="chip chip-warning">${audit.issues.weak.count}</span>
          </div>
          <p style="color: var(--heroui-text-secondary); font-size: 0.85rem; margin-bottom: 12px;">
            Passwords with length under 10 or lacking character complexity.
          </p>
          ${audit.issues.weak.count === 0 ? `<p style="color: var(--heroui-success); font-size: 0.9rem;">✓ All passwords meet strength criteria.</p>` : `
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
        <div class="card" style="border-left: 4px solid var(--heroui-warning);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="color: var(--heroui-warning); font-size: 1.15rem;">${t('reused_passwords')}</h3>
            <span class="chip chip-warning">${audit.issues.reused.count}</span>
          </div>
          <p style="color: var(--heroui-text-secondary); font-size: 0.85rem; margin-bottom: 12px;">
            Entries sharing identical passwords. Passwords are never exposed in this review.
          </p>
          ${audit.issues.reused.count === 0 ? `<p style="color: var(--heroui-success); font-size: 0.9rem;">✓ No reused passwords detected.</p>` : `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${audit.issues.reused.groups.map(g => `
                <div style="background: var(--heroui-bg-secondary); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--heroui-border);">
                  <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; color: var(--heroui-text-secondary);">
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
        <div class="card" style="border-left: 4px solid var(--heroui-highlight);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="color: var(--heroui-highlight); font-size: 1.15rem;">${t('old_passwords')}</h3>
            <span class="chip" style="background: var(--heroui-highlight-glow); color: var(--heroui-highlight);">${audit.issues.old.count}</span>
          </div>
          <p style="color: var(--heroui-text-secondary); font-size: 0.85rem; margin-bottom: 12px;">
            Passwords unchanged for 90 days or longer.
          </p>
          ${audit.issues.old.count === 0 ? `<p style="color: var(--heroui-success); font-size: 0.9rem;">✓ No outdated passwords.</p>` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${audit.issues.old.entries.map(e => `
                <div class="field-row">
                  <div>
                    <strong>${escapeHTML(e.name)}</strong> (${escapeHTML(e.username)})
                    <span style="color: var(--heroui-text-secondary); font-size: 0.8rem; margin-left: 8px;">${e.days_old} days old</span>
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
      <div class="card" style="padding: 32px;">
        <h2 style="margin-bottom: 22px; font-size: 1.4rem; font-weight: 700;">${t('generator')}</h2>

        <div style="background: var(--heroui-bg-secondary); border: 1.5px solid var(--heroui-border); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 14px;">
          <span style="font-family: var(--font-mono); font-size: 1.35rem; font-weight: 700; color: var(--heroui-highlight); letter-spacing: 0.05em; word-break: break-all;" id="gen-password-display">
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

        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="form-group">
            <div style="display: flex; justify-content: space-between;">
              <label class="form-label">${t('password_length')}:</label>
              <strong id="gen-len-label" style="color: var(--heroui-highlight); font-size: 1.1rem;">8</strong>
            </div>
            <input type="range" min="6" max="28" value="8" id="gen-len-range" style="accent-color: var(--heroui-highlight); cursor: pointer; height: 6px;">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer;">
              <input type="checkbox" id="gen-opt-upper" checked style="accent-color: var(--heroui-highlight);">
              <span>${t('uppercase')}</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer;">
              <input type="checkbox" id="gen-opt-lower" checked style="accent-color: var(--heroui-highlight);">
              <span>${t('lowercase')}</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer;">
              <input type="checkbox" id="gen-opt-num" checked style="accent-color: var(--heroui-highlight);">
              <span>${t('numbers')}</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer;">
              <input type="checkbox" id="gen-opt-sym" checked style="accent-color: var(--heroui-highlight);">
              <span>${t('symbols')}</span>
            </label>
          </div>

          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; padding-top: 10px; border-top: 1px solid var(--heroui-border-light);">
            <input type="checkbox" id="gen-opt-ambig" checked style="accent-color: var(--heroui-highlight);">
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
  return `
    <div class="settings-view" style="display: flex; flex-direction: column; gap: 24px; max-width: 800px;">
      <!-- Profile Settings -->
      <div class="card">
        <h3 style="margin-bottom: 16px;">${t('account_settings')}</h3>
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label">${t('name')}</label>
          <div class="input-with-button">
            <input type="text" class="form-input" id="settings-name-input" value="${escapeHTML(state.user?.name || 'Vault Owner')}">
            <button class="btn btn-primary" id="save-name-btn">${t('save')}</button>
          </div>
        </div>
      </div>

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

      <!-- Delete Account -->
      <div class="card" style="border-color: rgba(239, 68, 68, 0.35);">
        <h3 style="color: var(--heroui-danger); margin-bottom: 8px;">Reset Vault</h3>
        <p style="color: var(--heroui-text-secondary); font-size: 0.9rem; margin-bottom: 14px;">
          Permanently purge all stored entries, categories, and trash data.
        </p>
        <button class="btn btn-danger" id="open-delete-account-modal">
          Reset Vault Data
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

  const mobileToggle = document.getElementById("mobile-toggle");
  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      document.getElementById("app-sidebar").classList.toggle("open");
    });
  }
}

function bindTabEvents() {
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

  if (state.activeTab === 'generator') {
    bindGeneratorEvents();
  }

  if (state.activeTab === 'settings') {
    bindSettingsEvents();
  }
}

function bindEntryActionButtons() {
  document.querySelectorAll(".copy-user-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const u = btn.dataset.username;
      await copyToClipboard(u, false);
      showToast(t('copied_username'), "success");
    });
  });

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

  document.querySelectorAll(".edit-entry-btn").forEach(btn => {
    btn.addEventListener("click", () => renderEntryModal(btn.dataset.id));
  });

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

  document.querySelectorAll(".move-cat-btn").forEach(btn => {
    btn.addEventListener("click", () => renderMoveCategoryModal(btn.dataset.id));
  });

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
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function loadTrashData() {
  try {
    const res = await APIClient.getTrash();
    state.trash = res.trash;
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

  const openDelBtn = document.getElementById("open-delete-account-modal");
  if (openDelBtn) {
    openDelBtn.addEventListener("click", () => renderDeleteAccountModal());
  }
}

// ---------------- HEROUI MODALS ----------------
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
      await loadVaultData();
      renderApp();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

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
      await loadVaultData();
      renderApp();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

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
      await loadVaultData();
      renderApp();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

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
        <p style="color: var(--heroui-text-secondary); font-size: 0.88rem;">
          Strict CSV Format: <code>name,url,username,password,note</code><br>
          Protected against spreadsheet formula injection. Categories are safely assigned to General.
        </p>

        <div style="border: 2px dashed var(--heroui-border); border-radius: var(--radius-lg); padding: 32px; text-align: center; cursor: pointer; background: var(--heroui-bg-secondary);" id="csv-dropzone">
          <div style="font-size: 2.2rem; color: var(--heroui-highlight); margin-bottom: 8px;">${icons.upload}</div>
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
        <div class="field-row"><span>${t('valid_rows')}:</span><strong style="color: var(--heroui-success);">${preview.valid_rows_count}</strong></div>
        <div class="field-row"><span>${t('invalid_rows')}:</span><strong style="color: var(--heroui-danger);">${preview.invalid_rows_count}</strong></div>
        <div class="field-row"><span>${t('duplicates_detected')}:</span><strong style="color: var(--heroui-warning);">${preview.duplicates_count}</strong></div>
      </div>

      ${preview.errors.length > 0 ? `
        <div style="background: var(--heroui-danger-bg); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); padding: 12px; max-height: 120px; overflow-y: auto;">
          <strong style="color: var(--heroui-danger); font-size: 0.85rem;">Validation Errors:</strong>
          <ul style="font-size: 0.8rem; margin-left: 20px; color: var(--heroui-text-main);">
            ${preview.errors.map(err => `<li>Row ${err.row_number}: ${escapeHTML(err.error)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${preview.duplicates_count > 0 ? `
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer;">
          <input type="checkbox" id="skip-duplicates-chk" checked style="accent-color: var(--heroui-highlight);">
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
      await loadVaultData();
      renderApp();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

function renderDeleteAccountModal() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal" style="max-width: 450px;">
      <div class="modal-header">
        <h3 class="modal-title" style="color: var(--heroui-danger);">Reset Vault Data</h3>
        <button class="modal-close" id="del-acc-close">&times;</button>
      </div>
      <div class="modal-body">
        <p style="color: var(--heroui-text-secondary); font-size: 0.9rem;">
          Permanently delete all stored vault entries, custom categories, and trash data.
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
      showToast("Vault reset successfully", "success");
      close();
      await loadVaultData();
      renderApp();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
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

document.addEventListener("DOMContentLoaded", initApp);
