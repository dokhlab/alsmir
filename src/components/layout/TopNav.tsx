import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Home", match: (p: string) => p === "/" },
  { to: "/database", label: "Database", match: (p: string) => p.startsWith("/database") || p.startsWith("/mirnas") },
  { to: "/how-to-use", label: "How to Use", match: (p: string) => p.startsWith("/how-to-use") },
  { to: "/curation-policy", label: "Curation Policy", match: (p: string) => p.startsWith("/curation-policy") },
  { to: "/submit", label: "Submit Data", match: (p: string) => p.startsWith("/submit") },
  { to: "/contact", label: "Contact Us", match: (p: string) => p.startsWith("/contact") },
  // About Us is hidden for now; the /about page still exists.
];

export function TopNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const tabClass = (active: boolean) =>
    cn(
      "relative inline-flex items-center px-3 py-4 text-sm font-medium transition-colors whitespace-nowrap",
      active ? "text-primary-dark" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Main bar */}
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8 min-w-0">
          <Logo />
          <nav className="hidden lg:flex items-center gap-1">
            {TABS.map((t) => {
              const active = t.match(pathname);
              return (
                <Link key={t.to} to={t.to} className={tabClass(active)}>
                  {t.label}
                  {active && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-primary rounded-full" />}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="hero" size="sm" className="hidden sm:inline-flex">
            <a href="https://dokhlab.org/" target="_blank" rel="noreferrer">
              Dokholyan Lab
            </a>
          </Button>
          <button
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="container-page py-2 flex flex-col">
            {TABS.map((t) => {
              const active = t.match(pathname);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "px-2 py-3 text-sm border-l-2 -mx-2 pl-3",
                    active ? "border-primary text-primary-dark font-medium bg-secondary" : "border-transparent text-foreground",
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
            <div className="flex flex-col gap-2 py-3 border-t border-border mt-2">
              <Button asChild variant="hero" size="sm">
                <a href="https://dokhlab.org/" target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>Dokholyan Lab</a>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
