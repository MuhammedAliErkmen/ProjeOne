// public/js/dashboard.js
(function () {
  const ORDER_KEY = "ba_board_order_v1";
  const CHILD_ORDER_KEY = "ba_child_order_v1";
  const SORT_MODE_KEY = "ba_sort_mode_v1";

  const STATUS = {
    new:        { key: "new",        cardsId: "cardsNew",     countId: "cNew",     emptyId: "emptyNew" },
    prog:       { key: "prog",       cardsId: "cardsProg",    countId: "cProg",    emptyId: "emptyProg" },
    "done-dev": { key: "done-dev",   cardsId: "cardsDoneDev", countId: "cDoneDev", emptyId: "emptyDoneDev" },
    done:       { key: "done",       cardsId: "cardsDone",    countId: "cDone",    emptyId: "emptyDone" },
  };

  // drag/drop için güncel liste tutulur
  const CURRENT = { projects: [] };

  function getSortMode() {
    let v = "auto";
    try { v = String(localStorage.getItem(SORT_MODE_KEY) || "auto").toLowerCase(); }
    catch {}
    return (v === "manual") ? "manual" : "auto";
  }
  function setSortMode(mode) {
    const v = (String(mode).toLowerCase() === "manual") ? "manual" : "auto";
    try { localStorage.setItem(SORT_MODE_KEY, v); } catch {}
  }

  function loadOrder() {
    try {
      const raw = localStorage.getItem(ORDER_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return {
        new: Array.isArray(obj.new) ? obj.new : [],
        prog: Array.isArray(obj.prog) ? obj.prog : [],
        "done-dev": Array.isArray(obj["done-dev"]) ? obj["done-dev"] : [],
        done: Array.isArray(obj.done) ? obj.done : [],
      };
    } catch {
      return { new: [], prog: [], "done-dev": [], done: [] };
    }
  }
  function saveOrder(order) {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch {}
  }
  function upsertOrderList(order, statusKey, idsInDomOrder) {
    order[statusKey] = idsInDomOrder.map(String);
    for (const k of Object.keys(order)) {
      if (k === statusKey) continue;
      order[k] = (order[k] || []).filter(x => !idsInDomOrder.includes(String(x)));
    }
    saveOrder(order);
  }

  function loadChildOrder() {
    try {
      const raw = localStorage.getItem(CHILD_ORDER_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === "object") ? obj : {};
    } catch {
      return {};
    }
  }
  function saveChildOrder(obj) {
    try { localStorage.setItem(CHILD_ORDER_KEY, JSON.stringify(obj)); } catch {}
  }
  function setChildOrder(parentId, childIds) {
    const map = loadChildOrder();
    map[String(parentId)] = childIds.map(String);
    saveChildOrder(map);
  }

  function sortChildrenBySavedOrder(parentId, children) {
    const map = loadChildOrder();
    const arr = Array.isArray(map[String(parentId)]) ? map[String(parentId)] : [];
    const idx = new Map(arr.map((id, i) => [String(id), i]));
    return [...children].sort((a, b) => {
      const ia = idx.has(String(a.id)) ? idx.get(String(a.id)) : 1e9;
      const ib = idx.has(String(b.id)) ? idx.get(String(b.id)) : 1e9;
      if (ia !== ib) return ia - ib;

      const ua = String(a.updatedAt || a.createdAt || "");
      const ub = String(b.updatedAt || b.createdAt || "");
      return ub.localeCompare(ua);
    });
  }

  function statusOf(p) {
    const pct = Number(p?.yuzde) || 0;
    if (pct >= 100) return (String(p?.doneType || "").toLowerCase() === "done-dev") ? "done-dev" : "done";
    if (pct > 0) return "prog";
    return "new";
  }

  function sortParents(list, statusKey) {
    const mode = getSortMode();

    if (mode === "auto") {
      return [...list].sort((a, b) => {
        const ua = String(a.updatedAt || a.createdAt || "");
        const ub = String(b.updatedAt || b.createdAt || "");
        return ub.localeCompare(ua);
      });
    }

    const order = loadOrder();
    const arr = order[statusKey] || [];
    const idx = new Map(arr.map((id, i) => [String(id), i]));

    return [...list].sort((a, b) => {
      const ia = idx.has(String(a.id)) ? idx.get(String(a.id)) : 1e9;
      const ib = idx.has(String(b.id)) ? idx.get(String(b.id)) : 1e9;
      if (ia !== ib) return ia - ib;

      const ua = String(a.updatedAt || a.createdAt || "");
      const ub = String(b.updatedAt || b.createdAt || "");
      return ub.localeCompare(ua);
    });
  }

  function fmtOwnersAvatars(owners) {
    const arr = Array.isArray(owners) ? owners : [];
    if (!arr.length) return "";
    const max = 3;
    const shown = arr.slice(0, max);
    const more = arr.length > max ? (arr.length - max) : 0;

    const chips = shown.map(u => {
      const s = String(u || "").trim();
      const initials = s ? s.split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase() : "?";
      return `<div class="avatar-sm" title="${U.esc(s)}">${U.esc(initials)}</div>`;
    }).join("");

    return `<div class="avatars">${chips}${more ? `<div class="avatar-sm" title="+${more}">+${more}</div>` : ""}</div>`;
  }

  function priorityMeta(priorityRaw) {
    const p = String(priorityRaw || "").toLowerCase().trim();
    if (p === "yüksek" || p === "yuksek" || p === "high") return { cls: "prio-high", label: "Yüksek" };
    if (p === "düşük" || p === "dusuk" || p === "low") return { cls: "prio-low", label: "Düşük" };
    return { cls: "prio-normal", label: "Normal" };
  }
  function priorityBadgeHtml(priorityRaw) {
    const m = priorityMeta(priorityRaw);
    return `<span class="prio-badge ${m.cls}" title="Öncelik: ${U.esc(m.label)}">${U.esc(m.label)}</span>`;
  }

  function childBadge(st) {
    const label =
      st === "done-dev" ? "Tamamlandı (Geliştirme)" :
      st === "done" ? "Tamamlandı" :
      st === "prog" ? "Devam Ediyor" : "Başlamadı";

    const cls =
      st === "done" ? "b-done" :
      st === "done-dev" ? "b-done-dev" :
      st === "prog" ? "b-prog" : "b-new";

    return `<span class="child-badge ${cls}">${U.esc(label)}</span>`;
  }

  function childrenHtml(parentId, children) {
    if (!children.length) return "";
    const ordered = sortChildrenBySavedOrder(parentId, children);

    return `
      <div class="child-wrap">
        <div class="child-title">Alt Projeler</div>
        <div class="child-list" data-parent="${U.esc(parentId)}">
          ${ordered.map(c => {
            const st = statusOf(c);
            const pct = Math.max(0, Math.min(100, Number(c.yuzde) || 0));
            return `
              <div class="child-row draggable" draggable="true" data-id="${U.esc(c.id)}" data-parent="${U.esc(parentId)}">
                <div class="child-main">
                  <div class="child-name">${U.esc(c.ad || "")}</div>
                  <div class="child-sub">
                    ${childBadge(st)}
                    <span class="child-pct">${U.esc(U.fmtPct(pct))}</span>
                  </div>
                </div>
                <div class="child-open">›</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function parentCardHtml(p, childrenMap) {
    const st = statusOf(p);
    const pct = Math.max(0, Math.min(100, Number(p.yuzde) || 0));

    const barColor =
      st === "done" ? "var(--good)" :
      st === "done-dev" ? "var(--focus)" :
      st === "prog" ? "var(--warn)" :
      "var(--bad)";

    const kids = childrenMap.get(String(p.id)) || [];

    return `
      <div class="card draggable" draggable="true" data-id="${U.esc(p.id)}" data-status="${U.esc(st)}">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div class="title" style="margin-bottom:0; flex:1; min-width:0;">${U.esc(p.ad || "")}</div>
          ${priorityBadgeHtml(p.priority)}
        </div>

        <div class="desc">${U.esc(p.aciklama || "")}</div>

        <div class="prog-container">
          <div class="prog-bar"><span style="width:${pct}%; background:${barColor};"></span></div>
          <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--muted); font-weight:800;">
            <span>${U.esc(p.alan || "Genel")}</span>
            <span>${U.esc(U.fmtPct(pct))}</span>
          </div>
        </div>

        ${childrenHtml(p.id, kids)}

        <div class="card-footer">
          <div style="font-size:12px; color:var(--muted); font-weight:800;">${U.esc(p.sonTeslim || "")}</div>
          ${fmtOwnersAvatars(p.owners)}
        </div>
      </div>
    `;
  }

  function renderSection(statusKey, parents, childrenMap) {
    const meta = STATUS[statusKey];
    const host = U.qs("#" + meta.cardsId);
    const count = U.qs("#" + meta.countId);
    const empty = U.qs("#" + meta.emptyId);

    if (count) count.textContent = String(parents.length);
    if (!host) return;

    if (!parents.length) {
      host.innerHTML = "";
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";

    const orderedParents = sortParents(parents, statusKey);
    host.innerHTML = orderedParents.map(p => parentCardHtml(p, childrenMap)).join("");

    host.querySelectorAll(".card").forEach(card => {
      card.addEventListener("click", (e) => {
        if (e.target && (e.target.closest(".child-row"))) return;
        if (card.classList.contains("dragging")) return;
        const id = card.getAttribute("data-id");
        window.App?.openProject?.(id);
      });
    });

    host.querySelectorAll(".child-row").forEach(row => {
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        if (row.classList.contains("dragging")) return;
        const id = row.getAttribute("data-id");
        window.App?.openProject?.(id);
      });
    });

    host.querySelectorAll(".card").forEach(el => {
      el.addEventListener("dragstart", (e) => {
        el.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", JSON.stringify({
          kind: "parent",
          id: el.getAttribute("data-id"),
          from: el.getAttribute("data-status")
        }));
      });
      el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
        document.querySelectorAll(".cards.drag-over").forEach(x => x.classList.remove("drag-over"));
        document.querySelectorAll(".child-list.drag-over").forEach(x => x.classList.remove("drag-over"));
      });
    });

    host.querySelectorAll(".child-row").forEach(el => {
      el.addEventListener("dragstart", (e) => {
        el.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", JSON.stringify({
          kind: "child",
          id: el.getAttribute("data-id"),
          parent: el.getAttribute("data-parent")
        }));
      });
      el.addEventListener("dragend", () => el.classList.remove("dragging"));
    });
  }

  function getDragAfterElement(container, y, selector) {
    const sel = selector || ".draggable";
    const els = [...container.querySelectorAll(`${sel}:not(.dragging)`)];
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };

    for (const child of els) {
      const box = child.getBoundingClientRect();
      const offset = y - (box.top + box.height / 2);
      if (offset < 0 && offset > closest.offset) closest = { offset, element: child };
    }
    return closest.element;
  }

  async function applyStatusMove(project, targetStatus) {
    const p = project;

    if (targetStatus === "new") {
      p.yuzde = 0; p.doneType = null;
    } else if (targetStatus === "prog") {
      const cur = Number(p.yuzde) || 0;
      p.yuzde = (cur > 0 && cur < 100) ? cur : 50;
      p.doneType = null;
    } else if (targetStatus === "done") {
      p.yuzde = 100; p.doneType = "done";
    } else if (targetStatus === "done-dev") {
      p.yuzde = 100; p.doneType = "done-dev";
    }

    p.history = Array.isArray(p.history) ? p.history : [];
    p.history.push({
      user: window.App?.state?.me || "Anonim",
      action: "moved",
      date: new Date().toISOString().slice(0, 10),
      details: `→ ${targetStatus}`
    });

    await window.API.updateProject(p.id, p);
  }

  function wireDropZones() {
    if (wireDropZones._wired) return;
    wireDropZones._wired = true;

    for (const k of Object.keys(STATUS)) {
      const host = U.qs("#" + STATUS[k].cardsId);
      if (!host) continue;
      host.dataset.status = k;

      host.addEventListener("dragover", (e) => {
        e.preventDefault();
        host.classList.add("drag-over");

        const dragging = document.querySelector(".card.dragging");
        if (!dragging) return;

        const after = getDragAfterElement(host, e.clientY, ".card");
        if (after == null) host.appendChild(dragging);
        else host.insertBefore(dragging, after);
      });

      host.addEventListener("dragleave", () => host.classList.remove("drag-over"));

      host.addEventListener("drop", async (e) => {
        e.preventDefault();
        host.classList.remove("drag-over");

        let payload;
        try { payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}"); } catch {}
        if (payload?.kind !== "parent") return;

        const id = payload?.id;
        const from = payload?.from;
        const to = host.dataset.status;
        if (!id || !to) return;

        const ids = [...host.querySelectorAll(":scope > .card")].map(x => String(x.getAttribute("data-id")));
        const order = loadOrder();
        upsertOrderList(order, to, ids);

        if (from && to && from !== to) {
          const proj = (CURRENT.projects || []).find(x => String(x.id) === String(id));
          if (!proj) return;

          const copy = JSON.parse(JSON.stringify(proj));
          try {
            await applyStatusMove(copy, to);
            await window.App.loadProjects();
          } catch (err) {
            console.error(err);
            alert("Sürükle-bırak güncelleme hatası: " + (err.message || err));
          }
        }
      });
    }

    document.addEventListener("dragover", (e) => {
      const list = e.target?.closest?.(".child-list");
      if (!list) return;
      e.preventDefault();

      const dragging = document.querySelector(".child-row.dragging");
      if (!dragging) return;

      list.classList.add("drag-over");
      const after = getDragAfterElement(list, e.clientY, ".child-row");
      if (after == null) list.appendChild(dragging);
      else list.insertBefore(dragging, after);
    }, true);

    document.addEventListener("dragleave", (e) => {
      const list = e.target?.closest?.(".child-list");
      if (list) list.classList.remove("drag-over");
    }, true);

    document.addEventListener("drop", (e) => {
      const list = e.target?.closest?.(".child-list");
      if (!list) return;

      let payload;
      try { payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}"); } catch {}
      if (payload?.kind !== "child") return;

      const parentId = list.getAttribute("data-parent");
      if (!parentId || String(parentId) !== String(payload.parent)) return;

      const ids = [...list.querySelectorAll(".child-row")].map(x => String(x.getAttribute("data-id")));
      setChildOrder(parentId, ids);

      list.classList.remove("drag-over");
    }, true);
  }

  const Dashboard = {
    statusOf,
    getSortMode,
    setSortMode,

    renderAll(projects, filterStatuses) {
      const all = Array.isArray(projects) ? projects : [];
      CURRENT.projects = all;

      const allowed = new Set(["new", "prog", "done-dev", "done"]);
      const active = [];

      if (filterStatuses && typeof filterStatuses.forEach === "function") {
        filterStatuses.forEach((st) => { if (allowed.has(st)) active.push(st); });
      }

      const list = active.length ? all.filter((p) => active.includes(statusOf(p))) : all;

      // KPI
      const total = list.length;
      const by = { new: 0, prog: 0, "done-dev": 0, done: 0 };
      let sumPct = 0;
      for (const p of list) {
        const st = statusOf(p);
        by[st] = (by[st] || 0) + 1;
        sumPct += (Number(p.yuzde) || 0);
      }

      U.qs("#kTotal") && (U.qs("#kTotal").textContent = String(total));
      U.qs("#kNew") && (U.qs("#kNew").textContent = String(by.new));
      U.qs("#kProg") && (U.qs("#kProg").textContent = String(by.prog));
      U.qs("#kDoneDev") && (U.qs("#kDoneDev").textContent = String(by["done-dev"]));
      U.qs("#kDone") && (U.qs("#kDone").textContent = String(by.done));
      U.qs("#kAvg") && (U.qs("#kAvg").textContent = total ? `${Math.round(sumPct / total)}%` : "0%");

      // Search
      const q = String(U.qs("#q")?.value || "").toLowerCase().trim();
      const filtered = q
        ? list.filter(p => (String(p.ad || "") + " " + String(p.aciklama || "")).toLowerCase().includes(q))
        : list;

      // children map
      const childrenMap = new Map();
      const parents = [];
      const byId = new Map(filtered.map(x => [String(x.id), x]));

      for (const p of filtered) {
        const pid = String(p.parentId || "");
        if (pid && byId.has(pid)) {
          if (!childrenMap.has(pid)) childrenMap.set(pid, []);
          childrenMap.get(pid).push(p);
        } else {
          parents.push(p);
        }
      }

      // status groups
      const groups = { new: [], prog: [], "done-dev": [], done: [] };
      for (const p of parents) groups[statusOf(p)].push(p);

      renderSection("new", groups.new, childrenMap);
      renderSection("prog", groups.prog, childrenMap);
      renderSection("done-dev", groups["done-dev"], childrenMap);
      renderSection("done", groups.done, childrenMap);

      wireDropZones();
    }
  };

  window.Dashboard = Dashboard;
})();
