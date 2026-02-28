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
import AcceptInvite from "./pages/AcceptInvite";

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
import NotFound from "./pages/NotFound";

// Super Admin
import SuperAdminLayout from "./components/super-admin/SuperAdminLayout";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import SuperAdminBrokers from "./pages/super-admin/SuperAdminBrokers";
import SuperAdminAddBroker from "./pages/super-admin/SuperAdminAddBroker";
import SuperAdminInvites from "./pages/super-admin/SuperAdminInvites";
import SuperAdminRealEstate from "./pages/super-admin/SuperAdminRealEstate";
import SuperAdminRealEstateNew from "./pages/super-admin/SuperAdminRealEstateNew";
import SuperAdminRealEstateInvites from "./pages/super-admin/SuperAdminRealEstateInvites";
import SuperAdminAudit from "./pages/super-admin/SuperAdminAudit";
import SuperAdminBilling from "./pages/super-admin/SuperAdminBilling";
import SuperAdminBillingEvents from "./pages/super-admin/SuperAdminBillingEvents";
import SuperAdminAffiliates from "./pages/super-admin/SuperAdminAffiliates";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AppHead />
            <Routes>
            <Route path="/" element={<Home />} />
            
            {/* Public invite acceptance */}
            <Route path="/aceitar-convite" element={<AcceptInvite />} />
            
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

            {/* Super Admin with layout — requires auth */}
            <Route path="/super-admin" element={<ProtectedRoute><SuperAdminLayout /></ProtectedRoute>}>
              <Route index element={<SuperAdminDashboard />} />
              <Route path="brokers" element={<SuperAdminBrokers />} />
              <Route path="brokers/new" element={<SuperAdminAddBroker />} />
              <Route path="brokers/invites" element={<SuperAdminInvites />} />
              <Route path="tenants/real-estate" element={<SuperAdminRealEstate />} />
              <Route path="tenants/real-estate/new" element={<SuperAdminRealEstateNew />} />
              <Route path="tenants/real-estate/invites" element={<SuperAdminRealEstateInvites />} />
              <Route path="audit" element={<SuperAdminAudit />} />
              <Route path="billing" element={<SuperAdminBilling />} />
              <Route path="billing-events" element={<SuperAdminBillingEvents />} />
              <Route path="affiliates" element={<SuperAdminAffiliates />} />
            </Route>
            
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
