// C:\Erkmen\ProjeOne\src\routes\users.routes.js
const express = require("express");
const UsersService = require("../services/users.service");
const { bad } = require("../utils/http");
const { asStr } = require("../utils/convert");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const usersRouter = express.Router();

// USERS - LOGIN (public)
usersRouter.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ success: false, message: "Eksik bilgi" });

  try {
    const r = await UsersService.login(asStr(username), asStr(password));
    return res.json(r);
  } catch (e) {
    console.error(e);
    return res.json({ success: false, message: "Baglanti hatasi." });
  }
});

// USERS - LIST (auth required)
usersRouter.get("/users", requireAuth, async (req, res) => {
  try {
    const list = await UsersService.listUsers();
    res.json(list);
  } catch (e) {
    console.error(e);
    bad(res, "Users okunamadi: " + e.message, 500);
  }
});

// USERS - CREATE (admin only)
usersRouter.post("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, title, password } = req.body || {};
    const out = await UsersService.createUser({ username, title, password });
    res.json(out);
  } catch (e) {
    console.error(e);
    if (e.code === "USER_EXISTS") return bad(res, e.message, 409);
    bad(res, "User eklenemedi: " + e.message, 500);
  }
});

// USERS - UPDATE (admin only)
usersRouter.put("/users/:username", requireAuth, requireAdmin, async (req, res) => {
  try {
    const oldUsername = req.params.username;
    const { username, title } = req.body || {};
    const out = await UsersService.updateUser(oldUsername, { username, title });
    res.json(out);
  } catch (e) {
    console.error(e);
    if (e.code === "NOT_FOUND") return bad(res, e.message, 404);
    if (e.code === "USER_EXISTS") return bad(res, e.message, 409);
    bad(res, "User guncellenemedi: " + e.message, 500);
  }
});

// USERS - CHANGE OWN PASSWORD (auth required)
usersRouter.put("/users/me/password", requireAuth, async (req, res) => {
  try {
    const username = req.user && req.user.username;
    const { currentPassword, newPassword } = req.body || {};
    const out = await UsersService.changePasswordSelf(
      asStr(username),
      currentPassword,
      newPassword
    );
    res.json(out);
  } catch (e) {
    console.error(e);
    if (e.code === "NOT_FOUND") return bad(res, e.message, 404);
    if (e.code === "BAD_PASSWORD") return bad(res, e.message, 400);
    bad(res, "Sifre guncellenemedi: " + e.message, 500);
  }
});

// USERS - CHANGE PASSWORD (admin only)
usersRouter.put("/users/:username/password", requireAuth, requireAdmin, async (req, res) => {
  try {
    const u = req.params.username;
    const { password } = req.body || {};
    const out = await UsersService.changePasswordAdmin(asStr(u), password);
    res.json(out);
  } catch (e) {
    console.error(e);
    if (e.code === "NOT_FOUND") return bad(res, e.message, 404);
    bad(res, "Sifre guncellenemedi: " + e.message, 500);
  }
});

// USERS - DELETE (admin only)
usersRouter.delete("/users/:username", requireAuth, requireAdmin, async (req, res) => {
  try {
    const out = await UsersService.deleteUser(req.params.username);
    res.json(out);
  } catch (e) {
    console.error(e);
    bad(res, "User silinemedi: " + e.message, 500);
  }
});

module.exports = { usersRouter };
