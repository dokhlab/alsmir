import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import ConsortiumLayout from "@/components/layout/ConsortiumLayout";
import DatabaseLayout from "@/components/layout/DatabaseLayout";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import TissueExplorerPage from "./pages/TissueExplorerPage";
import DatabaseOverviewPage from "./pages/DatabaseOverviewPage";
import CurationPage from "./pages/CurationPage";
import CurationPolicyPage from "./pages/CurationPolicyPage";
import HowToUsePage from "./pages/HowToUsePage";
import EvidencePage from "./pages/EvidencePage";
import MirnasPage from "./pages/MirnasPage";
import MirnaDetailPage from "./pages/MirnaDetailPage";
import BiospecimensPage from "./pages/BiospecimensPage";
// StrataPage removed — route retired
import StatsPage from "./pages/StatsPage";
import UpdatesPage from "./pages/UpdatesPage";
import ContactPage from "./pages/ContactPage";
import SubmitPage from "./pages/SubmitPage";
import NotFound from "./pages/NotFound.tsx";
import { Analytics } from "@/components/analytics/Analytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Analytics />
        <Routes>
          <Route element={<ConsortiumLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            {/* updates route retired */}
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/submit" element={<SubmitPage />} />
            <Route path="/how-to-use" element={<HowToUsePage />} />
            <Route path="/curation-policy" element={<CurationPolicyPage />} />

            <Route path="/database" element={<DatabaseLayout />}>
              <Route index element={<DatabaseOverviewPage />} />
              <Route path="evidence" element={<EvidencePage />} />
              <Route path="mirnas" element={<MirnasPage />} />
              <Route path="mirnas/:name" element={<MirnaDetailPage />} />
              <Route path="biospecimens" element={<BiospecimensPage />} />
              {/* strata route retired */}
              <Route path="stats" element={<StatsPage />} />
              <Route path="curation" element={<CurationPage />} />
              <Route path="network" element={<TissueExplorerPage />} />
              {/* Compare Subgroups hidden for now (curators, 8 Oct 2026). */}
              <Route path="compare" element={<Navigate to="/database" replace />} />
            </Route>

            {/* Legacy redirects */}
            <Route path="/consortium" element={<Navigate to="/about" replace />} />
            <Route path="/evidence" element={<Navigate to="/database/evidence" replace />} />
            <Route path="/mirnas" element={<Navigate to="/database/mirnas" replace />} />
            <Route path="/mirnas/:name" element={<MirnaDetailRedirect />} />
            <Route path="/biospecimens" element={<Navigate to="/database/biospecimens" replace />} />
            <Route path="/strata" element={<Navigate to="/database" replace />} />
            <Route path="/stats" element={<Navigate to="/database/stats" replace />} />
            <Route path="/curation" element={<Navigate to="/database/curation" replace />} />
            <Route path="/updates" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

function MirnaDetailRedirect() {
  const path = window.location.pathname.replace(/^\/mirnas\//, "/database/mirnas/");
  return <Navigate to={path} replace />;
}

export default App;
