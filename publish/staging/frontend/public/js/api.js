// public/js/api.js
(function () {
  const DEFAULT_TIMEOUT_MS = 15000;
  const TOKEN_KEY = "auth_token";
  const API_BASE = "";

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; }
    catch { return ""; }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {}
  }

  async function req(method, url, body, options = {}) {
    const { timeoutMs = DEFAULT_TIMEOUT_MS } = options;

    const opts = {
      method,
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      cache: "no-store",
    };

    const token = getToken();
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;

    // timeout
    let timeoutId;
    let controller;
    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      controller = new AbortController();
      opts.signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    // body
    const isForm = (typeof FormData !== "undefined") && (body instanceof FormData);
    if (body !== undefined) {
      if (isForm) {
        opts.body = body;
      } else {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
      }
    }

    let r;
    try {
      r = await fetch(url, opts);
    } catch (e) {
      if (e && e.name === "AbortError") throw new Error("İstek zaman aşımına uğradı");
      throw e;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    if (r.status === 304) return null;

    const text = await r.text();
    let data;
    try { data = text ? JSON.parse(text) : null; }
    catch { data = text; }

    if (!r.ok) {
      const msg =
        (data && typeof data === "object" && (
          data.error?.message || data.error || data.message
        )) ||
        (typeof data === "string" && data) ||
        `HTTP ${r.status}`;

      throw new Error(msg);
    }

    return data;
  }

  // Auth / users
  const getUsers = () => req("GET", `${API_BASE}/api/users`);
  const login = (username, password) => req("POST", `${API_BASE}/api/login`, { username, password });

  const createUser = (payload) => req("POST", `${API_BASE}/api/users`, payload);
  const updateUser = (oldUsername, payload) =>
    req("PUT", `${API_BASE}/api/users/${encodeURIComponent(oldUsername)}`, payload);
  const deleteUser = (username) =>
    req("DELETE", `${API_BASE}/api/users/${encodeURIComponent(username)}`);

  const changeMyPassword = (currentPassword, newPassword) =>
    req("PUT", `${API_BASE}/api/users/me/password`, { currentPassword, newPassword });

  const changeUserPassword = (username, password) =>
    req("PUT", `${API_BASE}/api/users/${encodeURIComponent(username)}/password`, { password });

  // Projects
  const getProjects = () => req("GET", `${API_BASE}/api/projects`);
  const createProject = (payload) => req("POST", `${API_BASE}/api/projects`, payload);
  const updateProject = (id, payload) =>
    req("PUT", `${API_BASE}/api/projects/${encodeURIComponent(id)}`, payload);
  const deleteProject = (id) =>
    req("DELETE", `${API_BASE}/api/projects/${encodeURIComponent(id)}`);

  // Upload
  const uploadBase64 = (name, base64) => {
    const fd = new FormData();
    fd.append("name", name ?? "file");
    fd.append("data", base64 ?? "");
    return req("POST", `${API_BASE}/api/upload`, fd);
  };

  const uploadFile = (file) => {
    const fd = new FormData();
    const fname = file?.name || "file";
    fd.append("file", file, fname);
    fd.append("name", fname);
    return req("POST", `${API_BASE}/api/upload`, fd);
  };

  window.API = {
    getToken, setToken,
    getUsers, login,
    createUser, updateUser, deleteUser,
    changeMyPassword, changeUserPassword,
    getProjects, createProject, updateProject, deleteProject,
    uploadBase64, uploadFile,
  };
})();

