import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Reps from "./pages/Reps";
import Performance from "./pages/Performance";
import Analytics from "./pages/Analytics";
import LeadGeneration from "./pages/LeadGeneration";
import EmailDrafting from "./pages/EmailDrafting";
import PredictiveAnalysis from "./pages/PredictiveAnalysis";
import RouteOptimization from "./pages/RouteOptimization";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/reps" element={<Reps />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/lead-generation" element={<LeadGeneration />} />
          <Route path="/email-drafting" element={<EmailDrafting />} />
          <Route path="/predictive-analysis" element={<PredictiveAnalysis />} />
          <Route path="/route-optimization" element={<RouteOptimization />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
