import { Link } from "react-router-dom";
import { Database, Dna, FlaskConical, BarChart3, FileText, Share2, ArrowRight } from "lucide-react";

const CARDS = [
  { to: "/database/evidence", label: "Browse evidence", icon: Database, desc: "Search by miRNA name, DOI, or author. Use the filters to narrow the results, then select View details to examine a complete record." },
  { to: "/database/mirnas", label: "Browse miRNAs", icon: Dna, desc: "Per-miRNA evidence breakdown across studies and tissues." },
  { to: "/database/biospecimens", label: "Browse biospecimens", icon: FlaskConical, desc: "Per-tissue evidence breakdown across studies" },
  { to: "/database/stats", label: "Statistics & insights", icon: BarChart3, desc: "Descriptive counts by records, miRNAs, studies and biospecimens." },
  { to: "/database/curation", label: "Reporting practices", icon: FileText, desc: "Suggested information to report in ALS miRNA studies." },
  { to: "/database/network",  label: "miRNA × Tissue Explorer", icon: Share2,   desc: "Explore miRNA findings across biospecimens and identify shared miRNAs." },
];

export default function DatabaseOverviewPage() {
  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-primary mb-2">ALS miRNA evidence database.</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Explore the ALSmiR data</h1>
        <p className="mt-3 text-muted-foreground">
          Search miRNA expression findings and explore their publication, cohort, biospecimen, and assay information.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ to, label, icon: Icon, desc }) => (
          <Link
            key={to}
            to={to}
            className="card-academic p-6 group hover:border-primary transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-secondary text-primary-dark inline-flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-semibold">{label}</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
            <span className="mt-4 inline-flex items-center text-sm text-primary-dark font-medium">
              Open <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
