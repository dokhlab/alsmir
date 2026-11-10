import { Link } from "react-router-dom";
import { Droplet, FlaskConical, Brain, Activity, TestTube, Microscope } from "lucide-react";
import { ALL_EVIDENCE, uniqueBiospecimens } from "@/data/queries";

const ICONS: Record<string, typeof Droplet> = {
  CSF: Droplet,
  "Whole blood": Droplet,
  Plasma: TestTube,
  Serum: TestTube,
  PBMC: Microscope,
  "Spinal cord tissue": Activity,
  "Brain tissue": Brain,
  "Muscle tissue": Activity,
  Urine: FlaskConical,
  Saliva: FlaskConical,
};

export default function BiospecimensPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Browse biospecimens</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Explore miRNA expression results by biospecimen. Select a card to view its evidence records.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {uniqueBiospecimens().map((name) => {
          const records = ALL_EVIDENCE.filter((r) => r.biospecimenKey === name);
          const studies = new Set(records.map((r) => r.studyId)).size;
          const species = new Set(records.map((r) => r.mirna)).size;
          const topMirnas = Object.entries(
            records.reduce<Record<string, number>>((acc, r) => {
              acc[r.mirna] = (acc[r.mirna] ?? 0) + 1;
              return acc;
            }, {})
          ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m);
          const Icon = ICONS[name] ?? FlaskConical;

          return (
            <Link
              key={name}
              to={`/database/evidence?biospecimen=${encodeURIComponent(name)}`}
              className="card-academic p-5 hover:border-primary transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-md bg-secondary text-primary-dark flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-right leading-none" data-testid="species-count">
                  <span className="block text-2xl font-semibold tabular-nums text-primary">{species}</span>
                  <span className="text-[11px] text-muted-foreground">{species === 1 ? "miRNA" : "miRNAs"}</span>
                </span>
              </div>
              <h3 className="mt-3 font-semibold">{name}</h3>
              <p className="text-xs text-muted-foreground">{records.length} result{records.length === 1 ? "" : "s"} · {studies} publication{studies === 1 ? "" : "s"}</p>
              {topMirnas.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {topMirnas.map((m) => (
                    <span key={m} className="pill bg-secondary text-secondary-foreground">{m}</span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
