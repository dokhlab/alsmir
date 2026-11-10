import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Upload, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uniqueBiospecimens } from "@/data/queries";
import { COHORT_FIELDS, DIRECTIONS, MAX_COHORTS, emptyRow, isStarted, type ResultRow } from "@/components/submit/submitFields";

const STEPS = ["Contact & publication", "Cohort & sample", "miRNA results"];
const MAX_FILE_MB = 10;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function SubmitPage() {
  const [step, setStep] = useState(0);
  const [submitter, setSubmitter] = useState({ name: "", email: "", affiliation: "" });
  const [publication, setPublication] = useState({ title: "", doi: "", year: "", location: "" });
  const [cohortCount, setCohortCount] = useState("1");
  const [cohorts, setCohorts] = useState<Record<string, string>[]>([{}]);
  const [rows, setRows] = useState<ResultRow[]>([emptyRow("1")]);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot, hidden from people
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ id: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function updateRow(i: number, k: keyof ResultRow, v: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }

  /** One cohort section per cohort; results assigned to a removed cohort must be reassigned. */
  function changeCohortCount(v: string) {
    setCohortCount(v);
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > MAX_COHORTS) return;
    setCohorts((cs) => Array.from({ length: n }, (_, i) => cs[i] ?? {}));
    setRows((rs) => rs.map((r) => (Number(r.cohort) > n ? { ...r, cohort: "" } : r)));
  }
  const setCohortField = (i: number, k: string, v: string) =>
    setCohorts((cs) => cs.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));

  function checkStep(s: number): string | null {
    if (s === 0) {
      if (!submitter.name.trim()) return "Please enter your name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitter.email.trim())) return "Please enter a valid email address.";
      if (!publication.title.trim()) return "Please enter the study title.";
      if (!publication.doi.trim()) return "Please enter the DOI.";
    }
    if (s === 1) {
      const n = Number(cohortCount);
      if (!Number.isInteger(n) || n < 1) return "Please enter the number of cohorts (a whole number, 1 or more).";
      if (n > MAX_COHORTS) return `Please enter at most ${MAX_COHORTS} cohorts, or contact us for larger studies.`;
    }
    if (s === 2) {
      const started = rows.filter(isStarted);
      if (started.length === 0) return "Please add at least one miRNA result.";
      for (const [i, r] of rows.entries()) {
        if (!isStarted(r)) continue;
        const where = `miRNA result ${i + 1}`;
        if (!r.cohort) return `${where}: please choose the cohort.`;
        if (!r.microRNA.trim()) return `${where}: please enter the miRNA.`;
        if (!r.direction) return `${where}: please choose the expression direction.`;
        if (!r.comparison.trim()) return `${where}: please describe the comparison (e.g. sALS vs HC).`;
      }
      if (!accepted) return "Please confirm the data sharing declaration.";
    }
    return null;
  }

  function next() {
    const err = checkStep(step);
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (!/\.(csv|tsv|txt|xls|xlsx)$/i.test(f.name)) { toast.error("Please choose a CSV, TSV, TXT, XLS or XLSX file."); return; }
    if (f.size > MAX_FILE_MB * 1024 * 1024) { toast.error(`The file must be ${MAX_FILE_MB} MB or smaller.`); return; }
    setFile(f);
  }

  async function submit() {
    const err = checkStep(0) ?? checkStep(1) ?? checkStep(2);
    if (err) { toast.error(err); return; }
    setSending(true);
    try {
      const attachment = file ? { name: file.name, content: await readFileAsBase64(file) } : null;
      const resp = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitter, publication, notes, website,
          cohorts: cohorts.map((fields, i) => ({ cohort: i + 1, ...fields })),
          results: rows.filter(isStarted),
          declaration: accepted, attachment,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) throw new Error(data.error || "The submission could not be sent.");
      setDone({ id: data.id });
    } catch (e) {
      toast.error(`${(e as Error).message} You can also send us a message through the Contact page.`);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setDone(null); setStep(0); setRows([emptyRow("1")]); setCohortCount("1"); setCohorts([{}]); setNotes(""); setFile(null); setAccepted(false);
    setPublication({ title: "", doi: "", year: "", location: "" });
  }

  if (done) {
    return (
      <div className="container-page py-12">
        <div className="max-w-xl mx-auto card-academic p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-success/10 text-success flex items-center justify-center">
            <Check className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Thank you for your submission</h1>
          <p className="mt-2 text-muted-foreground">
            Your submission reference is <span className="font-mono font-medium text-foreground">{done.id}</span>.
            The ALSmiR curators will review it and contact you at {submitter.email}.
          </p>
          <Button className="mt-6" variant="hero" onClick={reset}>Submit another study</Button>
        </div>
      </div>
    );
  }

  const field = (label: string, value: string, onChange: (v: string) => void, opts: { placeholder?: string; required?: boolean; type?: string; list?: string; min?: number; max?: number } = {}) => (
    <div>
      <label className="text-sm font-medium">{label}{opts.required && <span className="text-destructive"> *</span>}</label>
      <Input className="mt-1" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={opts.placeholder} type={opts.type} list={opts.list} min={opts.min} max={opts.max} />
    </div>
  );

  return (
    <div className="container-page py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <p className="text-sm font-medium text-primary">Step {step + 1} of {STEPS.length}</p>
          <h1 className="mt-1 text-3xl font-semibold">Submit your data</h1>
          <p className="mt-2 text-muted-foreground">
            Contribute miRNA expression data from your published ALS study. Fields marked * are required. See
            the <Link to="/curation-policy" className="text-primary-dark underline">curation policy</Link> for
            eligibility criteria. Submitted data are reviewed by the ALSmiR curators before inclusion in the database.
          </p>
        </header>

        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={cn("h-2 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground -mt-6">
          {STEPS.map((s, i) => <span key={s} className={cn(i === step && "text-foreground font-medium")}>{s}</span>)}
        </div>

        <div className="card-academic p-6 space-y-4">
          {/* Honeypot: invisible to people, bots tend to fill it. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)}
            className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden="true" />

          {step === 0 && (
            <>
              <h2 className="font-semibold">Your contact details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("Name", submitter.name, (v) => setSubmitter({ ...submitter, name: v }), { required: true })}
                {field("Email", submitter.email, (v) => setSubmitter({ ...submitter, email: v }), { required: true, type: "email" })}
              </div>
              {field("Affiliation", submitter.affiliation, (v) => setSubmitter({ ...submitter, affiliation: v }), { placeholder: "Institution, department" })}
              <h2 className="font-semibold pt-2">Publication</h2>
              {field("Study title", publication.title, (v) => setPublication({ ...publication, title: v }), { required: true, placeholder: "e.g. Plasma miR-206 as an ALS progression biomarker" })}
              <div className="grid gap-4 sm:grid-cols-3">
                {field("DOI", publication.doi, (v) => setPublication({ ...publication, doi: v }), { required: true, placeholder: "e.g. 10.1016/j.nbd.2026.107473" })}
                {field("Year", publication.year, (v) => setPublication({ ...publication, year: v }), { placeholder: "2026" })}
                {field("Location of study", publication.location, (v) => setPublication({ ...publication, location: v }), { placeholder: "e.g. Italy" })}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">
                Describe each patient cohort and its corresponding sample information. Add the number of cohorts below; a
                separate section will be created for each cohort.
              </p>
              <div className="sm:w-56">
                {field("Number of cohorts", cohortCount, changeCohortCount, { required: true, type: "number", min: 1, max: MAX_COHORTS })}
              </div>
              <datalist id="tissue-suggestions">
                {uniqueBiospecimens().map((t) => <option key={t} value={t} />)}
              </datalist>
              {cohorts.map((c, ci) => (
                <section key={ci} className="rounded-md border border-border p-4 space-y-4" data-testid={`cohort-${ci + 1}`}>
                  <h3 className="font-semibold">Cohort {ci + 1}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {COHORT_FIELDS.map((f) => (
                      <div key={f.key} className={f.wide ? "sm:col-span-2" : undefined}>
                        {field(f.label, c[f.key] ?? "", (v) => setCohortField(ci, f.key, v), {
                          placeholder: f.placeholder, list: f.key === "tissue" ? "tissue-suggestions" : undefined,
                        })}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">miRNA results <span className="text-destructive">*</span></label>
                <p className="text-xs text-muted-foreground">
                  One row per miRNA result. Choose the cohort that produced each result and describe the comparison it
                  represents. Add as many rows as you need.
                </p>
                <div className="space-y-3">
                  {rows.map((r, i) => (
                    <div key={i} className="rounded-md border border-border p-3" data-testid={`result-${i + 1}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">miRNA result {i + 1}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} disabled={rows.length === 1} aria-label="Remove row"><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
                        <div>
                          <label className="text-xs font-medium">Cohort <span className="text-destructive">*</span></label>
                          <Select value={r.cohort} onValueChange={(v) => updateRow(i, "cohort", v)}>
                            <SelectTrigger className="mt-1" aria-label="Cohort"><SelectValue placeholder="Choose" /></SelectTrigger>
                            <SelectContent>
                              {cohorts.map((_, ci) => <SelectItem key={ci} value={String(ci + 1)}>Cohort {ci + 1}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium">miRNA <span className="text-destructive">*</span></label>
                          <Input className="mt-1" aria-label="miRNA" value={r.microRNA} onChange={(e) => updateRow(i, "microRNA", e.target.value)} placeholder="hsa-miR-206" />
                        </div>
                        <div>
                          <label className="text-xs font-medium">Expression direction <span className="text-destructive">*</span></label>
                          <Select value={r.direction} onValueChange={(v) => updateRow(i, "direction", v)}>
                            <SelectTrigger className="mt-1" aria-label="Expression direction"><SelectValue placeholder="Choose" /></SelectTrigger>
                            <SelectContent>
                              {DIRECTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium">ALS group/subgroup</label>
                          <Input className="mt-1" aria-label="ALS group/subgroup" value={r.alsGroup} onChange={(e) => updateRow(i, "alsGroup", e.target.value)} placeholder="e.g. sALS, bulbar ALS" />
                        </div>
                        <div>
                          <label className="text-xs font-medium">Comparison <span className="text-destructive">*</span></label>
                          <Input className="mt-1" aria-label="Comparison" value={r.comparison} onChange={(e) => updateRow(i, "comparison", e.target.value)} placeholder="e.g. sALS vs HC" />
                        </div>
                        <div>
                          <label className="text-xs font-medium">Fold change</label>
                          <Input className="mt-1" aria-label="Fold change" value={r.foldChange} onChange={(e) => updateRow(i, "foldChange", e.target.value)} placeholder="optional" />
                        </div>
                        <div>
                          <label className="text-xs font-medium">Statistical result (as reported)</label>
                          <Input className="mt-1" aria-label="Statistical result" value={r.statistic} onChange={(e) => updateRow(i, "statistic", e.target.value)} placeholder="e.g. p = 0.003; FDR q = 0.04" />
                        </div>
                        <div>
                          <label className="text-xs font-medium">Notes</label>
                          <Input className="mt-1" aria-label="Notes" value={r.notes} onChange={(e) => updateRow(i, "notes", e.target.value)} placeholder="optional" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setRows((r) => [...r, emptyRow(cohorts.length === 1 ? "1" : "")])}><Plus className="h-4 w-4 mr-1" /> Add another miRNA result</Button>
              </div>

              <div>
                <label className="text-sm font-medium">Supplementary table (optional)</label>
                <input ref={fileInput} type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
                {file ? (
                  <div className="mt-1 flex items-center justify-between rounded-md border border-border p-3 text-sm">
                    <span className="truncate">{file.name} · {file.size < 1024 ? `${file.size} bytes` : `${(file.size / 1024).toFixed(0)} KB`}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remove file"><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
                    className="mt-1 w-full border-2 border-dashed border-border rounded-md p-6 text-center text-sm text-muted-foreground hover:border-primary transition-colors"
                  >
                    <Upload className="h-5 w-5 mx-auto mb-1" /> Drop a CSV or Excel file here, or click to browse (max {MAX_FILE_MB} MB)
                  </button>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Notes for the curators (optional)</label>
                <Textarea className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional information relevant to the submitted results or to the curators" />
              </div>

              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} className="mt-0.5" />
                <span>I confirm this data is not under embargo and can be made publicly available under CC BY 4.0. <span className="text-destructive">*</span></span>
              </label>
            </>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || sending}>Back</Button>
          {step < STEPS.length - 1 ? (
            <Button variant="hero" onClick={next}>Next step</Button>
          ) : (
            <Button variant="accent" onClick={submit} disabled={sending}>
              {sending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sending…</> : "Submit study"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
