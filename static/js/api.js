// Client API layer

export class APIClient {
  static token = null;

  static async request(url, options = {}) {
    options.headers = options.headers || {};
    options.credentials = "include"; // Send HttpOnly cookies

    if (this.token) {
      options.headers["Authorization"] = `Bearer ${this.token}`;
    }

    if (options.body && !(options.body instanceof FormData) && typeof options.body === "object") {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, options);
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent("vault:unauthorized"));
    }

    const contentType = res.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const msg = (data && data.detail) || (typeof data === "string" ? data : "Request failed");
      throw new Error(msg);
    }

    return data;
  }

  // Auth
  static register(payload) { return this.request("/api/auth/register", { method: "POST", body: payload }); }
  static verifyEmail(token) { return this.request("/api/auth/verify-email", { method: "POST", body: { token } }); }
  static login(payload) { return this.request("/api/auth/login", { method: "POST", body: payload }); }
  static googleLogin(payload) { return this.request("/api/auth/google", { method: "POST", body: payload }); }
  static forgotPassword(email) { return this.request("/api/auth/forgot-password", { method: "POST", body: { email } }); }
  static resetPassword(payload) { return this.request("/api/auth/reset-password", { method: "POST", body: payload }); }
  static logout() { return this.request("/api/auth/logout", { method: "POST" }); }
  static getMe() { return this.request("/api/auth/me"); }

  // Vault
  static getEntries(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/api/vault?${q}`);
  }
  static createEntry(payload) { return this.request("/api/vault", { method: "POST", body: payload }); }
  static getEntry(id, reveal = false) { return this.request(`/api/vault/${id}?reveal=${reveal}`); }
  static getEntryPassword(id) { return this.request(`/api/vault/${id}/password`); }
  static updateEntry(id, payload) { return this.request(`/api/vault/${id}`, { method: "PUT", body: payload }); }
  static deleteEntry(id) { return this.request(`/api/vault/${id}`, { method: "DELETE" }); }
  static duplicateEntry(id) { return this.request(`/api/vault/${id}/duplicate`, { method: "POST" }); }
  static moveEntryCategory(id, category_id) { return this.request(`/api/vault/${id}/move-category`, { method: "POST", body: { category_id } }); }
  static updateOrder(order) { return this.request("/api/vault/order", { method: "PUT", body: { order } }); }

  // Categories
  static getCategories() { return this.request("/api/categories"); }
  static createCategory(name) { return this.request("/api/categories", { method: "POST", body: { name } }); }
  static updateCategory(id, name) { return this.request(`/api/categories/${id}`, { method: "PUT", body: { name } }); }
  static deleteCategory(id) { return this.request(`/api/categories/${id}`, { method: "DELETE" }); }

  // Trash
  static getTrash() { return this.request("/api/trash"); }
  static restoreTrash(id) { return this.request(`/api/trash/${id}/restore`, { method: "POST" }); }
  static deletePermanently(id) { return this.request(`/api/trash/${id}`, { method: "DELETE" }); }
  static emptyTrash() { return this.request("/api/trash/empty", { method: "POST" }); }

  // Security Center & Dashboard
  static getDashboardSummary() { return this.request("/api/security/dashboard-summary"); }
  static getSecurityAudit() { return this.request("/api/security/audit"); }

  // CSV
  static previewCSV(formData) { return this.request("/api/csv/preview", { method: "POST", body: formData }); }
  static confirmCSV(payload) { return this.request("/api/csv/confirm", { method: "POST", body: payload }); }

  // Settings & Sessions
  static updateProfile(name) { return this.request("/api/settings/profile", { method: "PUT", body: { name } }); }
  static requestEmailChange(new_email) { return this.request("/api/settings/request-email-change", { method: "POST", body: { new_email } }); }
  static confirmEmailChange(token) { return this.request("/api/settings/confirm-email-change", { method: "POST", body: { token } }); }
  static changePassword(payload) { return this.request("/api/settings/change-password", { method: "POST", body: payload }); }
  static updatePreferences(payload) { return this.request("/api/settings/preferences", { method: "PUT", body: payload }); }
  static deleteAccount(confirmation) { return this.request("/api/settings/delete-account", { method: "POST", body: { confirmation } }); }

  static getSessions() { return this.request("/api/sessions"); }
  static revokeSession(id) { return this.request(`/api/sessions/${id}/revoke`, { method: "POST" }); }
  static revokeAllOtherSessions() { return this.request("/api/sessions/revoke-all", { method: "POST" }); }
}
