import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EvidenceTable } from "@/components/data/EvidenceTable";
import { cn } from "@/lib/utils";
import { DIRS, DIR_META, MIRNA_ROWS, TISSUES, plural, resultsFor, type Dir } from "./explorerData";

const PAGE = 25;

export function TissueMatrix() {
  const [dir, setDir] = useState<Dir>("up");
  const [tissue, setTissue] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<{ mirna: string; tissue: string } | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Only miRNAs with at least one result of the chosen direction in the chosen biospecimen;
  // most such results first, then by name.
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MIRNA_ROWS
      .filter((r) => !q || r.mirna.toLowerCase().includes(q))
      .map((r) => ({ row: r, n: resultsFor(r, dir, tissue).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n || a.row.mirna.localeCompare(b.row.mirna));
  }, [search, dir, tissue]);

  // Column header: miRNAs with at least one result of this direction in the tissue.
  const perTissue = useMemo(
    () => new Map(TISSUES.map((t) => [t, MIRNA_ROWS.filter((r) => resultsFor(r, dir, t).length > 0).length])),
    [dir],
  );

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const shown = rows.slice(safePage * PAGE, (safePage + 1) * PAGE);

  const selRow = selected ? MIRNA_ROWS.find((r) => r.mirna === selected.mirna) : undefined;
  const selRecords = selRow ? resultsFor(selRow, dir, selected!.tissue) : [];

  useEffect(() => { if (selected) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [selected]);
  const reset = () => { setPage(0); setSelected(null); };
  const pick = (mirna: string, t: string) =>
    setSelected((s) => (s && s.mirna === mirna && s.tissue === t ? null : { mirna, tissue: t }));
  const m = DIR_META[dir];

  function CellView({ mirna, t, n, measured }: { mirna: string; t: string; n: number; measured: boolean }) {
    if (!measured) return <span className="text-muted-foreground/40" aria-label="no matching record in ALSmiR">·</span>;
    if (n === 0) return <span className="text-xs text-muted-foreground/70 tabular-nums" aria-label={`no ${m.label} results`}>0</span>;
    const label = `${mirna} in ${t === "all" ? "all biospecimens" : t}: ${plural(n, `${m.label} result`)}. Click to see them.`;
    const isSel = selected?.mirna === mirna && selected.tissue === t;
    return (
      <button type="button" onClick={() => pick(mirna, t)} title={label} aria-label={label} aria-pressed={isSel}
        data-count={n}
        className={cn("inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded border px-2 text-xs font-semibold tabular-nums hover:shadow",
          m.cell, isSel && "ring-2 ring-primary ring-offset-1")}>
        {n}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card-academic p-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <div className="inline-flex rounded-md border border-border overflow-hidden" role="radiogroup" aria-label="Direction">
          {DIRS.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={dir === d} data-dir={d}
              onClick={() => { setDir(d); reset(); }}
              className={cn("px-4 py-2 text-sm font-medium border-r last:border-r-0 border-border transition-colors",
                dir === d ? DIR_META[d].button : "bg-background hover:bg-secondary")}>
              {DIR_META[d].symbol} {DIR_META[d].label}
            </button>
          ))}
        </div>
        <Select value={tissue} onValueChange={(v) => { setTissue(v); reset(); }}>
          <SelectTrigger className="md:w-56" aria-label="Biospecimen"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All biospecimens</SelectItem>
            {TISSUES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative md:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Find a miRNA, e.g. miR-206" aria-label="Find a miRNA" value={search}
            onChange={(e) => { setSearch(e.target.value); reset(); }} className="pl-9" />
        </div>
        <span className="text-sm text-muted-foreground md:ml-auto" data-testid="matrix-count">
          {plural(rows.length, "miRNA")} with {m.label} results{tissue === "all" ? "" : ` in ${tissue}`}
        </span>
      </div>

      <div className="text-xs text-muted-foreground space-y-1" data-testid="status-legend">
        <p>
          <span className={cn("inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded border px-1 mr-1.5 font-semibold", m.cell)}>n</span>
          Number of <span className="font-medium text-foreground">{m.symbol} {m.label}</span> results {m.explain} for the selected
          biospecimen. Click a number to view the corresponding results. Use the buttons above to switch between Up, Down, and NC.
        </p>
        <p>
          <span className="inline-block w-6 text-center tabular-nums">(0)</span> Results are recorded for this miRNA in this biospecimen, but none
          are {m.label}.{" "}
          <span className="inline-block w-6 text-center">(·)</span> No matching record in ALSmiR for this miRNA–biospecimen combination.
        </p>
      </div>

      <div className="card-academic overflow-x-auto" data-testid="tissue-matrix" data-dir={dir}>
        <table className="text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-card border-b border-border px-3 py-2 text-left align-bottom min-w-[11rem]">microRNA</th>
              {TISSUES.map((t) => (
                <th key={t} data-tissue={t}
                  className={cn("border-b border-border px-1.5 py-2 align-bottom text-center font-medium min-w-[4.5rem]", tissue === t && "bg-secondary")}>
                  <div className="text-xs leading-tight">{t}</div>
                  <div className="text-[10px] font-normal text-muted-foreground">{plural(perTissue.get(t)!, "miRNA")}</div>
                </th>
              ))}
              <th className="border-b border-l border-border px-2 py-2 align-bottom text-center font-medium min-w-[5rem]">
                <div className="text-xs leading-tight">All biospecimens</div>
                <div className="text-[10px] font-normal text-muted-foreground">{m.label} results</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ row }) => (
              <tr key={row.mirna} className="hover:bg-secondary/40" data-mirna={row.mirna}>
                <th scope="row" className="sticky left-0 z-10 bg-card border-b border-border px-3 py-1.5 text-left font-medium">
                  <Link to={`/database/mirnas/${encodeURIComponent(row.mirna)}`} className="text-primary-dark hover:underline break-all">{row.mirna}</Link>
                </th>
                {TISSUES.map((t) => (
                  <td key={t} className={cn("border-b border-border px-1.5 py-1.5 text-center", tissue === t && "bg-secondary/60")} data-tissue={t}>
                    <CellView mirna={row.mirna} t={t} n={resultsFor(row, dir, t).length} measured={row.cells.has(t)} />
                  </td>
                ))}
                <td className="border-b border-l border-border px-2 py-1.5 text-center" data-tissue="__all">
                  <CellView mirna={row.mirna} t="all" n={resultsFor(row, dir, "all").length} measured />
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={TISSUES.length + 2} className="px-4 py-10 text-center text-muted-foreground">
                {search.trim() ? "No miRNAs match your search." : `No ${m.label} results${tissue === "all" ? "" : ` in ${tissue}`} in ALSmiR.`}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm" data-testid="matrix-pager">
          <span className="text-muted-foreground">
            Showing {safePage * PAGE + 1}–{Math.min((safePage + 1) * PAGE, rows.length)} of {rows.length} · Page {safePage + 1} of {pages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: pages }, (_, i) => i)
              .filter((i) => i === 0 || i === pages - 1 || Math.abs(i - safePage) <= 2)
              .map((i, k, arr) => (
                <span key={i} className="flex items-center gap-1">
                  {k > 0 && i - arr[k - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
                  <Button variant={i === safePage ? "default" : "outline"} size="sm" className="h-8 min-w-8 px-2" onClick={() => setPage(i)}>{i + 1}</Button>
                </span>
              ))}
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {selected && selRow && (
        <section ref={detailRef} className="card-academic p-5 space-y-3 scroll-mt-24" data-testid="matrix-detail">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">
                {selected.mirna} in {selected.tissue === "all" ? "all biospecimens" : selected.tissue}: {m.symbol} {m.label}
              </h3>
              <p className="text-sm text-muted-foreground">{plural(selRecords.length, `${m.label} result`)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Close"><X className="h-4 w-4" /></Button>
          </div>
          <EvidenceTable key={`${selected.mirna}|${selected.tissue}|${dir}`} records={selRecords} hideFilters pageSize={10} />
        </section>
      )}
    </div>
  );
}
