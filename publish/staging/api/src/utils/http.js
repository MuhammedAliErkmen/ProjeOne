// C:\Erkmen\ProjeOne\src\utils\http.js
function bad(res, msg, code = 400) {
  return res.status(code).json({ error: msg || "Bad Request" });
}

function notFoundApi(req, res) {
  return res.status(404).json({ error: "API route not found", path: req.originalUrl });
}

module.exports = { bad, notFoundApi };
