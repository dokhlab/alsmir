import { useSearchParams } from "react-router-dom";
import { Grid3x3, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATS } from "@/data/queries";
import { TissueMatrix } from "@/components/explorer/TissueMatrix";
import { TissueOverlap } from "@/components/explorer/TissueOverlap";

const VIEWS = [
  { id: "matrix", label: "Tissue matrix", icon: Grid3x3, desc: "Up, Down and NC results of each miRNA in each biospecimen." },
  { id: "overlap", label: "Shared across tissues", icon: BarChart3, desc: "How many miRNAs each combination of tissues has in common." },
] as const;

/** "Shared across tissues" is hidden for now (curators, 9 Oct 2026); its code is kept. */
const SHOW_OVERLAP = false;

export default function TissueExplorerPage() {
  const [params, setParams] = useSearchParams();
  const view = SHOW_OVERLAP && params.get("view") === "overlap" ? "overlap" : "matrix";

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold">miRNA × Tissue Explorer</h1>
        <p className="mt-2 text-muted-foreground">
          See how many Up, Down and NC results each of the {STATS.uniqueMirnas} miRNAs has in each of the{" "}
          {STATS.biospecimens} biospecimens. Biospecimens are shown exactly as reported by the authors. Every number is a
          count of curated results; click it to see those results.
        </p>
      </header>

      {SHOW_OVERLAP && (
      <div className="grid gap-3 sm:grid-cols-2 max-w-3xl" role="tablist">
        {VIEWS.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setParams(id === "matrix" ? {} : { view: id }, { replace: true })}
            className={cn(
              "card-academic p-4 text-left transition-colors flex gap-3 items-start",
              view === id ? "border-primary ring-1 ring-primary bg-secondary/40" : "hover:border-primary/50",
            )}
          >
            <span className={cn("h-9 w-9 shrink-0 rounded-md inline-flex items-center justify-center", view === id ? "bg-primary text-primary-foreground" : "bg-secondary text-primary-dark")}>
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold">{label}</span>
              <span className="block text-sm text-muted-foreground">{desc}</span>
            </span>
          </button>
        ))}
      </div>
      )}

      {view === "matrix" ? <TissueMatrix /> : <TissueOverlap />}
    </div>
  );
}
