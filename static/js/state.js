import { translations } from './i18n.js';

export const state = {
  user: null,
  activeTab: 'dashboard',
  lang: localStorage.getItem('vault_lang') || 'en',
  theme: localStorage.getItem('vault_theme') || 'system',
  viewMode: localStorage.getItem('vault_view') || 'cards',
  sortMode: localStorage.getItem('vault_sort') || 'name_asc',
  entries: [],
  categories: [],
  trash: [],
  activeCategoryFilter: null,
  searchTerm: '',
  dashboardData: null,
  securityData: null,
  sessions: [],
  revealedPasswords: {} // entry_id -> plaintext password
};

export function t(key) {
  const dict = translations[state.lang] || translations.en;
  return dict[key] || translations.en[key] || key;
}

export function setLanguage(lang) {
  state.lang = lang;
  localStorage.setItem('vault_lang', lang);
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  window.dispatchEvent(new CustomEvent('vault:state_changed'));
}

export function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem('vault_theme', theme);
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  window.dispatchEvent(new CustomEvent('vault:state_changed'));
}
