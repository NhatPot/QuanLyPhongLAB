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
    SELECT t.name AS TableName, s.name AS SchemaName, u.name AS Owner
    FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    LEFT JOIN sys.database_principals u ON t.principal_id = u.principal_id
    WHERE t.name IN ('Computers', 'DeviceAgents')
  `);
  console.log(res.recordset);
  await pool.close();
}

main().catch(console.error);
