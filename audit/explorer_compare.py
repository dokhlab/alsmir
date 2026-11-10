import json, re
from collections import defaultdict
t=json.load(open('out/truth.json')); s=json.load(open('out/explorer_site.json'))
# Rule (6 Oct 2026): one direction at a time; each cell = number of result ROWS with that AXIS for the
# miRNA in that tissue ('0' if the miRNA has rows there but none of that direction, '·' if no rows at all).
# Listed rows: miRNAs with >=1 row of that direction; order = that count desc (ties by name).
cnt=defaultdict(int); mt=defaultdict(set)
for r in t['results']:
    m,ax,tis=r['v'][1],r['v'][2],r['v'][8].strip()
    cnt[(m,tis,ax)]+=1; cnt[(m,'__all',ax)]+=1; mt[m].add(tis)
TIS_ALL=sorted({x for v in mt.values() for x in v})
bad=[]; checked=0
for d,ax in (('up','↑'),('down','↓'),('none','=')):
    got=s['matrix'][d]['rows']
    want=sorted([m for m in mt if cnt[(m,'__all',ax)]>0], key=lambda m:(-cnt[(m,'__all',ax)], m))
    if sorted(g['mirna'] for g in got)!=sorted(want): bad.append(('row set',d,len(got),len(want)))
    seq=[cnt[(g['mirna'],'__all',ax)] for g in got]
    if seq!=sorted(seq,reverse=True): bad.append(('row order not by count desc',d))
    exp_text=f"{len(want)} miRNA{'s' if len(want)!=1 else ''} with {dict(up='Up',down='Down',none='NC')[d]} results"
    if (s['matrix'][d]['countText'] or '').strip()!=exp_text: bad.append(('count text',d,s['matrix'][d]['countText'],exp_text))
    for g in got:
        for tis,txt in g['cells'].items():
            checked+=1
            if tis=='__all': e=str(cnt[(g['mirna'],'__all',ax)])
            elif tis not in mt[g['mirna']]: e='·'
            else: e=str(cnt[(g['mirna'],tis,ax)])
            if txt!=e: bad.append(('cell',d,g['mirna'],tis,'site',txt,'expected',e))
if s.get('mixedText'): bad.append(('the word Mixed appears on the page',))
print('cells checked (3 directions)',checked,'mismatches',len(bad)); [print(' ',b) for b in bad[:20]]
TIS=TIS_ALL
groups=defaultdict(int)
for m,v in mt.items(): groups[' + '.join([x for x in TIS if x in v])]+=1
print('shared-across-tissues view hidden:', s.get('overlapHidden'), '| deleted sentence absent:', not s.get('missingSentence'))
