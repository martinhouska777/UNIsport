/*
  WHAT HAVE I RUN, AND WHAT IS LEFT — a checklist for the db/ folder.

    node scripts/check-db.mjs            # ask the live database and report
    node scripts/check-db.mjs --offline  # just list what each file expects

  Every file in db/ creates things: tables, columns, views, functions, policies.
  This reads each file, works out what it would create, asks the live project
  what actually exists, and sorts the folder into three piles — already run,
  partly run, still to run — then prints the exact commands for the ones left.

  It never writes anything. The only statement it sends is a read of the
  catalog (pg_class and friends), so it is safe to run at any time.

  WHY IT PARSES THE FILES rather than keeping a list: a list would go stale the
  first time somebody adds a file. The folder stays the source of truth, which
  is the same rule the app follows for its own data (CLAUDE.md rule 7).

  Needs SUPABASE_ACCESS_TOKEN in .env.local, same as scripts/run-sql.mjs.
*/
import fs from "node:fs";
import path from "node:path";

const PROJECT_REF = "wavxyrgtaotrhnyepyor"; // the one live UNIsport project
const DB_DIR = "db";

/*
  NOT EVERY FILE IN db/ IS A MIGRATION. Four kinds are judged differently, and
  none of them belongs in a "you still need to run this" list:

    schema.sql        a planning artifact — CLAUDE.md says it is not connected
    *_test.sql        queries to paste in by hand when checking something
    seed_*.sql        demo rows; run one when a screen looks empty, not to work
    *_undo.sql        removes demo rows again

  Everything else is a migration, and the catalog can say whether it ran.
*/
const DESIGN_ONLY = new Set(["schema.sql"]);
/* This script's own output lives in db/ so it can be pasted from there. It is a
   read-only report, not a migration, and must never be judged as one. */
const GENERATED = new Set(["check_what_i_ran.sql"]);
const kindOf = (file) =>
  GENERATED.has(file) ? "generated"
  : DESIGN_ONLY.has(file) ? "design"
  : /_test\.sql$/.test(file) ? "test"
  : /_undo\.sql$/.test(file) ? "undo"
  : /^seed_/.test(file) ? "seed"
  : "migration";

/* ------------------------------------------------------------------ parsing */

/* Comments first, or the examples inside them get read as real statements. */
function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ") // /* … */
    .replace(/--[^\n]*/g, " "); // -- to end of line
}

const RX = {
  table: /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi,
  view: /\bcreate\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi,
  func: /\bcreate\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?(\w+)"?\s*\(/gi,
  /* "add column x" and the shorter "add x" both count. Only the first action of
     a multi-action ALTER is seen; nothing in db/ writes one, and a comma list
     would need a real parser to split safely. */
  column:
    /\balter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?(\w+)"?\s+add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?"?(\w+)"?/gi,
  /* A table this file points a foreign key at has to exist before it runs. */
  references: /\breferences\s+(?:public\.)?"?(\w+)"?/gi,
  /* Policies are not all on public tables — varsity_videos.sql puts four on
     storage.objects, so the schema has to be carried through or that file would
     report as half-run forever. */
  policy: /\bcreate\s+policy\s+"?([^"\n]+?)"?\s+on\s+(?:"?(\w+)"?\.)?"?(\w+)"?/gi,
  rls: /\balter\s+table\s+(?:public\.)?"?(\w+)"?\s+enable\s+row\s+level\s+security/gi,
};

function matchAll(sql, rx) {
  const out = [];
  rx.lastIndex = 0;
  for (let m; (m = rx.exec(sql)); ) out.push(m.slice(1));
  return out;
}

function parseFile(file) {
  const sql = stripComments(fs.readFileSync(path.join(DB_DIR, file), "utf8"));
  const uniq = (a) => [...new Set(a)];
  return {
    file,
    tables: uniq(matchAll(sql, RX.table).map(([t]) => t)),
    views: uniq(matchAll(sql, RX.view).map(([v]) => v)),
    functions: uniq(matchAll(sql, RX.func).map(([f]) => f)),
    columns: uniq(matchAll(sql, RX.column).map(([t, c]) => `${t}.${c}`)),
    policies: uniq(
      matchAll(sql, RX.policy).map(([p, schema, t]) => `${schema || "public"}.${t}::${p.trim()}`),
    ),
    rlsOn: uniq(matchAll(sql, RX.rls).map(([t]) => t)),
    refs: uniq(matchAll(sql, RX.references).map(([t]) => t)),
    /* The exact "add column" statements, so a partly-run file can be finished
       without re-running the whole thing (see the note under PARTLY RUN). */
    columnSql: columnStatements(sql),
  };
}

/* Pull each "alter table … add column …;" out whole, keyed by table.column. */
function columnStatements(sql) {
  const out = new Map();
  const rx =
    /\balter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?(\w+)"?\s+add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?"?(\w+)"?[^;]*;/gi;
  for (let m; (m = rx.exec(sql)); ) {
    out.set(`${m[1]}.${m[2]}`, m[0].replace(/\s+/g, " ").trim());
  }
  return out;
}

const countOf = (p) =>
  p.tables.length + p.views.length + p.functions.length + p.columns.length + p.policies.length;

/* --------------------------------------------------------------- the project */

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

async function ask(token, query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    },
  );
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} from Supabase:\n${body}`);
  return JSON.parse(body);
}

/* One read of the catalog: everything that exists in the public schema. */
const CATALOG_SQL = `
select 'table' as kind, c.relname as name, c.relrowsecurity::text as extra
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r','p')
union all
select 'view', c.relname, coalesce(array_to_string(c.reloptions, ','), '')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('v','m')
union all
select 'column', c.relname || '.' || a.attname, ''
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid
 where n.nspname = 'public' and c.relkind in ('r','p')
   and a.attnum > 0 and not a.attisdropped
union all
select 'function', p.proname, ''
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
union all
select 'policy', n.nspname || '.' || c.relname || '::' || pol.polname, ''
  from pg_policy pol
  join pg_class c on c.oid = pol.polrelid
  join pg_namespace n on n.oid = c.relnamespace
`;

/* ---------------------------------------------------------------- reporting */

const GREEN = "\x1b[32m", YELLOW = "\x1b[33m", RED = "\x1b[31m";
const DIM = "\x1b[2m", BOLD = "\x1b[1m", OFF = "\x1b[0m";
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

function describe(p) {
  const bits = [];
  if (p.tables.length) bits.push(plural(p.tables.length, "table"));
  if (p.views.length) bits.push(plural(p.views.length, "view"));
  if (p.functions.length) bits.push(plural(p.functions.length, "function"));
  if (p.columns.length) bits.push(plural(p.columns.length, "column"));
  if (p.policies.length) bits.push(plural(p.policies.length, "policy", "policies"));
  return bits.join(", ") || "nothing the catalog can show";
}

/*
  A PATCH MUST NOT BE LISTED BEFORE THE FILE THAT MAKES ITS TABLE. Alphabetical
  order puts patch_announced.sql above varsity_lineups.sql, and running it there
  would just fail. So: a file waits for whichever file creates a table it only
  adds to. Anything left in a cycle (there are none today) keeps its place.
*/
function order(list, creator) {
  const inList = new Set(list.map((p) => p.file));
  const needs = new Map(
    list.map((p) => {
      const own = new Set(p.tables);
      const deps = new Set();
      /* A column reads "table.column"; a policy reads "schema.table::name".
         Foreign keys count too: gym_crowd.sql makes its own table but points at
         public.profiles, so profiles.sql has to have run first. */
      const tables = [
        ...p.columns.map((c) => c.slice(0, c.indexOf("."))),
        ...p.policies.map((pol) => {
          const q = pol.split("::")[0];
          return q.slice(q.indexOf(".") + 1);
        }),
        ...p.refs,
      ];
      for (const table of tables) {
        const from = creator.get(table);
        if (from && from !== p.file && inList.has(from) && !own.has(table)) deps.add(from);
      }
      return [p.file, deps];
    }),
  );

  const out = [];
  const placed = new Set();
  let moved = true;
  while (moved && out.length < list.length) {
    moved = false;
    for (const p of list) {
      if (placed.has(p.file)) continue;
      if ([...needs.get(p.file)].every((d) => placed.has(d))) {
        out.push(p);
        placed.add(p.file);
        moved = true;
      }
    }
  }
  for (const p of list) if (!placed.has(p.file)) out.push(p); // a cycle: leave as found
  return out;
}

/*
  THE SAME CHECK AS ONE SQL QUERY — for the Supabase SQL editor, which is where
  the work actually happens. Everything this script knows about db/ is baked in
  as a list of expected objects, so the query needs no files and no terminal.

  Regenerate it whenever db/ changes:
      node scripts/check-db.mjs --sql > db/check_what_i_ran.sql
*/
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

function toSql(parsed) {
  const expected = [];
  const rls = new Set();
  for (const p of parsed) {
    if (kindOf(p.file) !== "migration") continue;
    for (const t of p.tables) expected.push([p.file, "table", t]);
    for (const v of p.views) expected.push([p.file, "view", v]);
    for (const f of p.functions) expected.push([p.file, "function", f]);
    for (const c of p.columns) expected.push([p.file, "column", c]);
    for (const pol of p.policies) expected.push([p.file, "policy", pol]);
    for (const t of p.rlsOn) rls.add(t);
  }

  const values = expected.map(([f, k, n]) => `    (${q(f)},${q(k)},${q(n)})`).join(",\n");
  const rlsValues = [...rls].map((t) => `    (${q(t)})`).join(",\n");

  return `/*
  WHAT HAVE I RUN, AND WHAT IS LEFT — paste this whole file into the Supabase
  SQL editor and press Run. It only READS; it changes nothing.

  Read the result top to bottom: anything that needs doing is at the top, and
  everything already in place is at the bottom.

  GENERATED FILE — do not edit by hand. It is the same check as
  scripts/check-db.mjs, frozen into one query. Regenerate after changing db/:

      node scripts/check-db.mjs --sql > db/check_what_i_ran.sql

  Covers ${expected.length} objects across the migration files in db/.
  Seeds, undo scripts, schema.sql and the *_test.sql files are left out on
  purpose — none of them has to run for the app to work.
*/
with expected (file, kind, name) as (
  values
${values}
),
expect_rls (tbl) as (
  values
${rlsValues}
),

-- Everything that actually exists right now.
present (kind, name) as (
  select distinct 'table', c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r','p')
  union
  select distinct 'view', c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('v','m')
  union
  select distinct 'column', c.relname || '.' || a.attname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
   where n.nspname = 'public' and c.relkind in ('r','p')
     and a.attnum > 0 and not a.attisdropped
  union
  select distinct 'function', p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
  union
  select distinct 'policy', n.nspname || '.' || c.relname || '::' || pol.polname
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
),

per_file as (
  select e.file,
         count(*) as expects,
         count(p.name) as found,
         string_agg(e.kind || ' ' || e.name, ', ' order by e.kind, e.name)
           filter (where p.name is null) as missing
    from expected e
    left join present p on p.kind = e.kind and p.name = e.name
   group by e.file
),

-- One line per file: run it, finish it, or leave it alone.
files as (
  select case when found = expects then 4 when found = 0 then 2 else 3 end as sort,
         case when found = expects then 'OK — already run'
              when found = 0      then 'RUN THIS'
              else                     'PARTLY RUN — see note'
         end as status,
         file as item,
         case when found = expects
              then expects || ' objects all present'
              else found || ' of ' || expects || ' present · missing: ' || missing
         end as detail
    from per_file
),

-- Row security a file turns on, but the live table has off.
rls_off as (
  select 1 as sort,
         'ROW SECURITY IS OFF' as status,
         r.tbl as item,
         'this table is readable by anyone until its file is re-run' as detail
    from expect_rls r
    join pg_class c on c.relname = r.tbl
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   where c.relkind in ('r','p') and c.relrowsecurity = false
),

-- The match_profiles fix creates no object, so the piles above cannot see it.
-- It is two statements in db/matching.sql, just after the view definition.
security as (
  select 0 as sort,
         'SECURITY — NOT FIXED YET' as status,
         'match_profiles' as item,
         'every signed-in user can read every onboarded profile. Run: alter view '
         || 'public.match_profiles set (security_invoker = on); '
         || 'revoke all on public.match_profiles from anon, authenticated;' as detail
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   where c.relname = 'match_profiles'
     and c.relkind = 'v'
     and (
       coalesce(array_to_string(c.reloptions, ','), '') not like '%security_invoker=%'
       or (
         exists (select 1 from pg_roles where rolname = 'authenticated')
         and has_table_privilege('authenticated', c.oid, 'select')
       )
     )
)

select status, item, detail
  from (
    select * from security
    union all select * from rls_off
    union all select * from files
  ) all_rows
 order by sort, item;
`;
}

function main() {
  const offline = process.argv.includes("--offline");
  if (process.argv.includes("--sql")) {
    const files = fs.readdirSync(DB_DIR).filter((f) => f.endsWith(".sql")).sort();
    process.stdout.write(toSql(files.map(parseFile)));
    return;
  }
  const files = fs
    .readdirSync(DB_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const parsed = files.map(parseFile);

  console.log(`\n${BOLD}UNIsport — what has been run in the database${OFF}`);
  console.log(`${DIM}${files.length} files in ${DB_DIR}/  ·  project ${PROJECT_REF}${OFF}\n`);

  if (offline) {
    for (const p of parsed) {
      const kind = kindOf(p.file);
      const tag = kind === "migration" ? "" : `  (${kind})`;
      console.log(`  ${p.file.padEnd(38)} ${describe(p)}${DIM}${tag}${OFF}`);
    }
    console.log(`\n${DIM}Offline: nothing was asked of the database.${OFF}\n`);
    return;
  }

  const token = tokenFromEnvFile();
  if (!token) {
    console.error(
      `${RED}No SUPABASE_ACCESS_TOKEN found.${OFF}\n\n` +
        `Add one to .env.local (the file is gitignored, so it stays on this machine):\n\n` +
        `    SUPABASE_ACCESS_TOKEN=sbp_…\n\n` +
        `Generate it at https://supabase.com/dashboard/account/tokens\n` +
        `Or run \`node scripts/check-db.mjs --offline\` to see what each file expects\n` +
        `without touching the database.\n`,
    );
    process.exit(1);
  }
  return report(token, parsed);
}

async function report(token, parsed) {
  let rows;
  try {
    rows = await ask(token, CATALOG_SQL);
    /* run-sql.mjs guards this too: a 200 can still carry something that is not
       a list of rows, and walking it would die as a stack trace. */
    if (!Array.isArray(rows)) {
      throw new Error(`Expected rows, got: ${JSON.stringify(rows).slice(0, 300)}`);
    }
  } catch (e) {
    console.error(`${RED}Could not read the database.${OFF}\n${e.message}\n`);
    process.exit(1);
  }

  const live = { table: new Map(), view: new Map(), column: new Set(), function: new Set(), policy: new Set() };
  for (const r of rows) {
    if (r.kind === "table") live.table.set(r.name, r.extra === "true");
    else if (r.kind === "view") live.view.set(r.name, r.extra);
    else live[r.kind].add(r.name);
  }

  const done = [], partial = [], todo = [], unknown = [];
  const seeds = [], undos = [], others = [];
  const warnings = [];

  /* Which file creates which table — so a missing column can name the file that
     has to run first. */
  const creator = new Map();
  for (const p of parsed) {
    if (kindOf(p.file) !== "migration") continue;
    for (const t of p.tables) if (!creator.has(t)) creator.set(t, p.file);
  }

  for (const p of parsed) {
    const kind = kindOf(p.file);
    if (kind === "seed") { seeds.push(p); continue; }
    if (kind === "undo") { undos.push(p); continue; }
    if (kind === "design" || kind === "test" || kind === "generated") {
      others.push({ ...p, kind });
      continue;
    }

    /* A migration the catalog cannot speak for — a one-off UPDATE, say. */
    if (countOf(p) === 0) { unknown.push(p); continue; }

    const missing = [];
    for (const t of p.tables) if (!live.table.has(t)) missing.push(`table ${t}`);
    for (const v of p.views) if (!live.view.has(v)) missing.push(`view ${v}`);
    for (const f of p.functions) if (!live.function.has(f)) missing.push(`function ${f}()`);
    for (const c of p.columns) {
      if (live.column.has(c)) continue;
      const table = c.slice(0, c.indexOf("."));
      const first = !live.table.has(table) && creator.get(table) && creator.get(table) !== p.file
        ? ` ${DIM}(needs ${creator.get(table)} first)${OFF}`
        : "";
      missing.push(`column ${c}${first}`);
    }
    for (const pol of p.policies) if (!live.policy.has(pol)) missing.push(`policy ${pol.replace("::", " → ")}`);

    const total = countOf(p);
    const entry = { ...p, missing, total };
    if (missing.length === 0) done.push(entry);
    else if (missing.length === total) todo.push(entry);
    else partial.push(entry);

    /* Row security the file turns on, but the live table has off. */
    for (const t of p.rlsOn) {
      if (live.table.has(t) && live.table.get(t) === false) {
        warnings.push(`${t} exists but row-level security is OFF — ${p.file} turns it on`);
      }
    }
  }

  /* The match_profiles fix is a security change, not a new object, so the piles
     above cannot see it. Check it on its own terms. */
  const mp = live.view.get("match_profiles");
  if (mp !== undefined) {
    if (!/security_invoker=(true|on)/i.test(mp)) {
      warnings.push(
        "match_profiles still runs with its OWNER's rights. Any signed-in user " +
          "can read every onboarded profile until this runs — the two statements " +
          "just after the view definition in db/matching.sql:\n" +
          "      alter view public.match_profiles set (security_invoker = on);\n" +
          "      revoke all on public.match_profiles from anon, authenticated;",
      );
    }
    try {
      const g = await ask(
        token,
        `select has_table_privilege('authenticated','public.match_profiles','select') as can`,
      );
      if (g?.[0]?.can === true) {
        warnings.push(
          "match_profiles is still readable by signed-in users — run the revoke at " +
            "the view definition in db/matching.sql:\n" +
            "      revoke all on public.match_profiles from anon, authenticated;",
        );
      }
    } catch {
      /* the role may not exist on a local copy; the reloptions check is the important one */
    }
  }

  /*
    RE-RUNNING A PARTLY-RUN FILE IS NOT SAFE, and saying otherwise would be the
    worst thing this script could do. run-sql.mjs posts the whole file as ONE
    query, so Postgres wraps it in a single implicit transaction: the first
    `create policy` that already exists (nine files in db/ create policies with
    no `drop policy if exists` first) aborts the lot and rolls back the very
    column the re-run was for. The file looks like it ran; nothing changed.

    So for these, print the missing pieces to run on their own.
  */
  const partialAdvice = (list) => {
    console.log(`${YELLOW}  Do not simply re-run a file above.${OFF}`);
    console.log(
      `${DIM}  The whole file is sent as one statement, so a policy that already exists\n` +
        `  stops it and undoes everything in it — including the part you need.\n` +
        `  Run just the missing pieces instead:${OFF}\n`,
    );
    let printed = 0;
    for (const p of list) {
      const stmts = [...p.columns]
        .filter((c) => p.missing.some((m) => m.startsWith(`column ${c}`)))
        .map((c) => p.columnSql.get(c))
        .filter(Boolean);
      if (!stmts.length) continue;
      console.log(`  ${DIM}from ${p.file}:${OFF}`);
      for (const s of stmts) console.log(`    node scripts/run-sql.mjs ${JSON.stringify(s)}`);
      printed += stmts.length;
    }
    const others = list.filter((p) =>
      p.missing.some((m) => !m.startsWith("column ")),
    );
    if (others.length) {
      console.log(
        `\n${DIM}  ${others.map((p) => p.file).join(", ")} also ${others.length === 1 ? "has" : "have"} a missing\n` +
          `  view, function or policy. Open the file and run those statements in the\n` +
          `  Supabase SQL editor — a function is safe (they are all "create or\n` +
          `  replace"), and a policy needs its "drop policy if exists" line first.${OFF}`,
      );
    }
    if (!printed && !others.length) console.log(`${DIM}  (nothing to print)${OFF}`);
    console.log("");
  };

  const show = (title, list, color, note) => {
    if (!list.length) return;
    console.log(`${color}${BOLD}${title} (${list.length})${OFF}`);
    if (note) console.log(`${DIM}  ${note}${OFF}`);
    for (const p of list) {
      console.log(`  ${p.file.padEnd(36)} ${DIM}${describe(p)}${OFF}`);
      if (p.missing?.length) {
        const head = p.missing.slice(0, 6).join(", ");
        const rest = p.missing.length > 6 ? `, +${p.missing.length - 6} more` : "";
        console.log(`      ${YELLOW}missing:${OFF} ${head}${rest}`);
      }
    }
    console.log("");
  };

  show("ALREADY RUN", done, GREEN, "everything these files create is in the database");
  show(
    "PARTLY RUN", partial, YELLOW,
    "some of this landed — read the note below before re-running one of these",
  );
  if (partial.length) partialAdvice(partial);
  show("STILL TO RUN", todo, RED, "nothing from these files is in the database yet");
  show(
    "CANNOT BE CHECKED", unknown, DIM,
    "these only change existing rows, so the catalog cannot say — re-run if unsure, they are safe",
  );
  show(
    "SEEDS — demo rows, not structure", seeds, DIM,
    "not needed for the app to work; run one when a screen looks empty",
  );
  show("UNDO — removes demo rows again", undos, DIM, "only run these to clear a seed");
  show("NOT MIGRATIONS", others, DIM, "a planning file and hand-run test queries — leave them alone");

  if (warnings.length) {
    console.log(`${RED}${BOLD}NEEDS ATTENTION (${warnings.length})${OFF}`);
    for (const w of warnings) console.log(`  ${RED}!${OFF} ${w}`);
    console.log("");
  }

  /* Only the files with NOTHING in the database yet. A partly-run file must not
     be in a paste-this block — see partialAdvice above for why. */
  const left = order(todo, creator);
  if (left.length) {
    console.log(`${BOLD}Copy and paste this to run what is left, in this order:${OFF}\n`);
    for (const p of left) console.log(`node scripts/run-sql.mjs ${DB_DIR}/${p.file}`);
    console.log("");
    console.log(
      `${DIM}The order matters: a file that adds a column or points a foreign key at\n` +
        `another file's table comes after it. These have not been run at all, so\n` +
        `each should go through cleanly — if one reports "already exists", it had\n` +
        `been run after all, and the next check will move it up into ALREADY RUN.${OFF}\n`,
    );
  } else if (!partial.length) {
    console.log(`${GREEN}${BOLD}Nothing left to run — the database has everything db/ describes.${OFF}\n`);
  }

  console.log(
    `${DIM}One limit worth knowing: a function is matched by name only, so if its\n` +
      `arguments changed since it was last run (db/matching.sql has rewritten a\n` +
      `few), this script still counts it as present. If an app screen reports a\n` +
      `missing function while everything here looks green, re-run that file — a\n` +
      `function is always "create or replace", so that is safe.${OFF}\n`,
  );
}

/* Awaited, so a failure inside report() prints its message instead of an
   unhandled-rejection stack trace. */
await main();
