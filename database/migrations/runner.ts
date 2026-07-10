import fs from 'fs';
import path from 'path';
import mssql from 'mssql';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

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

async function run() {
  const command = process.argv[2] || 'up';
  console.log(`[Migration] Running command: ${command}`);

  let pool: mssql.ConnectionPool | null = null;
  try {
    pool = await new mssql.ConnectionPool(dbConfig).connect();
    
    // Ensure _MigrationHistory exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '_MigrationHistory')
      BEGIN
        CREATE TABLE _MigrationHistory (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          MigrationName NVARCHAR(255) NOT NULL UNIQUE,
          AppliedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
        );
      END
    `);

    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (command === 'up') {
      for (const file of files) {
        const checkResult = await pool.request()
          .input('name', mssql.NVarChar, file)
          .query('SELECT 1 FROM _MigrationHistory WHERE MigrationName = @name');

        if (checkResult.recordset.length > 0) {
          console.log(`[Migration] ${file} already applied.`);
          continue;
        }

        console.log(`[Migration] Applying ${file}...`);
        const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        const upSql = parseSqlSection(content, 'up');

        const transaction = new mssql.Transaction(pool);
        await transaction.begin();
        try {
          await transaction.request().batch(upSql);
          await transaction.request()
            .input('name', mssql.NVarChar, file)
            .query('INSERT INTO _MigrationHistory (MigrationName) VALUES (@name)');
          await transaction.commit();
          console.log(`[Migration] Successfully applied ${file}.`);
        } catch (err) {
          await transaction.rollback();
          console.error(`[Migration] Failed to apply ${file}. Transaction rolled back.`);
          throw err;
        }
      }
    } else if (command === 'down') {
      const applied = await pool.request()
        .query('SELECT MigrationName FROM _MigrationHistory ORDER BY Id DESC');

      if (applied.recordset.length === 0) {
        console.log('[Migration] No migrations to roll back.');
        return;
      }

      const lastFile = applied.recordset[0].MigrationName;
      console.log(`[Migration] Rolling back ${lastFile}...`);
      const content = fs.readFileSync(path.join(migrationsDir, lastFile), 'utf-8');
      const downSql = parseSqlSection(content, 'down');

      const transaction = new mssql.Transaction(pool);
      await transaction.begin();
      try {
        await transaction.request().batch(downSql);
        await transaction.request()
          .input('name', mssql.NVarChar, lastFile)
          .query('DELETE FROM _MigrationHistory WHERE MigrationName = @name');
        await transaction.commit();
        console.log(`[Migration] Successfully rolled back ${lastFile}.`);
      } catch (err) {
        await transaction.rollback();
        console.error(`[Migration] Failed to rollback ${lastFile}. Transaction rolled back.`);
        throw err;
      }
    } else if (command === 'reset-test') {
      if (process.env.NODE_ENV !== 'test') {
        throw new Error('db:reset:test is only allowed in test environment.');
      }
      console.log('[Migration] Resetting database for test...');
      const reversedFiles = [...files].reverse();
      for (const file of reversedFiles) {
        console.log(`[Migration] Rolling back ${file} for reset...`);
        const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        const downSql = parseSqlSection(content, 'down');
        try {
          await pool.request().batch(downSql);
        } catch (err) {
          console.warn(`[Migration] Warning while rolling back ${file}:`, err.message);
        }
      }
      await pool.request().query('DROP TABLE IF EXISTS _MigrationHistory');
      console.log('[Migration] Database reset completed.');
    } else {
      console.error(`[Migration] Unknown command: ${command}`);
    }

  } catch (error) {
    console.error('[Migration] Error:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
    process.exit(0);
  }
}

function parseSqlSection(content: string, section: 'up' | 'down'): string {
  const parts = content.split(/--\s*DOWN/i);
  if (section === 'up') {
    const upPart = parts[0].replace(/--\s*UP/i, '');
    return upPart.trim();
  } else {
    return parts[1] ? parts[1].trim() : '';
  }
}

run();
