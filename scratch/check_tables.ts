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
  const tables = await pool.request().query(`
    SELECT TABLE_SCHEMA, TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_SCHEMA, TABLE_NAME
  `);
  console.log('Tables in DB:');
  console.table(tables.recordset);

  const daColumns = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'DeviceAgents'
    ORDER BY ORDINAL_POSITION
  `);
  console.log('Columns in DeviceAgents:');
  console.table(daColumns.recordset);

  await pool.close();
}

main().catch(console.error);
