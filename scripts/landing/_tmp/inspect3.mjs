import pg from "pg";
import { env } from "./env.mjs";
const c = new pg.Client({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const q = async (label, sql) => { try { const r = await c.query(sql); console.log("\n== " + label); console.table(r.rows.slice(0,10)); } catch(e){ console.log("\n== " + label + "  ERR: " + e.message); } };
await q("profile cols", `select column_name from information_schema.columns where table_schema='public' and table_name='profiles' order by ordinal_position`);
await q("the two accounts", `select p.id, p.full_name, p.house, p.class_year, left(coalesce(p.bio,''),40) bio
   from public.profiles p where p.id in ('67fd65e5-3979-41f4-97c8-83e7a204dc84','11f51e4f-6d28-475c-acad-463606cbbbd4')`);
await q("workout_logs per account", `select user_id, count(*) n, min(performed_at::date) first, max(performed_at::date) last
   from public.workout_logs where user_id in ('67fd65e5-3979-41f4-97c8-83e7a204dc84','11f51e4f-6d28-475c-acad-463606cbbbd4') group by 1`);
await q("missing tables?", `select t.name, (to_regclass('public.'||t.name) is not null) as present from (values ('varsity_results'),('varsity_telemetry'),('varsity_coach_reads'),('workout_logs'),('session_plans')) as t(name)`);
await c.end();
