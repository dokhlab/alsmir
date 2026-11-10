"""Derive ground truth ONLY from the Excel workbook (openpyxl). Writes out/truth.json."""
import openpyxl, re, json, os, collections
from decimal import Decimal, ROUND_HALF_UP
XLSX = os.environ.get('XLSX', '/data/2026_TABLE_DATABASE_V04.xlsx')
os.makedirs('out', exist_ok=True)
wb = openpyxl.load_workbook(XLSX)          # formulas not present (checked); values as stored
notes = []

def disp(c):
    """Text Excel displays for the cell."""
    v, f = c.value, c.number_format
    if v is None: return ''
    if isinstance(v, str):
        return v
    if isinstance(v, bool): return 'TRUE' if v else 'FALSE'
    if isinstance(v, (int, float)):
        if f in ('General', '@'):
            if float(v).is_integer(): return str(int(v))
            s = format(float(v), '.10g')       # Excel General: <= ~10 significant digits shown
            if 'e' in s: raise SystemExit(f'sci notation {c.coordinate} {v}')
            return s
        m = re.fullmatch(r'0(?:\.(0+))?%', f)
        if m:
            d = len(m.group(1) or '')
            q = (Decimal(repr(float(v))) * 100).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP)
            return f'{q}%'
        m = re.fullmatch(r'0(?:\.(0+))?', f)
        if m:
            d = len(m.group(1) or '')
            return str(Decimal(repr(float(v))).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP))
        raise SystemExit(f'unhandled number format {f!r} at {c.coordinate}')
    raise SystemExit(f'unhandled type {type(v)} at {c.coordinate}')

def rows(ws, first, ncol):
    out = []
    for r in range(first, ws.max_row + 1):
        cells = [ws.cell(r, c) for c in range(1, ncol + 1)]
        # also make sure nothing lives beyond ncol
        extra = [ws.cell(r, c).value for c in range(ncol + 1, ws.max_column + 1)]
        if any(v is not None for v in extra): notes.append(f'{ws.title} row {r}: data beyond column {ncol}: {extra!r}')
        if all(c.value is None for c in cells): continue
        out.append({'row': r, 'v': [disp(c) for c in cells],
                    'raw': [None if c.value is None else (c.value if isinstance(c.value, (str, int)) else repr(c.value)) for c in cells],
                    'fmt': [c.number_format for c in cells]})
    return out

for ws in wb.worksheets:
    for row in ws.iter_rows():
        for c in row:
            if c.data_type == 'f': notes.append(f'FORMULA {ws.title}!{c.coordinate}')

P, C, M = wb['1.PUB'], wb['2.Cohort'], wb['3.miRNA']
pub_hdr = [P.cell(1, 1).value] + [P.cell(2, c).value for c in range(2, 7)]
pubs = rows(P, 5, 6)
# Cohort headers from 3 header rows; resolve merged cells
def merged_val(ws, r, c):
    for rng in ws.merged_cells.ranges:
        if rng.min_row <= r <= rng.max_row and rng.min_col <= c <= rng.max_col:
            return ws.cell(rng.min_row, rng.min_col).value
    return ws.cell(r, c).value
coh_hdr = []
for c in range(1, 23):
    g, n, s = merged_val(C, 1, c), merged_val(C, 2, c), C.cell(3, c).value
    if c == 1: coh_hdr.append({'group': None, 'name': 'ID', 'sub': None}); continue
    coh_hdr.append({'group': g, 'name': n, 'sub': s if (s is not None and s != n) else None})
cohorts = rows(C, 4, 22)
res_hdr = [M.cell(1, c).value for c in range(1, 12)]
results = rows(M, 2, 11)

def ndoi(s):
    s = re.sub(r'\s+', '', (s or '')).lower()
    return re.sub(r'^https?://(dx\.)?doi\.org/', '', s)

pub_by_id = {}
for p in pubs:
    if p['v'][0] in pub_by_id: notes.append(f'duplicate PUB id {p["v"][0]!r}')
    pub_by_id[p['v'][0]] = p
coh_by_id = {}
for c in cohorts:
    if c['v'][0] in coh_by_id: notes.append(f'duplicate cohort id {c["v"][0]!r}')
    coh_by_id[c['v'][0]] = c
# Curators' rule (8 Oct 2026): PUB0005_C01 is a documented alias of the shared cohort PUB0005_PUB0007_C01
# (13 fALS, used in PUB0005 and PUB0007). Resolve the alias for linking; count the cohort once.
ALIAS = {'PUB0005_C01': 'PUB0005_PUB0007_C01'}
alias_conflicts = []
for a_, c_ in ALIAS.items():
    if a_ in coh_by_id and c_ in coh_by_id:
        diffs = [i for i in range(1, len(coh_by_id[a_]['v'])) if coh_by_id[a_]['v'][i] != coh_by_id[c_]['v'][i]]
        alias_conflicts.append({'alias': a_, 'canonical': c_, 'differing_columns': diffs})
ucohorts = [c for c in cohorts if c['v'][0] not in ALIAS]
seen = set()
for r in results:
    rid = r['v'][0]
    if rid in seen: notes.append(f'duplicate result id {rid!r}')
    seen.add(rid)

# ---- linking
link = []
missing_cohort = []
for r in results:
    rid = r['v'][0]
    if not re.fullmatch(r'.*_R\d+', rid): notes.append(f'3.miRNA row {r["row"]}: ID without _R#### suffix {rid!r}')
    cid = ALIAS.get(re.sub(r'_R\d+$', '', rid), re.sub(r'_R\d+$', '', rid))
    coh = coh_by_id.get(cid)
    if coh is None: missing_cohort.append((r['row'], rid, cid))
    pids = list(dict.fromkeys(re.findall(r'PUB\d{4}', rid)))
    for pid in pids:
        if pid not in pub_by_id: notes.append(f'3.miRNA row {r["row"]}: {pid} not in 1.PUB')
    match = [pid for pid in pids if pid in pub_by_id and ndoi(pub_by_id[pid]['v'][2]) == ndoi(r['v'][10])]
    if len(pids) == 1:
        pub = pids[0] if pids[0] in pub_by_id else None
        if pub and not match: notes.append(f'3.miRNA row {r["row"]} {rid}: single PUB but DOI {r["v"][10]!r} != 1.PUB DOI {pub_by_id[pub]["v"][2]!r}')
    else:
        if len(match) == 1: pub = match[0]
        else:
            pub = None; notes.append(f'3.miRNA row {r["row"]} {rid}: multi-PUB id, DOI matches {match!r} (cannot pick publication)')
    if coh is not None:
        cp = set(re.findall(r'PUB\d{4}', cid))
        if pub and pub not in cp: notes.append(f'3.miRNA row {r["row"]}: publication {pub} not in cohort id {cid}')
    link.append({'row': r['row'], 'cohort_id': cid, 'cohort_row': coh['row'] if coh else None, 'pub': pub,
                 'pub_row': pub_by_id[pub]['row'] if pub else None})
coh_pubs = {}
for c in cohorts:
    ps = list(dict.fromkeys(re.findall(r'PUB\d{4}', c['v'][0])))
    if not ps: notes.append(f'2.Cohort row {c["row"]}: no PUB in id {c["v"][0]!r}')
    for pid in ps:
        if pid not in pub_by_id: notes.append(f'2.Cohort row {c["row"]}: {pid} not in 1.PUB')
    coh_pubs[c['v'][0]] = ps
# coverage
used_coh = {l['cohort_id'] for l in link}
used_pub = {l['pub'] for l in link}
unref_coh = [(c['row'], c['v'][0]) for c in cohorts if c['v'][0] not in used_coh]
unref_pub = [(p['row'], p['v'][0]) for p in pubs if p['v'][0] not in used_pub]

# ---- per-miRNA
mir_rows = collections.OrderedDict()
for r, l in zip(results, link):
    mir_rows.setdefault(r['v'][1], []).append((r, l))
mir = {}
for name, lst in mir_rows.items():
    pubsset = {l['pub'] for _, l in lst if l['pub']}
    up = {l['pub'] for r, l in lst if l['pub'] and r['v'][2] == '↑'}
    dn = {l['pub'] for r, l in lst if l['pub'] and r['v'][2] == '↓'}
    nc = {l['pub'] for r, l in lst if l['pub'] and r['v'][2] == '='}
    mir[name] = {'results': len(lst), 'pubs': len(pubsset), 'tissues': len({r['v'][8].strip() for r, _ in lst}),
                 'replicated': len(pubsset) >= 2, 'result_ids': [r['v'][0] for r, _ in lst],
                 'up': len(up), 'down': len(dn), 'nc': len(nc),
                 'res_up': sum(r['v'][2] == '↑' for r, _ in lst), 'res_down': sum(r['v'][2] == '↓' for r, _ in lst), 'res_nc': sum(r['v'][2] == '=' for r, _ in lst)}
trim_merge = collections.defaultdict(set)
for n in mir: trim_merge[n.strip()].add(n)
for k, s in trim_merge.items():
    if len(s) > 1: notes.append(f'microRNA texts differing only by surrounding whitespace: {sorted(s)!r}')
ci = collections.defaultdict(set)
for n in mir: ci[n.strip().lower()].add(n)
for k, s in ci.items():
    if len(s) > 1: notes.append(f'microRNA texts differing only by case/whitespace: {sorted(s)!r}')

# ---- tissues
tis = collections.OrderedDict()
for r, l in zip(results, link):
    t = r['v'][8].strip()
    d = tis.setdefault(t, {'results': 0, 'pubs': set(), 'mirnas': set()})
    d['results'] += 1
    d['mirnas'].add(r['v'][1])
    if l['pub']: d['pubs'].add(l['pub'])
raw_t = collections.defaultdict(set)
for r in results: raw_t[r['v'][8].strip()].add(r['v'][8])
for k, s in raw_t.items():
    if len(s) > 1: notes.append(f'Tissue variants merged by trimming: {sorted(s)!r}')

# ---- curators' cohort table (16 Oct 2026), read as an independent second source for the three cohort charts
def curator_table():
    p = os.path.join(os.path.dirname(XLSX), 'LAST_TABLE_REDA_cohort_characteristics_V2.xlsx')
    if not os.path.exists(p): return None
    ws = openpyxl.load_workbook(p, data_only=True).worksheets[0]
    out = {'Form of ALS at Population Level': {}, 'Site of onset': {}, 'Diagnosis criteria': {}}
    for r in ws.iter_rows(min_row=2, values_only=True):
        for key, (ci, vi) in (('Form of ALS at Population Level', (0, 1)), ('Site of onset', (3, 4)), ('Diagnosis criteria', (8, 9))):
            k, v = r[ci] if ci < len(r) else None, r[vi] if vi < len(r) else None
            if isinstance(k, str) and isinstance(v, (int, float)) and not k.startswith('Total'): out[key][k.strip()] = int(v)
    # Curators, 21 Oct 2026: the table's onset "Not applicable" row is counted under "Not reported".
    na = out['Site of onset'].pop('Not applicable', 0)
    if na: out['Site of onset']['Not reported'] = out['Site of onset'].get('Not reported', 0) + na
    return out

# ---- stats
top = sorted(mir.items(), key=lambda kv: (-kv[1]['results'], kv[0]))[:15]
top_js = sorted(mir.items(), key=lambda kv: (-kv[1]['results'], kv[0].lower()))[:15]
# Cohort charts (curators' table, 16 Oct 2026): unique cohorts; display names. 21 Oct 2026: no onset "Not applicable".
FORM_DISPLAY = {'fALS (10); sALS (22)': 'fALS / sALS', 'ALS (7), sALS (6)': 'ALS / sALS'}
DIAG_DISPLAY = {'Neurologists': 'Neurologists / Clinically diagnosed', 'Clinically diagnosed': 'Neurologists / Clinically diagnosed'}
form = collections.Counter((FORM_DISPLAY.get(c['v'][1].strip(), c['v'][1].strip()) or 'Not reported') for c in ucohorts)
diag = collections.Counter((DIAG_DISPLAY.get(c['v'][2].strip(), c['v'][2].strip()) or 'Not reported') for c in ucohorts)
onset_names = ['Both', 'Upper-limb', 'Lower-limb', 'Spinal/Limb', 'Bulbar']
def nz(c, idx):
    raw = c['raw'][idx]
    if raw is None: return False
    if isinstance(raw, str):
        s = raw.strip()
        if s == '': return False
        try: return float(s.rstrip('%')) != 0
        except ValueError: return True
    return float(raw) != 0
onset = collections.OrderedDict((n, 0) for n in onset_names); onset['Not reported'] = 0
onset_cells = collections.Counter()
for c in ucohorts:
    any_ = False
    for i, n in enumerate(onset_names):
        onset_cells[repr(c['raw'][7 + i])] += 1
        if nz(c, 7 + i): onset[n] += 1; any_ = True
    if not any_: onset['Not reported'] += 1
onset = {k: v for k, v in onset.items() if v}
years = collections.Counter()
for p in pubs:
    try: years[int(p['v'][4])] += 1
    except ValueError: notes.append(f'1.PUB row {p["row"]}: non-integer year {p["v"][4]!r}')
yrs = {str(y): years.get(y, 0) for y in range(min(years), max(years) + 1)}
country_pubs = collections.defaultdict(set)
for p in pubs:
    for part in p['v'][5].split(';'):
        if part.strip(): country_pubs[part.strip()].add(p['v'][0])
geo = {}
for k, ps in country_pubs.items():
    cs = {c['v'][0] for c in ucohorts if set(coh_pubs[c['v'][0]]) & ps}
    tot = 0
    for cid in cs:
        n = coh_by_id[cid]['raw'][4]
        if isinstance(n, int): tot += n
        elif n is None: pass
        else: notes.append(f'cohort {cid}: non-integer ALS Number {n!r} (not summed)')
    geo[k] = {'publications': len(ps), 'patients': tot}
cons = []
for n, d in mir.items():
    tot = d['pubs']
    if tot == 0: continue
    # Rule 5 Oct 2026 ("general dysregulated direction"): the outcome reported by the most publications,
    # NC included; a tie for the highest count -> "No consistent direction".
    outs = [('↑ Up', d['up']), ('↓ Down', d['down']), ('= NC', d['nc'])]
    best = max(n_ for _, n_ in outs); leaders = [o for o in outs if o[1] == best]
    agreement = 'No consistent direction' if len(leaders) > 1 else f"{leaders[0][0]} ({best} of {tot} publication{'' if tot == 1 else 's'})"
    cons.append({'name': n, 'up': d['up'], 'down': d['down'], 'nc': d['nc'], 'total': tot, 'agreement': agreement,
                 'agree': max(d['up'], d['down']), 'oppose': min(d['up'], d['down'])})
# Rule changed 2026-10-02: no score; rank by publications agreeing on one direction,
# then fewest opposing, then total publications, then name.
cons.sort(key=lambda x: (-x['agree'], x['oppose'], x['nc'], -x['total'], x['name']))
# boundary ties (informational)
cons_tie_note = None
if len(cons) > 10:
    k10 = (cons[9]['agree'], cons[9]['oppose'], cons[9]['nc'], cons[9]['total'])
    tied = [x['name'] for x in cons if (x['agree'], x['oppose'], x['nc'], x['total']) == k10]
    cons_tie_note = {'key_of_10th': k10, 'n_tied': len(tied)}

axis_vals = collections.Counter(r['v'][2] for r in results)
truth = {
    'curator_cohort_table': curator_table(), 'counts': {'pubs': len(pubs), 'cohorts': len(ucohorts), 'cohort_rows': len(cohorts), 'results': len(results)}, 'alias_conflicts': alias_conflicts,
    'pub_hdr': pub_hdr, 'coh_hdr': coh_hdr, 'res_hdr': res_hdr,
    'pubs': pubs, 'cohorts': cohorts, 'results': results, 'link': link,
    'missing_cohort': missing_cohort, 'unref_coh': unref_coh, 'unref_pub': unref_pub,
    'coh_pubs': coh_pubs,
    'mir': mir, 'tissues': {k: {'results': v['results'], 'pubs': len(v['pubs']), 'mirnas': len(v['mirnas'])} for k, v in tis.items()},
    'home': {'records': len(results), 'species': len(mir), 'studies': len(pubs), 'biospecimens': len(tis)},
    'stats': {'Most represented miRNAs': [[n, d['results']] for n, d in top],
              'top_js_order': [[n, d['results']] for n, d in top_js],
              'Form of ALS at Population Level': dict(form), 'Site of onset': onset,
              'Diagnosis criteria': dict(diag), 'Papers published over time': yrs,
              'Geographic distribution of studies': geo,
              # heatmap: every miRNA [name, up, down, nc, total] in distinct source publications (DOI-linked)
              'heat': [[n, d['up'], d['down'], d['nc'], d['pubs']] for n, d in mir.items()]},
    'axis_values': dict(axis_vals), 'onset_cells': dict(onset_cells), 'notes': notes,
}
json.dump(truth, open('out/truth.json', 'w'), ensure_ascii=False, indent=1)
print('rows', truth['counts'], 'notes', len(notes))
for n in notes: print('NOTE', n)
print('missing cohort', missing_cohort); print('unreferenced cohorts', unref_coh); print('unreferenced pubs', unref_pub)
print('home', truth['home']); print('axis', axis_vals); print('onset cells', onset_cells)
print('top15', top); print('top15 (case-insens tie order)', top_js == top)
print('cons', cons[:12], cons_tie_note)
print('form', form); print('diag', diag); print('onset', onset); print('years', yrs); print('geo', geo)
print('formats', collections.Counter(f for s in (pubs, cohorts, results) for x in s for f in x['fmt']))
