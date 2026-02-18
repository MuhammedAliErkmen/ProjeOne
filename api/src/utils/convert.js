// C:\Erkmen\ProjeOne\src\utils\convert.js
const crypto = require("crypto");

function asStr(v) {
  if (v == null) return "";
  return String(v);
}

function asTrimStr(v) {
  return asStr(v).trim();
}

function asIdStr(v) {
  const s = asTrimStr(v);
  return s.length ? s : null;
}

function asInt(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

/**
 * ✅ Güvenli JSON parse
 * - string / array / object / null hepsini kaldırır
 * - tek object gelirse array'e çevirir
 */
function safeJson(v, fallback) {
  if (v == null || v === "") return fallback;

  if (Array.isArray(v)) return v;

  if (typeof v === "object") {
    // tek object gelirse array gibi davranabilelim
    return v;
  }

  const s = String(v).trim();
  if (!s) return fallback;

  try {
    const parsed = JSON.parse(s);
    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * ✅ doneType normalize
 * toleranslı (DB kirliyse bile)
 */
function normalizeDoneType(v) {
  const s = asTrimStr(v).toLowerCase();

  if (
    s === "done-dev" ||
    s === "done_dev" ||
    s === "donedev" ||
    s === "dev"
  ) {
    return "done-dev";
  }

  return "done";
}

/**
 * ✅ benzersiz proje ID
 * zaman + random
 */
function newProjectId() {
  return `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

module.exports = {
  asStr,
  asTrimStr,
  asIdStr,
  asInt,
  safeJson,
  normalizeDoneType,
  newProjectId
};
