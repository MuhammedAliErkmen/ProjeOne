const sql = require("mssql/msnodesqlv8");

let pool;

async function getPool() {
  if (pool) return pool;

  const server = process.env.DB_SERVER || "localhost";
  const database = process.env.DB_DATABASE || "Merkmen";
  const driver = process.env.DB_ODBC_DRIVER || "ODBC Driver 18 for SQL Server";

  // Encrypt Mandatory olduğu için Encrypt ve TrustServerCertificate ekliyoruz
  const connStr =
    `Driver={${driver}};` +
    `Server=${server};` +
    `Database=${database};` +
    `Trusted_Connection=Yes;` +
    `Encrypt=yes;` +
    `TrustServerCertificate=yes;`;

  pool = await sql.connect({
    connectionString: connStr,
    options: {
      trustedConnection: true,
      trustServerCertificate: true
    }
  });

  return pool;
}

module.exports = { sql, getPool };
