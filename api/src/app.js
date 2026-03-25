// C:\Erkmen\ProjeOne\src\app.js
const express = require("express");
const path = require("path");
const fs = require("fs");

const { apiRouter } = require("./routes");
const { notFoundApi } = require("./utils/http");

function createApp() {
  const app = express();

  const uploadsDir = path.join(__dirname, "..", "uploads");

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // middleware
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true }));

  // CORS (prod domain)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cache-Control, Pragma");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // uploads
  app.use("/uploads", express.static(uploadsDir));

  // health
  app.get("/api/health", (req, res) => res.json({ ok: true }));

  // api routes
  app.use("/api", apiRouter);

  // 404 for API
  app.use("/api", notFoundApi);

  // all other requests -> JSON 404
  app.use((req, res) => {
    res.status(404).json({ error: "Not Found", path: req.originalUrl });
  });

  return app;
}

module.exports = { createApp };
