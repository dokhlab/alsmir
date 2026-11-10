import { Link } from "react-router-dom";
import { NOTE_DOUBLE_HASH, NOTE_HASH } from "@/data/notation";

interface Step {
  title: string;
  to?: { href: string; label: string };
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: "Browse the evidence",
    to: { href: "/database/evidence", label: "Open the evidence table" },
    body: (
      <>
        <p>
          The <Link to="/database/evidence" className="text-primary-dark underline">Evidence table</Link> contains all curated miRNA expression results in
          ALSmiR. Each row represents one miRNA expression result linked to its specific cohort, biospecimen, comparison,
          and publication.
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Search by miRNA name (e.g., miR-206), DOI, author, or publication ID.</li>
          <li>Filter by biospecimen, expression direction, and publication year.</li>
          <li>Sort by clicking a column header; click again to reverse the order.</li>
          <li>Select any row to view the complete record.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Read a result",
    body: (
      <>
        <p>The main columns summarize the information needed to interpret each finding:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><span className="font-medium">Expression direction</span>: ↑ Up (higher in ALS), ↓ Down (lower in ALS), = NC (no significant change).</li>
          <li><span className="font-medium">ALS group/subgroup</span>: the patient group represented by that result.</li>
          <li><span className="font-medium">ALS (N) / HC (N)</span>: the number of patients with ALS and healthy controls analyzed for that result.</li>
          <li><span className="font-medium">Evidence count</span>: the number of results recorded in ALSmiR for that miRNA.</li>
        </ul>
        <p className="mt-2">
          Opening a row shows the complete curated record, including the miRNA result, biospecimen and assay information,
          patient cohort or subgroup, diagnostic criteria, mutations, sex, site of onset, age, disease duration,
          ALSFRS/ALSFRS-R, treatment, healthy-control information, and source publication, when reported.
        </p>
      </>
    ),
  },
  {
    title: "Interpret results in context",
    body: (
      <>
        <p>
          The same miRNA may have different results across cohorts, ALS subgroups, biospecimens, or publications. ALSmiR
          preserves these findings separately so that each result can be interpreted in its original clinical and
          methodological context.
        </p>
        <p className="mt-2">
          A no significant change (NC) result means that the miRNA was tested but no statistically significant difference
          was reported for that comparison. It does not indicate missing or untested information.
        </p>
      </>
    ),
  },
  {
    title: "Understand record IDs",
    body: (
      <>
        <p>Each result has a unique identifier, such as <code className="font-mono">PUB0001_C01_R00001</code>:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><span className="font-medium">PUB</span> identifies the publication.</li>
          <li><span className="font-medium">C</span> identifies the cohort or subgroup within the publication.</li>
          <li><span className="font-medium">R</span> identifies the individual miRNA result associated with that cohort.</li>
        </ul>
        <p className="mt-2">
          When the same cohort is reported in more than one publication, multiple publication IDs may be retained, for
          example <code className="font-mono">PUB0005_PUB0007_C01</code>.
        </p>
        <p className="mt-2">
          Record IDs support internal traceability and preserve the links between publications, cohorts, and individual
          results.
        </p>
      </>
    ),
  },
  {
    title: "Explore a miRNA",
    to: { href: "/database/mirnas", label: "Browse miRNAs" },
    body: (
      <>
        <p>
          The <Link to="/database/mirnas" className="text-primary-dark underline">miRNAs page</Link> provides a dedicated card for each miRNA represented in
          ALSmiR. Select a miRNA to examine its individual expression results and the publications, cohorts, and
          biospecimens in which it has been studied.
        </p>
        <p className="mt-2">
          Because findings may differ by biospecimen, cohort, or ALS subgroup, individual records should be examined when
          interpreting the evidence for a miRNA.
        </p>
      </>
    ),
  },
  {
    title: "Explore the evidence",
    to: { href: "/database/stats", label: "Open statistics" },
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li><Link to="/database/biospecimens" className="text-primary-dark underline">Biospecimen Explorer</Link>: view miRNA expression results across biospecimens.</li>
        <li><Link to="/database/network" className="text-primary-dark underline">Tissue Explorer</Link>: a matrix showing, for Up, Down or NC, how many results each miRNA has in each biospecimen. Click any number to see the results behind it.</li>
        <li><Link to="/database/stats" className="text-primary-dark underline">Statistics</Link>: explore database summaries, including miRNAs, expression findings, cohort characteristics, countries, biospecimens, and publications.</li>
      </ul>
    ),
  },
  {
    title: "Download the data",
    body: (
      <p>
        Select <span className="font-medium">Download CSV</span> from the{" "}
        <Link to="/database/evidence" className="text-primary-dark underline">Evidence table</Link> to export the currently displayed records. When no filters
        are applied, all records are downloaded with their curated fields, ready for use in Excel, R, or other analysis
        tools.
      </p>
    ),
  },
  {
    title: "Symbols",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li><span className="font-medium">#</span> {NOTE_HASH}</li>
        <li><span className="font-medium">##</span> {NOTE_DOUBLE_HASH}</li>
      </ul>
    ),
  },
  {
    title: "Contribute or report an issue",
    to: { href: "/submit", label: "Submit data" },
    body: (
      <>
        <p>
          Have published human ALS miRNA results to share? <Link to="/submit" className="text-primary-dark underline">Submit data</Link>. Author submissions
          may include liquid-biopsy samples or other human tissues.
        </p>
        <p className="mt-2">
          To report an error or suggest a correction, use the <Link to="/contact" className="text-primary-dark underline">contact page</Link> and include the
          publication DOI, miRNA species, and a short description of the issue.
        </p>
        <p className="mt-2">
          See the <Link to="/curation-policy" className="text-primary-dark underline">Curation Policy</Link> for eligibility and data-handling information.
        </p>
      </>
    ),
  },
];

export default function HowToUsePage() {
  return (
    <div className="container-page py-12 md:py-16">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">How to use ALSmiR</h1>
        <p className="mt-2 text-muted-foreground">
          A quick guide to finding, interpreting, and downloading evidence from ALSmiR.
        </p>

        <ol className="mt-10 space-y-10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-sm font-semibold">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg">{s.title}</h2>
                <div className="mt-2 text-foreground/90 leading-relaxed">{s.body}</div>
                {s.to && (
                  <Link to={s.to.href} className="mt-3 inline-block text-sm font-medium text-primary-dark hover:underline">
                    {s.to.label} →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}
