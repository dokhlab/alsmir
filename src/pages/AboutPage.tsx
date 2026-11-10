import { useState } from "react";
import { Link } from "react-router-dom";
import { STATS, roundedCount } from "@/data/queries";
import { CITATION, CITATION_TEXT, CITATION_URL } from "@/lib/citation";
import {
  ArrowRight,
  Search,
  FileEdit,
  CheckCircle2,
  Link2,
  Users,
  BookOpen,
  Unlock,
  ExternalLink,
  Quote as QuoteIcon,
  Flag,
  Beaker,
  Copy,
  Check,
  ChevronDown,
  Play,
  Sparkles,
  Layers,
  Database,
  BarChart3,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CURATION_STEPS = [
  {
    step: "01",
    icon: Search,
    title: "Study screening",
    desc: "Eligible studies are identified by curators or contributed by researchers and screened using predefined criteria.",
  },
  {
    step: "02",
    icon: FileEdit,
    title: "Structured extraction",
    desc: "Data are carefully extracted using standardized templates in a blinded workflow to minimize bias.",
  },
  {
    step: "03",
    icon: CheckCircle2,
    title: "Reviewer consensus",
    desc: "Extracted records are double-reviewed and resolved through consensus for accuracy and consistency.",
  },
  {
    step: "04",
    icon: Link2,
    title: "Source traceability",
    desc: "Each miRNA record remains linked to its original publication for transparent context and verification.",
  },
];

const SCOPE_ROWS = [
  {
    label: "Current scope",
    text: "Human ALS, liquid biopsy studies, and PCR-based evidence.",
  },
  {
    label: "Evidence catalogue",
    text: "ALSmiR reports curated published findings; it is not a clinical diagnosis tool.",
  },
  {
    label: "Interpretation",
    text: "Interpret findings in light of cohort size, biospecimen type, assay method, clinical subgroup, and replication across independent studies.",
  },
];

const HELP_ITEMS = [
  {
    icon: Flag,
    label: "Report a data issue",
    text: "If you identify a record that may not accurately reflect the source publication, please contact us so the team can review it.",
  },
  {
    icon: Beaker,
    label: "Contribute to expansion",
    text: "We welcome collaboration to expand ALSmiR beyond liquid biopsies, including muscle biopsy data, CNS or post-mortem tissue, and patient-derived cellular models.",
  },
];

const ABOUT_STATS = [
  { v: roundedCount(STATS.results), l: "Evidence records" },
  { v: "PCR-based", l: "Evidence type" },
  { v: "Open access", l: "Access model" },
  { v: "CC BY 4.0", l: "License" },
];

export default function AboutPage() {
  const [activePersona, setActivePersona] = useState<"researchers" | "clinicians" | "data-scientists">("researchers");
  const [openScope, setOpenScope] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  const citationText = CITATION_TEXT;

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(citationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const personas = [
    {
      id: "researchers" as const,
      icon: Beaker,
      label: "Researchers",
      whoItIsFor: "Researchers working with ALS-associated miRNAs and biomarker research.",
      whatItSupports: "Literature review, biomarker prioritization, experimental planning, and comparison of curated evidence across experimental conditions.",
      scenarios: [
        "Sift through hundreds of published journals instantly by filtering for specific miRNA names.",
        "Assess experimental methodologies (e.g. RT-qPCR, TaqMan) to select robust validation controls.",
        "Discover candidate biomarkers that show highly replicated upregulation across independent cohorts."
      ]
    },
    {
      id: "clinicians" as const,
      icon: Users,
      label: "Clinicians",
      whoItIsFor: "Translational clinicians, neurologists, and medical researchers.",
      whatItSupports: "Cohort comparison, clinical subgroup analysis, and tracing molecular findings back to patient-level epidemiological metadata.",
      scenarios: [
        "Verify if specific miRNAs correlate with sporadic ALS vs. familial ALS clinical subgroups.",
        "Compare miRNA profiles from accessible biofluids like Plasma, Serum, or Cerebrospinal Fluid (CSF).",
        "Contextualize patient demographics and cohort sizes used in historical clinical trials."
      ]
    },
    {
      id: "data-scientists" as const,
      icon: Layers,
      label: "Data Scientists",
      whoItIsFor: "Bioinformaticians, systems biologists, and computational scientists.",
      whatItSupports: "Computational reuse of curated evidence, structured data downloading, targets network mapping, and database integration.",
      scenarios: [
        "Download highly standardized, clean evidence matrices without noisy literature formatting.",
        "Cross-reference curated database indices with RNA-seq networks, pathway enrichments, or target genes.",
        "Feed machine learning classifiers with vetted, clinical differential expression gold-standards."
      ]
    }
  ];

  return (
    <div className="bg-background text-foreground min-h-screen selection:bg-primary/30">
      
      {/* PREMIUM HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary/50 via-background to-secondary/20 border-b border-border/40 text-foreground">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,188,212,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,188,212,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" aria-hidden />
        {/* Glowing backdrop meshes */}
        <div className="absolute -top-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-primary/10 blur-3xl opacity-60" aria-hidden />
        <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-accent/5 blur-3xl opacity-30" aria-hidden />

        <div className="container-page relative py-20 md:py-32 flex flex-col justify-center min-h-[500px]">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-primary-dark px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 self-start">
            <Sparkles className="h-3 w-3" />
            About ALSmiR Consortium
          </div>

          <h1 className="mt-8 font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-4xl leading-[1.1] text-foreground">
            ALSmiR is a curated evidence resource for miRNAs studied in amyotrophic lateral sclerosis (ALS) patients.
          </h1>

          <p className="mt-8 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed font-sans">
            ALSmiR structures published ALS miRNA findings with their biospecimen, assay method,
            patient group, and source study, so users can search the evidence, compare results across
            contexts, and interpret findings in light of ALS heterogeneity.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary-dark text-white font-medium shadow-sm hover:shadow-primary/20 transition-all duration-300">
              <Link to="/database">
                Explore the Database <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary/45 hover:border-primary bg-transparent text-primary-dark hover:bg-primary/10 transition-all">
              <a href="#how-to-use">
                How to Get Started
              </a>
            </Button>
          </div>

          {/* Elegant Stats Grid */}
          <div className="mt-20 grid gap-4 grid-cols-2 lg:grid-cols-4 max-w-4xl">
            {ABOUT_STATS.map((s) => (
              <div 
                key={s.l} 
                className="relative overflow-hidden rounded-xl border border-border bg-card p-5 group hover:border-primary/40 hover:shadow-md transition-all duration-300 shadow-sm"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/30 group-hover:bg-primary transition-all duration-300" />
                <div className="font-serif text-3xl md:text-4xl font-bold text-primary-dark tracking-tight">{s.v}</div>
                <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUICK GUIDE SECTION - WHAT IS THE USER GOING TO GET? (IMPROVES UTILITY) */}
      <section id="how-to-use" className="py-20 bg-secondary/10 border-b border-border/30">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Intuitive Workflow</p>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold tracking-tight">
              What can you do with ALSmiR?
            </h2>
            <p className="mt-4 text-muted-foreground text-sm md:text-base">
              ALSmiR transforms raw scientific publications into structured, actionable, and searchable intelligence.
              Here is how researchers utilize our open-access catalog.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Search,
                step: "01",
                title: "Search & Filter Evidence",
                text: "Query by microRNA name, biological specimen type, clinical stratification, or citation. Instantly isolate upregulated or downregulated candidates.",
                cta: "Search page",
                to: "/database/evidence"
              },
              {
                icon: Database,
                step: "02",
                title: "Analyze Assay Context",
                text: "Drill down into quantitative details: sample size, extraction method, control groups, replication, and standard clinical descriptors.",
                cta: "Explore biospecimens",
                to: "/database/biospecimens"
              },
              {
                icon: BarChart3,
                step: "03",
                title: "Compare & Export Data",
                text: "Directly download structured summaries for bioinformatics modeling or print ready-to-cite biospecimen evidence tables in one click.",
                cta: "View statistics",
                to: "/database/stats"
              }
            ].map((step, idx) => (
              <div 
                key={idx} 
                className="relative p-6 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-4xl font-serif font-black text-primary/10 group-hover:text-primary/20 transition-colors">{step.step}</span>
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <step.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="font-serif text-lg font-bold mb-2 group-hover:text-primary transition-colors">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">{step.text}</p>
                </div>
                <Link to={step.to} className="inline-flex items-center text-xs font-semibold text-primary hover:text-primary-dark mt-auto">
                  {step.cta} <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DYNAMIC INTERACTIVE PERSONA EXPLORATION SECTION */}
      <section className="py-20 bg-background border-b border-border/30">
        <div className="container-page">
          <div className="max-w-3xl mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Targeted Utility</p>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold tracking-tight">
              Designed for the entire ALS community
            </h2>
            <p className="mt-4 text-muted-foreground text-sm md:text-base">
              ALSmiR serves the specific needs of diverse scientific stakeholders. Click on your role below to explore how the database supports your research efforts.
            </p>
          </div>

          {/* Persona selector tabs */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-border/40 pb-4">
            {personas.map((p) => {
              const Icon = p.icon;
              const isActive = activePersona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePersona(p.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold tracking-wide transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/10"
                      : "bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Active Persona Panel Content */}
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-stretch">
            {personas.map((p) => {
              if (p.id !== activePersona) return null;
              return (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-8 shadow-sm flex flex-col justify-between animate-fade-in">
                  <div className="space-y-6">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-primary font-bold">Target Audience Profile</span>
                      <h3 className="font-serif text-2xl font-bold mt-2 text-foreground">{p.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1 italic">Designed for: {p.whoItIsFor}</p>
                    </div>

                    <div className="h-px bg-border/40" />

                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Core Supports</h4>
                      <p className="text-base text-foreground leading-relaxed">{p.whatItSupports}</p>
                    </div>

                    <div className="h-px bg-border/40" />

                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-3">Concrete Use Cases</h4>
                      <ul className="space-y-2.5">
                        {p.scenarios.map((s, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-2.5 text-sm text-foreground/90">
                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="h-3 w-3" />
                            </span>
                            <span className="leading-relaxed">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border/30 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Always Open-Access</span>
                    <Button asChild size="sm" variant="hero">
                      <Link to="/database">
                        Launch database <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Scientific Rigor / Curation sidebar preview alongside active persona */}
            <div className="rounded-2xl border border-primary/20 bg-secondary/35 p-8 flex flex-col justify-between relative overflow-hidden shadow-sm">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,188,212,0.06),transparent_60%)]" aria-hidden />
              <div className="relative space-y-6">
                <div>
                  <span className="text-xs uppercase tracking-wider text-primary font-bold">Standard of Excellence</span>
                  <h3 className="font-serif text-2xl font-bold mt-2 text-foreground">Open & Standardized</h3>
                  <p className="text-sm text-foreground/90 mt-2 leading-relaxed">
                    ALSmiR values transparency and evidence traceability. Every item added to our database follows a structured multi-step curation plan, verified by clinical consensus to ensure correct parameters and citation integrity.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 text-primary-dark">
                      <Unlock className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground/90">CC BY 4.0 International Licensing</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 text-primary-dark">
                      <ExternalLink className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground/90">Direct DOI links to source publications</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 text-primary-dark">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground/90">Strict study criteria (Human Liquid Biopsies)</span>
                  </div>
                </div>
              </div>

              <div className="relative mt-8 pt-6 border-t border-primary/20">
                <blockquote className="text-xs italic text-muted-foreground leading-relaxed pl-3 border-l-2 border-primary">
                  &ldquo;A standard evidence repository is critical to filter out publication noise and prioritize highly replicated markers for prospective ALS cohorts.&rdquo;
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TIMELINE CURATION FLOW - ELEVATED VISUAL WORKFLOW */}
      <section className="py-20 bg-secondary/10 border-b border-border/30">
        <div className="container-page">
          <div className="max-w-3xl mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Scientific Curation Pipeline</p>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold tracking-tight">
              How the evidence is curated
            </h2>
            <p className="mt-4 text-muted-foreground text-sm md:text-base">
              To minimize publishing bias and guarantee high data quality, each database record travels through our standardized curation cycle.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
            {/* Connecting line for timeline */}
            <div className="absolute top-[48px] left-[50px] right-[50px] h-0.5 bg-gradient-to-r from-primary/10 via-primary to-primary/10 hidden lg:block -z-10" aria-hidden />

            {CURATION_STEPS.map(({ step, icon: Icon, title, desc }, idx) => (
              <div
                key={step}
                className="group relative rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
              >
                {/* Glow border effect on hover */}
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-mono font-bold text-primary-dark/60 tracking-wider">STEP {step}</span>
                  <span className="h-6 w-6 rounded-full bg-secondary text-primary-dark font-mono text-[10px] font-bold flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    {idx + 1}
                  </span>
                </div>

                <div className="h-12 w-12 rounded-xl bg-secondary text-primary-dark inline-flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors mb-4">
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="font-serif text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DYNAMIC INTERACTIVE ACCORDION FOR SCOPE & LIMITATIONS */}
      <section className="py-20 bg-background border-b border-border/30">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr] items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Science Boundaries</p>
              <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold tracking-tight">
                Scope and limitations
              </h2>
              <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
                As a trustworthy scientific tool, ALSmiR defines its search boundaries and evidence constraints clearly. 
                Use this guide to interpret findings accurately.
              </p>
              
              <div className="mt-8 p-5 rounded-xl bg-secondary/30 border border-border/60">
                <h4 className="font-serif text-sm font-bold text-primary-dark flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4" /> Important Curation Note
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ALSmiR structures published evidence rather than asserting definitive clinical diagnostics. Always interpret data through study designs, replication models, and cohort sizes.
                </p>
              </div>
            </div>

            {/* Scope Rows Accordion */}
            <div className="space-y-3">
              {SCOPE_ROWS.map(({ label, text }, idx) => {
                const isOpen = openScope === idx;
                return (
                  <div 
                    key={label}
                    className={`rounded-xl border transition-all duration-300 ${
                      isOpen ? "border-primary/50 bg-secondary/20 shadow-sm" : "border-border bg-card hover:bg-secondary/10"
                    }`}
                  >
                    <button
                      onClick={() => setOpenScope(isOpen ? null : idx)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                    >
                      <span className="text-sm font-bold uppercase tracking-wider text-primary-dark">{label}</span>
                      <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                        isOpen ? "transform rotate-180 text-primary" : ""
                      }`} />
                    </button>
                    
                    <div 
                      className={`overflow-hidden transition-all duration-300 ${
                        isOpen ? "max-h-40 border-t border-border/40" : "max-h-0"
                      }`}
                    >
                      <p className="px-6 py-5 text-sm text-foreground/90 leading-relaxed bg-card/40">
                        {text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ACCESS & REUSE WITH COPY CITE TRIGGER TOOL */}
      <section className="py-20 bg-secondary/10 border-b border-border/30">
        <div className="container-page">
          <div className="max-w-3xl mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Access Rights</p>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold tracking-tight">
              Access and reuse
            </h2>
            <p className="mt-4 text-muted-foreground text-sm md:text-base">
              The ALSmiR Database remains dedicated to serving the open scientific community. All entries are licensed under standard CC BY 4.0 models.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Unlock,
                label: "Open access",
                text: "Search, browse, filter, compare, and export curated evidence without paywalls or login constraints.",
              },
              {
                icon: ExternalLink,
                label: "Source-linked",
                text: "Each evidence entry remains explicitly bound to its source publication to support robust data citation, verification, and reuse.",
              }
            ].map(({ icon: Icon, label, text }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary-dark inline-flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-xs uppercase tracking-widest text-primary-dark font-bold">{label}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}

            {/* How to Cite card with clipboard interactive button */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary-dark inline-flex items-center justify-center shrink-0">
                  <QuoteIcon className="h-5 w-5" />
                </div>
                {/* Copy feedback action */}
                <button
                  onClick={handleCopyCitation}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                    copied 
                      ? "bg-success text-white" 
                      : "bg-secondary text-primary-dark hover:bg-primary hover:text-white"
                  }`}
                  aria-label="Copy citation text"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" /> Copy Cite
                    </>
                  )}
                </button>
              </div>

              <h4 className="text-xs uppercase tracking-widest text-primary-dark font-bold">How to cite</h4>
              
              <div className="space-y-3 text-sm text-foreground/90 leading-relaxed flex-1">
                <p className="text-xs text-muted-foreground">Please cite ALSmiR and the original publications linked to each record.</p>
                <blockquote className="pl-3 border-l-2 border-primary text-muted-foreground text-[11px] leading-relaxed italic bg-secondary/35 py-2.5 pr-2 rounded">
                  {CITATION.authors} ({CITATION.year}). {CITATION.title}. <em>{CITATION.venue}</em>.
                  {CITATION_URL && <>{" "}<a href={CITATION_URL} target="_blank" rel="noreferrer" className="underline hover:text-primary-dark">{CITATION_URL}</a></>}
                </blockquote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HELP US IMPROVE / CALL TO ACTION */}
      <section className="bg-secondary/20 border-t border-border py-20 relative overflow-hidden text-foreground">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,188,212,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,188,212,0.01)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl opacity-40" aria-hidden />

        <div className="container-page relative">
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-primary-dark mb-8">
            <span className="h-px w-10 bg-primary" />
            Help us improve
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
            {HELP_ITEMS.map(({ icon: Icon, label, text }) => (
              <div 
                key={label} 
                className="rounded-xl border border-border bg-card p-6 flex gap-5 hover:border-primary/30 hover:shadow-sm transition-all duration-300 group"
              >
                <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary-dark inline-flex items-center justify-center border border-primary/25 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-2 tracking-wide">{label}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-4 items-center justify-between pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">Join the international effort in curing ALS microRNA markers databases.</p>
            <Button asChild size="lg" className="bg-primary hover:bg-primary-dark text-white font-medium shadow-md hover:shadow-primary/20 transition-all duration-300">
              <Link to="/contact">
                Contact the Team <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
