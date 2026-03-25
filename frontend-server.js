const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "0.0.0.0";
const PORT = Number(process.env.FRONTEND_PORT || 3000);
const ROOT = path.join(__dirname, "frontend", "public");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(body);
}

function resolvePath(urlPath) {
  const safePath = decodeURIComponent(String(urlPath || "/")).split("?")[0];
  const normalized = path.normalize(safePath).replace(/^(\.\.[\\/])+/, "");
  const relative = normalized === path.sep ? "index.html" : normalized.replace(/^[/\\]+/, "");
  const filePath = path.join(ROOT, relative || "index.html");
  if (!filePath.startsWith(ROOT)) return null;
  return filePath;
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url);
  if (!filePath) return send(res, 400, "Bad Request");

  let target = filePath;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, "index.html");
  }

  fs.readFile(target, (err, data) => {
    if (err) {
      if (target !== path.join(ROOT, "index.html")) {
        fs.readFile(path.join(ROOT, "index.html"), (indexErr, indexData) => {
          if (indexErr) return send(res, 404, "Not Found");
          send(res, 200, indexData, CONTENT_TYPES[".html"]);
        });
        return;
      }
      return send(res, 404, "Not Found");
    }

    const ext = path.extname(target).toLowerCase();
    send(res, 200, data, CONTENT_TYPES[ext] || "application/octet-stream");
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Frontend running: http://localhost:${PORT}`);
});
