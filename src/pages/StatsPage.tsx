import { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area,
} from "recharts";
import { COHORTS } from "@/data/dataset";
import { publicationsByYear, topMirnasByEvidenceCount } from "@/data/queries";
import { ChartData } from "@/components/stats/ChartData";
import { CountryMap } from "@/components/stats/CountryMap";
import { HorizontalBars, NOT_REPORTED, orderBars } from "@/components/stats/HorizontalBars";
import { OutcomeHeatmap } from "@/components/stats/OutcomeHeatmap";

/** 2.Cohort ONSET columns, in sheet order. */
const ONSET_COLUMNS = [
  { key: "onsetBoth", name: "Both" },
  { key: "onsetUpperLimb", name: "Upper-limb" },
  { key: "onsetLowerLimb", name: "Lower-limb" },
  { key: "onsetSpinalLimb", name: "Spinal/Limb" },
  { key: "onsetBulbar", name: "Bulbar" },
];

const COLORS = { primary: "hsl(var(--primary))" };

/*
 * Cohort characteristics (curators' table, 16 Oct 2026: LAST_TABLE_REDA_cohort_characteristics_V2.xlsx).
 * All three charts count unique cohorts (the shared PUB0005/PUB0007 cohort once). Display names below apply
 * to these charts only; record details keep the workbook text.
 */
const FORM_DISPLAY: Record<string, string> = {
  "fALS (10); sALS (22)": "fALS / sALS",
  "ALS (7), sALS (6)": "ALS / sALS",
};
const DIAGNOSIS_DISPLAY: Record<string, string> = {
  "Neurologists": "Neurologists / Clinically diagnosed",
  "Clinically diagnosed": "Neurologists / Clinically diagnosed",
};
const display = (map: Record<string, string>) => (v: string | null) => {
  const t = v?.trim() ?? null;
  return t ? map[t] ?? t : t;
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const topMirnas = useMemo(() => topMirnasByEvidenceCount(15).reverse(), []);
  const yearData  = useMemo(() => publicationsByYear(), []);

  // Cohort-level charts: one count per 2.Cohort row. Text is grouped after trimming
  // surrounding whitespace; empty cells are counted as "Not reported".
  const countBy = (values: (string | null)[]) => {
    const counts = new Map<string, number>();
    values.forEach((v) => {
      const k = v && v.trim() ? v.trim() : NOT_REPORTED;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  };

  const alsTypeData = useMemo(() => countBy(COHORTS.map((c) => display(FORM_DISPLAY)(c.form))), []);

  // Site of onset: cohorts reporting a non-zero value in each ONSET column.
  const onsetData = useMemo(() => {
    const reported = (v: string | null) => v !== null && v.trim() !== "" && parseFloat(v) !== 0;
    const counts = ONSET_COLUMNS.map(({ key, name }) => ({
      name,
      value: COHORTS.filter((c) => reported((c as unknown as Record<string, string | null>)[key])).length,
    }));
    // Curators, 21 Oct 2026: no "Not applicable" category; every cohort without a reported onset is "Not reported".
    const none = COHORTS.filter((c) => ONSET_COLUMNS.every(({ key }) => !reported((c as unknown as Record<string, string | null>)[key]))).length;
    return [...counts, { name: NOT_REPORTED, value: none }].filter((d) => d.value > 0);
  }, []);

  const diagData = useMemo(() => countBy(COHORTS.map((c) => display(DIAGNOSIS_DISPLAY)(c.diagnosis))), []);

  const cohortCharts = [
    { title: "Cohort classification (as reported)", note: "Cohorts per classification", data: alsTypeData },
    { title: "Site of onset", note: "Cohorts reporting each onset category", data: onsetData, overlapping: true },
    { title: "Diagnostic criteria and assessment", note: "Cohorts per criterion", data: diagData },
  ];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Statistics & insights</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Aggregate views across the curated database — research focus, expression findings, cohort
          characteristics, geography, and growth over time. All figures are calculated from the
          source workbook.
        </p>
      </header>

      {/* miRNAs with the most recorded results */}
      <section>
        <h2 className="text-xl font-semibold mb-3">miRNAs with the most recorded results</h2>
        <div className="card-academic p-4">
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={topMirnas} layout="vertical" margin={{ left: 12, right: 32 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis dataKey="mirna" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
              <Tooltip cursor={{ fill: "hsl(var(--secondary))" }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" fill={COLORS.primary} radius={[0, 4, 4, 0]} label={{ position: "right", fill: "hsl(var(--foreground))", fontSize: 12 }} />
            </BarChart>
          </ResponsiveContainer>
          <ChartData id="miRNAs with the most recorded results" rows={[...topMirnas].reverse().map((d) => ({ name: d.mirna, value: d.count }))} />
          <p className="mt-2 text-xs text-muted-foreground">
            Multiple results may come from the same publication or cohort or same research group across different publications.
          </p>
        </div>
      </section>

      {/* Reported miRNA expression outcomes (one interactive heatmap) */}
      <section>
        <OutcomeHeatmap />
      </section>

      {/* Cohort characteristics */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Cohort characteristics</h2>
        <div className="grid gap-4 md:grid-cols-3 items-start">
          {cohortCharts.map((d) => (
            <div key={d.title} className="card-academic p-4 flex flex-col">
              <h3 className="font-medium">{d.title}</h3>
              <p className="text-xs text-muted-foreground mb-2">{d.note} (out of {COHORTS.length} cohorts)</p>
              <HorizontalBars rows={d.data} total={COHORTS.length} testId={d.overlapping ? "onset-bars" : undefined} />
              {d.overlapping && (
                <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                  Each cohort includes patients with different onset types and can therefore be counted in multiple
                  categories. Percentages are calculated using the total number of cohorts and may add up to more than 100%.
                </p>
              )}
              <ChartData id={d.title} rows={orderBars(d.data)} />
            </div>
          ))}
        </div>
      </section>

      {/* Geographic distribution */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Geographic distribution of studies</h2>
        <CountryMap />
      </section>

      {/* Publications included by year */}
      <section>
        <h2 className="text-xl font-semibold mb-1">Publications included by year</h2>
        <p className="text-sm text-muted-foreground mb-3 max-w-3xl">
          Counts reflect publications included in the current ALSmiR dataset through systematic literature selection or
          accepted author submissions.
        </p>
        <div className="card-academic p-4">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={yearData} margin={{ left: 4, right: 12 }}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={COLORS.primary} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="Publications" stroke={COLORS.primary} strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
          <ChartData id="Publications included by year" rows={yearData.map((d) => ({ name: d.year, value: d.Publications }))} />
        </div>
      </section>
    </div>
  );
}
