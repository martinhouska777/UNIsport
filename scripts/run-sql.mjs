/*
  RUN SQL AGAINST THE LIVE SUPABASE PROJECT — without opening a browser.

  The Supabase SQL editor is the normal way to run everything in db/. This is the
  same thing from a terminal, for when a script is long or has to be re-run a few
  times:

    node scripts/run-sql.mjs db/seed_demo.sql
    node scripts/run-sql.mjs "select count(*) from public.profiles;"

  It talks to the Management API, which runs the statement with full rights (it
  is NOT the anon key the app uses — that one is bound by row-level security and
  could never write another user's rows).

  Needs SUPABASE_ACCESS_TOKEN in .env.local: a personal access token from
  https://supabase.com/dashboard/account/tokens. That file is gitignored, so the
  token never leaves this machine. Revoke it on that same page at any time; this
  script then simply stops working until a new one is pasted in.
*/
import fs from "node:fs";
import path from "node:path";

const PROJECT_REF = "wavxyrgtaotrhnyepyor"; // the one live UNIsport project

function tokenFromEnvFile() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return null;
  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("SUPABASE_ACCESS_TOKEN="));
  return line ? line.slice(line.indexOf("=") + 1).trim() : null;
}

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node scripts/run-sql.mjs <file.sql | \"select …\">");
  process.exit(1);
}

const token = tokenFromEnvFile();
if (!token) {
  console.error(
    "No SUPABASE_ACCESS_TOKEN in .env.local — generate one at\n" +
      "https://supabase.com/dashboard/account/tokens and add it there.",
  );
  process.exit(1);
}

const query = arg.endsWith(".sql") ? fs.readFileSync(arg, "utf8") : arg;

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  },
);

const body = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}`);
  console.error(body);
  process.exit(1);
}

try {
  const rows = JSON.parse(body);
  if (Array.isArray(rows) && rows.length === 0) console.log("OK (no rows returned)");
  else console.log(JSON.stringify(rows, null, 2));
} catch {
  console.log(body);
}
