import { Outlet, useLocation } from "react-router-dom";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";

export default function ConsortiumLayout() {
  // The homepage ends with a full-width band, so it sits directly on the footer;
  // other pages keep breathing room above it.
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className={pathname === "/" ? "flex-1 animate-fade-in" : "flex-1 animate-fade-in pb-16"}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
