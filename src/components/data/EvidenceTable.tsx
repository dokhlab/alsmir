import { Fragment, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Download, ExternalLink, Info, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DirectionBadge } from "./DirectionBadge";
import type { Biospecimen, Cell, Column, Direction, EvidenceRecord } from "@/data/types";
import { ALL_EVIDENCE, uniqueBiospecimens } from "@/data/queries";
import {
  COHORT_COLUMNS, PUBLICATION_BY_ID, PUBLICATION_COLUMNS, RESULT_COLUMNS, columnLabel,
} from "@/data/dataset";
import { cn } from "@/lib/utils";
import { COHORT_HELP, RESULT_HELP } from "@/data/fieldHelp";
import { NOTE_DOUBLE_HASH } from "@/data/notation";

interface Props {
  initialBiospecimen?: Biospecimen | "all";
  initialDirection?: Direction | "all";
  initialMirna?: string;
  records?: EvidenceRecord[];
  pageSize?: number;
  hideFilters?: boolean;
}

/** An empty Excel cell is shown as a dash. */
const show = (v: Cell | undefined) => (v === null || v === undefined || v.trim() === "" ? "—" : v);

/** Convert a DOI or URL to a working hyperlink. */
export function doiUrl(raw: string): string {
  const s = raw.replace(/\s/g, "");
  if (s.startsWith("http")) return s;
  return `https://doi.org/${s}`;
}

/** Total results per miRNA across the whole database (calculated). */
const EVIDENCE_COUNT = new Map<string, number>();
ALL_EVIDENCE.forEach((r) => EVIDENCE_COUNT.set(r.mirna, (EVIDENCE_COUNT.get(r.mirna) ?? 0) + 1));

const YEARS = Array.from(new Set(ALL_EVIDENCE.map((r) => r.year))).sort((a, b) => a - b);

function csvField(v: string | number | null | undefined): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

/** Every column of 3.miRNA, the linked 2.Cohort row and the linked 1.PUB row, verbatim. */
function downloadCsv(rows: EvidenceRecord[]) {
  const headers = [
    ...RESULT_COLUMNS.map(columnLabel),
    ...COHORT_COLUMNS.map((c) => `Cohort: ${c.group === "CONTROL PATIENTS" ? "Control " : ""}${columnLabel(c)}`),
    ...PUBLICATION_COLUMNS.map((c) => `Publication: ${columnLabel(c)}`),
    "Replicated (calculated)",
    "Evidence count (calculated)",
  ];
  const lines = [headers.map(csvField).join(",")];
  rows.forEach((r) => {
    const res = r.result as unknown as Record<string, Cell>;
    const coh = r.cohort as unknown as Record<string, Cell> | null;
    const pub = r.publication as unknown as Record<string, Cell>;
    lines.push([
      ...RESULT_COLUMNS.map((c) => res[c.key]),
      ...COHORT_COLUMNS.map((c) => (coh ? coh[c.key] : null)),
      ...PUBLICATION_COLUMNS.map((c) => pub[c.key]),
      r.replicated ? "yes" : "no",
      EVIDENCE_COUNT.get(r.mirna) ?? 0,
    ].map(csvField).join(","));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "alsmir-evidence.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** DOI and Author (Year) are shown once, in the Publication Level section. */
const RESULT_DETAIL_COLUMNS = RESULT_COLUMNS.filter((c) => c.key !== "doi" && c.key !== "authorYear");

const isEmpty = (v: Cell | undefined) => v === null || v === undefined || v.trim() === "";

/** Small ⓘ button; the explanation opens only when clicked. */
function FieldDetails({ label, text }: { label: string; text?: string }) {
  if (!text) return <span />;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`What ${label} means`} onClick={(e) => e.stopPropagation()}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-primary-dark hover:bg-secondary">
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" className="w-72 text-xs leading-relaxed">{text}</PopoverContent>
    </Popover>
  );
}

/** Fields of one Excel row that have a value: Field | Value | Details (ⓘ). Empty cells are left out. */
function FieldList({ columns, row, help, prefixControl }: {
  columns: Column[]; row: Record<string, Cell>; help?: Record<string, string>; prefixControl?: boolean;
}) {
  return (
    <dl className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_1.25rem] gap-x-2 gap-y-1.5 items-start">
      {columns.filter((c) => !isEmpty(row[c.key])).map((c) => {
        const label = `${prefixControl && c.group === "CONTROL PATIENTS" && !/control/i.test(columnLabel(c)) ? "Control " : ""}${columnLabel(c)}`;
        return (
          <Fragment key={c.key}>
            <dt className="text-muted-foreground whitespace-pre-line">{label}</dt>
            <dd className="whitespace-pre-line break-words" data-field={c.key}>{row[c.key]}</dd>
            <dd><FieldDetails label={label} text={help?.[c.key]} /></dd>
          </Fragment>
        );
      })}
    </dl>
  );
}

export function RecordDetail({ r }: { r: EvidenceRecord }) {
  // The publication this result is cited from comes first; a shared cohort lists the other(s) after it.
  // A shared cohort lists every publication that used it (from the cohort ID, e.g. PUB0005_PUB0007_C01).
  const pubIds = r.cohort?.publicationIds ?? r.result.publicationIds;
  const pubs = [r.publication, ...pubIds.filter((id) => id !== r.publication.id).map((id) => PUBLICATION_BY_ID.get(id)!)];
  const heading = "text-xs uppercase text-muted-foreground mb-2";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
      <section>
        <h4 className={heading}>miRNA result</h4>
        <FieldList columns={RESULT_DETAIL_COLUMNS} row={r.result as unknown as Record<string, Cell>} help={RESULT_HELP} />
      </section>
      <section>
        <h4 className={heading}>
          Cohort Level
        </h4>
        {r.cohort ? (
          <FieldList columns={COHORT_COLUMNS} row={r.cohort as unknown as Record<string, Cell>} help={COHORT_HELP} prefixControl />
        ) : (
          <p className="text-muted-foreground">No row in 2.Cohort matches this result's cohort ID.</p>
        )}
      </section>
      <section className="space-y-4">
        {pubs.map((p) => (
          <div key={p.id}>
            <h4 className={heading}>
              {p.id === r.publication.id ? "Publication Level" : "Cohort also published in"}
            </h4>
            <FieldList columns={PUBLICATION_COLUMNS} row={p as unknown as Record<string, Cell>} />
          </div>
        ))}
        {pubs.length > 1 && (
          <p className="text-xs text-muted-foreground">This cohort was published in {pubs.length} publications; the first is the one this result cites (matching DOI).</p>
        )}
      </section>
    </div>
  );
}

export function EvidenceTable({
  initialBiospecimen = "all",
  initialDirection = "all",
  initialMirna,
  records = ALL_EVIDENCE,
  pageSize = 25,
  hideFilters = false,
}: Props) {
  const [search, setSearch] = useState(initialMirna ?? "");
  const [biospecimen, setBiospecimen] = useState<string>(initialBiospecimen);
  const [direction, setDirection] = useState<string>(initialDirection);
  const [yearMin, setYearMin] = useState<string>("all");
  const [subgroup, setSubgroup] = useState<string>("all");
  const [method, setMethod] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  type SortCol = "mirna" | "direction" | "subtype" | "biospecimen" | "assay" | "patientN" | "year" | "evCount";
  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
    setPage(0);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) => {
      if (q) {
        const hay = [r.mirna, r.result.doi, r.result.authorYear, r.publication.authors, r.studyId];
        if (!hay.some((v) => v && v.toLowerCase().includes(q))) return false;
      }
      if (biospecimen !== "all" && r.biospecimenKey !== biospecimen) return false;
      if (direction !== "all" && r.direction !== direction) return false;
      if (yearMin !== "all" && r.year < parseInt(yearMin)) return false;
      if (subgroup !== "all" && r.result.typeOfAls !== subgroup) return false;
      if (method !== "all" && r.result.method !== method) return false;
      return true;
    });
  }, [records, search, biospecimen, direction, yearMin, subgroup, method]);

  // Values exactly as recorded in the results (no merging), most frequent first.
  const options = (get: (r: EvidenceRecord) => Cell) => {
    const n = new Map<string, number>();
    records.forEach((r) => { const v = get(r); if (v) n.set(v, (n.get(v) ?? 0) + 1); });
    return Array.from(n.keys()).sort((a, b) => n.get(b)! - n.get(a)! || a.localeCompare(b));
  };
  const SUBGROUPS = useMemo(() => options((r) => r.result.typeOfAls), [records]); // eslint-disable-line react-hooks/exhaustive-deps
  const METHODS = useMemo(() => options((r) => r.result.method), [records]); // eslint-disable-line react-hooks/exhaustive-deps

  const anyFilter = search !== "" || biospecimen !== "all" || direction !== "all" || yearMin !== "all" || subgroup !== "all" || method !== "all";
  function clearFilters() {
    setSearch(""); setBiospecimen("all"); setDirection("all"); setYearMin("all"); setSubgroup("all"); setMethod("all");
    setPage(0); setExpanded(null);
  }

  const DIR_ORDER: Record<string, number> = { up: 0, none: 1, down: 2 };
  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    const text = (v: Cell) => v ?? "";
    return [...filtered].sort((a, b) => {
      let v = 0;
      if (sortCol === "mirna")            v = a.mirna.localeCompare(b.mirna);
      else if (sortCol === "direction")   v = (DIR_ORDER[a.direction] ?? 1) - (DIR_ORDER[b.direction] ?? 1);
      else if (sortCol === "subtype")     v = text(a.result.typeOfAls).localeCompare(text(b.result.typeOfAls));
      else if (sortCol === "biospecimen") v = a.biospecimen.localeCompare(b.biospecimen);
      else if (sortCol === "assay")       v = text(a.result.method).localeCompare(text(b.result.method));
      else if (sortCol === "patientN")    v = (Number(a.result.alsN) || 0) - (Number(b.result.alsN) || 0);
      else if (sortCol === "year")        v = a.year - b.year;
      else if (sortCol === "evCount")     v = (EVIDENCE_COUNT.get(a.mirna) ?? 0) - (EVIDENCE_COUNT.get(b.mirna) ?? 0);
      return sortDir === "asc" ? v : -v;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const slice = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  function renderPagination() {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(0, safePage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(0, endPage - maxVisible + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={safePage === i ? "default" : "outline"}
          size="sm"
          className="w-8 h-8 p-0"
          onClick={() => setPage(i)}
        >
          {i + 1}
        </Button>
      );
    }
    return pages;
  }

  const COLUMNS: { col: SortCol | null; label: string; align: string }[] = [
    { col: "mirna",       label: "microRNA",          align: "left"   },
    { col: "direction",   label: "Expression direction", align: "left" },
    { col: "subtype",     label: "ALS group/subgroup", align: "left" },
    { col: "biospecimen", label: "Tissue",            align: "left"   },
    { col: "assay",       label: "Method",            align: "left"   },
    { col: "patientN",    label: "ALS (N) / HC (N)",  align: "right"  },
    { col: null,          label: "DOI",               align: "left"   },
    { col: "year",        label: "Year",              align: "center" },
    { col: "evCount",     label: "Evidence count",    align: "center" },
    { col: null,          label: "Details",           align: "center" },
  ];

  return (
    <div className="space-y-4">
      {!hideFilters && (
        <div className="card-academic p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
          <Input
            placeholder="Search miRNA, DOI, author…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="lg:w-72"
          />
          <Select value={biospecimen} onValueChange={(v) => { setBiospecimen(v); setPage(0); }}>
            <SelectTrigger className="lg:w-44"><SelectValue placeholder="Tissue" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tissues</SelectItem>
              {uniqueBiospecimens().map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={direction} onValueChange={(v) => { setDirection(v); setPage(0); }}>
            <SelectTrigger className="lg:w-40"><SelectValue placeholder="Direction" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All directions</SelectItem>
              <SelectItem value="up">Upregulated (↑)</SelectItem>
              <SelectItem value="down">Downregulated (↓)</SelectItem>
              <SelectItem value="none">No significant change (=)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={yearMin} onValueChange={(v) => { setYearMin(v); setPage(0); }}>
            <SelectTrigger className="lg:w-36"><SelectValue placeholder="Year ≥" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {YEARS.map((y) => <SelectItem key={y} value={String(y)}>From {y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subgroup} onValueChange={(v) => { setSubgroup(v); setPage(0); }}>
            <SelectTrigger className="lg:w-60" aria-label="ALS group/subgroup"><SelectValue placeholder="ALS group/subgroup" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ALS subgroups</SelectItem>
              {SUBGROUPS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={method} onValueChange={(v) => { setMethod(v); setPage(0); }}>
            <SelectTrigger className="lg:w-56" aria-label="Assay method"><SelectValue placeholder="Assay method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assay methods</SelectItem>
              {METHODS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {anyFilter && (
            <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="clear-filters">
              <X className="h-4 w-4 mr-1" /> Clear filters
            </Button>
          )}
          <div className="lg:ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Showing {slice.length} of {sorted.length}</span>
            <Button variant="outline" size="sm" onClick={() => downloadCsv(sorted)}>
              <Download className="h-4 w-4 mr-1.5" /> Download CSV
            </Button>
          </div>
        </div>
      )}

      <div className="card-academic overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="evidence-table">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {COLUMNS.map(({ col, label, align }) =>
                  col ? (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className={cn("px-4 py-3 cursor-pointer select-none hover:bg-muted/90 transition-colors",
                        sortCol === col && "text-foreground")}
                    >
                      <span className={cn("inline-flex items-center gap-1",
                        align === "right" && "flex-row-reverse w-full",
                        align === "center" && "justify-center"
                      )}>
                        {label}
                        {sortCol === col
                          ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                          : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                      </span>
                    </th>
                  ) : (
                    <th key={label} className="px-4 py-3">{label}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {slice.map((r, i) => {
                const isOpen = expanded === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr
                      data-result-id={r.id}
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className={cn(
                        "border-t border-border cursor-pointer transition-colors",
                        i % 2 === 1 && "bg-primary-light/20",
                        "hover:bg-secondary/60",
                      )}
                    >
                      <td className="px-4 py-3">
                        <Link to={`/database/mirnas/${encodeURIComponent(r.mirna)}`} className="font-medium text-primary-dark hover:underline break-all" onClick={(e) => e.stopPropagation()}>
                          {r.mirna}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><DirectionBadge direction={r.direction} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{show(r.result.typeOfAls)}</td>
                      <td className="px-4 py-3">{r.biospecimen}</td>
                      <td className="px-4 py-3 text-muted-foreground">{show(r.result.method)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{show(r.result.alsN)} / {show(r.result.hcN)}</td>
                      <td className="px-4 py-3">
                        {r.result.doi ? (
                          <a
                            href={doiUrl(r.result.doi)}
                            target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary-dark hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            DOI <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{show(r.publication.year)}</td>
                      <td className="px-4 py-3 text-center tabular-nums font-medium">{EVIDENCE_COUNT.get(r.mirna)}</td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          type="button" variant="outline" size="sm" className="h-7 px-3 whitespace-nowrap"
                          aria-expanded={isOpen}
                          onClick={(e) => { e.stopPropagation(); setExpanded(isOpen ? null : r.id); }}
                        >
                          {isOpen ? "Hide details" : "View details"}
                        </Button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-secondary/40 border-t border-border">
                        <td colSpan={10} className="px-4 py-4">
                          <RecordDetail r={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {slice.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">No records match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <span className="text-muted-foreground">Showing {sorted.length === 0 ? 0 : safePage * pageSize + 1}-{Math.min((safePage + 1) * pageSize, sorted.length)} of {sorted.length} records</span>
          <div className="flex items-center gap-1">
            <Button aria-label="Previous page" variant="outline" size="sm" className="w-8 h-8 p-0" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {renderPagination()}
            <Button aria-label="Next page" variant="outline" size="sm" className="w-8 h-8 p-0" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-medium">#</span> Authors provided clarification of the miRNA's 3p or 5p arm.{" "}
        <span className="font-medium">##</span> {NOTE_DOUBLE_HASH} Select View details to view the complete curated
        record. Evidence count = number of results recorded in ALSmiR for that miRNA (calculated).
      </p>
    </div>
  );
}
