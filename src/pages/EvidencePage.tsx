import { useSearchParams } from "react-router-dom";
import { EvidenceTable } from "@/components/data/EvidenceTable";
import type { Biospecimen, Direction } from "@/data/types";

export default function EvidencePage() {
  const [params] = useSearchParams();
  const biospecimen = (params.get("biospecimen") ?? "all") as Biospecimen | "all";
  const direction = (params.get("direction") ?? "all") as Direction | "all";
  const q = params.get("q") ?? undefined;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Browse evidence</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Search by miRNA name, DOI, or author. Use the filters to narrow the results, then select View details to
          examine a complete record.
        </p>
      </header>
      <EvidenceTable
        initialBiospecimen={biospecimen}
        initialDirection={direction}
        initialMirna={q}
      />
    </div>
  );
}
