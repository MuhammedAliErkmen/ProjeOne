// C:\Erkmen\ProjeOne\src\services\users.service.js
const bcrypt = require("bcryptjs");
const UsersRepo = require("../repositories/users.repo");
const { asStr } = require("../utils/convert");
const { signToken, isAdminUser } = require("../middleware/auth");

async function listUsers() {
  return await UsersRepo.listUsers();
}

async function login(username, password) {
  const u = asStr(username).trim();
  const p = asStr(password).trim();

  const rows = await UsersRepo.getUserByUsername(u);
  if (!rows.length) return { success: false, message: "Hatali sifre." };

  const row = rows[0];
  const hash = String(row.password || "");
  const ok = await bcrypt.compare(p, hash);
  if (!ok) return { success: false, message: "Hatali sifre." };

  const token = signToken({ username: row.username });
  return { success: true, username: row.username, token, isAdmin: isAdminUser(row.username) };
}

async function createUser({ username, title, password }) {
  const u = asStr(username).trim();
  const t = asStr(title).trim();
  const pw = asStr(password).trim();
  if (!u) throw new Error("username gerekli");
  if (!pw) throw new Error("sifre gerekli");

  const exists = await UsersRepo.userExists(u);
  if (exists) {
    const err = new Error("Bu kullanici zaten var");
    err.code = "USER_EXISTS";
    throw err;
  }

  const hash = await bcrypt.hash(pw, 10);
  await UsersRepo.insertUser({ username: u, title: t, password: hash });
  return { success: true };
}

async function updateUser(oldUsername, { username, title }) {
  const oldU = asStr(oldUsername).trim();
  const newU = asStr(username).trim();
  const t = asStr(title).trim();

  if (!oldU) throw new Error("username gerekli");
  if (!newU) throw new Error("yeni username gerekli");

  const existsOld = await UsersRepo.userExists(oldU);
  if (!existsOld) {
    const err = new Error("Kullanici bulunamadi");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (newU.toLowerCase() !== oldU.toLowerCase()) {
    const clash = await UsersRepo.userExists(newU);
    if (clash) {
      const err = new Error("Yeni kullanici adi zaten var");
      err.code = "USER_EXISTS";
      throw err;
    }
  }

  await UsersRepo.updateUser(oldU, { username: newU, title: t });
  return { success: true };
}

async function deleteUser(username) {
  const u = asStr(username).trim();
  if (!u) throw new Error("username gerekli");
  await UsersRepo.deleteUser(u);
  return { success: true };
}

async function changePasswordAdmin(username, newPassword) {
  const u = asStr(username).trim();
  const pw = asStr(newPassword).trim();
  if (!u) throw new Error("username gerekli");
  if (!pw) throw new Error("sifre gerekli");

  const exists = await UsersRepo.userExists(u);
  if (!exists) {
    const err = new Error("Kullanici bulunamadi");
    err.code = "NOT_FOUND";
    throw err;
  }

  const hash = await bcrypt.hash(pw, 10);
  await UsersRepo.updatePassword(u, hash);
  return { success: true };
}

async function changePasswordSelf(username, currentPassword, newPassword) {
  const u = asStr(username).trim();
  const cur = asStr(currentPassword).trim();
  const next = asStr(newPassword).trim();
  if (!u) throw new Error("username gerekli");
  if (!cur) throw new Error("mevcut sifre gerekli");
  if (!next) throw new Error("yeni sifre gerekli");

  const rows = await UsersRepo.getUserByUsername(u);
  if (!rows.length) {
    const err = new Error("Kullanici bulunamadi");
    err.code = "NOT_FOUND";
    throw err;
  }

  const row = rows[0];
  const hash = String(row.password || "");
  const ok = await bcrypt.compare(cur, hash);
  if (!ok) {
    const err = new Error("Mevcut sifre hatali");
    err.code = "BAD_PASSWORD";
    throw err;
  }

  const newHash = await bcrypt.hash(next, 10);
  await UsersRepo.updatePassword(u, newHash);
  return { success: true };
}

module.exports = {
  listUsers,
  login,
  createUser,
  updateUser,
  deleteUser,
  changePasswordAdmin,
  changePasswordSelf
};
