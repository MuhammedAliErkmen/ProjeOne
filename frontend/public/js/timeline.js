// public/js/timeline.js
(function () {
  const pad2 = (n) => String(n).padStart(2, "0");

  function todayText() {
    const d = new Date();
    return `Bugün: ${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  // "YYYY-MM-DD" gibi değilse "-" dön
  function normDate(s) {
    const v = String(s || "").trim();
    if (!v) return "";
    // en basit validasyon: 10 char + dash
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return v; // farklı format kullanıyorsan bozmayalım, sadece boşu filtreliyoruz
  }

  function renderTimeline(projects) {
    const host = U.qs("#timelineCanvas");
    if (!host) return;

    const todayEl = U.qs("#timelineToday");
    if (todayEl) todayEl.textContent = todayText();

    const list = Array.isArray(projects) ? projects : [];

    const items = list
      .map((p) => {
        const start = normDate(p?.baslangicTarihi);
        const end = normDate(p?.sonTeslim);
        return {
          id: p?.id == null ? "" : String(p.id),
          ad: String(p?.ad || ""),
          start,
          end
        };
      })
      .filter((x) => x.start || x.end)
      .sort((a, b) => {
        const ae = a.end || "9999-12-31";
        const be = b.end || "9999-12-31";
        if (ae !== be) return ae.localeCompare(be);

        const as = a.start || "9999-12-31";
        const bs = b.start || "9999-12-31";
        if (as !== bs) return as.localeCompare(bs);

        return String(a.ad || "").localeCompare(String(b.ad || ""));
      });

    if (!items.length) {
      host.innerHTML = `<div style="color:var(--muted); font-weight:700;">Zaman çizelgesinde gösterilecek kayıt yok.</div>`;
      return;
    }

    host.innerHTML = items.map((x) => `
      <div class="timeline-item"
           data-id="${U.esc(x.id)}"
           style="padding:12px 0; border-bottom:1px solid var(--line-dark); cursor:pointer;">
        <div style="font-weight:800;">${U.esc(x.ad || "")}</div>
        <div style="font-size:12px; color:var(--muted); font-weight:700;">
          Başlangıç: ${U.esc(x.start || "-")} • Bitiş: ${U.esc(x.end || "-")}
        </div>
      </div>
    `).join("");

    host.querySelectorAll(".timeline-item").forEach((row) => {
      row.addEventListener("click", () => {
        const id = row.getAttribute("data-id");
        if (id) window.App?.openProject?.(id);
      });
    });
  }

  window.Timeline = { renderTimeline };
})();
