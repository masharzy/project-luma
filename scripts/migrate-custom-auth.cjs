/* Explicit owner URL only. Non-destructive schema/import migration; never disables managed auth. */
const fs = require("node:fs");
const path = require("node:path");
const { neon } = require("@neondatabase/serverless");
const { createHash } = require("node:crypto");
const file = process.argv[2];
if (!file) throw Error("Pass a private migration env file.");
const env = Object.fromEntries(
  fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const at = l.indexOf("=");
      return [l.slice(0, at), l.slice(at + 1)];
    }),
);
if (!env.DATABASE_URL_UNPOOLED || env.AUTH_MIGRATION_MODE !== "prepare")
  throw Error(
    "DATABASE_URL_UNPOOLED and AUTH_MIGRATION_MODE=prepare are required.",
  );
if (new URL(env.DATABASE_URL_UNPOOLED).hostname.includes("-pooler"))
  throw Error("Use the direct owner connection for migrations.");
(async () => {
  const sql = neon(env.DATABASE_URL_UNPOOLED);
  await sql.query("CREATE SCHEMA IF NOT EXISTS app_auth");
  await sql.query(
    "CREATE TABLE IF NOT EXISTS app_auth.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  for (const name of [
    "001_custom_auth.sql",
    "002_import_managed_identity.sql",
    "003_runtime_grants.sql",
  ]) {
    const source = fs.readFileSync(path.join("migrations", name), "utf8");
    const checksum = createHash("sha256").update(source).digest("hex");
    const rows = await sql.query(
      "SELECT checksum FROM app_auth.schema_migrations WHERE name=$1",
      [name],
    );
    if (rows[0]) {
      if (rows[0].checksum !== checksum)
        throw Error("Applied migration checksum differs: " + name);
      console.log("Already applied:", name);
      continue;
    }
    const statements = source.includes("-- statement-breakpoint")
      ? source.split(/^-- statement-breakpoint\s*$/m)
      : source.split(";");
    const queries = statements.filter((s) => s.trim()).map((s) => sql.query(s));
    queries.push(
      sql.query(
        "INSERT INTO app_auth.schema_migrations(name,checksum) VALUES($1,$2)",
        [name, checksum],
      ),
    );
    await sql.transaction(queries);
    console.log("Applied:", name);
  }
  console.log(
    "Custom schema prepared. Existing managed schema and live sessions were not modified.",
  );
})().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
