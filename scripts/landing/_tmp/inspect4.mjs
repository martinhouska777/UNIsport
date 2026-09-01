import pg from "pg";
import { env } from "./env.mjs";
const c = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const q = async (label, sql) => { try { const r = await c.query(sql); console.log("\n== " + label); console.log(JSON.stringify(r.rows, null, 1).slice(0, 1400)); } catch(e){ console.log("\n== " + label + "  ERR: " + e.message); } };
await q("the two accounts", `select id, data->>'name' name, data->>'house' house, data->>'classYear' yr, left(coalesce(data->>'bio',''),44) bio
   from public.profiles where id in ('67fd65e5-3979-41f4-97c8-83e7a204dc84','11f51e4f-6d28-475c-acad-463606cbbbd4')`);
await q("workout_logs cols", `select column_name from information_schema.columns where table_schema='public' and table_name='workout_logs' order by ordinal_position`);
await c.end();
