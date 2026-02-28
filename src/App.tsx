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
// Backup: landing pages completas de Estância Velha (reativar trocando as rotas abaixo)
import EstanciaVelha from "./pages/EstanciaVelha";
// import BrokerLandingPage from "./pages/BrokerLandingPage";
import EstanciaVelhaTeaser from "./pages/EstanciaVelhaTeaser";
import BairrodasRosas from "./pages/BairrodasRosas";
import EstanciaVelhaBrokerTeaser from "./pages/EstanciaVelhaBrokerTeaser";
import ProjectLandingPage from "./pages/ProjectLandingPage";
import ProjectBrokerLandingPage from "./pages/ProjectBrokerLandingPage";
import GoldenViewLandingPage from "./pages/goldenview/GoldenViewLandingPage";
import GoldenViewBrokerLandingPage from "./pages/goldenview/GoldenViewBrokerLandingPage";
import MauricioCardosoLandingPage from "./pages/mauriciocardoso/MauricioCardosoLandingPage";
import MauricioCardosoBrokerLandingPage from "./pages/mauriciocardoso/MauricioCardosoBrokerLandingPage";
import TermosGoldenView from "./pages/goldenview/TermosGoldenView";
import TermosMauricioCardoso from "./pages/mauriciocardoso/TermosMauricioCardoso";
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
import Prontos from "./pages/Prontos";
import ProntosBrokerPage from "./pages/ProntosBrokerPage";
import Termos from "./pages/Termos";
import LeadPage from "./pages/LeadPage";
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
            
            {/* GoldenView - custom landing page with unique visual identity */}
            <Route path="/portao/goldenview" element={<GoldenViewLandingPage />} />
            <Route path="/portao/goldenview/obrigado" element={<GoldenViewLandingPage />} />
            <Route path="/portao/goldenview/termos" element={<TermosGoldenView />} />
            <Route path="/portao/goldenview/:brokerSlug" element={<GoldenViewBrokerLandingPage />} />
            
            {/* Mauricio Cardoso - Wellness landing page for Novo Hamburgo */}
            <Route path="/novohamburgo/mauriciocardoso" element={<MauricioCardosoLandingPage />} />
            <Route path="/novohamburgo/mauriciocardoso/obrigado" element={<MauricioCardosoLandingPage />} />
            <Route path="/novohamburgo/mauriciocardoso/termos" element={<TermosMauricioCardoso />} />
            <Route path="/novohamburgo/mauriciocardoso/:brokerSlug/obrigado" element={<MauricioCardosoBrokerLandingPage />} />
            <Route path="/novohamburgo/mauriciocardoso/:brokerSlug" element={<MauricioCardosoBrokerLandingPage />} />
            
            {/* Legacy redirects for backward compatibility */}
            <Route path="/goldenview" element={<Navigate to="/portao/goldenview" replace />} />
            <Route path="/goldenview/:brokerSlug" element={<Navigate to="/portao/goldenview" replace />} />
            {/* Backup: rota desativada - reativar quando necessário */}
            {/* <Route path="/estanciavelha/privado" element={<EstanciaVelha />} /> */}
            <Route path="/estanciavelha" element={<EstanciaVelhaTeaser />} />
            <Route path="/estanciavelha/bairrodasrosas" element={<BairrodasRosas />} />
            <Route path="/estanciavelha/:brokerSlug" element={<EstanciaVelhaBrokerTeaser />} />
            
            {/* Imóveis Prontos - lead capture for ready-to-move-in properties */}
            <Route path="/prontos" element={<Prontos />} />
            <Route path="/prontos/:brokerSlug" element={<ProntosBrokerPage />} />
            
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
            
            {/* Dynamic city/project routes - MUST BE AFTER specific routes */}
            <Route path="/:citySlug/:projectSlug" element={<ProjectLandingPage />} />
            <Route path="/:citySlug/:projectSlug/:brokerSlug" element={<ProjectBrokerLandingPage />} />
            
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
