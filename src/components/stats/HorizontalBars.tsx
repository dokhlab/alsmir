// Labelled horizontal bars for cohort characteristics: one count per 2.Cohort row,
// largest category first and "Not reported" last, in grey.

export interface BarRow { name: string; value: number }

export const NOT_REPORTED = "Not reported";
export const NOT_APPLICABLE = "Not applicable";

/** Largest first; "Not reported" always last. */
/** Shown last, in grey, after the reported categories: "Not reported", then "Not applicable". */
const LAST = (name: string) => (name === NOT_REPORTED ? 1 : name === NOT_APPLICABLE ? 2 : 0);

export function orderBars(rows: BarRow[]): BarRow[] {
  return [...rows].sort((a, b) => LAST(a.name) - LAST(b.name) || b.value - a.value || a.name.localeCompare(b.name));
}

export function HorizontalBars({ rows, total, testId }: { rows: BarRow[]; total: number; testId?: string }) {
  return (
    <ul className="space-y-2.5 mt-1" data-testid={testId}>
      {orderBars(rows).map((r) => {
        const grey = LAST(r.name) > 0;
        return (
          <li key={r.name} className="text-xs">
            <div className="flex justify-between gap-2 mb-1">
              <span className={grey ? "text-muted-foreground" : "text-foreground/90"}>{r.name}</span>
              <span className="tabular-nums text-muted-foreground whitespace-nowrap">
                {r.value} <span className="text-muted-foreground/80">({Math.round((100 * r.value) / total)}%)</span>
              </span>
            </div>
            <div className="h-3 rounded bg-muted overflow-hidden" aria-hidden>
              <div className={grey ? "h-full rounded bg-muted-foreground/40" : "h-full rounded bg-primary"} style={{ width: `${(100 * r.value) / total}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
