// Compare ALS subgroups: published results for two result-level ALS groups/subgroups within one
// biospecimen, side by side. Labels are used exactly as recorded (no splitting, merging or inference),
// and no comparison statistic is calculated.
import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DirectionBadge } from "@/components/data/DirectionBadge";
import { RecordDetail, doiUrl } from "@/components/data/EvidenceTable";
import { ALL_EVIDENCE, uniqueBiospecimens } from "@/data/queries";
import type { EvidenceRecord } from "@/data/types";

const NONE = "No matching record in ALSmiR";

/** Result-level ALS group/subgroup labels exactly as recorded, most frequent first. */
const SUBGROUPS = (() => {
  const n = new Map<string, number>();
  ALL_EVIDENCE.forEach((r) => { const v = r.result.typeOfAls; if (v) n.set(v, (n.get(v) ?? 0) + 1); });
  return Array.from(n.keys()).sort((a, b) => n.get(b)! - n.get(a)! || a.localeCompare(b));
})();
const BIOSPECIMENS = uniqueBiospecimens();

interface Row { key: string; mirna: string; publicationId: string; method: string; a: EvidenceRecord[]; b: EvidenceRecord[] }

function Entries({ recs, open, toggle }: { recs: EvidenceRecord[]; open: string | null; toggle: (id: string) => void }) {
  if (recs.length === 0) return <span className="text-muted-foreground">{NONE}</span>;
  return (
    <ul className="space-y-2">
      {recs.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1" data-result-id={r.id}>
          <DirectionBadge direction={r.direction} />
          <span className="tabular-nums text-muted-foreground">
            ALS (N) {r.result.alsN ?? "—"} / HC (N) {r.result.hcN ?? "—"}
          </span>
          <Button type="button" variant="outline" size="sm" className="h-7 px-3 whitespace-nowrap"
            aria-expanded={open === r.id} onClick={() => toggle(r.id)}>
            {open === r.id ? "Hide details" : "View details"}
          </Button>
        </li>
      ))}
    </ul>
  );
}

export default function ComparePage() {
  const [groupA, setGroupA] = useState("");
  const [groupB, setGroupB] = useState("");
  const [biospecimen, setBiospecimen] = useState("");
  const [mirna, setMirna] = useState("");
  const [bothOnly, setBothOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const ready = groupA !== "" && groupB !== "" && groupA !== groupB && biospecimen !== "";

  const rows = useMemo<Row[]>(() => {
    if (!ready) return [];
    const q = mirna.trim().toLowerCase();
    const map = new Map<string, Row>();
    ALL_EVIDENCE.forEach((r) => {
      const g = r.result.typeOfAls;
      if (r.biospecimenKey !== biospecimen || (g !== groupA && g !== groupB)) return;
      if (q && !r.mirna.toLowerCase().includes(q)) return;
      // Same miRNA, same publication, same biospecimen and same recorded assay method.
      const method = r.result.method ?? "";
      const key = [r.mirna, r.studyId, method].join("|");
      const row = map.get(key) ?? { key, mirna: r.mirna, publicationId: r.studyId, method, a: [], b: [] };
      (g === groupA ? row.a : row.b).push(r);
      map.set(key, row);
    });
    return Array.from(map.values())
      .filter((r) => !bothOnly || (r.a.length > 0 && r.b.length > 0))
      .sort((x, y) => x.mirna.localeCompare(y.mirna) || x.publicationId.localeCompare(y.publicationId) || x.method.localeCompare(y.method));
  }, [ready, groupA, groupB, biospecimen, mirna, bothOnly]);

  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));
  const byId = useMemo(() => new Map(ALL_EVIDENCE.map((r) => [r.id, r])), []);
  const groupSelect = (value: string, set: (v: string) => void, label: string, other: string) => (
    <div>
      <label className="text-sm font-medium">{label} <span className="text-destructive">*</span></label>
      <Select value={value} onValueChange={(v) => { set(v); setOpen(null); }}>
        <SelectTrigger className="mt-1" aria-label={label}><SelectValue placeholder="Choose a subgroup" /></SelectTrigger>
        <SelectContent>
          {SUBGROUPS.map((g) => <SelectItem key={g} value={g} disabled={g === other}>{g}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Compare ALS subgroups</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Compare published miRNA expression findings for two ALS subgroups within the same biospecimen.
        </p>
      </header>

      <div className="card-academic p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {groupSelect(groupA, setGroupA, "ALS subgroup A", groupB)}
        {groupSelect(groupB, setGroupB, "ALS subgroup B", groupA)}
        <div>
          <label className="text-sm font-medium">Biospecimen <span className="text-destructive">*</span></label>
          <Select value={biospecimen} onValueChange={(v) => { setBiospecimen(v); setOpen(null); }}>
            <SelectTrigger className="mt-1" aria-label="Biospecimen"><SelectValue placeholder="Choose a biospecimen" /></SelectTrigger>
            <SelectContent>
              {BIOSPECIMENS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">miRNA (optional)</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input aria-label="miRNA" placeholder="e.g. miR-206" value={mirna} onChange={(e) => setMirna(e.target.value)} className="pl-9" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-4">
          <Checkbox checked={bothOnly} onCheckedChange={(v) => setBothOnly(!!v)} />
          Show only publications with results for both selected subgroups
        </label>
      </div>

      <p className="text-sm text-muted-foreground max-w-3xl" data-testid="compare-note">
        Each result compares an ALS subgroup with healthy controls. Displaying two subgroup results together does not
        establish a statistically significant difference between the subgroups.
      </p>

      {!ready ? (
        <p className="card-academic p-8 text-center text-muted-foreground">
          {groupA && groupA === groupB ? "Please choose two different subgroups." : "Choose two different ALS subgroups and one biospecimen to compare their results."}
        </p>
      ) : (
        <div className="card-academic overflow-x-auto">
          <table className="w-full text-sm" data-testid="compare-table">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">miRNA</th>
                <th className="px-4 py-3">Publication</th>
                <th className="px-4 py-3">Assay method</th>
                <th className="px-4 py-3">{groupA} results</th>
                <th className="px-4 py-3">{groupB} results</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rec = row.a[0] ?? row.b[0];
                const openRec = open ? byId.get(open) : undefined;
                const showDetail = openRec && [...row.a, ...row.b].some((r) => r.id === open);
                return (
                  <Fragment key={row.key}>
                    <tr className="border-t border-border align-top" data-row={row.key}>
                      <td className="px-4 py-3">
                        <Link to={`/database/mirnas/${encodeURIComponent(row.mirna)}`} className="font-medium text-primary-dark hover:underline break-all">{row.mirna}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <div>{rec.result.authorYear ?? row.publicationId}</div>
                        {rec.result.doi && (
                          <a href={doiUrl(rec.result.doi)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-dark hover:underline">
                            DOI <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.method || "—"}</td>
                      <td className="px-4 py-3"><Entries recs={row.a} open={open} toggle={toggle} /></td>
                      <td className="px-4 py-3"><Entries recs={row.b} open={open} toggle={toggle} /></td>
                    </tr>
                    {showDetail && (
                      <tr className="bg-secondary/40 border-t border-border">
                        <td colSpan={5} className="px-4 py-4"><RecordDetail r={openRec!} /></td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No results in ALSmiR for these subgroups in {biospecimen}{bothOnly ? " from the same publication" : ""}.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
