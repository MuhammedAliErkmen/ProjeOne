  // C:\Erkmen\ProjeOne\src\db\txQuery.js
const { sql } = require("../../db");

async function txQuery(tx, text, params = []) {
  const req = new sql.Request(tx);
  for (const p of params) req.input(p.name, p.type, p.value);
  return await req.query(text);
}

module.exports = { txQuery };
