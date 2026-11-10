import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight, Search, Upload, Database, BarChart3, Globe2, FlaskConical,
  Calendar, FileText, Users, Microscope, BookOpen, Megaphone, Heart,
} from "lucide-react";

const SUPPORT_ITEMS = [
  {
    title: "Turn findings into usable evidence",
    desc: "Transform ALS miRNA results into structured, traceable records.",
  },
  {
    title: "Make comparison easier",
    desc: "Search miRNAs, biospecimens, patient groups, and study context side by side.",
  },
  {
    title: "Build a shared biomarker resource",
    desc: "Give scientists, clinicians, and data partners a common evidence base.",
  },
];
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATS, roundedCount } from "@/data/queries";
import NeuralCanvas from "@/components/hero/NeuralCanvas";

const EVIDENCE_COUNT_LABEL = roundedCount(STATS.results);

// Database manuscript preprint: add the bioRxiv link here once it is available; the link stays hidden until then.
const BIORXIV_URL = "";

interface ResourceLink { label: string; to: string; external?: boolean }
const RESOURCES: { icon: typeof Calendar; title: string; desc: string; links: ResourceLink[] }[] = [
  {
    icon: BookOpen,
    title: "Publications",
    desc: "Read the ALSmiR database manuscript and the systematic review that informed its development.",
    links: [
      ...(BIORXIV_URL ? [{ label: "bioRxiv preprint", to: BIORXIV_URL, external: true }] : []),
      { label: "Casado Gama et al., 2024", to: "https://doi.org/10.1016/j.ncrna.2024.02.006", external: true },
    ],
  },
  {
    icon: FileText,
    title: "Suggested reporting practices",
    desc: "Key cohort, biospecimen, assay, and result information to report in ALS miRNA studies.",
    links: [{ label: "Read reporting practices", to: "/database/curation" }],
  },
  {
    icon: Megaphone,
    title: "Curation policy",
    desc: "How evidence is selected, recorded, and linked to its source.",
    links: [{ label: "Read the curation policy", to: "/curation-policy" }],
  },
  {
    icon: Calendar,
    title: "How to use ALSmiR",
    desc: "Find evidence, interpret records, and download data.",
    links: [{ label: "Read the user guide", to: "/how-to-use" }],
  },
];

const QUICK_FILTERS = [
  { label: "CSF", to: "/database/evidence?biospecimen=CSF" },
  { label: "Plasma", to: "/database/evidence?biospecimen=Plasma" },
  { label: "Serum", to: "/database/evidence?biospecimen=Serum" },
  { label: "Upregulated", to: "/database/evidence?direction=up" },
  { label: "Downregulated", to: "/database/evidence?direction=down" },
  { label: "No significant change", to: "/database/evidence?direction=none" },
];

// About Us and Lab Portal are hidden for now.
const FOCUS_AREAS = [
  { to: "/database", icon: Database, title: "Database", desc: "Evidence, miRNAs, biospecimens, and statistics." },
  { to: "/how-to-use", icon: BookOpen, title: "How to Use", desc: "A quick guide to searching, reading, and downloading the evidence." },
  { to: "/submit", icon: Upload, title: "Submit Data", desc: "Add your ALS miRNA findings to the open-access database." },
];

/** "Support our work" and "Where to start" sections are hidden for now. */
const SHOW_SUPPORT = false;
const SHOW_WHERE_TO_START = false;

export default function HomePage() {
  const [q, setQ] = useState("");
  const nav = useNavigate();

  return (
    <div>
      {/* Hero — canvas fills the area; text is pushed to the lower half so the graph breathes */}
      <section className="relative isolate flex flex-col overflow-hidden border-b border-border bg-[#0a1220] min-h-[640px] md:min-h-[720px] lg:min-h-[820px]">
        <NeuralCanvas className="absolute inset-0 h-full w-full" />
        {/* Subtle vignette only at very bottom for button legibility, canvas stays visible */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0a1220]/40 to-transparent"
          aria-hidden
        />
        <div className="relative mt-auto pl-6 sm:pl-10 lg:pl-14 pr-6 pb-8 md:pb-10 lg:pb-12">
          <div
            className="max-w-md lg:max-w-lg text-background"
            style={{ textShadow: "0 2px 10px rgba(10,18,32,0.6), 0 1px 2px rgba(10,18,32,0.5)" }}
          >
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
              Advancing miRNA biomarkers for ALS, together.
            </h1>
            <p className="mt-4 text-sm md:text-base text-background/85 leading-relaxed">
              An international community of clinicians and researchers making ALS miRNA evidence searchable,
              comparable, and reusable.
            </p>
            <div className="mt-6 flex flex-wrap gap-3" style={{ textShadow: "none" }}>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-background/60 text-background hover:bg-background hover:text-foreground">
                <Link to="/database">
                  Browse the Database <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Search the database */}
      <section className="border-b border-border bg-secondary/40">
        <div className="container-page py-12 md:py-14">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary-dark font-medium mb-2">Search the evidence base</p>
              <h2 className="font-serif text-2xl md:text-3xl font-semibold">Find a miRNA, biospecimen, or ALS clinical feature.</h2>
              <p className="mt-2 text-muted-foreground max-w-2xl">
                {EVIDENCE_COUNT_LABEL} curated ALS miRNA entries from PCR-based liquid-biopsy studies.
              </p>
            </div>
            <Link to="/database/evidence" className="text-sm font-medium text-primary-dark hover:underline whitespace-nowrap">
              View all evidence <ArrowRight className="h-4 w-4 ml-1 inline-block" />
            </Link>
          </div>
          <form
            className="mt-6 flex max-w-2xl items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              nav(`/database/evidence?q=${encodeURIComponent(q)}`);
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. miR-206, CSF, sporadic ALS, plasma…"
                className="pl-9 h-12 bg-background"
              />
            </div>
            <Button type="submit" variant="hero" size="lg">Search</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_FILTERS.map((f) => (
              <Link
                key={f.label}
                to={f.to}
                className="pill border border-border bg-background hover:border-primary hover:bg-secondary transition-colors text-foreground"
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Resources and documentation — teal band */}
      <section className="bg-primary text-primary-foreground">
        <div className="container-page py-14 md:py-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold">Resources and documentation</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {RESOURCES.map((a) => (
              <article key={a.title} className="flex flex-col">
                <a.icon className="h-7 w-7 mb-4 opacity-90" strokeWidth={1.5} />
                <h3 className="font-serif text-xl font-semibold leading-snug">{a.title}</h3>
                <p className="mt-3 text-sm leading-relaxed opacity-90 flex-1">{a.desc}</p>
                <div className="mt-4 flex flex-col items-start gap-2">
                  {a.links.map((l) => {
                    const cls = "inline-flex items-center text-sm font-medium border-b border-primary-foreground/60 pb-0.5 hover:border-primary-foreground";
                    const body = <>{l.label} <ArrowRight className="h-4 w-4 ml-1" /></>;
                    return l.external
                      ? <a key={l.label} href={l.to} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
                      : <Link key={l.label} to={l.to} className={cls}>{body}</Link>;
                  })}
                </div>
              </article>
            ))}
          </div>
          <p className="mt-10 text-xs opacity-60 leading-relaxed border-t border-primary-foreground/20 pt-4">
            The database is updated annually with contributions from collaborators.
          </p>
        </div>
      </section>

      {/* By the numbers */}
      <section className="border-b border-border">
        <div className="container-page py-14 md:py-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold">By the numbers</h2>
          </div>
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-lg border border-border">
            {[
              { v: STATS.results, l: "Evidence records" },
              { v: STATS.uniqueMirnas, l: "miRNA species" },
              { v: STATS.studies, l: "Studies included" },
              { v: STATS.biospecimens, l: "Biospecimens covered" },
            ].map((s) => (
              <div key={s.l} className="bg-card p-8">
                <div className="text-4xl md:text-5xl font-semibold text-primary-dark tabular-nums tracking-tight">{s.v}</div>
                <div className="mt-2 text-sm text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Focus areas */}
      {SHOW_WHERE_TO_START && (
      <section className="border-b border-border">
        <div className="container-page py-14 md:py-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold">Where to start</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FOCUS_AREAS.map(({ to, icon: Icon, title, desc }) => (
              <Link
                key={to}
                to={to}
                className="group card-academic p-6 hover:border-primary hover:shadow-md transition-all"
              >
                <div className="h-11 w-11 rounded-md bg-secondary text-primary-dark inline-flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-serif text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
                <span className="mt-5 inline-flex items-center text-sm text-primary-dark font-medium">
                  Open <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Support — AES-style donation appeal */}
      {SHOW_SUPPORT && (
      <section className="border-b border-border bg-secondary/30">
        <div className="container-page py-16 md:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-start">
            <div>
              <div className="flex items-center gap-4 mb-5">
                <span className="text-xs uppercase tracking-[0.2em] text-primary-dark font-medium">Support our work</span>
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold leading-tight">
                Support the future of ALS biomarker research.
              </h2>
              <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Help keep ALSmiR open, curated, and useful for researchers and clinicians working
                toward better ALS biomarkers.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary-dark">
                  <Link to="/contact?subject=gift">
                    <Heart className="h-4 w-4 mr-1.5" /> Make a Gift
                  </Link>
                </Button>
                {/* TODO: confirm partnership model with Nikolay before publishing */}
                <Button asChild size="lg" variant="outline">
                  <Link to="/contact?subject=partnership">
                    Become a partner <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="card-academic p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.18em] text-primary-dark font-medium mb-6">
                What your support / partnering makes possible
              </p>
              <ul className="space-y-6">
                {SUPPORT_ITEMS.map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <p className="font-serif text-base font-semibold leading-snug">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Contribute data CTA */}
      <section className="bg-foreground text-background">
        <div className="container-page py-16 md:py-20 grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-background/70 mb-3">Contribute data</p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold leading-tight">
              Have ALS miRNA results to share?
            </h2>
            <p className="mt-4 text-background/80 max-w-2xl leading-relaxed">
              Make your findings easier to discover, compare, and reuse. Add your published PCR-based miRNA expression
              results and help build a shared, open-access resource for ALS research.
            </p>
            <p className="mt-3 text-sm text-background/70 max-w-2xl leading-relaxed">
              Submissions are reviewed by the ALSmiR curators, and accepted results remain linked to your publication.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary-dark">
              <Link to="/submit">
                <Upload className="h-4 w-4 mr-1.5" /> Submit data
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-background/40 text-background hover:bg-background hover:text-foreground">
              <Link to="/curation-policy">
                Read the curation policy <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
