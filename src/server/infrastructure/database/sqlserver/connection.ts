import mssql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

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
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

export class SqlConnectionFactory {
  private static pool: mssql.ConnectionPool | null = null;

  public static async getPool(): Promise<mssql.ConnectionPool> {
    if (this.pool) {
      return this.pool;
    }

    try {
      this.pool = await new mssql.ConnectionPool(dbConfig).connect();
      return this.pool;
    } catch (error) {
      this.pool = null;
      throw error;
    }
  }

  public static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }
}
