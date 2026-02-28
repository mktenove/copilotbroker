import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { TenantProvider } from "@/contexts/TenantContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SubscriptionGuard } from "@/components/auth/SubscriptionGuard";
import AppHead from "@/components/AppHead";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Onboarding from "./pages/Onboarding";
import Admin from "./pages/Admin";

import BrokerAdmin from "./pages/BrokerAdmin";
import BrokerProjects from "./pages/BrokerProjects";
import BrokerSignup from "./pages/BrokerSignup";

import BrokerRoletasPage from "./pages/BrokerRoletasPage";
import BrokerInbox from "./pages/BrokerInbox";
import BrokerCopilotConfig from "./pages/BrokerCopilotConfig";
import AdminInbox from "./pages/AdminInbox";
import AdminCopilotConfig from "./pages/AdminCopilotConfig";
import Termos from "./pages/Termos";
import LeadPage from "./pages/LeadPage";
import SuperAdmin from "./pages/SuperAdmin";
import SuperAdminBrokers from "./pages/super-admin/SuperAdminBrokers";
import SuperAdminAddBroker from "./pages/super-admin/SuperAdminAddBroker";
import SuperAdminInvites from "./pages/super-admin/SuperAdminInvites";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
        <TooltipProvider>
          {/* Toasters removed per user request */}
          <BrowserRouter>
            <AppHead />
            <Routes>
            <Route path="/" element={<Home />} />
            
            {/* Auth and admin routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/planos" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/corretor/cadastro" element={<BrokerSignup />} />
            <Route path="/corretor/empreendimentos" element={<ProtectedRoute><SubscriptionGuard><BrokerProjects /></SubscriptionGuard></ProtectedRoute>} />
            <Route path="/corretor/whatsapp" element={<Navigate to="/corretor/copiloto" replace />} />
            <Route path="/admin" element={<ProtectedRoute><SubscriptionGuard><Admin /></SubscriptionGuard></ProtectedRoute>} />
            <Route path="/admin/whatsapp" element={<Navigate to="/admin/copiloto" replace />} />
            <Route path="/admin/inbox" element={<ProtectedRoute><SubscriptionGuard><AdminInbox /></SubscriptionGuard></ProtectedRoute>} />
            <Route path="/admin/copiloto" element={<ProtectedRoute><SubscriptionGuard><AdminCopilotConfig /></SubscriptionGuard></ProtectedRoute>} />
            <Route path="/corretor/admin" element={<ProtectedRoute><SubscriptionGuard><BrokerAdmin /></SubscriptionGuard></ProtectedRoute>} />
            <Route path="/corretor/roletas" element={<ProtectedRoute><SubscriptionGuard><BrokerRoletasPage /></SubscriptionGuard></ProtectedRoute>} />
            <Route path="/corretor/inbox" element={<ProtectedRoute><SubscriptionGuard><BrokerInbox /></SubscriptionGuard></ProtectedRoute>} />
            <Route path="/corretor/copiloto" element={<ProtectedRoute><SubscriptionGuard><BrokerCopilotConfig /></SubscriptionGuard></ProtectedRoute>} />
            <Route path="/corretor/lead/:leadId" element={<ProtectedRoute><SubscriptionGuard><LeadPage /></SubscriptionGuard></ProtectedRoute>} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/super-admin" element={<SuperAdmin />} />
            <Route path="/super-admin/brokers" element={<SuperAdminBrokers />} />
            <Route path="/super-admin/brokers/new" element={<SuperAdminAddBroker />} />
            <Route path="/super-admin/brokers/invites" element={<SuperAdminInvites />} />
            
            {/* Catch-all for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </TenantProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
