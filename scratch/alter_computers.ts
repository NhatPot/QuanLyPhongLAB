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
  try {
    await pool.request().query('ALTER TABLE dbo.Computers ALTER COLUMN IpAddress NVARCHAR(MAX) NULL');
    console.log('ALTER TABLE dbo.Computers succeeded!');
  } catch (err) {
    console.error('ALTER TABLE error:', err);
  }
  await pool.close();
}

main().catch(console.error);
