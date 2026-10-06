// Applies db/schema.sql to the database in DATABASE_URL (from .env).
// Usage: npm run db:migrate
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { prepare: false, ssl: local ? false : "require", max: 1 });
try {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await sql.unsafe(schema);
  const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`;
  console.log("Schema applied. Tables:", tables.map((t) => t.table_name).join(", "));
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
