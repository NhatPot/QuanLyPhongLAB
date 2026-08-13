import mssql from 'mssql';
import '../src/server/config/load-environment';

const dbConfig: mssql.config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourStrongPassword123!',
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'ItLabManagerDb',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
};

async function main() {
  const pool = await new mssql.ConnectionPool(dbConfig).connect();
  const res = await pool.request().query(`
    SELECT da.ComputerId, da.DeviceId, da.Hostname, da.CurrentUsername, da.LastSeenAt, c.Name, c.Status, c.MacAddress
    FROM DeviceAgents da
    LEFT JOIN Computers c ON c.Id = da.ComputerId
  `);
  console.log('DeviceAgents records:', res.recordset);
  await pool.close();
}

main().catch(console.error);
