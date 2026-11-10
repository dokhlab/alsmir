import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Direction } from "@/data/types";

export function DirectionBadge({ direction, className }: { direction: Direction; className?: string }) {
  if (direction === "up") {
    return (
      <span className={cn("pill bg-success/10 text-success", className)}>
        <ArrowUp className="h-3 w-3 mr-1" /> Up
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className={cn("pill bg-destructive/10 text-destructive", className)}>
        <ArrowDown className="h-3 w-3 mr-1" /> Down
      </span>
    );
  }
  return (
    <span className={cn("pill bg-muted text-muted-foreground", className)}>
      <Minus className="h-3 w-3 mr-1" /> NC
    </span>
  );
}
