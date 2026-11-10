const SECTIONS = [
  {
    title: "Cohort",
    body: "Details such as diagnostic criteria, ALS subtype, site of onset, disease stage, ALSFRS/ALSFRS-R, mutation status when screened, treatment, age, sex, control group definition, sample size, and relevant comorbidities help define the clinical context of the miRNA finding.",
  },
  {
    title: "Biospecimen and collection",
    body: "Useful details may include sample type, collection tube or additive when relevant, fasting status, time of collection, time from symptom onset or diagnosis to sampling, processing and storage conditions, freeze–thaw history, hemolysis assessment for blood-derived samples, and EV enrichment approach when applicable.",
  },
  {
    title: "Assay and analysis",
    body: "Method details such as RNA extraction, assay platform, use of modern and complete miRNA nomenclature, normalization strategy, endogenous or spike-in controls, quality control, and handling of replicates, outliers, or missing values help clarify how the signal was measured and analyzed.",
  },
  {
    title: "Results and reuse",
    body: "Direction of change, effect size or fold change, p-value, multiple testing correction, and significant as well as non-significant findings help others interpret the result. When feasible, normalized expression data with relevant metadata can facilitate future comparisons and synthesis.",
  },
];

export default function CurationPage() {
  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="mt-2 text-3xl font-semibold">Suggested reporting practices</h1>
      <p className="mt-2 text-muted-foreground">
        A practical guide to improve evidence reuse and cross-study comparability in ALS miRNA biomarker studies.
      </p>
      <p className="mt-4 text-foreground/90">
        Not every study can report every detail. This page highlights information that can make ALS miRNA findings easier for others to interpret, compare, and build upon.
      </p>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((s, i) => (
          <section key={s.title} className="section-accent">
            <h2 className="font-semibold">{i + 1}. {s.title}</h2>
            <p className="mt-1 text-foreground/90 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}

