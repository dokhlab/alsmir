import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { ALL_EVIDENCE, studiesByCountry } from "@/data/queries";

/** ISO alpha-3 -> ISO numeric, which is the id used by the world-atlas map shapes. */
const ISO3_TO_NUMERIC: Record<string, string> = {
  BEL: "056", BRA: "076", CAN: "124", CHL: "152", CHN: "156", DEU: "276", EGY: "818", ESP: "724",
  GBR: "826", IND: "356", IRN: "364", ISR: "376", ITA: "380", JPN: "392", KOR: "410", PRT: "620", SVN: "705", USA: "840",
};

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ─── Country map ──────────────────────────────────────────────────────────────
export function CountryMap() {
  const data   = studiesByCountry();
  const max    = Math.max(...data.map((d) => d.studies), 1);
  const lookup = new Map(data.map((d) => [ISO3_TO_NUMERIC[d.iso], d]));

  // Pre-compute per-country details: records, unique miRNAs, top 5 miRNAs
  const countryDetails = useMemo(() => {
    const map = new Map<string, { records: number; uniqueMirnas: number; top: { mirna: string; dir: string }[] }>();
    const tmp = new Map<string, { recs: number; mirnas: Map<string, { up: number; down: number }> }>();
    ALL_EVIDENCE.forEach((r) => {
      r.countryIso.forEach((iso) => {
        if (!tmp.has(iso)) tmp.set(iso, { recs: 0, mirnas: new Map() });
        const c = tmp.get(iso)!;
        c.recs++;
        if (!c.mirnas.has(r.mirna)) c.mirnas.set(r.mirna, { up: 0, down: 0 });
        if (r.direction === "up")   c.mirnas.get(r.mirna)!.up++;
        if (r.direction === "down") c.mirnas.get(r.mirna)!.down++;
      });
    });
    tmp.forEach(({ recs, mirnas }, iso) => {
      // rank by dysregulation count, then total records
      const top = Array.from(mirnas.entries())
        .map(([mirna, { up, down }]) => ({ mirna, dyCount: up + down, up, down }))
        .sort((a, b) => b.dyCount - a.dyCount || b.up - a.up)
        .slice(0, 5)
        .map(({ mirna, up, down }) => ({
          mirna,
          dir: up > down * 1.5 ? "↑" : down > up * 1.5 ? "↓" : up + down > 0 ? "↕" : "—",
        }));
      map.set(iso, { records: recs, uniqueMirnas: mirnas.size, top });
    });
    return map;
  }, []);

  type HoverState = { name: string; iso: string; studies: number; patients: number; x: number; y: number };
  const [hover, setHover] = useState<HoverState | null>(null);

  function colorFor(value: number) {
    if (!value) return "hsl(var(--muted))";
    const t = value / max;
    if (t < 0.34) return "hsl(var(--primary-light))";
    if (t < 0.67) return "hsl(var(--primary))";
    return "hsl(var(--primary-dark))";
  }

  return (
    <div className="card-academic p-4 relative">
      <div className="hidden md:block">
        <ComposableMap projectionConfig={{ scale: 140 }} height={360}>
          <Geographies geography={GEO_URL}>
            {({ geographies }: any) =>
              geographies.map((geo: any) => {
                const entry = lookup.get(String(geo.id));
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={colorFor(entry?.studies ?? 0)}
                    stroke="hsl(var(--background))"
                    strokeWidth={0.5}
                    onMouseEnter={(e: React.MouseEvent) =>
                      entry && setHover({ name: entry.country, iso: entry.iso, studies: entry.studies, patients: entry.patients, x: e.clientX, y: e.clientY })
                    }
                    onMouseMove={(e: React.MouseEvent) =>
                      setHover((h) => h ? { ...h, x: e.clientX, y: e.clientY } : null)
                    }
                    onMouseLeave={() => setHover(null)}
                    style={{
                      default: { outline: "none" },
                      hover:   { fill: "hsl(var(--accent))", outline: "none", cursor: entry ? "pointer" : "default" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>Fewer studies</span>
          <span className="inline-block w-6 h-3 rounded-sm bg-primary-light" />
          <span className="inline-block w-6 h-3 rounded-sm bg-primary" />
          <span className="inline-block w-6 h-3 rounded-sm bg-primary-dark" />
          <span>More studies</span>
          <span className="ml-2 opacity-60">Hover a country for details</span>
        </div>

        {/* Floating tooltip */}
        {hover && (() => {
          const det = countryDetails.get(hover.iso);
          return (
            <div
              className="fixed z-50 pointer-events-none bg-foreground text-background rounded-lg shadow-xl px-4 py-3 text-xs max-w-[220px]"
              style={{ left: hover.x + 14, top: hover.y - 10 }}
            >
              <p className="font-bold text-sm mb-1">{hover.name}</p>
              <p>{hover.studies} publication{hover.studies === 1 ? "" : "s"} · {hover.patients.toLocaleString()} ALS patients</p>
              {det && (
                <>
                  <p className="text-background/70">{det.records} records · {det.uniqueMirnas} miRNAs</p>
                  {det.top.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-background/20">
                      <p className="text-background/60 mb-1 uppercase tracking-wide text-[10px]">Top miRNAs</p>
                      {det.top.map(({ mirna, dir }) => (
                        <div key={mirna} className="flex items-center justify-between gap-2">
                          <span className="truncate">{mirna.replace("hsa-", "")}</span>
                          <span className="shrink-0 font-medium">{dir}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </div>
      <div className="relative h-0 overflow-hidden">
      <table className="sr-only" data-chart="Geographic distribution of studies">
        <tbody>
          {[...data].sort((a, b) => a.country.localeCompare(b.country)).map((d) => (
            <tr key={d.iso}><th>{d.country}</th><td data-col="publications">{d.studies}</td><td data-col="patients">{d.patients}</td></tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="md:hidden">
        <h3 className="font-semibold mb-2">Top contributing countries</h3>
        <ul className="divide-y divide-border">
          {[...data].sort((a, b) => b.studies - a.studies || a.country.localeCompare(b.country)).slice(0, 10).map((d) => (
            <li key={d.iso} className="flex justify-between py-2 text-sm">
              <span>{d.country}</span>
              <span className="tabular-nums text-muted-foreground">{d.studies} publications · {d.patients} ALS patients</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
