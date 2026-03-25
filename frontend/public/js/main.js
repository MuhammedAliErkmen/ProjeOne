// public/js/main.js
(function () {
  const state = {
    me: null,
    isAdmin: false,
    projects: [],
    users: [],
    view: "board",
    page: "dashboard",
    filterStatuses: new Set(),
    sortKey: "ad",
    sortDir: 1,
    mentions: [],
    notifTab: "all",
    activeProjectId: null,
    editProject: null,
    editUser: null
  };

  const PAGES = {
    dashboard: { id: "#pageDashboard", title: "Proje Panosu", nav: "#navDashboard" },
    users: { id: "#pageUsers", title: "Ekibimiz", nav: "#navUsers" },
    settings: { id: "#pageSettings", title: "Ayarlar", nav: "#navSettings" },
    list: { id: "#pageList", title: "Proje Listesi", nav: "#navProjectList" }
  };

  const el = (s) => U.qs(s);
  const els = (s) => U.qsa(s);

  // ---------------------------
  // UI Helpers
  // ---------------------------
  function setBodyState(ready) {
    document.body.classList.toggle("app-ready", !!ready);
    document.body.classList.toggle("login-only", !ready);
  }

  function setAdminUi(isAdmin) {
    els(".admin-only").forEach((x) => {
      x.style.display = isAdmin ? "block" : "none";
    });
  }

  function closeAllOverlays() {
    ["#modalOverlay", "#userModalOverlay", "#myPassOverlay", "#notifOverlay"].forEach((s) => {
      try { U.closeOverlay(s); } catch {}
    });
  }

  function clearLoginInputs() {
    el("#inpLoginUser") && (el("#inpLoginUser").value = "");
    el("#inpLoginPass") && (el("#inpLoginPass").value = "");
    el("#loginError") && (el("#loginError").textContent = "");
  }

  // ✅ ISO timestamp (sorting + uniqueness için daha iyi)
  function fmtDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    if (!dt || Number.isNaN(dt.getTime())) return "";
    return dt.toISOString();
  }

  function statusLabel(st) {
    if (st === "cancelled") return "İptal Edildi";
    return st === "done-dev" ? "Tamamlandı (Geliştirme)"
      : st === "done" ? "Tamamlandı"
      : st === "prog" ? "Devam Ediyor"
      : "Başlamadı";
  }

  function projectStatus(p) {
    if (window.Dashboard?.statusOf) return window.Dashboard.statusOf(p);
    if (String(p?.status || "").toLowerCase() === "cancelled") return "cancelled";
    const pct = Number(p?.yuzde) || 0;
    if (pct >= 100) return (String(p?.doneType || "").toLowerCase() === "done-dev") ? "done-dev" : "done";
    if (pct > 0) return "prog";
    return "new";
  }

  // ---------------------------
  // Page + View
  // ---------------------------
  function renderSortModeToggle() {
    const wrap = el("#sortModeToggle");
    if (!wrap) return;

    const buttons = [...wrap.querySelectorAll("button[data-mode]")];
    if (!buttons.length) return;

    const getMode = () => window.Dashboard?.getSortMode?.() || "auto";
    const setMode = (m) => window.Dashboard?.setSortMode?.(m);

    function paint() {
      const mode = getMode();
      buttons.forEach((b) => b.classList.toggle("active", b.getAttribute("data-mode") === mode));
    }

    if (!wrap._wired) {
      wrap._wired = true;

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const mode = btn.getAttribute("data-mode") || "auto";
          setMode(mode);
          paint();
          renderDashboard();
        });
      });
    }

    paint();
  }

  function setPage(page) {
    state.page = page;

    Object.values(PAGES).forEach((p) => {
      const view = el(p.id);
      if (view) view.classList.toggle("active", p.id === PAGES[page].id);

      const nav = el(p.nav);
      if (nav) nav.classList.toggle("active", p.id === PAGES[page].id);
    });

    const title = PAGES[page]?.title || "Dashboard";
    const h = el("#pageTitle");
    if (h) h.textContent = title;

    const showDash = page === "dashboard";

    const headerSearch = el("#headerSearch");
    if (headerSearch) headerSearch.style.display = showDash ? "flex" : "none";

    const boardNav = el("#boardNav");
    if (boardNav) boardNav.style.display = showDash ? "flex" : "none";

    const sortToggle = el("#sortModeToggle");
    if (sortToggle) sortToggle.style.display = showDash ? "flex" : "none";

    if (showDash) renderSortModeToggle();
  }

  function setView(view) {
    state.view = (view === "timeline") ? "timeline" : "board";

    const btnBoard = el("#btnViewBoard");
    const btnTimeline = el("#btnViewTimeline");
    if (btnBoard) btnBoard.classList.toggle("active", state.view === "board");
    if (btnTimeline) btnTimeline.classList.toggle("active", state.view === "timeline");

    const board = el("#viewBoard");
    const timeline = el("#viewTimeline");

    if (board) board.style.display = (state.view === "board") ? "grid" : "none";
    if (timeline) timeline.style.display = (state.view === "timeline") ? "block" : "none";

    if (state.view === "timeline") {
      window.Timeline?.renderTimeline?.(state.projects || []);
    }
  }

  function setKpiActive(activeSet) {
    const map = {
      all: "#kpiTotal",
      new: "#kpiNew",
      prog: "#kpiProg",
      "done-dev": "#kpiDoneDev",
      done: "#kpiDone",
      cancelled: "#kpiCancelled"
    };

    Object.values(map).forEach((sel) => {
      const k = el(sel);
      if (k) k.classList.remove("active");
    });

    if (!activeSet || activeSet.size === 0) {
      const k = el(map.all);
      if (k) k.classList.add("active");
      return;
    }

    activeSet.forEach((st) => {
      const k = el(map[st]);
      if (k) k.classList.add("active");
    });
  }

  function filterByStatus(st) {
    if (!st) {
      state.filterStatuses.clear();
    } else {
      if (state.filterStatuses.has(st) && state.filterStatuses.size === 1) {
        state.filterStatuses.clear();
      } else {
        state.filterStatuses.clear();
        state.filterStatuses.add(st);
      }
    }

    setKpiActive(state.filterStatuses);
    renderDashboard();
  }

  function renderDashboard() {
    window.Dashboard?.renderAll?.(state.projects || [], state.filterStatuses);
    if (state.view === "timeline") {
      window.Timeline?.renderTimeline?.(state.projects || []);
    }
  }

  // ---------------------------
  // Auth helpers
  // ---------------------------
  function handleUnauthorized() {
    API.setToken("");
    state.me = null;
    state.isAdmin = false;
    state.projects = [];
    state.users = [];
    state.editProject = null;
    state.editUser = null;
    state.activeProjectId = null;

    setAdminUi(false);
    closeAllOverlays();
    setBodyState(false);
    clearLoginInputs();
  }

  function isUnauthorizedErr(e) {
    const m = String(e?.message || "").toLowerCase();
    return m.includes("yetkisiz") || m.includes("unauthorized") || m.includes("jwt");
  }

  // ---------------------------
  // Data Load
  // ---------------------------
  async function loadProjects() {
    try {
      const data = await API.getProjects();

      if (Array.isArray(data)) state.projects = data;
      else if (data == null) state.projects = Array.isArray(state.projects) ? state.projects : [];
      else state.projects = [];

    } catch (e) {
      if (isUnauthorizedErr(e)) {
        handleUnauthorized();
        return;
      }
      state.projects = Array.isArray(state.projects) ? state.projects : [];
    }

    renderDashboard();
    renderProjectList();
    renderParentSelect();
    renderNotifications();
    if (state.page === "dashboard") renderSortModeToggle();
  }

  async function loadUsers() {
    try {
      const data = await API.getUsers();
      state.users = Array.isArray(data) ? data : [];
    } catch (e) {
      state.users = [];
      if (isUnauthorizedErr(e)) {
        handleUnauthorized();
        return;
      }
    }

    renderUsers();
    renderOwnerSelects();
    renderOwnerFilter();
    renderAdminPasswordSelect();
  }

  // ---------------------------
  // Users / Owners Options
  // ---------------------------
  function userOptions() {
    const users = Array.isArray(state.users) ? state.users : [];
    if (users.length) return users.map((u) => String(u.username || u.name || u).trim()).filter(Boolean);

    const set = new Set();
    (state.projects || []).forEach((p) => {
      const owners = Array.isArray(p.owners) ? p.owners : [];
      owners.forEach((o) => set.add(String(o)));
      if (p.sahip) set.add(String(p.sahip));
    });
    return Array.from(set).filter(Boolean);
  }

  function renderOwnerSelects() {
    const sel = el("#inpOwnerSelect");
    if (!sel) return;
    const opts = userOptions();

    sel.innerHTML = opts.length
      ? opts.map((o) => `<option value="${U.esc(o)}">${U.esc(o)}</option>`).join("")
      : `<option value="">(Ekip üyesi bulunamadı)</option>`;
  }

  function renderOwnerFilter() {
    const sel = el("#filter_owner");
    if (!sel) return;

    const opts = userOptions();
    const cur = sel.value || "all";

    sel.innerHTML =
      `<option value="all">Hepsi</option>` +
      opts.map((o) => `<option value="${U.esc(o)}">${U.esc(o)}</option>`).join("");

    sel.value = cur;
  }

  function renderAdminPasswordSelect() {
    const sel = el("#adminPassUserSelect");
    if (!sel) return;

    const users = userOptions();
    sel.innerHTML = users.length
      ? users.map((o) => `<option value="${U.esc(o)}">${U.esc(o)}</option>`).join("")
      : `<option value="">(Kullanıcı yok)</option>`;
  }

  function initials(name) {
    const s = String(name || "").trim();
    if (!s) return "?";
    return s.split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
  }

  // ---------------------------
  // Users UI
  // ---------------------------
  function renderUsers() {
    const host = el("#userListGrid");
    if (!host) return;

    const list = Array.isArray(state.users) ? state.users : [];
    if (!list.length) {
      host.innerHTML = `<div style="color:var(--muted); font-weight:700;">Henüz ekip üyesi yok.</div>`;
      return;
    }

    host.innerHTML = list.map((u) => {
      const username = String(u.username || u.name || "");
      const title = String(u.title || "");

      return `
        <div class="user-card" data-user="${U.esc(username)}">
          <div class="user-avatar-lg">${U.esc(initials(username))}</div>
          <div class="user-details">
            <h3>${U.esc(username)}</h3>
            <p>${U.esc(title || "Ünvan belirtilmedi")}</p>
          </div>

          ${state.isAdmin ? `
            <div class="user-actions">
              <button class="btn btn-secondary btn-icon" data-action="edit" title="Düzenle">E</button>
              <button class="btn btn-secondary btn-icon delete" data-action="delete" title="Sil">X</button>
            </div>
          ` : ""}
        </div>
      `;
    }).join("");
  }

  // ---------------------------
  // Project List UI (Table)
  // ---------------------------
  function renderSortIcons() {
    const ad = el("#sort_ad");
    const alan = el("#sort_alan");
    if (ad) ad.textContent = state.sortKey === "ad" ? (state.sortDir > 0 ? "^" : "¡") : "";
    if (alan) alan.textContent = state.sortKey === "alan" ? (state.sortDir > 0 ? "^" : "¡") : "";
  }

  function renderProjectList() {
    const host = el("#projectListTable");
    if (!host) return;

    const fAd = String(el("#filter_ad")?.value || "").toLowerCase().trim();
    const fAlan = String(el("#filter_alan")?.value || "").toLowerCase().trim();
    const fOwner = String(el("#filter_owner")?.value || "all");
    const fStatus = String(el("#filter_status")?.value || "all");
    const fPctRaw = el("#filter_pct")?.value;
    const fPct = (fPctRaw === "" || fPctRaw == null) ? null : Number(fPctRaw);
    const fDate = String(el("#filter_date")?.value || "").toLowerCase().trim();

    let list = Array.isArray(state.projects) ? [...state.projects] : [];

    if (fAd) list = list.filter((p) => String(p.ad || "").toLowerCase().includes(fAd));
    if (fAlan) list = list.filter((p) => String(p.alan || "").toLowerCase().includes(fAlan));

    if (fOwner !== "all") {
      list = list.filter((p) => {
        const owners = Array.isArray(p.owners) ? p.owners.map(String) : [];
        return owners.includes(fOwner) || String(p.sahip || "") === fOwner;
      });
    }

    if (fStatus !== "all") list = list.filter((p) => projectStatus(p) === fStatus);
    if (fPct != null && Number.isFinite(fPct)) list = list.filter((p) => (Number(p.yuzde) || 0) >= fPct);
    if (fDate) list = list.filter((p) => String(p.sonTeslim || "").toLowerCase().includes(fDate));

    list.sort((a, b) => {
      const va = String(a[state.sortKey] || "");
      const vb = String(b[state.sortKey] || "");
      return state.sortDir * va.localeCompare(vb);
    });

    if (!list.length) {
      host.innerHTML = `<tr><td colspan="7" style="color:var(--muted); font-weight:700;">Kayıt bulunamadı.</td></tr>`;
      renderSortIcons();
      return;
    }

    host.innerHTML = list.map((p) => {
      const st = projectStatus(p);
      const owners = Array.isArray(p.owners) ? p.owners.join(", ") : (p.sahip || "");

      return `
        <tr>
          <td>${U.esc(p.ad || "")}</td>
          <td>${U.esc(p.alan || "Genel")}</td>
          <td>${U.esc(owners || "-")}</td>
          <td><span class="pill">${U.esc(statusLabel(st))}</span></td>
          <td>${U.esc(U.fmtPct(p.yuzde || 0))}</td>
          <td>${U.esc(p.sonTeslim || "-")}</td>
          <td><button class="btn btn-secondary" data-action="open" data-id="${U.esc(p.id)}">Detay</button></td>
        </tr>
      `;
    }).join("");

    renderSortIcons();
  }

  // ---------------------------
  // Project Modal Helpers
  // ---------------------------
  function projectDefaults() {
    return {
      ad: "",
      aciklama: "",
      yuzde: 0,
      sonTeslim: "",
      sahip: "",
      alan: "Genel",
      next: "",
      parentId: null,
      baslangicTarihi: "",
      sonTeslimEdilen: "",
      priority: "Normal",
      doneType: null,
      status: "",
      owners: [],
      files: [],
      comments: [],
      history: []
    };
  }

  function renderParentSelect() {
    const sel = el("#inpParentSelect");
    if (!sel) return;

    const curId = state.editProject?.id;
    const list = Array.isArray(state.projects) ? state.projects : [];

    const options = list
      .filter((p) => String(p.id) !== String(curId))
      .map((p) => `<option value="${U.esc(p.id)}">${U.esc(p.ad || p.id)}</option>`)
      .join("");

    sel.innerHTML = `<option value="">(Yok)</option>` + options;
    sel.value = state.editProject?.parentId ? String(state.editProject.parentId) : "";
  }

  function renderOwnersTags() {
    const host = el("#ownersTagContainer");
    if (!host) return;

    const owners = Array.isArray(state.editProject?.owners) ? state.editProject.owners : [];
    host.innerHTML = owners.map((o, i) => `
      <div class="tag">
        ${U.esc(o)}
        <button class="tag-remove" data-idx="${i}" title="Kaldır">×</button>
      </div>
    `).join("");
  }

  function renderFiles() {
    const host = el("#fileList");
    if (!host) return;

    const files = Array.isArray(state.editProject?.files) ? state.editProject.files : [];
    if (!files.length) {
      host.innerHTML = `<div style="color:var(--muted); font-weight:700; font-size:12px;">Henüz ek yok.</div>`;
      return;
    }

    host.innerHTML = files.map((f, i) => `
      <div class="file-row" style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin:8px 0;">
        <a href="${U.esc(f.url || "#")}" target="_blank">${U.esc(f.name || "Dosya")}</a>
        <button class="btn btn-secondary" data-action="remove-file" data-idx="${i}">Sil</button>
      </div>
    `).join("");
  }

  function renderComments() {
    const host = el("#commentList");
    if (!host) return;

    const comments = Array.isArray(state.editProject?.comments) ? state.editProject.comments : [];
    if (!comments.length) {
      host.innerHTML = `<div style="color:var(--muted); font-weight:700; font-size:12px;">Henüz yorum yok.</div>`;
      return;
    }

    host.innerHTML = comments.map((c) => `
      <div class="comment-row" style="padding:10px 0; border-bottom:1px solid var(--line);">
        <div style="font-weight:800;">${U.esc(c.user || "")}</div>
        <div style="font-size:12px; color:var(--muted); font-weight:700;">${U.esc(c.date || "")}</div>
        <div style="margin-top:6px;">${U.esc(c.text || "")}</div>
      </div>
    `).join("");
  }

  function renderHistory() {
    const host = el("#historyList");
    if (!host) return;

    const history = Array.isArray(state.editProject?.history) ? state.editProject.history : [];
    if (!history.length) {
      host.innerHTML = `<div style="color:var(--muted); font-weight:700; font-size:12px;">Henüz geçmiş yok.</div>`;
      return;
    }

    host.innerHTML = history.map((h) => `
      <div class="comment-row" style="padding:10px 0; border-bottom:1px solid var(--line);">
        <div style="font-weight:800;">${U.esc(h.user || "")}</div>
        <div style="font-size:12px; color:var(--muted); font-weight:700;">${U.esc(h.date || "")}</div>
        <div style="margin-top:6px;">${U.esc(h.details || h.action || "")}</div>
      </div>
    `).join("");
  }

  function updateCharCounts() {
    els(".char-count").forEach((n) => {
      const id = n.getAttribute("data-count-for");
      const input = id ? document.getElementById(id) : null;
      if (!input) return;
      const len = String(input.value || "").length;
      n.textContent = `${len}/2000`;
    });
  }

  function checkMaxLen() {
    const ids = ["inpAd", "inpDesc", "inpAlan", "inpLastDelivered", "inpNextStep"];
    let err = "";
    ids.forEach((id) => {
      const v = String(document.getElementById(id)?.value || "");
      if (v.length > 2000) err = "Alanlar 2000 karakteri geçemez.";
    });

    const warn = el("#projLenWarn");
    if (warn) {
      warn.style.display = err ? "block" : "none";
      warn.textContent = err;
    }
    return !err;
  }

  function renderProjectModal(isNew) {
    const p = state.editProject || projectDefaults();
    const isCancelled = String(p.status || "").toLowerCase() === "cancelled";

    const mt = el("#modalTitle");
    if (mt) mt.textContent = isNew ? "Yeni Proje" : "Proje Detayı";

    el("#inpAd") && (el("#inpAd").value = p.ad || "");
    el("#inpDesc") && (el("#inpDesc").value = p.aciklama || "");
    el("#inpStartDate") && (el("#inpStartDate").value = p.baslangicTarihi || "");
    el("#inpDate") && (el("#inpDate").value = p.sonTeslim || "");
    el("#inpPct") && (el("#inpPct").value = Number.isFinite(Number(p.yuzde)) ? Number(p.yuzde) : 0);
    el("#inpPriority") && (el("#inpPriority").value = p.priority || "Normal");
    el("#inpAlan") && (el("#inpAlan").value = p.alan || "");
    el("#inpDoneType") && (el("#inpDoneType").value = p.doneType || "done");
    el("#inpLastDelivered") && (el("#inpLastDelivered").value = p.sonTeslimEdilen || "");
    el("#inpNextStep") && (el("#inpNextStep").value = p.next || "");
    el("#btnCancelProject") && (el("#btnCancelProject").style.display = (!isNew && !isCancelled) ? "inline-flex" : "none");
    el("#btnReactivateProject") && (el("#btnReactivateProject").style.display = (!isNew && isCancelled) ? "inline-flex" : "none");

    const doneWrap = el("#doneTypeWrap");
    if (doneWrap) doneWrap.style.display = (Number(p.yuzde) || 0) >= 100 ? "block" : "none";

    renderParentSelect();
    renderOwnersTags();
    renderFiles();
    renderComments();
    renderHistory();
    updateCharCounts();
    checkMaxLen();

    ensureMentionUi();
  }

  function syncProjectFromForm() {
    if (!checkMaxLen()) return false;

    const p = state.editProject || projectDefaults();

    p.ad = String(el("#inpAd")?.value || "").trim();
    p.aciklama = String(el("#inpDesc")?.value || "");
    p.baslangicTarihi = String(el("#inpStartDate")?.value || "");
    p.sonTeslim = String(el("#inpDate")?.value || "");
    p.yuzde = Number(el("#inpPct")?.value || 0);
    p.priority = String(el("#inpPriority")?.value || "Normal");
    p.alan = String(el("#inpAlan")?.value || "Genel");
    p.doneType = String(el("#inpDoneType")?.value || "done");
    p.sonTeslimEdilen = String(el("#inpLastDelivered")?.value || "");
    p.next = String(el("#inpNextStep")?.value || "");

    if (String(p.status || "").toLowerCase() !== "cancelled") {
      p.status = "";
    }

    const parentId = String(el("#inpParentSelect")?.value || "").trim();
    p.parentId = parentId ? parentId : null;

    state.editProject = p;
    return true;
  }

  function addHistory(p, action, details) {
    p.history = Array.isArray(p.history) ? p.history : [];
    p.history.push({
      user: state.me || "Anonim",
      action,
      date: fmtDate(new Date()),
      details
    });
  }

  function openProject(id) {
    const proj = (state.projects || []).find((p) => String(p.id) === String(id));
    if (!proj) return;

    state.activeProjectId = proj.id;
    state.editProject = JSON.parse(JSON.stringify(proj));
    renderProjectModal(false);
    U.openOverlay("#modalOverlay");
  }

  function openNewProject() {
    state.activeProjectId = null;
    state.editProject = projectDefaults();
    renderProjectModal(true);
    U.openOverlay("#modalOverlay");
  }

  function closeProjectModal() {
    state.editProject = null;
    state.activeProjectId = null;
    U.closeOverlay("#modalOverlay");
    renderDashboard();
  }

  async function saveProject() {
    if (!syncProjectFromForm()) return;

    const p = state.editProject;
    if (!p.ad) {
      alert("Proje başlığı gerekli");
      return;
    }

    try {
      if (state.activeProjectId) {
        addHistory(p, "updated", "Proje güncellendi");
        await API.updateProject(state.activeProjectId, p);
      } else {
        addHistory(p, "created", "Yeni proje oluşturuldu");
        const r = await API.createProject(p);
        if (r?.id) state.activeProjectId = r.id;
      }
      await loadProjects();
      U.closeOverlay("#modalOverlay");
    } catch (e) {
      if (isUnauthorizedErr(e)) return handleUnauthorized();
      alert("Kaydetme hatası: " + (e?.message || e));
    }
  }

  async function deleteProject() {
    if (!state.activeProjectId) {
      U.closeOverlay("#modalOverlay");
      return;
    }
    if (!confirm("Projeyi silmek istiyor musun?")) return;

    try {
      await API.deleteProject(state.activeProjectId);
      await loadProjects();
      U.closeOverlay("#modalOverlay");
    } catch (e) {
      if (isUnauthorizedErr(e)) return handleUnauthorized();
      alert("Silme hatası: " + (e?.message || e));
    }
  }

  async function cancelProject() {
    if (!state.activeProjectId || !state.editProject) {
      U.closeOverlay("#modalOverlay");
      return;
    }
    if (!confirm("Projeyi iptal edilmiş durumuna almak istiyor musun?")) return;

    try {
      const p = state.editProject;
      p.status = "cancelled";
      addHistory(p, "cancelled", "Proje iptal edildi");
      await API.updateProject(state.activeProjectId, p);
      await loadProjects();
      U.closeOverlay("#modalOverlay");
    } catch (e) {
      if (isUnauthorizedErr(e)) return handleUnauthorized();
      alert("İptal etme hatası: " + (e?.message || e));
    }
  }

  async function reactivateProject() {
    if (!state.activeProjectId || !state.editProject) {
      U.closeOverlay("#modalOverlay");
      return;
    }
    if (!confirm("Projeyi tekrar aktif duruma almak istiyor musun?")) return;

    try {
      const p = state.editProject;
      p.status = "";
      addHistory(p, "reactivated", "Proje tekrar aktif edildi");
      await API.updateProject(state.activeProjectId, p);
      await loadProjects();
      U.closeOverlay("#modalOverlay");
    } catch (e) {
      if (isUnauthorizedErr(e)) return handleUnauthorized();
      alert("Aktif etme hatası: " + (e?.message || e));
    }
  }

  function switchTab(id) {
    els(".tab-content").forEach((c) => c.classList.remove("active"));
    const content = el("#" + id);
    if (content) content.classList.add("active");

    const tabs = els("#modalOverlay .tab");
    tabs.forEach((t) => t.classList.remove("active"));

    const map = { tabDetails: 0, tabComments: 1, tabHistory: 2 };
    const idx = map[id];
    if (Number.isFinite(idx) && tabs[idx]) tabs[idx].classList.add("active");

    if (id === "tabComments") ensureMentionUi();
  }

  // ---------------------------
  // File Upload (Project)
  // ---------------------------
  async function persistEditProjectSafe() {
    if (!state.activeProjectId || !state.editProject) return;
    try {
      await API.updateProject(state.activeProjectId, state.editProject);
      await loadProjects();
    } catch (e) {
      if (isUnauthorizedErr(e)) return handleUnauthorized();
      throw e;
    }
  }

  async function onFileSelected(file) {
    if (!file) return;
    try {
      const r = await API.uploadFile(file);

      state.editProject.files = Array.isArray(state.editProject.files) ? state.editProject.files : [];
      state.editProject.files.push({ name: r.name, url: r.url });
      addHistory(state.editProject, "file", `Dosya eklendi: ${r.name}`);

      renderFiles();
      renderHistory();

      await persistEditProjectSafe();
    } catch (err) {
      alert("Dosya yükleme hatası: " + (err?.message || err));
    }
  }

  // ---------------------------
  // Mentions autocomplete (@)
  // ---------------------------
  function ensureMentionUi() {
    const ta = el("#inpComment");
    if (!ta || ta._mentionWired) return;
    ta._mentionWired = true;

    const box = document.createElement("div");
    box.id = "mentionSuggest";
    box.style.position = "absolute";
    box.style.display = "none";
    box.style.zIndex = "99999";
    box.style.background = "white";
    box.style.border = "1px solid var(--line-dark)";
    box.style.borderRadius = "10px";
    box.style.boxShadow = "var(--shadow)";
    box.style.padding = "6px";
    box.style.minWidth = "220px";
    box.style.maxHeight = "220px";
    box.style.overflow = "auto";

    const parent = ta.closest(".form-group") || ta.parentElement;
    if (parent) parent.style.position = "relative";
    (parent || document.body).appendChild(box);

    let items = [];
    let active = 0;

    function close() { box.style.display = "none"; box.innerHTML = ""; }
    function open()  { box.style.display = "block"; }

    function positionBox() {
      box.style.left = (ta.offsetLeft) + "px";
      box.style.top = (ta.offsetTop + ta.offsetHeight + 6) + "px";
      box.style.width = ta.offsetWidth + "px";
    }

    function currentQuery() {
      const v = ta.value;
      const pos = ta.selectionStart || 0;
      const left = v.slice(0, pos);
      const m = left.match(/@([^\s@]{1,30})$/);
      return m ? m[1] : null;
    }

    function insertMention(username) {
      const v = ta.value;
      const pos = ta.selectionStart || 0;

      const left = v.slice(0, pos);
      const right = v.slice(pos);

      const m = left.match(/@([^\s@]{0,30})$/);
      if (!m) return;

      const before = left.slice(0, left.length - m[0].length);
      const mention = "@" + username;

      ta.value = before + mention + " " + right;
      const newPos = (before + mention + " ").length;
      ta.setSelectionRange(newPos, newPos);
      ta.focus();
    }

    function paintActive() {
      [...box.querySelectorAll(".ms-item")].forEach((n, i) => {
        n.style.background = (i === active) ? "var(--focus-soft)" : "transparent";
        n.style.color = (i === active) ? "var(--focus)" : "var(--text)";
      });
    }

    function renderList(q) {
      const all = userOptions();
      const low = String(q || "").toLowerCase();

      items = all
        .filter(x => x.toLowerCase().includes(low))
        .slice(0, 8);

      if (!items.length) { close(); return; }

      active = Math.min(active, items.length - 1);

      box.innerHTML = items.map((u, i) => `
        <div class="ms-item" data-i="${i}"
             style="padding:8px 10px; border-radius:8px; cursor:pointer; font-weight:800; font-size:12px;">
          ${U.esc(u)}
        </div>
      `).join("");

      paintActive();
      positionBox();
      open();
    }

    ta.addEventListener("input", () => {
      const q = currentQuery();
      if (!q) return close();
      renderList(q);
    });

    ta.addEventListener("keydown", (e) => {
      if (box.style.display !== "block") return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        active = Math.min(active + 1, items.length - 1);
        paintActive();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        active = Math.max(active - 1, 0);
        paintActive();
      }
      if (e.key === "Enter") {
        const u = items[active];
        if (u) {
          e.preventDefault();
          insertMention(u);
          close();
        }
      }
      if (e.key === "Escape") close();
    });

    box.addEventListener("click", (e) => {
      const item = e.target.closest(".ms-item");
      if (!item) return;
      const i = Number(item.getAttribute("data-i"));
      const u = items[i];
      if (u) {
        insertMention(u);
        close();
      }
    });

    document.addEventListener("click", (e) => {
      if (e.target === ta || box.contains(e.target)) return;
      close();
    }, true);
  }

  // ---------------------------
  // Notifications (Activities)
  // ---------------------------
  function parseDateLoose(v) {
    const s = String(v || "").trim();
    if (!s) return NaN;

    const iso = Date.parse(s);
    if (Number.isFinite(iso)) return iso;

    let m = s.match(/^(\d{2})[.\-](\d{2})[.\-](\d{4})/);
    if (m) return Date.parse(`${m[3]}-${m[2]}-${m[1]}`);

    return NaN;
  }

  function sortByDateDesc(a, b) {
    const da = parseDateLoose(a?.date);
    const db = parseDateLoose(b?.date);
    if (Number.isFinite(da) && Number.isFinite(db)) return db - da;
    if (Number.isFinite(da)) return -1;
    if (Number.isFinite(db)) return 1;
    return String(b?.date || "").localeCompare(String(a?.date || ""));
  }

  function activityKey(x) {
    return [
      String(x.projectId || ""),
      String(x.project || ""),
      String(x.user || ""),
      String(x.date || ""),
      String(x.details || x.action || x.text || "")
    ].join("|");
  }

  function hiddenKeyFor(user, type) {
    return `ba_hidden_${type}_${String(user || "").toLowerCase()}`;
  }

  function getHiddenSet(user, type) {
    try {
      const raw = localStorage.getItem(hiddenKeyFor(user, type));
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  function saveHiddenSet(user, type, set) {
    try {
      localStorage.setItem(hiddenKeyFor(user, type), JSON.stringify([...set]));
    } catch {}
  }

  function normalizeSimple(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function mentionMatchesUser(tag, meRaw) {
    const a = normalizeSimple(tag);
    const b = normalizeSimple(meRaw);
    if (!a || !b) return false;

    if (a === b) return true;

    const aj = a.replace(/\s+/g, "");
    const bj = b.replace(/\s+/g, "");
    return aj === bj;
  }

  function buildMentions() {
    const meRaw = String(state.me || "").trim();
    if (!meRaw) return [];

    const mentions = [];

    (state.projects || []).forEach((p) => {
      const comments = Array.isArray(p.comments) ? p.comments : [];
      comments.forEach((c) => {
        const text = String(c.text || "");

        const hits = text.match(/@[\p{L}\p{N}._-]+(?:\s+[\p{L}\p{N}._-]+)?/gu) || [];
        const ok = hits.some((h) => mentionMatchesUser(h.slice(1), meRaw));

        if (ok) {
          mentions.push({
            projectId: p.id,
            project: p.ad || p.id,
            user: c.user,
            date: c.date,
            text: c.text
          });
        }
      });
    });

    mentions.sort(sortByDateDesc);
    return mentions;
  }

  function renderNotifications() {
    const host = el("#globalHistoryList");
    if (host) {
      const all = [];
      (state.projects || []).forEach((p) => {
        const h = Array.isArray(p.history) ? p.history : [];
        h.forEach((item) => {
          all.push({
            projectId: p.id,
            project: p.ad || p.id,
            user: item.user,
            date: item.date,
            details: item.details || item.action
          });
        });
      });

      if (!all.length) {
        host.innerHTML = `<div style="color:var(--muted); font-weight:700; font-size:12px;">Henüz aktivite yok.</div>`;
      } else {
        const hiddenAll = getHiddenSet(state.me, "all");
        const visibleAll = all.filter(x => !hiddenAll.has(activityKey(x)));

        visibleAll.sort(sortByDateDesc);
        host.innerHTML = visibleAll.map((x) => `
          <div class="comment-row" style="padding:10px 0; border-bottom:1px solid var(--line);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-weight:800;">${U.esc(x.project || "Proje")}</div>
              <button class="btn btn-secondary btn-icon" data-action="hide-activity" data-key="${U.esc(activityKey(x))}">Sil</button>
            </div>
            <div style="font-size:12px; color:var(--muted); font-weight:700;">${U.esc(x.date || "")}</div>
            <div style="margin-top:6px;">${U.esc((x.user ? x.user + ": " : "") + (x.details || ""))}</div>
          </div>
        `).join("");
      }
    }

    state.mentions = buildMentions();
    const mHost = el("#mentionList");
    if (mHost) {
      const hiddenMent = getHiddenSet(state.me, "mentions");
      const visibleMent = state.mentions.filter(m => !hiddenMent.has(activityKey(m)));

      if (!visibleMent.length) {
        mHost.innerHTML = `<div style="color:var(--muted); font-weight:700; font-size:12px;">Henüz etiketin yok.</div>`;
      } else {
        mHost.innerHTML = visibleMent.map((m) => `
          <div class="comment-row mention-item"
               data-project-id="${U.esc(m.projectId)}"
               style="padding:10px 0; border-bottom:1px solid var(--line); cursor:pointer;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="font-weight:800;">${U.esc(m.project || "Proje")}</div>
              <button class="btn btn-secondary btn-icon" data-action="hide-mention" data-key="${U.esc(activityKey(m))}">Sil</button>
            </div>
            <div style="font-size:12px; color:var(--muted); font-weight:700;">${U.esc(m.date || "")}</div>
            <div style="margin-top:6px;">${U.esc((m.user ? m.user + ": " : "") + (m.text || ""))}</div>
          </div>
        `).join("");
      }
    }
  }

  function setNotifTab(tab) {
    state.notifTab = (tab === "mentions") ? "mentions" : "all";

    const tabs = els("#notifTabs .notif-tab");
    tabs.forEach((b) => b.classList.toggle("active", b.getAttribute("data-tab") === state.notifTab));

    const pAll = el("#notifTabAll");
    const pMen = el("#notifTabMentions");
    if (pAll) pAll.classList.toggle("active", state.notifTab === "all");
    if (pMen) pMen.classList.toggle("active", state.notifTab === "mentions");
  }

  function openNotifications() {
    renderNotifications();
    setNotifTab(state.notifTab || "all");
    U.openOverlay("#notifOverlay");
  }

  // ---------------------------
  // Users CRUD
  // ---------------------------
  function openUserAdd() {
    state.editUser = null;
    el("#userModalTitle") && (el("#userModalTitle").textContent = "Yeni Ekip Üyesi");
    el("#inpUserName") && (el("#inpUserName").value = "");
    el("#inpUserTitle") && (el("#inpUserTitle").value = "");
    el("#inpUserPass") && (el("#inpUserPass").value = "");
    el("#userPasswordWrap") && (el("#userPasswordWrap").style.display = "block");
    U.openOverlay("#userModalOverlay");
  }

  function openUserEdit(username) {
    const u = (state.users || []).find((x) => String(x.username) === String(username));
    if (!u) return;

    state.editUser = u;
    el("#userModalTitle") && (el("#userModalTitle").textContent = "Ekip Üyesi Düzenle");
    el("#inpUserName") && (el("#inpUserName").value = u.username || "");
    el("#inpUserTitle") && (el("#inpUserTitle").value = u.title || "");
    el("#inpUserPass") && (el("#inpUserPass").value = "");
    el("#userPasswordWrap") && (el("#userPasswordWrap").style.display = "none");
    U.openOverlay("#userModalOverlay");
  }

  async function saveUser() {
    const username = String(el("#inpUserName")?.value || "").trim();
    const title = String(el("#inpUserTitle")?.value || "").trim();
    const password = String(el("#inpUserPass")?.value || "").trim();

    if (!username) {
      alert("Kullanıcı adı gerekli");
      return;
    }

    try {
      if (state.editUser) {
        await API.updateUser(state.editUser.username, { username, title });
      } else {
        if (!password) {
          alert("Şifre gerekli");
          return;
        }
        await API.createUser({ username, title, password });
      }
      await loadUsers();
      U.closeOverlay("#userModalOverlay");
    } catch (e) {
      if (isUnauthorizedErr(e)) return handleUnauthorized();
      alert("Kaydetme hatası: " + (e?.message || e));
    }
  }

  async function deleteUser(username) {
    if (!confirm("Kullanıcıyı silmek istiyor musun?")) return;
    try {
      await API.deleteUser(username);
      await loadUsers();
    } catch (e) {
      if (isUnauthorizedErr(e)) return handleUnauthorized();
      alert("Silme hatası: " + (e?.message || e));
    }
  }

  // ---------------------------
  // Auth
  // ---------------------------
  async function doLogin() {
    const username = String(el("#inpLoginUser")?.value || "").trim();
    const password = String(el("#inpLoginPass")?.value || "").trim();

    if (!username || !password) {
      el("#loginError") && (el("#loginError").textContent = "Kullanıcı adı ve şifre gerekli");
      return;
    }

    el("#loginError") && (el("#loginError").textContent = "");

    const r = await API.login(username, password);
    if (!r || !r.success) {
      el("#loginError") && (el("#loginError").textContent = r?.message || "Giriş başarısız");
      return;
    }

    API.setToken(r.token);
    state.me = r.username;
    state.isAdmin = !!r.isAdmin;

    setAdminUi(state.isAdmin);
    setBodyState(true);
    setPage("dashboard");
    setView("board");

    clearLoginInputs();

    await loadUsers();
    await loadProjects();
  }

  function doLogout() {
    API.setToken("");
    state.me = null;
    state.isAdmin = false;
    setAdminUi(false);
    closeAllOverlays();
    setBodyState(false);
    clearLoginInputs();
  }

  // ---------------------------
  // Password Update
  // ---------------------------
  async function changeMyPassword() {
    const currentPassword = String(el("#inpMyCurrentPass")?.value || "").trim();
    const newPassword = String(el("#inpMyNewPass")?.value || "").trim();
    const newPassword2 = String(el("#inpMyNewPass2")?.value || "").trim();

    const msg = el("#myPassMsg");
    if (msg) msg.textContent = "";

    if (!currentPassword || !newPassword) {
      if (msg) { msg.textContent = "Tüm alanlar gerekli"; msg.className = "form-msg err"; }
      return;
    }
    if (newPassword !== newPassword2) {
      if (msg) { msg.textContent = "Yeni şifreler eşleşmiyor"; msg.className = "form-msg err"; }
      return;
    }

    try {
      await API.changeMyPassword(currentPassword, newPassword);
      if (msg) { msg.textContent = "Şifre güncellendi"; msg.className = "form-msg ok"; }
      el("#inpMyCurrentPass") && (el("#inpMyCurrentPass").value = "");
      el("#inpMyNewPass") && (el("#inpMyNewPass").value = "");
      el("#inpMyNewPass2") && (el("#inpMyNewPass2").value = "");
    } catch (e) {
      if (isUnauthorizedErr(e)) return handleUnauthorized();
      if (msg) { msg.textContent = e?.message || "Hata"; msg.className = "form-msg err"; }
    }
  }

  async function adminChangePassword() {
    const username = String(el("#adminPassUserSelect")?.value || "").trim();
    const password = String(el("#inpAdminNewPass")?.value || "").trim();
    const password2 = String(el("#inpAdminNewPass2")?.value || "").trim();

    const msg = el("#adminPassMsg");
    if (msg) msg.textContent = "";

    if (!username || !password) {
      if (msg) { msg.textContent = "Tüm alanlar gerekli"; msg.className = "form-msg err"; }
      return;
    }
    if (password !== password2) {
      if (msg) { msg.textContent = "Şifreler eşleşmiyor"; msg.className = "form-msg err"; }
      return;
    }

    try {
      await API.changeUserPassword(username, password);
      if (msg) { msg.textContent = "Şifre güncellendi"; msg.className = "form-msg ok"; }
      el("#inpAdminNewPass") && (el("#inpAdminNewPass").value = "");
      el("#inpAdminNewPass2") && (el("#inpAdminNewPass2").value = "");
    } catch (e) {
      if (isUnauthorizedErr(e)) return handleUnauthorized();
      if (msg) { msg.textContent = e?.message || "Hata"; msg.className = "form-msg err"; }
    }
  }

  function closeMyPasswordModal() {
    U.closeOverlay("#myPassOverlay");
  }

  // ---------------------------
  // Events
  // ---------------------------
  function bindEvents() {
    el("#btnLogin")?.addEventListener("click", doLogin);

    el("#inpLoginUser")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });
    el("#inpLoginPass")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLogin();
    });

    el("#btnNewProject")?.addEventListener("click", openNewProject);

    el("#btnSave")?.addEventListener("click", saveProject);
    el("#btnCancel")?.addEventListener("click", closeProjectModal);
    el("#btnDelete")?.addEventListener("click", deleteProject);
    el("#btnCancelProject")?.addEventListener("click", cancelProject);
    el("#btnReactivateProject")?.addEventListener("click", reactivateProject);

    el("#btnSidebarToggle")?.addEventListener("click", () => {
      document.body.classList.toggle("sidebar-collapsed");
    });

    el("#q")?.addEventListener("input", U.debounce(renderDashboard, 250));

    el("#inpPct")?.addEventListener("input", () => {
      const v = Number(el("#inpPct")?.value || 0);
      const wrap = el("#doneTypeWrap");
      if (wrap) wrap.style.display = v >= 100 ? "block" : "none";
    });

    els(".table-filter-input").forEach((x) => {
      x.addEventListener("input", renderProjectList);
      x.addEventListener("change", renderProjectList);
    });

    el("#projectListTable")?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-action='open']");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      if (id) openProject(id);
    });

    el("#ownersTagContainer")?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.(".tag-remove");
      if (!btn) return;

      const idx = Number(btn.getAttribute("data-idx"));
      if (!Number.isFinite(idx)) return;

      state.editProject.owners = Array.isArray(state.editProject.owners) ? state.editProject.owners : [];
      state.editProject.owners.splice(idx, 1);
      renderOwnersTags();
    });

    el("#btnAddOwner")?.addEventListener("click", (e) => {
      e.preventDefault();
      const val = String(el("#inpOwnerSelect")?.value || "").trim();
      if (!val) return;

      state.editProject.owners = Array.isArray(state.editProject.owners) ? state.editProject.owners : [];
      if (!state.editProject.owners.includes(val)) state.editProject.owners.push(val);
      renderOwnersTags();
    });

    el("#fileList")?.addEventListener("click", async (e) => {
      const btn = e.target?.closest?.("button[data-action='remove-file']");
      if (!btn) return;

      const idx = Number(btn.getAttribute("data-idx"));
      if (!Number.isFinite(idx)) return;

      state.editProject.files = Array.isArray(state.editProject.files) ? state.editProject.files : [];
      const removed = state.editProject.files[idx];
      state.editProject.files.splice(idx, 1);
      addHistory(state.editProject, "file", `Dosya silindi: ${removed?.name || ""}`);

      renderFiles();
      renderHistory();

      try { await persistEditProjectSafe(); } catch (err) {
        alert("Dosya silme kaydı hatası: " + (err?.message || err));
      }
    });

    el("#inpFile")?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      try {
        await onFileSelected(file);
      } finally {
        e.target.value = "";
      }
    });

    el("#btnPostComment")?.addEventListener("click", async () => {
      const text = String(el("#inpComment")?.value || "").trim();
      if (!text) return;

      const p = state.editProject;
      p.comments = Array.isArray(p.comments) ? p.comments : [];
      p.comments.push({ user: state.me || "Anonim", text, date: fmtDate(new Date()) });

      addHistory(p, "comment", "Yorum eklendi");
      el("#inpComment") && (el("#inpComment").value = "");

      renderComments();
      renderHistory();

      try { await persistEditProjectSafe(); } catch (err) {
        alert("Yorum kaydı hatası: " + (err?.message || err));
      }
    });

    el("#btnOpenMyPassword")?.addEventListener("click", () => U.openOverlay("#myPassOverlay"));
    el("#btnChangeMyPassword")?.addEventListener("click", changeMyPassword);
    el("#btnAdminChangePassword")?.addEventListener("click", adminChangePassword);

    el("#userListGrid")?.addEventListener("click", (e) => {
      const card = e.target?.closest?.(".user-card");
      const action = e.target?.closest?.("[data-action]")?.getAttribute("data-action");
      if (!card || !action) return;

      const username = card.getAttribute("data-user");
      if (!username) return;

      if (action === "edit") openUserEdit(username);
      if (action === "delete") deleteUser(username);
    });

    el("#notifTabs")?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.(".notif-tab");
      if (!btn) return;
      const tab = btn.getAttribute("data-tab");
      setNotifTab(tab);
    });

    el("#globalHistoryList")?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-action='hide-activity']");
      if (!btn) return;
      e.stopPropagation();
      const key = btn.getAttribute("data-key");
      if (!key) return;
      const set = getHiddenSet(state.me, "all");
      set.add(key);
      saveHiddenSet(state.me, "all", set);
      renderNotifications();
    });

    el("#mentionList")?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-action='hide-mention']");
      if (!btn) return;
      e.stopPropagation();
      const key = btn.getAttribute("data-key");
      if (!key) return;
      const set = getHiddenSet(state.me, "mentions");
      set.add(key);
      saveHiddenSet(state.me, "mentions", set);
      renderNotifications();
    });

    el("#mentionList")?.addEventListener("click", (e) => {
      const row = e.target?.closest?.(".mention-item");
      if (!row) return;
      const id = row.getAttribute("data-project-id");
      if (id) openProject(id);
    });

    els(".char-count").forEach((n) => {
      const id = n.getAttribute("data-count-for");
      const input = id ? document.getElementById(id) : null;
      if (!input) return;
      input.addEventListener("input", () => {
        updateCharCounts();
        checkMaxLen();
      });
    });

    renderSortModeToggle();
    ensureMentionUi();
  }

  function init() {
    bindEvents();
    setPage("dashboard");
    setView("board");
    setBodyState(false);

    API.setToken("");
    state.me = null;
    state.isAdmin = false;
    state.projects = [];
    state.users = [];
    setBodyState(false);
    clearLoginInputs();
    setTimeout(clearLoginInputs, 50);
    setKpiActive(state.filterStatuses);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.App = {
    state,
    setPage,
    setView,
    filterByStatus,
    doLogout,
    openNotifications,
    openUserAdd,
    saveUser,
    openProject,
    switchTab,
    renderProjectList,
    loadProjects,
    loadUsers,
    setSort(key) {
      if (state.sortKey === key) state.sortDir *= -1;
      else { state.sortKey = key; state.sortDir = 1; }
      renderProjectList();
    },
    closeMyPasswordModal
  };
})();
