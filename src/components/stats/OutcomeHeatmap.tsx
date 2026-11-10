// "Reported miRNA expression outcomes" (curators' specification, 8 Oct 2026): distinct source
// publications per miRNA and outcome for the whole dataset, ranked by a chosen column. One colour
// scale (white -> #1C7ED6) from 0 to the largest outcome count in the FULL dataset, so colours stay
// comparable across views; the total column is not coloured. Everything is recalculated from the
// loaded dataset — no miRNA names, counts or sizes are hard-coded.
import { useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOURCE } from "@/data/dataset";
import { expressionOutcomes, rankOutcomes, type OutcomeKey, type OutcomeRow } from "@/data/queries";

const TITLE = "Reported miRNA expression outcomes";
export const HEATMAP_NOTE =
  "Counts represent distinct publications per miRNA and expression outcome. Publications reporting different outcomes may appear in multiple columns; outcome counts may therefore sum to more than the total, which counts each publication once. Colour indicates publication count, not expression magnitude. Publications may share cohorts and therefore do not necessarily represent independent replication.";
const LEGEND = "Number of distinct publications";

const COLUMNS: { key: OutcomeKey; label: string; lines: string[] }[] = [
  { key: "up", label: "Increased expression (↑)", lines: ["Increased", "expression (↑)"] },
  { key: "down", label: "Decreased expression (↓)", lines: ["Decreased", "expression (↓)"] },
  { key: "none", label: "No statistically significant difference (=)", lines: ["No statistically", "significant", "difference (=)"] },
  { key: "total", label: "Total distinct publications", lines: ["Total distinct", "publications"] },
];
const OUTCOMES = COLUMNS.slice(0, 3);
const TOTAL = COLUMNS[3];
const SHOW = [6, 10, 20, 50];

const ALL = expressionOutcomes();
/** Scale maximum: the largest outcome count across the full dataset (not just the rows shown). */
const SCALE_MAX = Math.max(1, ...ALL.rows.flatMap((r) => [r.up, r.down, r.none]));

const BLUE = [0x1c, 0x7e, 0xd6];
function shade(n: number): string {
  const t = n / SCALE_MAX;
  const c = BLUE.map((v) => Math.round(255 + (v - 255) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  text.split(" ").forEach((w) => {
    if (line && (line + " " + w).length > width) { lines.push(line); line = w; } else line = line ? `${line} ${w}` : w;
  });
  if (line) lines.push(line);
  return lines;
}

const PAD = 20, CELL_W = 112, CELL_H = 30, GAP = 2, HEAD_H = 52;

export function OutcomeHeatmap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [sortKey, setSortKey] = useState<OutcomeKey>("total");
  const [limit, setLimit] = useState(10);
  const [hover, setHover] = useState<{ row: OutcomeRow; col: (typeof COLUMNS)[number]; x: number; y: number } | null>(null);

  // Rank the full dataset first, then apply the display limit.
  const rows = useMemo(() => rankOutcomes(ALL.rows, sortKey).slice(0, limit), [sortKey, limit]);
  const sortCol = COLUMNS.find((c) => c.key === sortKey)!;

  const labelW = Math.max(150, ...rows.map((r) => r.mirna.length * 7 + 14));
  const gridX = PAD + labelW;
  const totalX = gridX + 3 * (CELL_W + GAP) + 10;
  const width = totalX + CELL_W + PAD;
  const top = 92 + HEAD_H;
  const gridBottom = top + rows.length * (CELL_H + GAP);
  const legendY = gridBottom + 34;
  const legendW = 3 * CELL_W + 2 * GAP;
  const step = SCALE_MAX <= 10 ? 1 : Math.ceil(SCALE_MAX / 10);
  const ticks = Array.from({ length: Math.floor(SCALE_MAX / step) + 1 }, (_, i) => i * step);
  const noteLines = wrap(HEATMAP_NOTE, Math.max(70, Math.floor((width - 2 * PAD) / 6.2)));
  const noteY = legendY + 52;
  const height = noteY + noteLines.length * 15 + PAD;
  const subtitle = `Ranked by: ${sortCol.label} · top ${rows.length} of ${ALL.rows.length} miRNAs`;
  const version = `ALSmiR dataset ${SOURCE.version ?? SOURCE.file}${SOURCE.savedDate ? ` (workbook saved ${SOURCE.savedDate})` : ""}`;

  function serialize(): string {
    const clone = svgRef.current!.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    return new XMLSerializer().serializeToString(clone);
  }
  const fileBase = `alsmir-expression-outcomes-${SOURCE.version ?? "dataset"}-by-${sortKey}-top${rows.length}`;
  function save(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportSvg() { save(new Blob([serialize()], { type: "image/svg+xml;charset=utf-8" }), `${fileBase}.svg`); }
  function exportPng() {
    const scale = 4;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * scale; canvas.height = height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => b && save(b, `${fileBase}.png`), "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(serialize());
  }

  const font = "Inter Variable, Inter, Arial, sans-serif";
  const colX = (i: number) => (i < 3 ? gridX + i * (CELL_W + GAP) : totalX);
  return (
    <div className="card-academic p-4 relative" data-testid="outcome-heatmap" data-sort={sortKey} data-limit={limit}>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort by</span>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as OutcomeKey)}>
            <SelectTrigger className="w-[22rem]" aria-label="Sort by"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Show</span>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-24" aria-label="Show"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SHOW.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={exportSvg}><Download className="h-4 w-4 mr-1.5" /> SVG</Button>
          <Button variant="outline" size="sm" onClick={exportPng}><Download className="h-4 w-4 mr-1.5" /> PNG</Button>
        </div>
      </div>
      {ALL.flagged.length > 0 && (
        <p className="mb-3 rounded-md border border-warning/50 bg-warning/10 p-2 text-xs" data-testid="heatmap-flagged">
          {ALL.flagged.length} result{ALL.flagged.length === 1 ? "" : "s"} left out because the source publication or the
          expression outcome is missing: {ALL.flagged.slice(0, 10).map((f) => `${f.id} (${f.reason})`).join("; ")}
          {ALL.flagged.length > 10 ? "; …" : ""}
        </p>
      )}
      <div className="overflow-x-auto">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[52rem] h-auto mx-auto block"
          role="img" aria-label={`${TITLE}. ${subtitle}`} fontFamily={font}>
          <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
          <text x={PAD} y={PAD + 12} fontSize={16} fontWeight={600} fill="#111827">{TITLE}</text>
          <text x={PAD} y={PAD + 34} fontSize={11.5} fill="#374151" data-subtitle>{subtitle}</text>
          <text x={PAD} y={PAD + 51} fontSize={11} fill="#6b7280">{version}</text>

          {COLUMNS.map((c, i) => {
            const x = colX(i) + CELL_W / 2;
            const sel = c.key === sortKey;
            return (
              <g key={c.key} data-col={c.key}>
                {c.lines.map((l, li) => (
                  <text key={li} x={x} y={top - 10 - (c.lines.length - 1 - li) * 14} fontSize={11.5} fontWeight={sel ? 700 : 600}
                    textAnchor="middle" fill={sel ? "#1C7ED6" : "#111827"}>{l}</text>
                ))}
                {sel && <rect x={colX(i) + 8} y={top - 6} width={CELL_W - 16} height={2.5} fill="#1C7ED6" />}
              </g>
            );
          })}

          {rows.map((r, ri) => {
            const y = top + ri * (CELL_H + GAP);
            return (
              <g key={r.mirna} data-mirna={r.mirna}>
                <text x={gridX - 8} y={y + CELL_H / 2 + 4} fontSize={12} textAnchor="end" fill="#111827">{r.mirna}</text>
                {OUTCOMES.map((c, i) => {
                  const n = r[c.key];
                  return (
                    <g key={c.key} data-outcome={c.key}
                      onMouseEnter={(e) => setHover({ row: r, col: c, x: e.clientX, y: e.clientY })}
                      onMouseMove={(e) => setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))}
                      onMouseLeave={() => setHover(null)}>
                      <rect x={colX(i)} y={y} width={CELL_W} height={CELL_H} fill={shade(n)} stroke="#e5e7eb" strokeWidth={0.5} />
                      <text x={colX(i) + CELL_W / 2} y={y + CELL_H / 2 + 4} fontSize={12} fontWeight={600} textAnchor="middle"
                        fill={n / SCALE_MAX > 0.55 ? "#ffffff" : "#111827"}>{n}</text>
                    </g>
                  );
                })}
                <g data-outcome="total"
                  onMouseEnter={(e) => setHover({ row: r, col: TOTAL, x: e.clientX, y: e.clientY })}
                  onMouseMove={(e) => setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))}
                  onMouseLeave={() => setHover(null)}>
                  <rect x={totalX} y={y} width={CELL_W} height={CELL_H} fill="#ffffff" stroke="#d1d5db" strokeWidth={0.5} />
                  <text x={totalX + CELL_W / 2} y={y + CELL_H / 2 + 4} fontSize={12} fontWeight={600} textAnchor="middle" fill="#111827">{r.total}</text>
                </g>
              </g>
            );
          })}

          <defs>
            <linearGradient id="heat-scale" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#1C7ED6" />
            </linearGradient>
          </defs>
          <text x={gridX} y={legendY - 6} fontSize={11} fill="#374151">{LEGEND}</text>
          <rect data-scale-max={SCALE_MAX} x={gridX} y={legendY} width={legendW} height={10} fill="url(#heat-scale)" stroke="#d1d5db" strokeWidth={0.5} />
          {ticks.map((t) => {
            const x = gridX + (legendW * t) / SCALE_MAX;
            return (
              <g key={t}>
                <line x1={x} x2={x} y1={legendY + 10} y2={legendY + 14} stroke="#6b7280" strokeWidth={0.75} />
                <text x={x} y={legendY + 25} fontSize={10} textAnchor="middle" fill="#374151">{t}</text>
              </g>
            );
          })}

          {noteLines.map((l, i) => (
            <text key={i} x={PAD} y={noteY + i * 15} fontSize={11} fill="#4b5563">{l}</text>
          ))}
        </svg>
      </div>
      {hover && (
        <div className="fixed z-50 pointer-events-none bg-foreground text-background rounded-md shadow-lg px-3 py-2 text-xs"
          style={{ left: hover.x + 12, top: hover.y + 12 }}>
          <p className="font-semibold">{hover.row.mirna}</p>
          <p>{hover.col.label}: {hover.row[hover.col.key]} publication{hover.row[hover.col.key] === 1 ? "" : "s"}</p>
          {hover.col.key !== "total" && <p className="opacity-80">Total distinct publications: {hover.row.total}</p>}
        </div>
      )}
    </div>
  );
}
