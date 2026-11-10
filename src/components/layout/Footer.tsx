import logoDokholyan from "@/assets/dokhlab_logo.svg";
import logoUva from "@/assets/logo-uva.png";
import logoPennState from "@/assets/logo-pennstate.png";
import logoEla from "@/assets/logo-ela.png";
import logoMosaic from "@/assets/logo-mosaic.png";
import logoNeals from "@/assets/logo-neals.png";
import { SOURCE } from "@/data/dataset";
import { openCookieSettings } from "@/components/analytics/Analytics";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { CITATION, CITATION_TEXT, CITATION_URL } from "@/lib/citation";

/** e.g. "1 October 2026", from the date the curated workbook was last saved. */
const DATA_UPDATED = SOURCE.savedDate
  ? new Date(`${SOURCE.savedDate}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
  : null;

/** Shared style for the three footer section headings. */
const FOOTER_HEADING = "text-xs font-semibold uppercase tracking-[0.2em] text-slate-500";

/** "How to cite ALSmiR": the preprint, formatted, with a copy button. */
function HowToCite() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CITATION_TEXT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable: the text stays selectable */ }
  };
  return (
    <div className="max-w-3xl mx-auto rounded-lg border border-slate-200 bg-white px-5 py-4 text-left" data-testid="footer-citation">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className={FOOTER_HEADING}>How to cite ALSmiR</p>
        <button type="button" onClick={copy} aria-label="Copy citation"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
          {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">
        {CITATION.authors} ({CITATION.year}). {CITATION.title}. <em>{CITATION.venue}</em>.
        {CITATION_URL && <>{" "}<a href={CITATION_URL} target="_blank" rel="noreferrer" className="underline hover:text-slate-900">{CITATION_URL}</a></>}
      </p>
      <p className="mt-2 text-xs text-slate-500">Please also cite the original publications linked to each record.</p>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-slate-50 text-slate-700 border-t border-slate-200 font-sans">
      <div className="container-page py-12 md:py-16 space-y-12">
        {/* Top Developer, Maintainer & Collaborator Row */}
        <div className="flex flex-col md:flex-row items-center md:items-stretch justify-center gap-8 md:gap-10 lg:gap-14 text-center">
          {/* Developed By */}
          <div className="flex flex-col items-center gap-4">
            <p className={FOOTER_HEADING}>Developed By</p>
            <a href="https://dokhlab.org/" target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-3 hover:opacity-90 transition-opacity group">
              <img 
                src={logoDokholyan} 
                alt="Dokholyan Lab - Computational Biology & Biomarkers" 
                className="h-14 md:h-16 w-auto object-contain select-none" 
              />
              <span className="text-sm md:text-base font-semibold tracking-wide text-slate-700 group-hover:text-slate-900 transition-colors">
                Dokholyan Laboratory
              </span>
            </a>
          </div>

          <div className="hidden md:block w-px self-stretch bg-slate-300" />

          {/* Maintained At */}
          <div className="flex flex-col items-center gap-4">
            <p className={FOOTER_HEADING}>Maintained At</p>
            <a href="https://www.virginia.edu" target="_blank" rel="noreferrer" className="flex flex-1 items-center hover:opacity-90 transition-opacity group">
              <img 
                src={logoUva} 
                alt="University of Virginia" 
                className="h-10 md:h-12 w-auto object-contain select-none opacity-80 group-hover:opacity-100 transition-opacity" 
              />
            </a>
          </div>

          <div className="hidden md:block w-px self-stretch bg-slate-300" />

          {/* Scientific Collaboration */}
          <div className="flex flex-col items-center gap-4">
            <p className={FOOTER_HEADING}>In Scientific Collaboration With</p>
            <a href="https://med.psu.edu" target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-4 hover:opacity-90 transition-opacity group">
              <img 
                src={logoPennState} 
                alt="PennState College of Medicine" 
                className="h-10 md:h-12 w-auto object-contain select-none opacity-90 group-hover:opacity-100 transition-opacity" 
              />
              <span className="text-xs md:text-sm text-slate-600 group-hover:text-slate-800 transition-colors max-w-[200px] leading-snug font-medium text-left">
                Zachary Simmons, MD<br />
                Penn State<br />
                College of Medicine
              </span>
            </a>
          </div>
        </div>

        {false && (
          <>
            {/* Divider line */}
            <hr className="border-slate-200" />

            {/* Future Collaborators Grid */}
            <div className="space-y-6">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Future Collaborating Partners
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 max-w-4xl mx-auto">
                <img 
                  src={logoEla} 
                  alt="Tenemos ELA Uruguay" 
                  className="h-12 md:h-14 w-auto object-contain select-none" 
                />
                <div className="hidden sm:block h-10 w-px bg-slate-300" />
                <img 
                  src={logoMosaic} 
                  alt="Project MOSAIC - Data Sharing for ALS" 
                  className="h-12 md:h-14 w-auto object-contain select-none" 
                />
                <div className="hidden sm:block h-10 w-px bg-slate-300" />
                <img 
                  src={logoNeals} 
                  alt="NEALS - Northeast Amyotrophic Lateral Sclerosis Consortium" 
                  className="h-12 md:h-14 w-auto object-contain select-none" 
                />
              </div>
            </div>
          </>
        )}

        <HowToCite />

        {/* Subtext */}
        <p className="text-center text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
          ALSmiR is developed with clinical, computational, and biomarker expertise across collaborating groups.
        </p>
      </div>

      {/* Deep Copyright Footer */}
      <div className="bg-slate-100 border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="container-page flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <span>
            © {new Date().getFullYear()} ALSmiR · Released under{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline hover:text-slate-800">
              CC BY 4.0
            </a>
            {" · "}
            <button type="button" onClick={openCookieSettings} className="underline hover:text-slate-800">
              Cookie settings
            </button>
          </span>
          <span className="tabular-nums">
            {SOURCE.version ? `Dataset ${SOURCE.version}` : "Dataset"}{DATA_UPDATED && ` · Last updated ${DATA_UPDATED}`}
          </span>
        </div>
      </div>
    </footer>
  );
}
