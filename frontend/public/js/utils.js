// public/js/utils.js
(function () {
  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clamp(n, min, max) {
    const v = Number(n);
    if (!Number.isFinite(v)) return min;
    return Math.max(min, Math.min(max, v));
  }

  function fmtPct(n) {
    const v = clamp(n, 0, 100);
    return `${Math.round(v)}%`;
  }

  function debounce(fn, ms = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  // Optional: overlay açılınca body scroll kapansın
  function setBodyScrollLock(lock) {
    try {
      document.body.style.overflow = lock ? "hidden" : "";
    } catch {}
  }

  function openOverlay(sel, opts = {}) {
    const el = qs(sel);
    if (!el) return;

    el.classList.add("active");

    if (opts.lockScroll) setBodyScrollLock(true);

    // ESC ile kapatma (bir kere bağla)
    if (!openOverlay._escWired) {
      openOverlay._escWired = true;
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        const active = qs(".modal-overlay.active");
        if (active) active.classList.remove("active");
        setBodyScrollLock(false);
      });
    }
  }

  function closeOverlay(sel, opts = {}) {
    const el = qs(sel);
    if (!el) return;

    el.classList.remove("active");

    if (opts.lockScroll) setBodyScrollLock(false);
  }

  window.U = { qs, qsa, esc, fmtPct, clamp, debounce, openOverlay, closeOverlay };
})();
