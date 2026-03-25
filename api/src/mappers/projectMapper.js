// C:\Erkmen\ProjeOne\src\mappers\projectMapper.js
const { safeJson, normalizeDoneType } = require("../utils/convert");

// ✅ toleranslı JSON parse: string/array/object/null hepsini kaldırır
function toArrayJson(v, fallback = []) {
  try {
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      // bazen tek object gelir -> array'e çevir
      return [v];
    }
    const s = String(v ?? "").trim();
    if (!s) return fallback;

    // safeJson varsa onu kullan, yoksa JSON.parse dene
    if (typeof safeJson === "function") {
      const parsed = safeJson(s, fallback);
      return Array.isArray(parsed) ? parsed : fallback;
    }

    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function ownersToArray(v) {
  const arr = toArrayJson(v, []);
  return arr
    .map((x) => (x && typeof x === "object") ? (x.username ?? x.value ?? x.name ?? x) : x)
    .filter(Boolean)
    .map((x) => String(x).trim())
    .filter(Boolean);
}

function filesToArray(v) {
  const arr = toArrayJson(v, []);
  return arr
    .map((x) => ({
      name: (x && typeof x === "object") ? (x.name ?? x.fileName ?? "") : "",
      url:  (x && typeof x === "object") ? (x.url ?? x.filePath ?? "") : ""
    }))
    .map((x) => ({ name: String(x.name || "").trim(), url: String(x.url || "").trim() }))
    .filter((x) => x.name || x.url);
}

function commentsToArray(v) {
  const arr = toArrayJson(v, []);
  return arr
    .map((x) => ({
      user: (x && typeof x === "object") ? (x.user ?? x.author ?? "") : "",
      text: (x && typeof x === "object") ? (x.text ?? "") : "",
      date: (x && typeof x === "object") ? (x.date ?? "") : ""
    }))
    .map((x) => ({
      user: String(x.user || "").trim(),
      text: String(x.text || ""),
      date: String(x.date || "").trim()
    }))
    .filter((x) => x.user || x.text || x.date);
}

function historyToArray(v) {
  const arr = toArrayJson(v, []);
  return arr
    .map((x) => ({
      user: (x && typeof x === "object") ? (x.user ?? "") : "",
      action: (x && typeof x === "object") ? (x.action ?? "") : "",
      date: (x && typeof x === "object") ? (x.date ?? "") : "",
      details: (x && typeof x === "object") ? (x.details ?? "") : ""
    }))
    .map((x) => ({
      user: String(x.user || "").trim(),
      action: String(x.action || "").trim(),
      date: String(x.date || "").trim(),
      details: String(x.details || "")
    }))
    .filter((x) => x.user || x.action || x.date || x.details);
}

function mapProjectRowToUi(row) {
  const r = row || {};
  const owners = ownersToArray(r.OwnersJson);

  const pct = Number(r.yuzde);
  const safePct = Number.isFinite(pct) ? pct : 0;

  const doneType = (safePct >= 100) ? normalizeDoneType(r.doneType) : null;
  const status = String(r.status || "").trim().toLowerCase();

  return {
    id: r.id,
    ad: r.ad ?? "",
    aciklama: r.aciklama ?? "",
    yuzde: safePct,
    sonTeslim: r.sonTeslim ?? "",
    sahip: owners.length ? owners.join(", ") : (r.sahip ?? ""),
    alan: r.alan ?? "Genel",
    next: r.next ?? "",
    parentId: r.parentId ?? null,
    baslangicTarihi: r.baslangicTarihi ?? "",
    sonTeslimEdilen: r.sonTeslimEdilen ?? "",
    priority: r.priority ?? "Normal",
    doneType,
    status,
    createdAt: r.createdAt ?? null,
    updatedAt: r.updatedAt ?? null,

    owners,
    files: filesToArray(r.FilesJson),
    comments: commentsToArray(r.CommentsJson),
    history: historyToArray(r.HistoryJson),
  };
}

module.exports = {
  ownersToArray,
  filesToArray,
  commentsToArray,
  historyToArray,
  mapProjectRowToUi
};
