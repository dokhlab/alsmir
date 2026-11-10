import { ExternalLink } from "lucide-react";
import { MIRBASE_RELEASE, mirbaseLink } from "@/data/mirbase";
import { cn } from "@/lib/utils";

/** Link to the miRNA's miRBase page; renders nothing unless the name matches miRBase exactly. */
export function MirbaseLink({ name, className }: { name: string; className?: string }) {
  const link = mirbaseLink(name);
  if (!link) return null;
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      data-mirbase={link.accession}
      title={`Open ${name} in miRBase ${MIRBASE_RELEASE}`}
      className={cn("inline-flex items-center gap-1 text-xs font-medium text-primary-dark hover:underline", className)}
      onClick={(e) => e.stopPropagation()}
    >
      miRBase {link.accession} <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}
