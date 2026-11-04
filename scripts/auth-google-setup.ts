import "../src/server/config/load-environment";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { SqlConnectionFactory } from "../src/server/infrastructure/database/sqlserver/connection";
import mssql from "mssql";

// Explicit setup actions only. Never enable Google without the owner's client ID.
const migrationName = "031_SelfServiceAuth.sql";
async function run() {
  if (process.env.NODE_ENV === "production") throw new Error("Use the reviewed deployment workflow for production.");
  const prepare = process.argv.includes("--prepare-env");
  const migrate = process.argv.includes("--apply-migration");
  const exportSql = process.argv.includes("--export-sql");
  if (!prepare && !migrate && !exportSql) {
    console.log("Use --prepare-env for private keys/disabled flags, --export-sql for a reviewable DBA script, or --apply-migration to apply only 031 to the configured development database.");
    return;
  }
  const up = fs.readFileSync(path.resolve("database/migrations", migrationName), "utf8")
    .split(/--\s*DOWN\b/i)[0].replace(/^--\s*UP\s*/i, "");
  if (exportSql) {
    const target = path.resolve("database/operations/031_SelfServiceAuth.up.sql");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `-- Generated from migrations/${migrationName}; UP ONLY.\n-- Select the intended development database in SSMS before executing.\n-- Run as a database owner/migration principal; do not grant these privileges to the application.\nSET XACT_ABORT ON;\nBEGIN TRY\nBEGIN TRANSACTION;\nIF OBJECT_ID('dbo._MigrationHistory','U') IS NULL THROW 51002, 'Expected existing migration history.', 1;\nIF NOT EXISTS(SELECT 1 FROM dbo._MigrationHistory WHERE MigrationName=N'${migrationName}')\nBEGIN\n${up}\nINSERT INTO dbo._MigrationHistory(MigrationName) VALUES(N'${migrationName}');\nEND;\nCOMMIT TRANSACTION;\nEND TRY\nBEGIN CATCH\nIF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;\nTHROW;\nEND CATCH;\n`);
    console.log("Exported database/operations/031_SelfServiceAuth.up.sql (UP only, transaction with rollback, no credentials).");
  }
  if (prepare) {
    if (process.env.AUTH_OTP_SECRET && process.env.AUTH_OTP_SECRET.length < 32)
      throw new Error("Existing AUTH_OTP_SECRET is invalid; it was not overwritten.");
    if (process.env.AUTH_EMAIL_ENCRYPTION_KEY && !/^[a-f\d]{64}$/i.test(process.env.AUTH_EMAIL_ENCRYPTION_KEY))
      throw new Error("Existing AUTH_EMAIL_ENCRYPTION_KEY is invalid; it was not overwritten.");
    const file = fs.existsSync(".env") ? ".env" : fs.existsSync("backend/.env") ? "backend/.env" : ".env";
    const entries: Record<string, string> = {
      AUTH_OTP_SECRET: randomBytes(48).toString("hex"),
      AUTH_EMAIL_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
      GOOGLE_AUTH_ENABLED: "false",
      SELF_REGISTRATION_ENABLED: "false",
      AUTH_EMAIL_ENABLED: "false",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_ALLOWED_HOSTED_DOMAINS: "",
    };
    const content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    const missing = Object.entries(entries).filter(([key]) =>
      !process.env[key] && !new RegExp(`^\\s*${key}\\s*=`, "m").test(content));
    if (missing.length) fs.appendFileSync(file,
      "\n# Google authentication setup (private server configuration)\n" +
      missing.map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { mode: 0o600 });
    console.log(`Environment prepared in ${file}; existing values preserved, no secrets printed. Google remains subject to its configured feature flag.`);
  }
  if (migrate) {
    if (["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].some((key) => !process.env[key]))
      throw new Error("Configure the intended development database explicitly before migrating.");
    const pool = await SqlConnectionFactory.getPool();
    const permissions = await pool.request().query(`SELECT
      HAS_PERMS_BY_NAME('dbo.Users','OBJECT','ALTER') AS alterUsers,
      HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','CREATE TABLE') AS createTables,
      HAS_PERMS_BY_NAME('dbo','SCHEMA','ALTER') AS alterSchema`);
    if (!Object.values(permissions.recordset[0]).every(Boolean))
      throw new Error("Auth migration requires ALTER Users, CREATE TABLE and ALTER dbo schema. Ask the database owner to run the exported UP-only script; do not elevate the application account.");
    const tx = new mssql.Transaction(pool);
    await tx.begin();
    try {
      await tx.request().query(`
        SET XACT_ABORT ON;
        DECLARE @lock INT;
        EXEC @lock = sys.sp_getapplock @Resource='lhu-auth-schema-031', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000;
        IF @lock < 0 THROW 51001, 'Cannot acquire auth schema lock.', 1;
        IF OBJECT_ID('dbo._MigrationHistory','U') IS NULL THROW 51002, 'Expected existing migration history.', 1;
        IF OBJECT_ID('dbo.Users','U') IS NULL OR OBJECT_ID('dbo.AuthSessions','U') IS NULL
          THROW 51003, 'Required existing auth schema is missing.', 1;
        IF (SELECT COUNT(*) FROM Roles WHERE Code IN ('STUDENT','TEACHER','ADMIN')) <> 3
          THROW 51004, 'Required roles are missing.', 1;
      `);
      const applied = await tx.request().input("name", mssql.NVarChar, migrationName)
        .query("SELECT 1 FROM dbo._MigrationHistory WHERE MigrationName=@name");
      if (!applied.recordset.length) {
        await tx.request().batch(up);
        await tx.request().input("name", mssql.NVarChar, migrationName)
          .query("INSERT INTO dbo._MigrationHistory(MigrationName) VALUES(@name)");
      }
      await tx.commit();
      console.log(`Migration ${migrationName}: ${applied.recordset.length ? "already recorded" : "applied"}. Other pending migrations were not applied.`);
    } catch (error) {
      await tx.rollback().catch(() => {});
      const sqlNumber = error instanceof mssql.RequestError ? error.number : undefined;
      throw new Error(`Auth migration failed and was rolled back (SQL code ${sqlNumber || "unavailable"}); no database error details or secrets printed. Review schema/roles and migration 031.`);
    }
  }
}
run().catch((error) => {
  // Only intentional operator messages above; never print raw SQL connection errors.
  const known = error instanceof Error && /^(Use |Existing |Configure |Auth migration)/.test(error.message);
  console.error(known ? error.message : "Google setup failed. Check private configuration and database connectivity.");
  process.exitCode = 1;
}).finally(() => SqlConnectionFactory.close());
