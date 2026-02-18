// C:\Erkmen\ProjeOne\src\repositories\projects.repo.js
const { sql, getPool } = require("../../db");
const { txQuery } = require("../db/txQuery");

async function listProjectRows() {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT
      p.id,
      p.ad,
      p.aciklama,
      p.yuzde,
      p.sonTeslim,
      p.sahip,
      p.alan,
      p.next,
      p.parentId,
      p.baslangicTarihi,
      p.sonTeslimEdilen,
      p.priority,
      p.doneType,
      p.createdAt,
      p.updatedAt,

      OwnersJson = (
        SELECT o.username
        FROM dbo.ProjectOwners o
        WHERE o.projectId = p.id
        FOR JSON PATH
      ),
      FilesJson = (
        SELECT f.fileName AS [name], f.filePath AS [url], f.uploadedBy, f.uploadDate
        FROM dbo.ProjectFiles f
        WHERE f.projectId = p.id
        FOR JSON PATH
      ),
      CommentsJson = (
        SELECT c.author AS [user], c.[text], c.[date]
        FROM dbo.ProjectComments c
        WHERE c.projectId = p.id
        FOR JSON PATH
      ),
      HistoryJson = (
        SELECT h.[user], h.[action], h.[date], h.details
        FROM dbo.ProjectHistory h
        WHERE h.projectId = p.id
        FOR JSON PATH
      )
    FROM dbo.Projects p
    ORDER BY p.updatedAt DESC
  `);

  return r.recordset || [];
}

async function insertProject(tx, data) {
  await txQuery(tx, `
    INSERT INTO dbo.Projects
      (id, ad, aciklama, yuzde, sonTeslim, sahip, alan, next, parentId,
       baslangicTarihi, sonTeslimEdilen, priority, doneType, createdAt, updatedAt)
    VALUES
      (@id, @ad, @ac, @yz, @st, @sh, @al, @nx, @pid,
       @bt, @ste, @pr, @dt, @ca, @ua)
  `, [
    { name: "id", type: sql.NVarChar, value: data.id },
    { name: "ad", type: sql.NVarChar, value: data.ad },
    { name: "ac", type: sql.NVarChar, value: data.aciklama },
    { name: "yz", type: sql.Int, value: data.yuzde },
    { name: "st", type: sql.NVarChar, value: data.sonTeslim },
    { name: "sh", type: sql.NVarChar, value: data.sahip },
    { name: "al", type: sql.NVarChar, value: data.alan },
    { name: "nx", type: sql.NVarChar, value: data.next },
    { name: "pid", type: sql.NVarChar, value: data.parentId },
    { name: "bt", type: sql.NVarChar, value: data.baslangicTarihi },
    { name: "ste", type: sql.NVarChar, value: data.sonTeslimEdilen },
    { name: "pr", type: sql.NVarChar, value: data.priority },
    { name: "dt", type: sql.NVarChar, value: data.doneType },
    { name: "ca", type: sql.DateTime2, value: data.createdAt },
    { name: "ua", type: sql.DateTime2, value: data.updatedAt },
  ]);
}

async function updateProject(tx, id, data) {
  await txQuery(tx, `
    UPDATE dbo.Projects SET
      ad = COALESCE(@ad, ad),
      aciklama = @ac,
      yuzde = @yz,
      sonTeslim = @st,
      sahip = @sh,
      alan = @al,
      next = @nx,
      parentId = @pid,
      baslangicTarihi = @bt,
      sonTeslimEdilen = @ste,
      priority = @pr,
      doneType = @dt,
      updatedAt = @ua
    WHERE id = @id
  `, [
    { name: "id", type: sql.NVarChar, value: id },
    { name: "ad", type: sql.NVarChar, value: data.ad },
    { name: "ac", type: sql.NVarChar, value: data.aciklama },
    { name: "yz", type: sql.Int, value: data.yuzde },
    { name: "st", type: sql.NVarChar, value: data.sonTeslim },
    { name: "sh", type: sql.NVarChar, value: data.sahip },
    { name: "al", type: sql.NVarChar, value: data.alan },
    { name: "nx", type: sql.NVarChar, value: data.next },
    { name: "pid", type: sql.NVarChar, value: data.parentId },
    { name: "bt", type: sql.NVarChar, value: data.baslangicTarihi },
    { name: "ste", type: sql.NVarChar, value: data.sonTeslimEdilen },
    { name: "pr", type: sql.NVarChar, value: data.priority },
    { name: "dt", type: sql.NVarChar, value: data.doneType },
    { name: "ua", type: sql.DateTime2, value: data.updatedAt },
  ]);
}

async function deleteProjectAll(tx, id) {
  await txQuery(tx, `DELETE FROM dbo.ProjectOwners WHERE projectId=@pid`, [{ name: "pid", type: sql.NVarChar, value: id }]);
  await txQuery(tx, `DELETE FROM dbo.ProjectFiles WHERE projectId=@pid`, [{ name: "pid", type: sql.NVarChar, value: id }]);
  await txQuery(tx, `DELETE FROM dbo.ProjectComments WHERE projectId=@pid`, [{ name: "pid", type: sql.NVarChar, value: id }]);
  await txQuery(tx, `DELETE FROM dbo.ProjectHistory WHERE projectId=@pid`, [{ name: "pid", type: sql.NVarChar, value: id }]);
  await txQuery(tx, `DELETE FROM dbo.Projects WHERE id=@id`, [{ name: "id", type: sql.NVarChar, value: id }]);
}

// relation sync
async function syncProjectOwners(tx, projectId, owners) {
  await txQuery(tx, `DELETE FROM dbo.ProjectOwners WHERE projectId=@pid`, [
    { name: "pid", type: sql.NVarChar, value: projectId }
  ]);

  for (const username of owners) {
    await txQuery(tx,
      `INSERT INTO dbo.ProjectOwners (projectId, username) VALUES (@pid, @u)`,
      [
        { name: "pid", type: sql.NVarChar, value: projectId },
        { name: "u", type: sql.NVarChar, value: username }
      ]
    );
  }
}

async function syncProjectFiles(tx, projectId, files, uploadedBy) {
  await txQuery(tx, `DELETE FROM dbo.ProjectFiles WHERE projectId=@pid`, [
    { name: "pid", type: sql.NVarChar, value: projectId }
  ]);

  for (const f of files) {
    await txQuery(tx,
      `INSERT INTO dbo.ProjectFiles (projectId, fileName, filePath, uploadedBy, uploadDate)
       VALUES (@pid, @fn, @fp, @ub, @ud)`,
      [
        { name: "pid", type: sql.NVarChar, value: projectId },
        { name: "fn", type: sql.NVarChar, value: f.name },
        { name: "fp", type: sql.NVarChar, value: f.url },
        { name: "ub", type: sql.NVarChar, value: uploadedBy || "Anonim" },
        { name: "ud", type: sql.DateTime2, value: new Date() }
      ]
    );
  }
}

// ✅ NO-DELETE append/upsert
async function syncProjectComments(tx, projectId, comments) {
  for (const c of comments) {
    await txQuery(tx, `
      IF NOT EXISTS (
        SELECT 1 FROM dbo.ProjectComments
        WHERE projectId=@pid AND author=@a AND [date]=@d AND [text]=@t
      )
      INSERT INTO dbo.ProjectComments (projectId, [text], author, [date])
      VALUES (@pid, @t, @a, @d)
    `, [
      { name: "pid", type: sql.NVarChar, value: projectId },
      { name: "t", type: sql.NVarChar, value: c.text },
      { name: "a", type: sql.NVarChar, value: c.user },
      { name: "d", type: sql.NVarChar, value: c.date }
    ]);
  }
}

// ✅ NO-DELETE append/upsert
async function syncProjectHistory(tx, projectId, history) {
  for (const h of history) {
    await txQuery(tx, `
      IF NOT EXISTS (
        SELECT 1 FROM dbo.ProjectHistory
        WHERE projectId=@pid AND [user]=@u AND [date]=@d AND [action]=@a AND details=@dt
      )
      INSERT INTO dbo.ProjectHistory (projectId, [action], [user], [date], details)
      VALUES (@pid, @a, @u, @d, @dt)
    `, [
      { name: "pid", type: sql.NVarChar, value: projectId },
      { name: "a", type: sql.NVarChar, value: h.action },
      { name: "u", type: sql.NVarChar, value: h.user },
      { name: "d", type: sql.NVarChar, value: h.date },
      { name: "dt", type: sql.NVarChar, value: h.details || "" }
    ]);
  }
}

module.exports = {
  getPool, // service'te tx açmak için
  listProjectRows,
  insertProject,
  updateProject,
  deleteProjectAll,
  syncProjectOwners,
  syncProjectFiles,
  syncProjectComments,
  syncProjectHistory
};
