import { chromium } from 'playwright'; import fs from 'node:fs';
// Tissue Explorer (rule of 6 Oct 2026): for each direction, every page of the matrix with "All biospecimens".
const B = process.env.BASE + '/database/network';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.addInitScript(() => { try { localStorage.setItem('alsmir-analytics-consent', 'denied'); } catch {} });
await p.goto(B, { waitUntil: 'networkidle' });
const out = { matrix: {}, combos: {}, mixedText: false };
for (const dir of ['up', 'down', 'none']) {
  await p.locator(`[role="radio"][data-dir="${dir}"]`).click(); await p.waitForTimeout(300);
  const rows = []; const countText = await p.locator('[data-testid="matrix-count"]').textContent();
  for (let guard = 0; guard < 200; guard++) {
    rows.push(...await p.$$eval('tr[data-mirna]', trs => trs.map(tr => ({ mirna: tr.dataset.mirna,
      cells: Object.fromEntries([...tr.querySelectorAll('td[data-tissue]')].map(td => [td.dataset.tissue, td.textContent.trim()])) }))));
    const next = p.getByRole('button', { name: 'Next page' });
    if (!(await next.count()) || await next.isDisabled()) break;
    await next.click(); await p.waitForTimeout(100);
  }
  out.matrix[dir] = { countText, rows };
}
out.mixedText = /Mixed/.test(await p.locator('main').innerText());
// "Shared across tissues" is hidden (curators, 9 Oct 2026): the old URL must show only the matrix.
await p.goto(B + '?view=overlap', { waitUntil: 'networkidle' });
const mainText = await p.locator('main').innerText();
out.overlapHidden = (await p.locator('[data-testid="tissue-overlap"], [data-combo]').count()) === 0 && !/Shared across tissues/.test(mainText);
out.missingSentence = /A missing record does not mean/.test(mainText);
out.mixedText = out.mixedText || /Mixed/.test(mainText);
fs.writeFileSync('/work/out/explorer_site.json', JSON.stringify(out));
console.log('rows', Object.values(out.matrix).map(m => m.rows.length).join('/'), 'overlap hidden', out.overlapHidden);
await b.close();
