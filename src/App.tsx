import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import AppHead from "@/components/AppHead";
import Home from "./pages/Home";
import EstanciaVelha from "./pages/EstanciaVelha";
import BrokerLandingPage from "./pages/BrokerLandingPage";
import ProjectLandingPage from "./pages/ProjectLandingPage";
import ProjectBrokerLandingPage from "./pages/ProjectBrokerLandingPage";
import GoldenViewLandingPage from "./pages/goldenview/GoldenViewLandingPage";
import GoldenViewBrokerLandingPage from "./pages/goldenview/GoldenViewBrokerLandingPage";
import MauricioCardosoLandingPage from "./pages/mauriciocardoso/MauricioCardosoLandingPage";
import MauricioCardosoBrokerLandingPage from "./pages/mauriciocardoso/MauricioCardosoBrokerLandingPage";
import TermosMauricioCardoso from "./pages/mauriciocardoso/TermosMauricioCardoso";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import BrokerAdmin from "./pages/BrokerAdmin";
import BrokerProjects from "./pages/BrokerProjects";
import BrokerSignup from "./pages/BrokerSignup";
import BrokerWhatsApp from "./pages/BrokerWhatsApp";
import Termos from "./pages/Termos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppHead />
            <Routes>
            <Route path="/" element={<Home />} />
            
            {/* GoldenView - custom landing page with unique visual identity */}
            <Route path="/portao/goldenview" element={<GoldenViewLandingPage />} />
            <Route path="/portao/goldenview/:brokerSlug" element={<GoldenViewBrokerLandingPage />} />
            
            {/* Mauricio Cardoso - Wellness landing page for Novo Hamburgo */}
            <Route path="/novohamburgo/mauriciocardoso" element={<MauricioCardosoLandingPage />} />
            <Route path="/novohamburgo/mauriciocardoso/termos" element={<TermosMauricioCardoso />} />
            <Route path="/novohamburgo/mauriciocardoso/:brokerSlug" element={<MauricioCardosoBrokerLandingPage />} />
            
            {/* Legacy redirects for backward compatibility */}
            <Route path="/goldenview" element={<Navigate to="/portao/goldenview" replace />} />
            <Route path="/goldenview/:brokerSlug" element={<Navigate to="/portao/goldenview" replace />} />
            <Route path="/estanciavelha" element={<EstanciaVelha />} />
            <Route path="/estanciavelha/:brokerSlug" element={<BrokerLandingPage />} />
            
            {/* Auth and admin routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/corretor/cadastro" element={<BrokerSignup />} />
            <Route path="/corretor/empreendimentos" element={<BrokerProjects />} />
            <Route path="/corretor/whatsapp" element={<BrokerWhatsApp />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/corretor/admin" element={<BrokerAdmin />} />
            <Route path="/termos" element={<Termos />} />
            
            {/* Dynamic city/project routes - MUST BE AFTER specific routes */}
            <Route path="/:citySlug/:projectSlug" element={<ProjectLandingPage />} />
            <Route path="/:citySlug/:projectSlug/:brokerSlug" element={<ProjectBrokerLandingPage />} />
            
            {/* Catch-all for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
