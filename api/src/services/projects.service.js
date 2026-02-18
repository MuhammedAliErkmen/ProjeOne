// C:\Erkmen\ProjeOne\src\services\projects.service.js
const { sql } = require("../db");
const ProjectsRepo = require("../repositories/projects.repo");
const { mapProjectRowToUi } = require("../mappers/projectMapper");
const { asStr, asIdStr, asInt, normalizeDoneType, newProjectId } = require("../utils/convert");

const MAX_TEXT_LEN = 2000;

function ensureMaxLen(label, value) {
  const v = asStr(value);
  if (v.length > MAX_TEXT_LEN) {
    const err = new Error(`${label} en fazla 2000 karakter olabilir. Lütfen 2000'i geçmeyin.`);
    err.code = "MAX_LEN";
    throw err;
  }
}

function ensureMaxLenForArray(label, arr, pick) {
  const list = Array.isArray(arr) ? arr : [];
  for (const item of list) {
    const v = pick(item);
    if (!v) continue;
    ensureMaxLen(label, v);
  }
}

function toFilesArray(filesLike) {
  const arr = Array.isArray(filesLike) ? filesLike : [];
  return arr
    .map((x) => ({
      name: asStr(x?.name || x?.fileName).trim(),
      url: asStr(x?.url || x?.filePath).trim(),
    }))
    .filter((x) => x.name || x.url);
}

function toCommentsArray(commentsLike) {
  const arr = Array.isArray(commentsLike) ? commentsLike : [];
  return arr
    .map((x) => ({
      user: asStr(x?.user || x?.author).trim(),
      text: asStr(x?.text).trim(),
      date: asStr(x?.date).trim(),
    }))
    .filter((x) => x.user || x.text || x.date);
}

function toHistoryArray(historyLike) {
  const arr = Array.isArray(historyLike) ? historyLike : [];
  return arr
    .map((x) => ({
      user: asStr(x?.user).trim(),
      action: asStr(x?.action).trim(),
      date: asStr(x?.date).trim(),
      details: asStr(x?.details).trim(),
    }))
    .filter((x) => x.user || x.action || x.date || x.details);
}

/* =========================
   MENTIONS HELPERS (NEW)
   ========================= */

function normalizeMentionName(s) {
  return String(s || "").trim();
}

// @Yusuf, @yusuf_1, @yusuf.ali, @yusuf-ali
function extractMentions(commentText) {
  const t = String(commentText || "");
const hits = t.match(/@[\p{L}\p{N}._-]+(?:\s+[\p{L}\p{N}._-]+)?/gu) || [];
  const names = hits.map((h) => normalizeMentionName(h.slice(1))).filter(Boolean);

  // uniq (case-insensitive)
  const seen = new Set();
  const out = [];
  for (const n of names) {
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

async function upsertMentionsFromCommentsTx(tx, projectId, comments, actor) {
  const list = Array.isArray(comments) ? comments : [];
  if (!list.length) return;

  for (const c of list) {
    const text = asStr(c?.text).trim();
    if (!text) continue;

    const mentionedUsers = extractMentions(text);
    if (!mentionedUsers.length) continue;

    const mentionedBy = asStr(actor || c?.user || "Anonim").trim() || "Anonim";
    const commentDate = asStr(c?.date).trim();
    const commentText = text.length > 2000 ? text.slice(0, 2000) : text;

    for (const mu of mentionedUsers) {
      const mentionedUser = asStr(mu).trim();
      if (!mentionedUser) continue;

      // mssql transaction request
      const r = new sql.Request(tx);
      r.input("projectId", sql.NVarChar(50), asStr(projectId));
      r.input("mentionedUser", sql.NVarChar(200), mentionedUser);
      r.input("mentionedBy", sql.NVarChar(200), mentionedBy || null);
      r.input("commentText", sql.NVarChar(2000), commentText || null);
      r.input("commentDate", sql.NVarChar(50), commentDate || null);

      await r.query(`
        IF NOT EXISTS (
          SELECT 1
          FROM dbo.ProjectMentions
          WHERE projectId = @projectId
            AND mentionedUser = @mentionedUser
            AND ISNULL(commentDate,'') = ISNULL(@commentDate,'')
            AND ISNULL(commentText,'') = ISNULL(@commentText,'')
        )
        INSERT INTO dbo.ProjectMentions
          (projectId, mentionedUser, mentionedBy, commentText, commentDate)
        VALUES
          (@projectId, @mentionedUser, @mentionedBy, @commentText, @commentDate);
      `);
    }
  }
}

/* ========================= */

async function listProjects() {
  const rows = await ProjectsRepo.listProjectRows();
  return rows.map(mapProjectRowToUi);
}

// ✅ actor eklendi
async function createProject(p, actor) {
  if (!p?.ad || !asStr(p.ad).trim()) throw new Error("ad gerekli");

  const owners = Array.isArray(p.owners) ? p.owners.map((x) => asStr(x).trim()).filter(Boolean) : [];
  const files = toFilesArray(p.files);
  const comments = toCommentsArray(p.comments);
  const history = toHistoryArray(p.history);

  const uploadedBy = history[history.length - 1]?.user || actor || "Anonim";

  const yuzde = asInt(p.yuzde, 0);
  const doneType = yuzde >= 100 ? normalizeDoneType(p.doneType) : null;

  const id = newProjectId();
  const parentId = asIdStr(p.parentId);

  ensureMaxLen("Proje Başlığı", p.ad);
  ensureMaxLen("Açıklama", p.aciklama);
  ensureMaxLen("Bitiş", p.sonTeslim);
  ensureMaxLen("Sahip", owners.join(", ") || p.sahip);
  ensureMaxLen("Alan", p.alan || "Genel");
  ensureMaxLen("Sonraki Adım", p.next);
  ensureMaxLen("Başlangıç", p.baslangicTarihi);
  ensureMaxLen("Son Teslim Edilen", p.sonTeslimEdilen);
  ensureMaxLen("Öncelik", p.priority || "Normal");
  ensureMaxLen("Durum Tipi", doneType);
  ensureMaxLen("Üst Proje", parentId);

  ensureMaxLenForArray("Ekip Üyesi", owners, (x) => x);
  ensureMaxLenForArray("Dosya Adı", files, (x) => x?.name);
  ensureMaxLenForArray("Dosya URL", files, (x) => x?.url);
  ensureMaxLenForArray("Yorum", comments, (x) => x?.text);
  ensureMaxLenForArray("Yorum Sahibi", comments, (x) => x?.user);
  ensureMaxLenForArray("Yorum Tarihi", comments, (x) => x?.date);
  ensureMaxLenForArray("Geçmiş Aksiyon", history, (x) => x?.action);
  ensureMaxLenForArray("Geçmiş Kullanıcı", history, (x) => x?.user);
  ensureMaxLenForArray("Geçmiş Tarih", history, (x) => x?.date);
  ensureMaxLenForArray("Geçmiş Detay", history, (x) => x?.details);

  const pool = await ProjectsRepo.getPool();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();
    const now = new Date();

    await ProjectsRepo.insertProject(tx, {
      id,
      ad: asStr(p.ad).trim(),
      aciklama: asStr(p.aciklama),
      yuzde,
      sonTeslim: asStr(p.sonTeslim),
      sahip: owners.join(", ") || asStr(p.sahip),
      alan: asStr(p.alan || "Genel"),
      next: asStr(p.next),
      parentId,
      baslangicTarihi: asStr(p.baslangicTarihi),
      sonTeslimEdilen: asStr(p.sonTeslimEdilen),
      priority: asStr(p.priority || "Normal"),
      doneType,
      createdAt: now,
      updatedAt: now,
    });

    await ProjectsRepo.syncProjectOwners(tx, id, owners);
    await ProjectsRepo.syncProjectFiles(tx, id, files, uploadedBy);
    await ProjectsRepo.syncProjectComments(tx, id, comments);
    await ProjectsRepo.syncProjectHistory(tx, id, history);

    // ✅ NEW: Mention’ları da yaz
    await upsertMentionsFromCommentsTx(tx, id, comments, actor || uploadedBy);

    await tx.commit();
    return { success: true, id };
  } catch (e) {
    try {
      await tx.rollback();
    } catch {}
    throw e;
  }
}

// ✅ actor eklendi
async function updateProject(idParam, p, actor) {
  const id = asIdStr(idParam);
  if (!id) throw new Error("id gerekli");

  const owners = Array.isArray(p.owners) ? p.owners.map((x) => asStr(x).trim()).filter(Boolean) : [];
  const files = toFilesArray(p.files);
  const comments = toCommentsArray(p.comments);
  const history = toHistoryArray(p.history);

  const uploadedBy = history[history.length - 1]?.user || actor || "Anonim";

  const yuzde = asInt(p.yuzde, 0);
  const doneType = yuzde >= 100 ? normalizeDoneType(p.doneType) : null;

  const parentId = asIdStr(p.parentId);

  ensureMaxLen("Proje Başlığı", p.ad || "");
  ensureMaxLen("Açıklama", p.aciklama);
  ensureMaxLen("Bitiş", p.sonTeslim);
  ensureMaxLen("Sahip", owners.join(", ") || p.sahip);
  ensureMaxLen("Alan", p.alan || "Genel");
  ensureMaxLen("Sonraki Adım", p.next);
  ensureMaxLen("Başlangıç", p.baslangicTarihi);
  ensureMaxLen("Son Teslim Edilen", p.sonTeslimEdilen);
  ensureMaxLen("Öncelik", p.priority || "Normal");
  ensureMaxLen("Durum Tipi", doneType);
  ensureMaxLen("Üst Proje", parentId);

  ensureMaxLenForArray("Ekip Üyesi", owners, (x) => x);
  ensureMaxLenForArray("Dosya Adı", files, (x) => x?.name);
  ensureMaxLenForArray("Dosya URL", files, (x) => x?.url);
  ensureMaxLenForArray("Yorum", comments, (x) => x?.text);
  ensureMaxLenForArray("Yorum Sahibi", comments, (x) => x?.user);
  ensureMaxLenForArray("Yorum Tarihi", comments, (x) => x?.date);
  ensureMaxLenForArray("Geçmiş Aksiyon", history, (x) => x?.action);
  ensureMaxLenForArray("Geçmiş Kullanıcı", history, (x) => x?.user);
  ensureMaxLenForArray("Geçmiş Tarih", history, (x) => x?.date);
  ensureMaxLenForArray("Geçmiş Detay", history, (x) => x?.details);

  const pool = await ProjectsRepo.getPool();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();
    const now = new Date();

    await ProjectsRepo.updateProject(tx, id, {
      ad: p.ad ? asStr(p.ad).trim() : null,
      aciklama: asStr(p.aciklama),
      yuzde,
      sonTeslim: asStr(p.sonTeslim),
      sahip: owners.join(", ") || asStr(p.sahip),
      alan: asStr(p.alan || "Genel"),
      next: asStr(p.next),
      parentId,
      baslangicTarihi: asStr(p.baslangicTarihi),
      sonTeslimEdilen: asStr(p.sonTeslimEdilen),
      priority: asStr(p.priority || "Normal"),
      doneType,
      updatedAt: now,
    });

    await ProjectsRepo.syncProjectOwners(tx, id, owners);
    await ProjectsRepo.syncProjectFiles(tx, id, files, uploadedBy);
    await ProjectsRepo.syncProjectComments(tx, id, comments);
    await ProjectsRepo.syncProjectHistory(tx, id, history);

    // ✅ NEW: Mention’ları da yaz (comments içinden)
    await upsertMentionsFromCommentsTx(tx, id, comments, actor || uploadedBy);

    await tx.commit();
    return { success: true };
  } catch (e) {
    try {
      await tx.rollback();
    } catch {}
    throw e;
  }
}

async function deleteProject(idParam) {
  const id = asIdStr(idParam);
  if (!id) throw new Error("id gerekli");

  const pool = await ProjectsRepo.getPool();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();
    await ProjectsRepo.deleteProjectAll(tx, id);
    await tx.commit();
    return { success: true };
  } catch (e) {
    try {
      await tx.rollback();
    } catch {}
    throw e;
  }
}

module.exports = {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
};
