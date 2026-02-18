// C:\Erkmen\ProjeOne\src\middleware\auth.js
const jwt = require("jsonwebtoken");
const { bad } = require("../utils/http");

function getJwtSecret() {
  return String(process.env.JWT_SECRET || "").trim();
}

function getJwtExpiresIn() {
  return String(process.env.JWT_EXPIRES_IN || "7d").trim();
}

// Authorization: Bearer <token>
// + (opsiyonel) ?token=<token> (debug/test için)
function getTokenFromRequest(req) {
  const h = String(req.headers?.authorization || req.headers?.Authorization || "").trim();
  if (h) {
    const parts = h.split(/\s+/);
    if (parts.length === 2 && String(parts[0]).toLowerCase() === "bearer") {
      return parts[1];
    }
  }

  // query fallback: /api/users?token=...
  const q = req.query?.token;
  if (q) return String(q).trim();

  return null;
}

function isAdminUser(username) {
  const u = String(username || "").trim().toLowerCase();
  if (!u) return false;

  const raw = String(process.env.ADMIN_USERS || "").trim();
  if (!raw) return false;

  const list = raw
    .split(",")
    .map((x) => String(x).trim().toLowerCase())
    .filter(Boolean);

  return list.includes(u);
}

function requireAuth(req, res, next) {
  const secret = getJwtSecret();

  // ✅ pratik: secret yoksa sistemi komple 500'e düşürmek yerine yetkisiz say
  // (istersen eski davranış: return bad(res, "JWT_SECRET eksik", 500);)
  if (!secret) return bad(res, "Yetkisiz", 401);

  const token = getTokenFromRequest(req);
  if (!token) return bad(res, "Yetkisiz", 401);

  try {
    const decoded = jwt.verify(token, secret);
    // decoded null/undefined gelmesin
    req.user = decoded && typeof decoded === "object" ? decoded : {};
    return next();
  } catch (e) {
    return bad(res, "Yetkisiz", 401);
  }
}

function requireAdmin(req, res, next) {
  const u = req.user && req.user.username;
  if (!u || !isAdminUser(u)) return bad(res, "Admin gerekli", 403);
  return next();
}

function signToken(payload) {
  const secret = getJwtSecret();
  if (!secret) throw new Error("JWT_SECRET eksik");

  const expiresIn = getJwtExpiresIn();
  // payload güvenliği
  const safePayload = payload && typeof payload === "object" ? payload : {};
  return jwt.sign(safePayload, secret, { expiresIn });
}

module.exports = {
  requireAuth,
  requireAdmin,
  isAdminUser,
  signToken,
};
