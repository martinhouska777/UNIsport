import { readFileSync } from "node:fs";
import pg from "pg";
const env = readFileSync("C:/Unisport/.env.local", "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim().replace(/^"|"$/g, "");
if (!url) throw new Error("no DATABASE_URL");
const sql = readFileSync(process.argv[2], "utf8");
const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  await c.query("begin");
  await c.query(sql);
  await c.query("commit");
  console.log("applied", process.argv[2]);
  const r = await c.query("select proname from pg_proc where proname in ('follow_counts','follow_list')");
  console.log(r.rows);
} catch (e) { await c.query("rollback"); console.error("FAILED:", e.message); process.exit(1); }
finally { await c.end(); }
