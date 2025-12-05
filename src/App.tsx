import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import BrandedLoader from "@/components/BrandedLoader";

// Eager load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy load non-critical pages
const Orders = lazy(() => import("./pages/Orders"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Receipts = lazy(() => import("./pages/Receipts"));
const Reps = lazy(() => import("./pages/Reps"));
const Performance = lazy(() => import("./pages/Performance"));
const Analytics = lazy(() => import("./pages/Analytics"));
const LeadGeneration = lazy(() => import("./pages/LeadGeneration"));
const EmailDrafting = lazy(() => import("./pages/EmailDrafting"));
const PredictiveAnalysis = lazy(() => import("./pages/PredictiveAnalysis"));
const RouteOptimization = lazy(() => import("./pages/RouteOptimization"));
const RouteTemplates = lazy(() => import("./pages/RouteTemplates"));
const MobileOrderEntry = lazy(() => import("./pages/MobileOrderEntry"));
const FollowUpTasks = lazy(() => import("./pages/FollowUpTasks"));
const Customers = lazy(() => import("./pages/Customers"));
const Products = lazy(() => import("./pages/Products"));
const Settings = lazy(() => import("./pages/Settings"));
const EdgeFunctionMonitoring = lazy(() => import("./pages/EdgeFunctionMonitoring"));
const WeeklyRoutes = lazy(() => import("./pages/WeeklyRoutes"));
const RouteAccounts = lazy(() => import("./pages/RouteAccounts"));
const MobileDailyRoute = lazy(() => import("./pages/MobileDailyRoute"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<BrandedLoader />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
            <Route path="/reps" element={<ProtectedRoute><Reps /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/lead-generation" element={<ProtectedRoute><LeadGeneration /></ProtectedRoute>} />
            <Route path="/email-drafting" element={<ProtectedRoute><EmailDrafting /></ProtectedRoute>} />
            <Route path="/predictive-analysis" element={<ProtectedRoute><PredictiveAnalysis /></ProtectedRoute>} />
            <Route path="/route-optimization" element={<ProtectedRoute><RouteOptimization /></ProtectedRoute>} />
            <Route path="/route-templates" element={<ProtectedRoute><RouteTemplates /></ProtectedRoute>} />
            <Route path="/mobile-order-entry" element={<ProtectedRoute><MobileOrderEntry /></ProtectedRoute>} />
            <Route path="/follow-up-tasks" element={<ProtectedRoute><FollowUpTasks /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/monitoring" element={<ProtectedRoute><EdgeFunctionMonitoring /></ProtectedRoute>} />
            <Route path="/weekly-routes" element={<ProtectedRoute><WeeklyRoutes /></ProtectedRoute>} />
            <Route path="/route-accounts" element={<ProtectedRoute><RouteAccounts /></ProtectedRoute>} />
            <Route path="/mobile-route" element={<ProtectedRoute><MobileDailyRoute /></ProtectedRoute>} />
            <Route path="/customer-portal" element={<ProtectedRoute><CustomerPortal /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
