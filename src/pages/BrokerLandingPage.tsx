import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import FeaturesSection from "@/components/FeaturesSection";
import UrgencySection from "@/components/UrgencySection";
import BenefitsSection from "@/components/BenefitsSection";
import FormSection from "@/components/FormSection";
import DisclaimerSection from "@/components/DisclaimerSection";
import Footer from "@/components/Footer";
import FloatingCTA from "@/components/FloatingCTA";
import { RefreshCw } from "lucide-react";
import { usePageTracking } from "@/hooks/use-page-tracking";

interface Broker {
  id: string;
  name: string;
  slug: string;
  whatsapp: string | null;
  is_active: boolean;
}

const BrokerLandingPage = () => {
  const { brokerSlug } = useParams<{ brokerSlug: string }>();
  const navigate = useNavigate();
  const [broker, setBroker] = useState<Broker | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track page view
  usePageTracking();

  useEffect(() => {
    const fetchBroker = async () => {
      if (!brokerSlug) {
        navigate("/estanciavelha");
        return;
      }

      try {
        const { data, error } = await (supabase
          .from("brokers" as any)
          .select("id, name, slug, whatsapp, is_active")
          .eq("slug", brokerSlug)
          .eq("is_active", true)
          .maybeSingle() as any);

        if (error) throw error;

        if (!data) {
          // Corretor não encontrado, redireciona para a landing principal
          navigate("/estanciavelha");
          return;
        }

        setBroker(data as Broker);
      } catch (error) {
        console.error("Erro ao buscar corretor:", error);
        navigate("/estanciavelha");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBroker();
  }, [brokerSlug, navigate]);

  // Update page meta for this specific landing page
  useEffect(() => {
    if (broker) {
      document.title = `Condomínio Alto Padrão Estância Velha | ${broker.name}`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute("content", `Pré-lançamento exclusivo com ${broker.name}: condomínio fechado de terrenos em Estância Velha com 350 lotes a partir de 500m². Cadastre-se para acesso antecipado.`);
      }
    }
  }, [broker]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!broker) {
    return null; // Will redirect
  }

  return (
    <>
      {/* Skip to main content - Accessibility */}
      <a 
        href="#sobre" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg"
      >
        Pular para o conteúdo principal
      </a>

      <div className="min-h-screen bg-background">
        <Header />
        <main id="main-content" role="main">
          <HeroSection />
          <AboutSection />
          <FeaturesSection />
          <UrgencySection />
          <BenefitsSection />
          <FormSection brokerId={broker.id} brokerSlug={broker.slug} />
          <DisclaimerSection />
        </main>
        <Footer />
        <FloatingCTA />
      </div>
    </>
  );
};

export default BrokerLandingPage;
