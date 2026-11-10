import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { uniqueMirnas, uniqueBiospecimens, recordsForMirna, ALL_EVIDENCE } from "@/data/queries";
import { MirbaseLink } from "@/components/data/MirbaseLink";
import { ResultCounts } from "@/components/data/ResultCounts";

const PAGE_SIZE = 24;

/** Publication years covered by the dataset, for the sparkline axis. */
const ALL_YEARS = Array.from(new Set(ALL_EVIDENCE.map((r) => r.year))).sort((a, b) => a - b);
const FIRST_YEAR = ALL_YEARS[0];
const YEAR_SPAN = ALL_YEARS[ALL_YEARS.length - 1] - FIRST_YEAR + 1;

function YearSparkline({ records }: { records: ReturnType<typeof recordsForMirna> }) {
  const counts = new Map<number, number>();
  records.forEach((r) => counts.set(r.year, (counts.get(r.year) ?? 0) + 1));
  const years = Array.from({ length: YEAR_SPAN }, (_, i) => FIRST_YEAR + i);
  const max = Math.max(1, ...Array.from(counts.values()));
  return (
    <svg viewBox={`0 0 ${YEAR_SPAN * 10} 28`} className="w-full h-7" preserveAspectRatio="none" aria-hidden>
      {years.map((y, i) => {
        const c = counts.get(y) ?? 0;
        const h = (c / max) * 24;
        return <rect key={y} x={i * 10 + 1} y={26 - h} width={8} height={h || 1} className="fill-primary" rx={1} />;
      })}
    </svg>
  );
}

export default function MirnasPage() {
  const allMirnas = uniqueMirnas();
  const [search, setSearch] = useState("");
  const [bioFilter, setBioFilter] = useState("all");
  const [dirFilter, setDirFilter] = useState("all");
  const [page, setPage] = useState(0);

  function resetPage() { setPage(0); }

  const mirnas = useMemo(() => {
    return allMirnas.filter((m) => {
      if (search && !m.toLowerCase().includes(search.toLowerCase())) return false;
      if (bioFilter !== "all") {
        const recs = recordsForMirna(m);
        if (!recs.some((r) => r.biospecimenKey === bioFilter)) return false;
      }
      if (dirFilter !== "all") {
        // At least one result with that direction (no overall direction is calculated).
        if (!recordsForMirna(m).some((r) => r.direction === dirFilter)) return false;
      }
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMirnas, search, bioFilter, dirFilter]);

  const totalPages = Math.max(1, Math.ceil(mirnas.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages - 1);
  const pageSlice  = mirnas.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Browse miRNAs</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Find a miRNA and explore its expression results across publications and biospecimens. Select View details to
          examine the evidence.
        </p>
      </header>

      {/* Filter bar */}
      <div className="card-academic p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by miRNA name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            className="pl-9"
          />
        </div>
        <Select value={bioFilter} onValueChange={(v) => { setBioFilter(v); resetPage(); }}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Tissue" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tissues</SelectItem>
            {uniqueBiospecimens().map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dirFilter} onValueChange={(v) => { setDirFilter(v); resetPage(); }}>
          <SelectTrigger className="sm:w-64"><SelectValue placeholder="Direction" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All directions</SelectItem>
            <SelectItem value="up">With an upregulated result</SelectItem>
            <SelectItem value="down">With a downregulated result</SelectItem>
            <SelectItem value="none">With a no-significant-change result</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {mirnas.length} of {allMirnas.length} miRNAs
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pageSlice.map((m) => {
          const records = recordsForMirna(m);
          const biospecimens = Array.from(new Set(records.map((r) => r.biospecimenKey)));
          const sourceStudies = new Set(records.map((r) => r.studyId)).size;
          return (
            <div key={m} className="card-academic p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link to={`/database/mirnas/${encodeURIComponent(m)}`} className="text-lg font-semibold text-primary-dark hover:underline">
                    {m}
                  </Link>
                  <div><MirbaseLink name={m} /></div>
                </div>
              </div>

              <ResultCounts records={records} className="mt-2" />

              <div className="mt-4 flex items-center gap-4 text-sm">
                <div>
                  <div className="text-2xl font-semibold tabular-nums text-foreground">{sourceStudies}</div>
                  <div className="text-xs text-muted-foreground">{sourceStudies === 1 ? "publication" : "publications"}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">Results by publication year ({FIRST_YEAR}–{FIRST_YEAR + YEAR_SPAN - 1})</div>
                  <YearSparkline records={records} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {biospecimens.slice(0, 4).map((b) => (
                  <span key={b} className="pill bg-secondary text-secondary-foreground">{b}</span>
                ))}
                {biospecimens.length > 4 && (
                  <span className="pill bg-muted text-muted-foreground">+{biospecimens.length - 4}</span>
                )}
              </div>

              <Button asChild variant="outline" size="sm" className="mt-4 self-start">
                <Link to={`/database/mirnas/${encodeURIComponent(m)}`}>View details →</Link>
              </Button>
            </div>
          );
        })}
        {mirnas.length === 0 && (
          <p className="col-span-full text-center py-12 text-muted-foreground">No miRNAs match the current filters.</p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">
            Page {safePage + 1} of {totalPages} · {mirnas.length} miRNAs
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
