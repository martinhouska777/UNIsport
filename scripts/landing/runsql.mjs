import fs from 'fs';
const ref = 'wavxyrgtaotrhnyepyor';
const token = process.env.SBP;
const arg = process.argv[2];
const sql = arg.endsWith('.sql') ? fs.readFileSync(arg, 'utf8') : arg;
const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const text = await r.text();
console.log('HTTP', r.status);
console.log(text.slice(0, 4000));
