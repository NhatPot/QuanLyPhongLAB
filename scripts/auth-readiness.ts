import "../src/server/config/load-environment";
import fs from "node:fs";
import path from "node:path";
import mssql from "mssql";
import { readSelfServiceConfig } from "../src/server/infrastructure/auth/self-service-config";

// Read-only diagnostics: never migrate, generate credentials or send email.
async function run() {
  const config = readSelfServiceConfig();
  const report: Record<string, unknown> = {
    google: {
      enabledFlag: process.env.GOOGLE_AUTH_ENABLED === "true",
      clientIdConfigured: Boolean(config.googleClientId),
      nonceSecretReady: config.secret.length >= 32,
      outboxKeyReady: /^[a-f\d]{64}$/i.test(config.outboxKey),
      availableFromConfig: config.googleEnabled,
      hostedDomainsConfigured: config.hostedDomains.length > 0,
      registrationEnabled: config.registrationEnabled,
      otpFallbackReady: config.mailReady,
    },
    database: { status: "NOT_CHECKED", hint: "Add --database for SELECT-only schema checks." },
    realGoogleSignIn: "NOT_TESTED: needs the owner's Google OAuth web client and interactive school account.",
  };
  if (process.argv.includes("--database")) {
    const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
    if (required.some((key) => !process.env[key])) {
      report.database = { status: "NOT_CONFIGURED" };
    } else {
      const pool = new mssql.ConnectionPool({
        server: process.env.DB_HOST!,
        user: process.env.DB_USER!,
        password: process.env.DB_PASSWORD!,
        database: process.env.DB_NAME!,
        port: Number(process.env.DB_PORT || 1433),
        connectionTimeout: 10000,
        requestTimeout: 10000,
        options: { encrypt: process.env.DB_ENCRYPT === "true", trustServerCertificate: true },
        pool: { min: 0, max: 1 },
      });
      try {
        await pool.connect();
        const objects = await pool.request().query(`
          SELECT name FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo');
          SELECT name, is_nullable FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users')
            AND name IN ('PasswordHash','EmailVerifiedAt');
          SELECT Code FROM dbo.Roles WHERE Code IN ('STUDENT','TEACHER','ADMIN');
          SELECT HAS_PERMS_BY_NAME('dbo.Users','OBJECT','ALTER') AS canAlterUsers,
            HAS_PERMS_BY_NAME(DB_NAME(),'DATABASE','CREATE TABLE') AS canCreateTables,
            HAS_PERMS_BY_NAME('dbo','SCHEMA','ALTER') AS canAlterDboSchema;
          SELECT t.tableName, p.permissionName,
            HAS_PERMS_BY_NAME('dbo.' + t.tableName,'OBJECT',p.permissionName) AS allowed
          FROM (VALUES ('UserExternalIdentities'),('AuthChallenges'),('AuthRateEvents'),('AuthEmailOutbox'),('AccountRegistrations')) t(tableName)
          CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(permissionName);
        `);
        const sets = objects.recordsets as unknown as Array<Array<Record<string, unknown>>>;
        const tables = new Set(sets[0].map((r) => String(r.name)));
        const missingTables = ["UserExternalIdentities", "AuthChallenges", "AuthRateEvents", "AuthEmailOutbox", "AccountRegistrations", "AuthSessions"]
          .filter((table) => !tables.has(table));
        const missingColumns: string[] = [];
        if (!sets[1].some((r) => r.name === "EmailVerifiedAt")) missingColumns.push("Users.EmailVerifiedAt");
        if (!sets[1].some((r) => r.name === "PasswordHash" && r.is_nullable)) missingColumns.push("Users.PasswordHash nullable");
        let pendingMigrations: string[] | undefined;
        if (tables.has("_MigrationHistory")) {
          const applied = await pool.request().query("SELECT MigrationName FROM dbo._MigrationHistory");
          const names = new Set(applied.recordset.map((r) => String(r.MigrationName)));
          pendingMigrations = fs.readdirSync(path.resolve("database/migrations"))
            .filter((name) => name.endsWith(".sql") && !names.has(name)).sort();
        }
        report.database = {
          status: missingTables.length || missingColumns.length ? "SCHEMA_PENDING" : "SCHEMA_PRESENT",
          missingTables, missingColumns, pendingMigrations,
          requiredRolesPresent: sets[2].map((row) => row.Code),
          migrationPermissions: sets[3][0],
          missingRuntimePermissions: sets[4].filter((row) => !row.allowed)
            .map((row) => `${row.tableName}.${row.permissionName}`),
          note: "SELECT-only. Schema presence does not prove transaction/concurrency behavior.",
        };
      } catch {
        // Connection errors may contain hosts/users; do not print their objects.
        report.database = { status: "CHECK_FAILED", hint: "Check private database configuration and connectivity." };
      } finally {
        await pool.close().catch(() => {});
      }
    }
  }
  console.log(JSON.stringify(report, null, 2));
}
run().catch(() => {
  console.error("Auth readiness check failed; no credentials or raw error details were printed.");
  process.exitCode = 1;
});
