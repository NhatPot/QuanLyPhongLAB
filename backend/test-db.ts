import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '.env') });

import { SqlConnectionFactory } from './src/infrastructure/database/sqlserver/connection';

async function testConnection() {
  try {
    console.log('Testing SQL Server connection...');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Port: ${process.env.DB_PORT}`);
    console.log(`User: ${process.env.DB_USER}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    
    const pool = await SqlConnectionFactory.getPool();
    const result = await pool.request().query('SELECT 1 as test');
    if (result.recordset[0].test === 1) {
      console.log('✅ Connected to SQL Server successfully!');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to connect to SQL Server:', err);
    process.exit(1);
  }
}

testConnection();
