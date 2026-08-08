import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: true }
};

async function run() {
  try {
    await sql.connect(config);
    const result = await sql.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Computers'");
    console.log(result.recordset.map(c => c.COLUMN_NAME));
  } catch(e) {
    console.error(e);
  } finally {
    sql.close();
  }
}
run();
