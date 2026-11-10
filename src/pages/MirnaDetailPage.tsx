import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { recordsForMirna, uniqueMirnas } from "@/data/queries";
import { ResultCounts } from "@/components/data/ResultCounts";
import { EvidenceTable } from "@/components/data/EvidenceTable";
import { MirbaseLink } from "@/components/data/MirbaseLink";


export default function MirnaDetailPage() {
  const { name } = useParams<{ name: string }>();
  const mirnaName = decodeURIComponent(name ?? "");
  const records = recordsForMirna(mirnaName);

  if (records.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">miRNA "{mirnaName}" not found in database.</p>
        <Link to="/database/mirnas" className="text-primary-dark hover:underline mt-2 inline-block">← Back to miRNAs</Link>
      </div>
    );
  }

  const related = uniqueMirnas().filter((m) => m !== mirnaName).slice(0, 5);

  return (
    <div className="space-y-8">
      <Link to="/database/mirnas" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> All miRNAs
      </Link>

      <header className="flex flex-wrap items-start gap-4 justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{mirnaName}</h1>
          <MirbaseLink name={mirnaName} className="mt-1 text-sm" />
        </div>
        <ResultCounts records={records} className="text-base" />
      </header>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="stat-card"><div className="text-3xl font-semibold text-primary tabular-nums">{records.length}</div><div className="text-sm text-muted-foreground mt-1">results</div></div>
        <div className="stat-card"><div className="text-3xl font-semibold text-primary tabular-nums">{new Set(records.map((r) => r.studyId)).size}</div><div className="text-sm text-muted-foreground mt-1">{new Set(records.map((r) => r.studyId)).size === 1 ? "publication" : "publications"}</div></div>
        <div className="stat-card"><div className="text-3xl font-semibold text-primary tabular-nums">{new Set(records.map((r) => r.biospecimenKey)).size}</div><div className="text-sm text-muted-foreground mt-1">tissues</div></div>
        <div className="stat-card"><div className="text-3xl font-semibold text-primary tabular-nums">{records[0].replicated ? "Yes" : "No"}</div><div className="text-sm text-muted-foreground mt-1">replicated in 2+ publications (calculated)</div></div>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-3">All evidence</h2>
        <EvidenceTable records={records} hideFilters pageSize={25} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Related miRNAs</h2>
        <div className="flex flex-wrap gap-2">
          {related.map((m) => (
            <Link key={m} to={`/database/mirnas/${encodeURIComponent(m)}`} className="pill border border-border hover:border-primary hover:bg-secondary">{m}</Link>
          ))}
        </div>
      </section>
    </div>
  );
}
