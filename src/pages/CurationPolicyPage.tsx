import { Link } from "react-router-dom";
import { NOTE_DOUBLE_HASH, NOTE_HASH } from "@/data/notation";

// Policy text supplied by the ALSmiR curators (ALSmiR_corrections.pptx, "Curation Policy").
const SECTIONS = [
  {
    title: "Inclusion criteria",
    body: [
      "We include evidence records from original, peer-reviewed human studies comparing patients with ALS and healthy controls in biological fluids or their components, with PCR-based measurement or validation of miRNA expression.",
      "For author-submitted data, ALSmiR also accepts eligible miRNA expression findings from ALS patients vs healthy controls from other tissues, provided they originate from a published, peer-reviewed ALS study.",
    ],
  },
  {
    title: "miRNA nomenclature",
    body: ["We record miRNA names exactly as reported in the source publication. A miRNA is linked to its miRBase (release 23.1) entry only when the reported name is an exact match to a miRBase entry; other names are shown as reported, without a link. If a reported name uses discontinued nomenclature or lacks 3p/5p information, we review the source material and contact authors when needed. We do not assign arms without evidence."],
  },
  {
    title: "Biospecimens",
    body: ["We keep distinct biospecimens and components separate, including serum, plasma, CSF, peripheral blood, blood-cell fractions, and extracellular vesicle-enriched fractions. Each biospecimen is recorded as reported by the authors."],
  },
  {
    title: "Expression results",
    body: ["We record expression results as reported in the source publication, distinguishing upregulation, downregulation, and no significant change from information that was not reported or could not be interpreted. We do not infer expression direction or recalculate reported statistical results."],
  },
  {
    title: "Independence",
    body: ["We do not rank, endorse, or promote individual miRNA biomarkers. ALSmiR curators and developers have no financial interest in any listed biomarker candidate."],
  },
  {
    title: "Source traceability",
    body: ["We link each evidence record to its source publication and associated cohort, biospecimen, assay, and comparison so users can verify its attribution and context and cite the original study."],
  },
];

export default function CurationPolicyPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">Curation policy</h1>
        <p className="mt-2 text-muted-foreground">
          How evidence is selected and recorded in ALSmiR.
        </p>

        <div className="mt-8 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title} className="section-accent">
              <h2 className="font-semibold">{s.title}</h2>
              {s.body.map((p) => <p key={p} className="mt-1 text-foreground/90 leading-relaxed">{p}</p>)}
            </section>
          ))}

          <section className="section-accent">
            <h2 className="font-semibold">Notation</h2>
            <ul className="mt-1 space-y-1 text-foreground/90 leading-relaxed">
              <li><span className="font-medium">#</span> {NOTE_HASH}</li>
              <li><span className="font-medium">##</span> {NOTE_DOUBLE_HASH}</li>
            </ul>
          </section>

          <section className="section-accent">
            <h2 className="font-semibold">Report an error or suggest a correction</h2>
            <p className="mt-1 text-foreground/90 leading-relaxed">
              Please include the publication DOI, miRNA species, and a short description of the issue, and send it through
              the <Link to="/contact" className="text-primary-dark underline">contact page</Link>.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Looking for guidance on what to report in your own study? See the{" "}
          <Link to="/database/curation" className="text-primary-dark underline">suggested reporting practices</Link>.
        </p>
      </article>
    </div>
  );
}
