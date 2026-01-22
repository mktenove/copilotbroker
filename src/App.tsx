import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import EstanciaVelha from "./pages/EstanciaVelha";
import BrokerLandingPage from "./pages/BrokerLandingPage";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import BrokerAdmin from "./pages/BrokerAdmin";
import BrokerSignup from "./pages/BrokerSignup";
import Termos from "./pages/Termos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/estanciavelha" element={<EstanciaVelha />} />
          <Route path="/estanciavelha/:brokerSlug" element={<BrokerLandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/corretor/cadastro" element={<BrokerSignup />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/corretor/admin" element={<BrokerAdmin />} />
          <Route path="/termos" element={<Termos />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
