import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Orders from "./pages/Orders";
import Invoices from "./pages/Invoices";
import Receipts from "./pages/Receipts";
import Reps from "./pages/Reps";
import Performance from "./pages/Performance";
import Analytics from "./pages/Analytics";
import LeadGeneration from "./pages/LeadGeneration";
import EmailDrafting from "./pages/EmailDrafting";
import PredictiveAnalysis from "./pages/PredictiveAnalysis";
import RouteOptimization from "./pages/RouteOptimization";
import RouteTemplates from "./pages/RouteTemplates";
import MobileOrderEntry from "./pages/MobileOrderEntry";
import FollowUpTasks from "./pages/FollowUpTasks";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Settings from "./pages/Settings";
import EdgeFunctionMonitoring from "./pages/EdgeFunctionMonitoring";
import WeeklyRoutes from "./pages/WeeklyRoutes";
import RouteAccounts from "./pages/RouteAccounts";
import MobileDailyRoute from "./pages/MobileDailyRoute";
import CustomerPortal from "./pages/CustomerPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
