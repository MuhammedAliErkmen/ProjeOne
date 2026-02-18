// C:\Erkmen\ProjeOne\scripts\hash_passwords.js
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sql, getPool } = require("../db");

function isBcryptHash(v) {
  return typeof v === "string" && v.startsWith("$2");
}

async function run() {
  const pool = await getPool();
  const r = await pool.request().query("SELECT username, password FROM dbo.Users");
  const rows = r.recordset || [];

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const username = row.username;
    const password = row.password;

    if (isBcryptHash(password)) {
      skipped++;
      continue;
    }

    const hash = await bcrypt.hash(String(password || ""), 10);
    await pool.request()
      .input("u", sql.NVarChar, username)
      .input("p", sql.NVarChar, hash)
      .query("UPDATE dbo.Users SET password=@p WHERE username=@u");
    updated++;
  }

  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
