// C:\Erkmen\ProjeOne\src\repositories\users.repo.js
const { sql, getPool } = require("../db");

async function listUsers() {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT username, title
    FROM dbo.Users
    ORDER BY username
  `);
  return r.recordset || [];
}

async function getUserByUsername(username) {
  const pool = await getPool();
  const r = await pool.request()
    .input("u", sql.NVarChar, username)
    .query(`SELECT username, password FROM dbo.Users WHERE username=@u`);
  return (r.recordset || []);
}

async function userExists(username) {
  const pool = await getPool();
  const r = await pool.request()
    .input("u", sql.NVarChar, username)
    .query(`SELECT 1 AS ok FROM dbo.Users WHERE username=@u`);
  return (r.recordset || []).length > 0;
}

async function insertUser({ username, title, password }) {
  const pool = await getPool();
  await pool.request()
    .input("u", sql.NVarChar, username)
    .input("t", sql.NVarChar, title)
    .input("p", sql.NVarChar, password)
    .query(`
      INSERT INTO dbo.Users (username, title, password)
      VALUES (@u, @t, @p)
    `);
}

async function updatePassword(username, password) {
  const pool = await getPool();
  await pool.request()
    .input("u", sql.NVarChar, username)
    .input("p", sql.NVarChar, password)
    .query(`UPDATE dbo.Users SET password=@p WHERE username=@u`);
}

async function updateUser(oldUsername, { username, title }) {
  const pool = await getPool();
  await pool.request()
    .input("oldU", sql.NVarChar, oldUsername)
    .input("newU", sql.NVarChar, username)
    .input("t", sql.NVarChar, title)
    .query(`
      UPDATE dbo.Users
      SET username=@newU, title=@t
      WHERE username=@oldU
    `);

  await pool.request()
    .input("oldU", sql.NVarChar, oldUsername)
    .input("newU", sql.NVarChar, username)
    .query(`
      UPDATE dbo.ProjectOwners
      SET username=@newU
      WHERE username=@oldU
    `);
}

async function deleteUser(username) {
  const pool = await getPool();
  await pool.request()
    .input("u", sql.NVarChar, username)
    .query(`DELETE FROM dbo.ProjectOwners WHERE username=@u`);

  await pool.request()
    .input("u", sql.NVarChar, username)
    .query(`DELETE FROM dbo.Users WHERE username=@u`);
}

module.exports = {
  listUsers,
  getUserByUsername,
  userExists,
  insertUser,
  updatePassword,
  updateUser,
  deleteUser
};
