import { Outlet, useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const SUBTABS = [
  { to: "/database", label: "Overview", end: true },
  { to: "/database/evidence", label: "Evidence" },
  { to: "/database/mirnas", label: "miRNAs" },
  { to: "/database/biospecimens", label: "Biospecimens" },

  { to: "/database/stats", label: "Statistics" },
  { to: "/database/curation", label: "Reporting Practices" },
  { to: "/database/network", label: "Tissue Explorer" },
  // Compare Subgroups is hidden for now (curators, 8 Oct 2026); its page code is kept.
];

export default function DatabaseLayout() {
  const { pathname } = useLocation();
  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div>
      <div className="border-b border-border bg-muted/30">
        <div className="container-page">
          <div className="flex flex-wrap gap-x-1">
            {SUBTABS.map((t) => {
              const active = isActive(t.to, t.end);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
                    active ? "text-primary-dark" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  {active && <span className="absolute inset-x-4 -bottom-px h-0.5 bg-primary rounded-full" />}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="container-page py-8">
        <Outlet />
      </div>
    </div>
  );
}
