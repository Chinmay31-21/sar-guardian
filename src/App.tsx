import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfileProvider } from "@/context/ProfileContext";
import { SARDataProvider } from "@/context/SARDataContext";
import AppLayout from "@/components/AppLayout";
import LiveTransactionBridge from "@/components/LiveTransactionBridge";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import FlaggedClusters from "@/pages/FlaggedClusters";
import SARGenerate from "@/pages/SARGenerate";
import ReviewQueue from "@/pages/ReviewQueue";
import FiledReports from "@/pages/FiledReports";
import RiskGraph from "@/pages/RiskGraph";
import Analytics from "@/pages/Analytics";
import AuditTrail from "@/pages/AuditTrail";
import Customers from "@/pages/Customers";
import SettingsPage from "@/pages/SettingsPage";
import CaseDetail from "@/pages/CaseDetail";
import AdminProfile from "@/pages/AdminProfile";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SARDataProvider>
      <LiveTransactionBridge />
      <ProfileProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/flagged" element={<FlaggedClusters />} />
                <Route path="/sar/generate" element={<SARGenerate />} />
                <Route path="/sar/queue" element={<ReviewQueue />} />
                <Route path="/sar/filed" element={<FiledReports />} />
                <Route path="/risk-graph" element={<RiskGraph />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/case/:caseId" element={<CaseDetail />} />
                <Route path="/audit" element={<AuditTrail />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<AdminProfile />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ProfileProvider>
    </SARDataProvider>
  </QueryClientProvider>
);

export default App;
