// Google Analytics 4 with a consent banner. Nothing is loaded from Google until the
// visitor clicks "Accept"; the choice is remembered in this browser and can be changed
// from the footer ("Cookie settings").
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const GA_MEASUREMENT_ID = "G-54R5J82W9Z";
const STORAGE_KEY = "alsmir-analytics-consent";
const OPEN_EVENT = "alsmir:cookie-settings";

type Consent = "granted" | "denied" | null;

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
}

function readConsent(): Consent {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function saveConsent(v: "granted" | "denied") {
  try { window.localStorage.setItem(STORAGE_KEY, v); } catch { /* private mode: ask again next visit */ }
}

let loaded = false;
function loadGoogleAnalytics() {
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
  window.gtag("js", new Date());
  // GA4 "enhanced measurement" (on by default) also records the page changes of
  // this single-page app, so no manual page_view events are sent.
  window.gtag("config", GA_MEASUREMENT_ID);
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

/** Opens the consent banner again (used by the footer link). */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function Analytics() {
  const [consent, setConsent] = useState<Consent>(readConsent);
  const [open, setOpen] = useState(consent === null);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  useEffect(() => {
    if (consent === "granted") loadGoogleAnalytics();
  }, [consent]);

  function choose(v: "granted" | "denied") {
    saveConsent(v);
    setOpen(false);
    if (v === "denied" && consent === "granted") {
      // Stop sending; already-loaded scripts stay until the page is reloaded.
      window.gtag?.("consent", "update", { analytics_storage: "denied" });
      window.location.reload();
      return;
    }
    setConsent(v);
  }

  if (!open) return null;
  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur shadow-lg" data-testid="cookie-banner">
      <div className="container-page py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-foreground/90 max-w-3xl">
          We use Google Analytics cookies to count visits and see which pages are useful. No data is collected unless you
          accept, and you can change your choice any time from "Cookie settings" at the bottom of the page.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => choose("denied")}>Decline</Button>
          <Button variant="hero" size="sm" onClick={() => choose("granted")}>Accept</Button>
        </div>
      </div>
    </div>
  );
}
