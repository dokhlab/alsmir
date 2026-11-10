import json
names = json.load(open('out/mir_names.json')); site = json.load(open('out/mirbase_site.json'))
mature = {}
for line in open('/data/mirbase/23.1/mature.fa'):
    if line.startswith('>hsa-'):
        n, a = line[1:].split()[:2]; mature[n] = a
bad = []; linked = 0
for n in names:
    got = site.get(n, [])
    exp = mature.get(n)
    if exp:
        linked += 1
        ok = len(got) == 1 and got[0]['acc'] == exp and got[0]['href'] == f'https://www.mirbase.org/mature/{exp}'
        if not ok: bad.append((n, 'expected link', exp, got))
    elif got:
        bad.append((n, 'expected NO link', None, got))
print(f'names {len(names)}; expected linked {linked}; pages with a link {sum(1 for n in names if site.get(n))}; mismatches {len(bad)}; cards with link on first list page {site["__cards"]}')
for b in bad[:20]: print('  ', b)
