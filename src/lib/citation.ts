// How to cite ALSmiR (22 Oct 2026). Used by the footer and the About page.
// When the preprint has a DOI, set `doi` (e.g. "10.1101/2026.xx.xx.xxxxxx") and both places show the link.
export const CITATION = {
  authors: "Amorós, M. A., Ekambaram, S., Iskandar, R. M., Simmons, Z., & Dokholyan, N. V.",
  year: 2026,
  title: "ALSmiR: a curated evidence resource for ALS-associated microRNAs for biomarker discovery",
  venue: "bioRxiv",
  doi: "10.64898/2026.10.16.759728" as string | null,
};

export const CITATION_URL = CITATION.doi ? `https://doi.org/${CITATION.doi}` : null;

/** Plain text for copying (APA style). */
export const CITATION_TEXT =
  `${CITATION.authors} (${CITATION.year}). ${CITATION.title}. ${CITATION.venue}.` + (CITATION_URL ? ` ${CITATION_URL}` : "");
