import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import sql from 'mssql';

// Credentials arrive through a non-echoing stdin pipe, never argv/env files/logs.
if (process.stdin.isTTY) process.stdin.setRawMode(true);
const input = readline.createInterface({ input: process.stdin, terminal: false });
console.log('Waiting for temporary migration credentials on stdin.');
let pool, credentials;
try {
  credentials = JSON.parse(await new Promise((resolve, reject) => {
    input.once('line', resolve);
    input.once('close', () => reject(new Error('Credentials were not supplied')));
  }));
  input.close();
  const readEnv = async (file) => {
    try { return dotenv.parse(await fs.readFile(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
  };
  const env = { ...await readEnv('backend/.env'), ...await readEnv('.env') };
  if (env.DB_HOST !== credentials.expectedServer || !env.DB_NAME || credentials.user !== 'sa')
    throw new Error('Target does not match the authorized server/development configuration');
  pool = await new sql.ConnectionPool({
    server: env.DB_HOST, port: Number(env.DB_PORT || 1433), database: env.DB_NAME,
    user: credentials.user, password: credentials.password,
    connectionTimeout: 10000, requestTimeout: 120000,
    options: { encrypt: env.DB_ENCRYPT === 'true', trustServerCertificate: true },
    pool: { min: 0, max: 1 },
  }).connect();
  credentials.password = '';
  const before = await pool.request().query(`
    SELECT DB_NAME() AS targetDatabase, IS_SRVROLEMEMBER('sysadmin') AS isAdmin,
      CAST(SUM(size)*8.0/1024 AS DECIMAL(18,2)) AS allocatedMb FROM sys.database_files;
    SELECT COUNT_BIG(*) AS usersBefore FROM dbo.Users;
    SELECT MigrationName FROM dbo._MigrationHistory WHERE MigrationName='031_SelfServiceAuth.sql';
    SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS NVARCHAR(4000)) AS backupDirectory;
  `);
  const target = before.recordsets[0][0];
  if (target.targetDatabase !== env.DB_NAME || !target.isAdmin) throw new Error('Unexpected database or missing administrator privileges');
  console.log(JSON.stringify({ connected: true, ...target, usersBefore: before.recordsets[1][0].usersBefore,
    migrationAlreadyApplied: before.recordsets[2].length > 0, backupDirectoryAvailable: !!before.recordsets[3][0].backupDirectory }));
  if (!process.argv.includes('--inspect') && !before.recordsets[2].length) {
    const directory = before.recordsets[3][0].backupDirectory;
    if (!directory || (!/^[a-z]:[\\/]/i.test(directory) && !directory.startsWith('\\\\')))
      throw new Error('Cannot resolve an absolute default server backup directory; migration was not attempted');
    const filename = `${env.DB_NAME.replace(/[^a-z\d_-]/gi, '_')}_before_auth031_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.bak`;
    const backupPath = path.win32.join(directory, filename);
    const backup = pool.request();
    backup.timeout = 120000;
    const quotedDatabase = '[' + env.DB_NAME.replaceAll(']', ']]') + ']';
    await backup.input('file', sql.NVarChar(4000), backupPath).query('BACKUP DATABASE ' + quotedDatabase + ' TO DISK=@file WITH COPY_ONLY,CHECKSUM');
    await pool.request().input('file', sql.NVarChar(4000), backupPath).query('RESTORE VERIFYONLY FROM DISK=@file WITH CHECKSUM');
    console.log(JSON.stringify({ backup: 'VERIFIED', filename }));
    const migration = await fs.readFile('database/operations/031_SelfServiceAuth.up.sql', 'utf8');
    if (migration.includes('-- DOWN') || /DROP\s+TABLE/i.test(migration)) throw new Error('Expected UP-only migration');
    await pool.request().batch(migration);
    const after = await pool.request().query("SELECT COUNT_BIG(*) AS usersAfter FROM dbo.Users; SELECT MigrationName FROM dbo._MigrationHistory WHERE MigrationName='031_SelfServiceAuth.sql'");
    console.log(JSON.stringify({ migration: 'APPLIED', name: '031_SelfServiceAuth.sql', usersAfter: after.recordsets[0][0].usersAfter,
      userCountUnchanged: after.recordsets[0][0].usersAfter === before.recordsets[1][0].usersBefore,
      recorded: after.recordsets[1].length === 1, otherMigrationsApplied: false }));
  }
} catch (error) {
  console.error(JSON.stringify({ status: 'FAILED', code: error.code, sqlNumber: error.number,
    stageHint: error instanceof sql.RequestError || error instanceof sql.ConnectionError ? 'Database operation failed; raw details suppressed.' : error.message }));
  process.exitCode = 1;
} finally {
  if (credentials) credentials.password = '';
  input.close();
  if (pool) await pool.close().catch(() => {});
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
}
