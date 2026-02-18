// C:\Erkmen\ProjeOne\src\routes\upload.routes.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { bad } = require("../utils/http");
const { requireAuth } = require("../middleware/auth");

const uploadRouter = express.Router();
uploadRouter.use(requireAuth);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const uploadsDir = path.join(__dirname, "..", "..", "uploads");

uploadRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const body = req.body || {};
    const name = body.name || (req.file && req.file.originalname);

    let fileBuffer = null;
    if (req.file && req.file.buffer) {
      fileBuffer = req.file.buffer;
    } else if (body.data) {
      const raw = String(body.data);
      const base64 = raw.includes("base64,") ? raw.split("base64,")[1] : raw;
      fileBuffer = Buffer.from(base64, "base64");
    }

    if (!name || !fileBuffer) return bad(res, "name ve data gerekli");

    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const safeName = String(name)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.\-_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    const fileName = `${Date.now()}_${safeName}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, fileBuffer);

    return res.json({ name: safeName, url: `/uploads/${fileName}` });
  } catch (e) {
    console.error("UPLOAD ERROR:", e);
    return bad(res, "Upload başarısız: " + e.message, 500);
  }
});

module.exports = { uploadRouter };
