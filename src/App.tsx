import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Home from "./pages/Home";
import EstanciaVelha from "./pages/EstanciaVelha";
import BrokerLandingPage from "./pages/BrokerLandingPage";
import ProjectLandingPage from "./pages/ProjectLandingPage";
import ProjectBrokerLandingPage from "./pages/ProjectBrokerLandingPage";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import BrokerAdmin from "./pages/BrokerAdmin";
import BrokerSignup from "./pages/BrokerSignup";
import Termos from "./pages/Termos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            {/* Legacy routes for estanciavelha - keep for backward compatibility */}
            <Route path="/estanciavelha" element={<EstanciaVelha />} />
            <Route path="/estanciavelha/:brokerSlug" element={<BrokerLandingPage />} />
            {/* Auth and admin routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/corretor/cadastro" element={<BrokerSignup />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/corretor/admin" element={<BrokerAdmin />} />
            <Route path="/termos" element={<Termos />} />
            {/* Dynamic project routes - MUST BE AFTER specific routes */}
            <Route path="/:projectSlug" element={<ProjectLandingPage />} />
            <Route path="/:projectSlug/:brokerSlug" element={<ProjectBrokerLandingPage />} />
            {/* Catch-all for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
