"""Compare out/truth.json (from Excel) with out/site.json + out/evidence.csv (from browser)."""
import json, re, collections, sys
T = json.load(open('out/truth.json', encoding='utf-8'))
S = json.load(open('out/site.json', encoding='utf-8')); S.setdefault('detail', {})
MM = collections.defaultdict(list); N = collections.Counter(); INFO = []
def chk(check, ok, loc, exp, act):
    N[check] += 1
    if not ok: MM[check].append(f'{loc}: expected {exp!r} actual {act!r}')
def norm(s): return re.sub(r'\s+', ' ', s or '').strip()
res, coh, pub, link = T['results'], T['cohorts'], T['pubs'], T['link']
coh_by_row = {c['row']: c for c in coh}; pub_by_row = {p['row']: p for p in pub}
mir = T['mir']
EMPTY22 = [''] * 22; EMPTY6 = [''] * 6

# ======================= A. CSV
raw = open('out/evidence.csv', 'rb').read()
chk('A', raw.startswith(b'\xef\xbb\xbf'), 'CSV BOM', 'EF BB BF', raw[:3])
txt = raw.decode('utf-8')
if txt.startswith('﻿'): txt = txt[1:]
def parse_strict(t):
    recs, rec, i, n, problems = [], [], 0, len(t), []
    while i < n:
        if t[i] != '"':
            j = i
            while j < n and t[j] not in ',\r\n': j += 1
            problems.append(f'unquoted field at char {i}: {t[i:j]!r}'); rec.append(t[i:j]); i = j
        else:
            i += 1; buf = []
            while True:
                if i >= n: problems.append('unterminated quote'); break
                if t[i] == '"':
                    if i + 1 < n and t[i + 1] == '"': buf.append('"'); i += 2; continue
                    i += 1; break
                buf.append(t[i]); i += 1
            rec.append(''.join(buf))
        if i >= n: recs.append(rec); break
        if t[i] == ',': i += 1; continue
        if t.startswith('\r\n', i): recs.append(rec); rec = []; i += 2; continue
        if t[i] == '\n': problems.append(f'bare LF record end at char {i}'); recs.append(rec); rec = []; i += 1; continue
        problems.append(f'unexpected char {t[i]!r} at {i}'); i += 1
    return recs, problems
recs, probs = parse_strict(txt)
chk('A', not probs, 'CSV format (quoting/CRLF)', [], probs[:20])
INFO.append(f'CSV: {len(raw)} bytes, {len(recs)} records incl header, ends with CRLF: {txt.endswith(chr(13)+chr(10))}, filename {S.get("csvName")!r}')
hdr = recs[0]; body = [r for r in recs[1:] if r != ['']]
exp_hdr = list(T['res_hdr'])
for h in T['coh_hdr']:
    nm = h['name'] + (f' – {h["sub"]}' if h['sub'] else '')
    exp_hdr.append('Cohort: ' + ('Control ' if h['group'] == 'CONTROL PATIENTS' else '') + nm)
exp_hdr += ['Publication: ' + h for h in T['pub_hdr']] + ['Replicated (calculated)', 'Evidence count (calculated)']
chk('A', len(hdr) == len(exp_hdr), 'CSV header column count', len(exp_hdr), len(hdr))
for i, (e, a) in enumerate(zip(exp_hdr, hdr)):
    chk('A', norm(e) == norm(a), f'CSV header col {i+1}', e, a)
    if e != a and norm(e) == norm(a): INFO.append(f'CSV header col {i+1} differs only in whitespace: excel {e!r} csv {a!r}')
chk('A', len(body) == len(res), 'CSV data row count', len(res), len(body))
for k, r in enumerate(body):
    if len(r) != len(exp_hdr): chk('A', False, f'CSV data row {k+1} field count', len(exp_hdr), len(r))
csv_ids = [r[0] for r in body]
chk('A', csv_ids == [x['v'][0] for x in res], 'CSV row order == 3.miRNA Excel row order', 'same order', 'differs' if csv_ids != [x['v'][0] for x in res] else 'same order')
seen_coh, seen_pub = set(), set()
for k, (x, l) in enumerate(zip(res, link)):
    if k >= len(body): break
    r = body[k]
    exp = list(x['v']) + (coh_by_row[l['cohort_row']]['v'] if l['cohort_row'] else EMPTY22) + (pub_by_row[l['pub_row']]['v'] if l['pub_row'] else EMPTY6)
    exp += ['yes' if mir[x['v'][1]]['replicated'] else 'no', str(mir[x['v'][1]]['results'])]
    for i, e in enumerate(exp):
        a = r[i] if i < len(r) else None
        if i == 39 and not mir[x['v'][1]]['replicated']:
            chk('A', a in ('no', ''), f'CSV row {k+1} (3.miRNA row {x["row"]}, {x["v"][0]}) col {i+1} [{exp_hdr[i]}]', "'no' or ''", a)
            continue
        sheet = '3.miRNA' if i < 11 else '2.Cohort' if i < 33 else '1.PUB' if i < 39 else 'calc'
        xr = x['row'] if i < 11 else l['cohort_row'] if i < 33 else l['pub_row'] if i < 39 else '-'
        chk('A', a == e, f'CSV row {k+1} ({x["v"][0]}) col {i+1} [{exp_hdr[i]!r}] vs {sheet} row {xr}', e, a)
    if len(r) > 11: seen_coh.add(r[11])
    if len(r) > 33: seen_pub.add(r[33])
# A documented alias row (curators, 8 Oct 2026) is exported under its canonical cohort instead of itself.
ALIASES = {x['alias']: x['canonical'] for x in T.get('alias_conflicts', [])}
for c in coh:
    want = ALIASES.get(c['v'][0], c['v'][0])
    chk('A', want in seen_coh, f'2.Cohort row {c["row"]} appears in CSV (as {want})', want, 'absent' if want not in seen_coh else 'present')
for a_ in ALIASES: chk('A', a_ not in seen_coh, f'alias cohort {a_} is not exported separately', 'absent', 'present' if a_ in seen_coh else 'absent')
for p in pub: chk('A', p['v'][0] in seen_pub, f'1.PUB row {p["row"]} appears in CSV', p['v'][0], 'absent' if p['v'][0] not in seen_pub else 'present')
INFO.append('CSV Replicated values seen: ' + repr(collections.Counter(r[39] for r in body if len(r) > 39)))

# ======================= B. rendered evidence table
RK = ['id', 'microRNA', 'axis', 'typeOfAls', 'alsN', 'kResidentN', 'hcN', 'method', 'tissue', 'authorYear', 'doi']
CK = ['id', 'form', 'diagnosis', 'mutations', 'n', 'sexFemale', 'sexMale', 'onsetBoth', 'onsetUpperLimb', 'onsetLowerLimb', 'onsetSpinalLimb', 'onsetBulbar', 'ageOnset', 'ageStudy', 'onsetToEndpoint', 'alsfrs', 'treatment', 'controlType', 'controlN', 'controlSexFemale', 'controlSexMale', 'controlAgeStudy']
PK = ['id', 'title', 'doi', 'authors', 'year', 'location']
ev = S['evidence']
chk('B', len(ev) == len(res), 'evidence table total rows over all pages', len(res), len(ev))
chk('B', [e['id'] for e in ev] == [x['v'][0] for x in res], 'evidence table row order == Excel order', 'same', 'same' if [e['id'] for e in ev] == [x['v'][0] for x in res] else 'differs')
pages = collections.Counter(e['page'] for e in ev)
INFO.append(f'evidence table: {len(pages)} pages, rows per page {sorted(set(pages.values()))}, footer {ev and S["evidence"] and None}')
ev_by_id = {e['id']: e for e in ev}
coh_labels = []
for h in T['coh_hdr']:
    coh_labels.append(('Control ' if h['group'] == 'CONTROL PATIENTS' else '') + h['name'] + (f' – {h["sub"]}' if h['sub'] else ''))
label_mm = []
def dispv(s): return '—' if s == '' else s
for x, l in zip(res, link):
    e = ev_by_id.get(x['v'][0]); loc = f'/database/evidence row {x["v"][0]} (3.miRNA row {x["row"]})'
    if e is None: chk('B', False, loc, 'row present', 'missing'); continue
    # visible cells
    c = [norm(z['text']) for z in e['cells']]
    v = x['v']; P_ = pub_by_row.get(l['pub_row'])
    exp_cells = {0: v[1], 2: v[3], 3: v[8], 4: v[7], 5: f'{dispv(v[4])} / {dispv(v[6])}', 7: P_['v'][4] if P_ else ''}
    names = {0: 'microRNA', 2: 'Type of ALS', 3: 'Tissue', 4: 'Method', 5: 'ALS (N) / HC (N)', 7: 'Year'}
    for i, ex in exp_cells.items():
        chk('B', c[i] == norm(ex) or (ex == '' and c[i] in ('—', '')), f'{loc} visible cell {names[i]}', norm(ex), c[i])
    axmap = {'↑': 'Up', '↓': 'Down', '=': 'NC'}
    chk('B', c[1] == axmap.get(v[2], v[2]), f'{loc} visible cell AXIS (↑→Up, ↓→Down, =→NC)', axmap.get(v[2], v[2]), c[1])
    chk('B', c[8] == str(mir[v[1]]['results']), f'{loc} visible cell Ev. count', str(mir[v[1]]['results']), c[8])
    href = e['cells'][6]['href'] or ''
    nd = lambda s: re.sub(r'^https?://(dx\.)?doi\.org/', '', re.sub(r'\s+', '', s).lower())
    chk('B', nd(href) == nd(v[10]), f'{loc} DOI link href', v[10], href)
    # panel
    pan = e.get('panel')
    if not pan or len(pan) < 3: chk('B', False, f'{loc} expanded panel', '3 sections', pan); continue
    exp_sets = [(0, RK, v, T['res_hdr'], 'Result'), (1, CK, coh_by_row[l['cohort_row']]['v'] if l['cohort_row'] else EMPTY22, coh_labels, 'Cohort'),
                (2, PK, P_['v'] if P_ else EMPTY6, T['pub_hdr'], 'Publication')]
    for si, keys, vals, labels, sname in exp_sets:
        fields = pan[si]['fields']; fmap = collections.defaultdict(list)
        for f in fields: fmap[f['key']].append(f)
        for ki, key in enumerate(keys):
            ex = vals[ki]
            # Since 5 Oct 2026 DOI and Author (Year) are left out of the miRNA-result section by design
            # (DOI is in the Publication section; both stay in the CSV, which check A verifies).
            if si == 0 and key in ('doi', 'authorYear'):
                chk('B', not fmap[key], f'{loc} panel Result dd[data-field={key}] should not be shown', 'not shown', 'shown')
                continue
            # Since 2 Oct 2026 the panel hides fields whose Excel cell is empty.
            if not fmap[key]:
                chk('B', norm(ex) == '', f'{loc} panel {sname} dd[data-field={key}] hidden but Excel has a value', norm(ex), 'HIDDEN')
                continue
            f = fmap[key].pop(0)
            a = norm(f['text']); exn = norm(ex)
            chk('B', exn != '' and a == exn, f'{loc} panel {sname} dd[data-field={key}] vs Excel col {chr(65+ki)}', exn or '(empty: should be hidden)', a)
            lab = f['label']
            N['B-labels'] += 1
            if norm(lab) != norm(labels[ki]) and not (sname == 'Cohort' and norm(lab) == norm(labels[ki]).replace('Control ', '', 1)):
                label_mm.append((sname, key, labels[ki], lab))
        heading = pan[si]['heading'] or ''
        # Since 5 Oct 2026 headings are fixed names (no Excel row numbers).
        exp_h = ('miRNA result', 'Cohort Level', 'Publication Level')[si]
        chk('B', norm(heading).lower() == exp_h.lower(), f'{loc} panel {sname} heading', exp_h, heading)
    if not l['cohort_row']:
        msg = "No row in 2.Cohort matches this result's cohort ID."
        chk('B', msg in norm(pan[1]['text']), f'{loc} cohort section message (cohort {l["cohort_id"]} missing)', msg, pan[1]['text'][:300])
lab_c = collections.Counter(label_mm)
for (sname, key, exl, sl), cnt in lab_c.items():
    MM['B-labels'].append(f'panel {sname} dt label for dd[data-field={key}] (on {cnt} rows): expected {exl!r} actual {sl!r}')

# ======================= C. numbers
H = T['home']; h = S['home']
for lab, k in [('Evidence records', 'records'), ('miRNA species', 'species'), ('Studies included', 'studies'), ('Biospecimens covered', 'biospecimens')]:
    chk('C', (h.get(lab) or '').replace(',', '') == str(H[k]), f'/ By the numbers "{lab}"', str(H[k]), h.get(lab))
rd = f'{(H["records"] // 100) * 100:,}+'
for url in ['/', '/about']:  # /database no longer quotes counts (5 Oct 2026)
    found = re.findall(r'\d{1,3}(?:,\d{3})*\+', S['pages'][url])
    chk('C', bool(found), f'{url} has "N,N00+" text', rd, found)
    for f in found: chk('C', f == rd, f'{url} "N,N00+" text', rd, f)
# Since 5 Oct 2026 the /database and /database/mirnas descriptions quote no counts.
chk('C', S['mirnaCountText'] == f'{H["species"]} of {H["species"]} miRNAs', '/database/mirnas "N of N miRNAs"', f'{H["species"]} of {H["species"]} miRNAs', S['mirnaCountText'])
INFO.append(f'/database/mirnas pages visited: {len(S.get("mirnaPages", []))}; first/last pager text: {S.get("mirnaPages", [None])[0]!r} / {S.get("mirnaPages", [None])[-1]!r}')
cards = collections.defaultdict(list)
for cd in S['mirnaCards']: cards[cd['name']].append(cd)
chk('C', len(S['mirnaCards']) == len(mir), '/database/mirnas number of cards', len(mir), len(S['mirnaCards']))
for name, d in mir.items():
    cl = cards.get(name, [])
    chk('C', len(cl) == 1, f'/database/mirnas card for {name!r} present once', 1, len(cl))
    if cl: chk('C', cl[0]['pubs'] == str(d['pubs']), f'/database/mirnas card {name!r} publications', str(d['pubs']), cl[0]['pubs'])
    counts = f"↑ Up: {d['res_up']} · ↓ Down: {d['res_down']} · NC: {d['res_nc']}"
    if cl: chk('C', norm(cl[0].get('counts')) == counts, f'/database/mirnas card {name!r} result counts', counts, cl[0].get('counts'))
for name in cards:
    if name not in mir: chk('C', False, f'/database/mirnas card {name!r}', 'no such microRNA in Excel', 'card present')
for name, d in mir.items():
    sd = S['detail'].get(name); loc = f'/database/mirnas/{name}'
    if not sd or 'error' in sd: chk('C', False, loc, 'page loads', sd and sd.get('error')); continue
    chk('C', sd['h1'] == name, f'{loc} h1', name, sd['h1'])
    counts = f"↑ Up: {d['res_up']} · ↓ Down: {d['res_down']} · NC: {d['res_nc']}"
    chk('C', norm(sd.get('counts')) == counts, f'{loc} result counts', counts, sd.get('counts'))
    st = sd['stats']
    chk('C', st.get('results') == str(d['results']), f'{loc} results', str(d['results']), st.get('results'))
    chk('C', st.get('publications') == str(d['pubs']), f'{loc} publications', str(d['pubs']), st.get('publications'))
    chk('C', st.get('tissues') == str(d['tissues']), f'{loc} tissues', str(d['tissues']), st.get('tissues'))
    rp = 'Yes' if d['replicated'] else 'No'
    chk('C', st.get('replicated in 2+ publications (calculated)') == rp, f'{loc} replicated', rp, st.get('replicated in 2+ publications (calculated)'))
    chk('C', sd['ids'] == d['result_ids'] or sorted(sd['ids']) == sorted(d['result_ids']), f'{loc} evidence table result IDs', d['result_ids'], sd['ids'])
bio = {b['h3']: b for b in S['bio']}
chk('C', len(S['bio']) == len(T['tissues']), '/database/biospecimens number of cards', len(T['tissues']), len(S['bio']))
for t, d in T['tissues'].items():
    b = bio.get(t)
    exp = f'{d["results"]} result{"s" if d["results"] != 1 else ""} · {d["pubs"]} publication{"s" if d["pubs"] != 1 else ""}'
    chk('C', b is not None and norm(b['p']) == exp, f'/database/biospecimens card {t!r}', exp, b and b['p'])
    if b: chk('C', b['big'] == str(d['mirnas']), f'/database/biospecimens card {t!r} big number = distinct miRNAs', str(d['mirnas']), b['big'])
for t in bio:
    if t not in T['tissues']: chk('C', False, f'/database/biospecimens card {t!r}', 'not an Excel tissue', 'present')
ST = T['stats']; charts = {c['chart']: c for c in S['stats']}
def simple(chart): return [(r['th'], r['tds'][0]['v'] if r['tds'] else None) for r in charts[chart]['rows']] if chart in charts else None
got = simple('miRNAs with the most recorded results'); exp = [(n, str(c)) for n, c in ST['Most represented miRNAs']]
chk('C', got is not None and len(got) == len(exp), 'stats Most represented: row count', len(exp), got and len(got))
for i, e in enumerate(exp): chk('C', got and i < len(got) and tuple(got[i]) == e, f'stats Most represented row {i+1}', e, got[i] if got and i < len(got) else None)
# Site chart ids (5 Oct 2026 titles) -> truth keys. Cohort charts: largest first, "Not reported" last.
SITE_CHART = {'Cohort classification (as reported)': 'Form of ALS at Population Level',  # curator display names, unique cohorts
              'Diagnostic criteria and assessment': 'Diagnosis criteria',
              'Site of onset': 'Site of onset', 'Publications included by year': 'Papers published over time'}
for chart, key in SITE_CHART.items():
    got = simple(chart); exp = {k: str(v) for k, v in ST[key].items()}
    if got is None: chk('C', False, f'stats {chart}', 'table present', None); continue
    gd = dict(got)
    chk('C', len(got) == len(gd), f'stats {chart}: duplicate categories', 'none', len(got) - len(gd))
    for k, v in exp.items(): chk('C', gd.get(k) == v, f'stats {chart} [{k!r}]', v, gd.get(k))
    for k in gd:
        if k not in exp: chk('C', False, f'stats {chart} [{k!r}]', 'category absent in Excel', gd[k])
    if chart == 'Publications included by year':
        chk('C', [k for k, _ in got] == list(exp), f'stats {chart} year sequence', list(exp), [k for k, _ in got])
    else:
        # Rule: largest first, "Not reported" last; categories with equal counts may be in any order.
        rank = lambda k: ({'Not reported': 1, 'Not applicable': 2}.get(k, 0), -int(exp[k]))
        seq = [rank(k) for k, _ in got if k in exp]
        chk('C', seq == sorted(seq), f'stats {chart} category order (largest first, Not reported then Not applicable last)', 'ordered', [k for k, _ in got])
    # Second, independent source: the curators' cohort table must give the same numbers as the workbook-derived truth.
    ct = (T.get('curator_cohort_table') or {}).get(key)
    if ct is not None:
        chk('C', {k: str(v) for k, v in ct.items()} == exp, f'stats {chart}: curators\' table = workbook', ct, exp)
        chk('C', {k: str(v) for k, v in ct.items()} == gd, f'stats {chart}: curators\' table = website', ct, gd)
g = charts.get('Geographic distribution of studies')
gd = {r['th']: {t['col']: t['v'] for t in r['tds']} for r in g['rows']} if g else {}
for k, v in ST['Geographic distribution of studies'].items():
    chk('C', gd.get(k, {}).get('publications') == str(v['publications']), f'stats Geographic [{k!r}] publications', str(v['publications']), gd.get(k, {}).get('publications'))
    chk('C', gd.get(k, {}).get('patients') == str(v['patients']), f'stats Geographic [{k!r}] ALS patients', str(v['patients']), gd.get(k, {}).get('patients'))
for k in gd:
    if k not in ST['Geographic distribution of studies']: chk('C', False, f'stats Geographic [{k!r}]', 'country absent in Excel', gd[k])
# Heatmap "Reported miRNA expression outcomes" (8 Oct 2026). Expected counts come from the workbook:
# distinct source publications per outcome; total counted independently. Ranking: chosen column desc,
# then total desc, then name (ties in name order are allowed in any order, incl. at the display cut-off).
HEAT = {h[0]: h[1:] for h in ST['heat']}
IDX = {'up': 0, 'down': 1, 'none': 2, 'total': 3}
LABEL = {'up': 'Increased expression (↑)', 'down': 'Decreased expression (↓)',
         'none': 'No statistically significant difference (=)', 'total': 'Total distinct publications'}
scale_max = max(max(v[0], v[1], v[2]) for v in HEAT.values())
FOOT = ("Counts represent distinct publications per miRNA and expression outcome. Publications reporting different outcomes "
        "may appear in multiple columns; outcome counts may therefore sum to more than the total, which counts each publication "
        "once. Colour indicates publication count, not expression magnitude. Publications may share cohorts and therefore do "
        "not necessarily represent independent replication.")
def check_view(view, key, limit, where):
    if not view: chk('C', False, f'stats heatmap {where}', 'present', None); return
    rows = view['rows']
    chk('C', len(rows) == min(limit, len(HEAT)), f'stats heatmap {where} row count', min(limit, len(HEAT)), len(rows))
    exp_sub = f"Ranked by: {LABEL[key]} · top {min(limit, len(HEAT))} of {len(HEAT)} miRNAs"
    chk('C', view['subtitle'] == exp_sub, f'stats heatmap {where} ranking criterion shown', exp_sub, view['subtitle'])
    chk('C', view.get('scaleMax') == str(scale_max), f'stats heatmap {where} colour scale 0..max of full dataset', str(scale_max), view.get('scaleMax'))
    chk('C', view.get('flagged') is None, f'stats heatmap {where} flagged records', None, view.get('flagged'))
    for r in rows:
        e = HEAT.get(r[0])
        chk('C', e is not None and r[1:] == [str(x) for x in e], f'stats heatmap {where} {r[0]!r} counts (up, down, NC, total)', e, r[1:])
    keys = [(-HEAT[r[0]][IDX[key]], -HEAT[r[0]][3]) for r in rows if r[0] in HEAT]
    chk('C', keys == sorted(keys), f'stats heatmap {where} order (by {key}, then total)', 'sorted', keys[:12])
    full = sorted(HEAT, key=lambda n: (-HEAT[n][IDX[key]], -HEAT[n][3], n))
    if rows:
        last = HEAT.get(rows[-1][0])
        cut = (last[IDX[key]], last[3]) if last else None
        must = [n for n in full if (HEAT[n][IDX[key]], HEAT[n][3]) > cut] if cut else []
        shown = {r[0] for r in rows}
        chk('C', all(n in shown for n in must), f'stats heatmap {where} includes every miRNA ranked above the cut-off', len(must), sum(n in shown for n in must))
    t = re.sub(r'\s+', ' ', view['text'])
    chk('C', FOOT in t, f'stats heatmap {where} footnote (exact text)', 'present', 'missing')
    chk('C', 'Number of distinct publications' in t, f'stats heatmap {where} legend label', 'present', 'missing')
    chk('C', re.search(r'ALSmiR dataset V\d+', t) is not None, f'stats heatmap {where} dataset version', 'present', 'missing')
H = S.get('heatmap') or {}
check_view(H.get('default'), 'total', 10, 'default view (Total, 10)')
for k in IDX:
    check_view((H.get('sorts') or {}).get(k), k, 50, f'sort by {k}, show 50')
INFO.append(f'Heatmap scale maximum expected (full dataset): {scale_max}')
INFO.append(f"Cohort alias (curators): {T.get('alias_conflicts')}; unique cohorts {T['counts']['cohorts']} of {T['counts']['cohort_rows']} rows")
for sub in S.get('statsSubtitles', []):
    m = re.search(r'out of (\d+) cohorts', sub)
    if m: chk('C', m.group(1) == str(T['counts']['cohorts']), f'stats subtitle {sub!r}', str(T['counts']['cohorts']), m.group(1))

# ======================= D. fabricated content
# MIMAT accessions are real miRBase links since 2 Oct 2026; mirbase_compare.py checks each one.
terms = [('Chr ', r'Chr '), ('Mature Sequence', r'(?i)mature sequence'), ('AI Insights', r'(?i)AI Insights'),
         ('PubMed', r'PubMed'), ('case-control', r'(?i)case[- ]control'), ('Stage: mid', r'(?i)Stage:\s*mid'), ('60-74', r'60\s*[-–]\s*74'),
         ('Sex: mixed', r'(?i)Sex:\s*mixed'), ('fold change', r'(?i)fold[- ]?change'), ('p-value', r'(?i)\bp[- ]?values?\b|\bp\s*[<=≤]\s*0?\.\d')]
xl_text = '\n'.join(' '.join(r['v']) for s in (res, coh, pub) for r in s)
srcs = {('visible', k): v for k, v in S['texts'].items()}
srcs.update({('dom-textContent', k): v for k, v in S['hidden'].items()})
for nm, d in S['detail'].items():
    if 'text' in d: srcs[('visible', '/database/mirnas/' + nm)] = d['text']; srcs[('dom-textContent', '/database/mirnas/' + nm)] = d['hidden']
for label, rx in terms:
    in_xl = bool(re.search(rx, xl_text))
    for (kind, url), text in srcs.items():
        N['D'] += 1
        for m in re.finditer(rx, text):
            ctx = text[max(0, m.start() - 60): m.end() + 60].replace('\n', ' ')
            MM['D' if kind == 'visible' else 'D-hidden'].append(f'{url} [{kind}] term {label!r} (term present in Excel: {in_xl}): ...{ctx}...')
# dedupe D lists
for k in ('D', 'D-hidden'): MM[k] = list(dict.fromkeys(MM[k]))

# ======================= report
summary = {k: {'compared': N[k], 'mismatches': len(MM[k])} for k in sorted(set(N) | set(MM))}
json.dump({'summary': summary, 'mismatches': MM, 'info': INFO, 'excel_notes': T['notes']}, open('out/report.json', 'w'), ensure_ascii=False, indent=1)
for k, v in MM.items():
    open(f'out/mismatches_{k}.txt', 'w', encoding='utf-8').write('\n'.join(v) + '\n')
print('SUMMARY'); [print(f'  {k}: compared {v["compared"]}, mismatches {v["mismatches"]}') for k, v in summary.items()]
print('INFO'); [print('  ' + i) for i in INFO]
for k, v in MM.items():
    print(f'==== {k} ({len(v)})')
    for line in v[:200]: print('  ' + line)
