// C:\Erkmen\ProjeOne\src\app.js
const express = require("express");
const path = require("path");
const fs = require("fs");

const { apiRouter } = require("./routes");
const { notFoundApi } = require("./utils/http");

function createApp() {
  const app = express();

  const publicDir = path.join(__dirname, "..", "public");   // PROJEONE/public
  const uploadsDir = path.join(__dirname, "..", "uploads"); // PROJEONE/uploads

  // klasör kontrol
  if (!fs.existsSync(publicDir)) {
    console.error("HATA: public klasörü bulunamadı:", publicDir);
    console.error("Beklenen: ...\\public\\index.html");
    process.exit(1);
  }
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // middleware
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true }));

  /**
   * 🔥 CACHE KAPATMA (KRİTİK)
   * Static dahil tüm response'larda cache'i kapatır.
   */
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
  });

  // static (utf-8 for html/css/js) + cache yok
  app.use(express.static(publicDir, {
    etag: false,
    lastModified: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
      res.setHeader("Cache-Control", "no-store");
      if (filePath.endsWith(".html")) res.setHeader("Content-Type", "text/html; charset=utf-8");
      else if (filePath.endsWith(".css")) res.setHeader("Content-Type", "text/css; charset=utf-8");
      else if (filePath.endsWith(".js")) res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    }
  }));

  app.use("/uploads", express.static(uploadsDir, {
    etag: false,
    lastModified: false,
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store");
    }
  }));

  // health
  app.get("/api/health", (req, res) => res.json({ ok: true }));

  // api routes
  app.use("/api", apiRouter);

  // 404 for API
  app.use("/api", notFoundApi);

  // SPA fallback
  app.use((req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.sendFile(path.join(publicDir, "index.html"));
  });

  return app;
}

module.exports = { createApp };
