// Observe the site only through a real browser. Writes out/site.json, out/evidence.csv
import { chromium } from 'playwright';
import fs from 'fs';
const B = process.env.BASE || 'http://confs-alsmir_site-1:3100';
const truth = JSON.parse(fs.readFileSync('out/truth.json', 'utf8'));
const site = { pages: {}, texts: {}, hidden: {} };
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
async function go(p, url) {
  await p.goto(B + url, { waitUntil: 'networkidle' });
  await p.waitForSelector('main', { timeout: 30000 });
  await p.waitForTimeout(300);
}
async function grabText(p, key) {
  site.texts[key] = (site.texts[key] || '') + '\n' + await p.innerText('body');
  site.hidden[key] = (site.hidden[key] || '') + '\n' + await p.evaluate(() => document.body.textContent);
}

// ---------- static pages
for (const url of ['/', '/database', '/about', '/contact', '/database/curation', '/database/network']) {
  await go(page, url); await page.waitForTimeout(1500);
  await grabText(page, url);
  site.pages[url] = await page.innerText('body');
}
// home "By the numbers": label -> preceding number
await go(page, '/');
site.home = await page.evaluate(() => {
  const out = {};
  for (const lab of ['Evidence records', 'miRNA species', 'Studies included', 'Biospecimens covered']) {
    const el = [...document.querySelectorAll('body *')].find(e => e.children.length === 0 && e.textContent.trim() === lab);
    if (!el) { out[lab] = null; continue; }
    let c = el.parentElement; out[lab] = c.innerText.replace(lab, '').trim();
  }
  return out;
});
log('home', JSON.stringify(site.home));

// ---------- evidence: CSV download
await go(page, '/database/evidence');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download CSV' }).click()]);
await dl.saveAs('out/evidence.csv');
site.csvName = dl.suggestedFilename();
log('csv saved', site.csvName);

// ---------- evidence table: every page, every row expanded
async function readTable(p, keyForText, expand) {
  const rows = [];
  let pageNo = 0;
  while (true) {
    pageNo++;
    const ids = await p.$$eval('table[data-testid="evidence-table"] tbody tr[data-result-id]', t => t.map(e => e.dataset.resultId));
    for (let i = 0; i < ids.length; i++) {
      const tr = p.locator('table[data-testid="evidence-table"] tbody tr[data-result-id]').nth(i);
      const cells = await tr.evaluate(e => [...e.children].map(td => ({ text: td.innerText, raw: td.textContent, href: td.querySelector('a')?.getAttribute('href') || null })));
      const rec = { id: ids[i], page: pageNo, cells };
      if (expand) {
        await tr.click();
        const panel = await tr.evaluate(e => {
          const n = e.nextElementSibling;
          if (!n || n.hasAttribute('data-result-id')) return null;
          return [...n.querySelectorAll('section')].map(s => ({
            heading: s.querySelector('h4,h3,h5')?.innerText || null,
            text: s.innerText,
            fields: [...s.querySelectorAll('dd[data-field]')].map(d => ({ key: d.dataset.field, label: d.previousElementSibling && d.previousElementSibling.tagName === 'DT' ? d.previousElementSibling.textContent : null, text: d.innerText, raw: d.textContent })),
          }));
        });
        rec.panel = panel;
        if (keyForText) { site.texts[keyForText] += '\n' + (await tr.evaluate(e => e.nextElementSibling?.innerText || '')); site.hidden[keyForText] += '\n' + (await tr.evaluate(e => e.nextElementSibling?.textContent || '')); }
        await tr.click();
      }
      rows.push(rec);
    }
    const info = await p.evaluate(() => {
      const s = [...document.querySelectorAll('span,div,p')].find(e => /^Showing \d+-\d+ of \d+ records$/.test(e.textContent.trim()));
      if (!s) return null;
      const btns = [...s.parentElement.querySelectorAll('button')];
      return { text: s.textContent.trim(), nextDisabled: btns.length ? btns[btns.length - 1].disabled : true };
    });
    if (!info || info.nextDisabled) { rows.footer = info; break; }
    const first = ids[0];
    await p.evaluate(() => {
      const s = [...document.querySelectorAll('span,div,p')].find(e => /^Showing \d+-\d+ of \d+ records$/.test(e.textContent.trim()));
      const btns = [...s.parentElement.querySelectorAll('button')]; btns[btns.length - 1].click();
    });
    await p.waitForFunction(f => document.querySelector('table[data-testid="evidence-table"] tbody tr[data-result-id]')?.dataset.resultId !== f, first);
  }
  return rows;
}
await go(page, '/database/evidence');
await grabText(page, '/database/evidence');
site.evidenceHeader = await page.$$eval('table[data-testid="evidence-table"] thead th', t => t.map(e => e.innerText));
site.evidenceShowing = await page.evaluate(() => [...document.querySelectorAll('*')].map(e => e.textContent.trim()).find(t => /^Showing \d+ of \d+$/.test(t)) || null);
site.evidence = await readTable(page, '/database/evidence', true);
log('evidence rows', site.evidence.length);

// ---------- miRNA list
await go(page, '/database/mirnas');
await grabText(page, '/database/mirnas');
site.mirnaHeader = await page.innerText('main header');
site.mirnaCards = []; site.mirnaPages = [];
while (true) {
  const pg = await page.evaluate(() => [...document.querySelectorAll('main *')].map(e => e.textContent.trim()).find(t => /^Page \d+ of \d+ · \d+ miRNAs$/.test(t)) || null);
  site.mirnaPages.push(pg);
  const cards = await page.evaluate(() => [...document.querySelectorAll('main a')].filter(a => a.textContent.trim().startsWith('View details')).map(a => {
    const card = a.parentElement; const nm = card.querySelector('a');
    const m = card.innerText.match(/(\d+)\s*\n?\s*publications?/);
    return { name: nm.textContent, href: nm.getAttribute('href'), pubs: m ? m[1] : null, text: card.innerText, counts: card.querySelector('[data-testid="result-counts"]')?.textContent ?? null };
  }));
  site.mirnaCards.push(...cards);
  site.texts['/database/mirnas'] += '\n' + await page.innerText('main');
  const next = page.locator('main button', { hasText: /^\s*Next\s*$/ });
  if (!(await next.count()) || await next.isDisabled()) break;
  const first = cards[0]?.name;
  await next.click();
  await page.waitForFunction(f => { const a = [...document.querySelectorAll('main a')].find(a => a.textContent.trim().startsWith('View details')); return a && a.parentElement.querySelector('a').textContent !== f; }, first);
}
site.mirnaCountText = await page.evaluate(() => [...document.querySelectorAll('span')].map(e => e.textContent.trim()).find(t => /^\d+ of \d+ miRNAs$/.test(t)) || null);
log('mirna cards', site.mirnaCards.length);

// ---------- biospecimens, stats
await go(page, '/database/biospecimens'); await grabText(page, '/database/biospecimens');
site.bio = await page.$$eval('main a[href^="/database/evidence?biospecimen="]', as => as.map(a => ({ href: a.getAttribute('href'), h3: a.querySelector('h3')?.textContent, p: a.querySelector('p')?.textContent, big: a.querySelector('[data-testid="species-count"] span')?.textContent })));
await go(page, '/database/stats'); await page.waitForTimeout(1500); await grabText(page, '/database/stats');
site.stats = await page.$$eval('table[data-chart]', ts => ts.map(t => ({ chart: t.dataset.chart, rows: [...t.querySelectorAll('tr')].map(r => ({ th: r.querySelector('th')?.textContent, tds: [...r.querySelectorAll('td')].map(d => ({ col: d.dataset.col || null, v: d.textContent })) })) })));
site.statsSubtitles = await page.$$eval('main h3 + p', ps => ps.map(p => p.textContent));
// Heatmap (8 Oct 2026): default view, then every "Sort by" option with "Show 50".
const readHeatmap = () => page.evaluate(() => {
  const root = document.querySelector('[data-testid="outcome-heatmap"]');
  if (!root) return null;
  return {
    sort: root.dataset.sort, limit: root.dataset.limit,
    subtitle: root.querySelector('text[data-subtitle]')?.textContent ?? null,
    scaleMax: root.querySelector('rect[data-scale-max]')?.getAttribute('data-scale-max') ?? null,
    text: [...root.querySelectorAll('svg[role="img"] text')].map(t => t.textContent).join(' '),
    flagged: root.querySelector('[data-testid="heatmap-flagged"]')?.textContent ?? null,
    rows: [...root.querySelectorAll('g[data-mirna]')].map(g => [g.dataset.mirna,
      ...['up', 'down', 'none', 'total'].map(k => g.querySelector(`g[data-outcome="${k}"] text`)?.textContent ?? null)]),
  };
});
site.heatmap = { default: await readHeatmap(), sorts: {} };
const pickOpt = async (label, option) => {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await page.waitForTimeout(200);
};
await pickOpt('Show', '50');
for (const [key, label] of [['up', 'Increased expression (↑)'], ['down', 'Decreased expression (↓)'],
  ['none', 'No statistically significant difference (=)'], ['total', 'Total distinct publications']]) {
  await pickOpt('Sort by', label);
  site.heatmap.sorts[key] = await readHeatmap();
}
fs.writeFileSync('out/site.json', JSON.stringify(site));

// ---------- every miRNA detail page (parallel workers)
const names = Object.keys(truth.mir);
site.detail = {};
let idx = 0;
async function worker() {
  const p = await ctx.newPage();
  while (idx < names.length) {
    const name = names[idx++];
    const url = '/database/mirnas/' + encodeURIComponent(name);
    try {
      await go(p, url);
      await p.waitForSelector('table[data-testid="evidence-table"], h1', { timeout: 20000 });
      const d = await p.evaluate(() => {
        const out = { h1: document.querySelector('main h1')?.textContent ?? null, stats: {}, counts: document.querySelector('main [data-testid="result-counts"]')?.textContent ?? null };
        for (const lab of ['results', 'publications', 'tissues', 'replicated in 2+ publications (calculated)']) {
          const alt = lab === 'publications' ? 'publication' : lab; // singular label when the count is 1
          const el = [...document.querySelectorAll('main div')].find(e => e.children.length === 0 && (e.textContent.trim() === lab || e.textContent.trim() === alt));
          out.stats[lab] = el ? el.previousElementSibling?.textContent ?? null : null;
        }
        return out;
      });
      const rows = await readTable(p, null, false);
      d.ids = rows.map(r => r.id); d.footer = rows.footer;
      d.text = await p.innerText('body'); d.hidden = await p.evaluate(() => document.body.textContent);
      site.detail[name] = d;
    } catch (e) { site.detail[name] = { error: String(e) }; }
    if (idx % 100 === 0) log('detail', idx);
  }
  await p.close();
}
await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
log('details done', Object.keys(site.detail).length);
fs.writeFileSync('out/site.json', JSON.stringify(site));
await browser.close();
