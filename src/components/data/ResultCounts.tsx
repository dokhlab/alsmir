import { cn } from "@/lib/utils";
import type { EvidenceRecord } from "@/data/types";

/** "↑ Up: N · ↓ Down: N · NC: N" – the recorded results per direction, never combined into one overall direction. */
export function ResultCounts({ records, className }: { records: EvidenceRecord[]; className?: string }) {
  const count = (d: string) => records.filter((r) => r.direction === d).length;
  return (
    <p className={cn("text-sm tabular-nums", className)} data-testid="result-counts">
      <span className="text-success">↑ Up: {count("up")}</span>
      <span className="text-muted-foreground"> · </span>
      <span className="text-destructive">↓ Down: {count("down")}</span>
      <span className="text-muted-foreground"> · </span>
      <span className="text-muted-foreground">NC: {count("none")}</span>
    </p>
  );
}
