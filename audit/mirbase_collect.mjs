import { chromium } from 'playwright'; import fs from 'node:fs';
const names = JSON.parse(fs.readFileSync('/work/out/mir_names.json'));
const b = await chromium.launch(); const ctx = await b.newContext();
await ctx.addInitScript(() => { try { localStorage.setItem('alsmir-analytics-consent', 'denied'); } catch {} });
const out = {}; const pages = await Promise.all([0,1,2,3].map(() => ctx.newPage()));
let i = 0;
await Promise.all(pages.map(async (p) => { while (i < names.length) { const n = names[i++];
  await p.goto(process.env.BASE + '/database/mirnas/' + encodeURIComponent(n), { waitUntil: 'networkidle' });
  await p.locator('h1').first().waitFor();
  out[n] = await p.$$eval('main a[data-mirbase]', as => as.map(a => ({ acc: a.dataset.mirbase, href: a.href, text: a.textContent.trim() })));
}}));
await p0(); async function p0() {}
const lp = pages[0]; await lp.goto(process.env.BASE + '/database/mirnas', { waitUntil: 'networkidle' });
out.__cards = await lp.$$eval('a[data-mirbase]', as => as.length);
fs.writeFileSync('/work/out/mirbase_site.json', JSON.stringify(out)); console.log('pages checked', Object.keys(out).length - 1);
await b.close();
