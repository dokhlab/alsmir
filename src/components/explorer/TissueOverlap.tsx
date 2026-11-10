import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MIRNA_ROWS, TISSUES, TISSUE_TOTALS, plural, tissueCombinations, type Combination } from "./explorerData";

const SHOW_DEFAULT = 20;
const BAR_H = 180;   // px, tallest bar
const COL_W = 34;    // px per combination column

export function TissueOverlap() {
  const [scope, setScope] = useState("multi");
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const combos = useMemo(() => {
    return tissueCombinations(MIRNA_ROWS).filter((c) => scope === "all" || c.tissues.length >= 2);
  }, [scope]);
  const shown = showAll ? combos : combos.slice(0, SHOW_DEFAULT);
  const total = combos.reduce((n, c) => n + c.rows.length, 0);

  // One group can dwarf the rest (e.g. Serum only). Cap its drawn height and mark the break.
  const counts = shown.map((c) => c.rows.length);
  const second = [...counts].sort((a, b) => b - a)[1] ?? counts[0] ?? 1;
  const cap = counts[0] > second * 3 ? Math.ceil(second * 1.3) : counts[0] ?? 1;
  const usedTissues = TISSUES.filter((t) => shown.some((c) => c.tissues.includes(t)));
  const maxSet = Math.max(1, ...usedTissues.map((t) => TISSUE_TOTALS.get(t)!.mirnas));

  const sel = combos.find((c) => c.key === selected) ?? null;
  useEffect(() => { if (sel) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [sel]);
  useEffect(() => { setSelected(null); }, [scope]);

  return (
    <div className="space-y-4">
      <div className="card-academic p-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="md:w-[22rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="multi">miRNAs measured in 2 or more tissues</SelectItem>
            <SelectItem value="all">All miRNAs (include single-tissue groups)</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground md:ml-auto" data-testid="overlap-count">
          {plural(total, "miRNA")} in {plural(combos.length, "tissue combination")}
        </span>
      </div>

      <p className="text-sm text-muted-foreground max-w-3xl">
        Each column is a group of miRNAs measured in <span className="font-medium text-foreground">exactly</span> the
        tissues marked with dots below it. The column height is the number of miRNAs. Click a column to list its
        miRNAs; open a miRNA for its Up, Down and NC results.
      </p>

      <div className="card-academic p-4 overflow-x-auto" data-testid="tissue-overlap">
        <div className="inline-grid" style={{ gridTemplateColumns: `14rem repeat(${shown.length}, ${COL_W}px)` }}>
          {/* Bars */}
          <div className="flex items-end pb-1 pr-3 text-xs text-muted-foreground">miRNAs per group</div>
          {shown.map((c) => {
            const n = c.rows.length;
            const capped = n > cap;
            const h = Math.max(2, (Math.min(n, cap) / cap) * BAR_H);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setSelected(selected === c.key ? null : c.key)}
                title={`${c.key}: ${plural(n, "miRNA")}. Click to list them.`}
                aria-label={`${c.key}: ${plural(n, "miRNA")}`}
                className={cn("group flex flex-col items-center justify-end px-[3px]", selected === c.key && "bg-secondary/70 rounded-t")}
                style={{ height: BAR_H + 22 }}
                data-combo={c.key}
                data-count={n}
              >
                <span className="text-[11px] font-semibold tabular-nums mb-0.5">{n}</span>
                <span className="relative flex w-full flex-col-reverse overflow-hidden rounded-t group-hover:opacity-80" style={{ height: h }}>
                  <span className="h-full w-full bg-primary" />
                  {capped && <span className="absolute inset-x-0 top-3 text-center text-[13px] leading-none font-bold text-background" aria-hidden>≈</span>}
                </span>
              </button>
            );
          })}

          {/* Tissue rows with dots */}
          {usedTissues.map((t) => {
            const size = TISSUE_TOTALS.get(t)!.mirnas;
            return (
              <div key={t} className="contents">
                <div className="flex items-center gap-2 pr-3 h-7 border-t border-border/60">
                  <span className="flex-1 truncate text-xs text-right" title={t}>{t}</span>
                  <span className="w-16 h-2 bg-muted rounded-full overflow-hidden" aria-hidden>
                    <span className="block h-full bg-primary/70" style={{ width: `${(size / maxSet) * 100}%` }} />
                  </span>
                  <span className="w-8 text-[10px] tabular-nums text-muted-foreground text-right">{size}</span>
                </div>
                {shown.map((c, ci) => {
                  const on = c.tissues.includes(t);
                  const idx = usedTissues.indexOf(t);
                  const first = usedTissues.findIndex((x) => c.tissues.includes(x));
                  const last = usedTissues.length - 1 - [...usedTissues].reverse().findIndex((x) => c.tissues.includes(x));
                  const linked = c.tissues.length > 1 && idx >= first && idx <= last;
                  return (
                    <div key={ci} className={cn("relative flex h-7 items-center justify-center border-t border-border/60", selected === c.key && "bg-secondary/70")}>
                      {linked && (
                        <span className="absolute w-0.5 bg-foreground/60" style={{ top: idx === first ? "50%" : 0, bottom: idx === last ? "50%" : 0 }} />
                      )}
                      <span className={cn("relative h-3 w-3 rounded-full", on ? "bg-foreground" : "bg-muted")} data-on={on ? "1" : undefined} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Bar beside each tissue: number of miRNAs measured in it. {shown.some((c) => c.rows.length > cap) && "≈ marks a column shortened to fit; its number is exact."}
        </p>
      </div>

      {combos.length > SHOW_DEFAULT && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? `Show the ${SHOW_DEFAULT} largest groups` : `Show all ${combos.length} groups`}
          </Button>
        </div>
      )}

      {sel && <CombinationDetail combo={sel} innerRef={detailRef} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CombinationDetail({ combo, innerRef, onClose }: { combo: Combination; innerRef: React.RefObject<HTMLDivElement>; onClose: () => void }) {
  const rows = [...combo.rows].sort((a, b) => b.all.records.length - a.all.records.length || a.mirna.localeCompare(b.mirna));
  return (
    <section ref={innerRef} className="card-academic p-5 space-y-3 scroll-mt-24" data-testid="overlap-detail">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{plural(combo.rows.length, "miRNA")} measured in exactly: {combo.tissues.join(" + ")}</h3>
          <p className="text-sm text-muted-foreground">Number after each name = results. Open a miRNA for its full evidence.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></Button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <li key={r.mirna} data-mirna={r.mirna}>
            <Link
              to={`/database/mirnas/${encodeURIComponent(r.mirna)}`}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1 text-xs font-medium hover:shadow hover:border-primary"
              title={`${r.mirna}: ${plural(r.all.records.length, "result")}`}
            >
              <span className="text-foreground">{r.mirna}</span>
              <span className="tabular-nums text-muted-foreground">{r.all.records.length}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
