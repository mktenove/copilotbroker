import { useEffect, useState } from "react";
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
import { usePageTracking } from "@/hooks/use-page-tracking";
import { supabase } from "@/integrations/supabase/client";

const EstanciaVelha = () => {
  const [projectId, setProjectId] = useState<string | null>(null);

  // Fetch project ID for estanciavelha
  useEffect(() => {
    const fetchProjectId = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id")
        .eq("slug", "estanciavelha")
        .maybeSingle();
      
      if (data) {
        setProjectId((data as any).id);
      }
    };
    fetchProjectId();
  }, []);

  // Track page view with project ID
  usePageTracking(projectId || undefined);

  // Update page meta for this specific landing page
  useEffect(() => {
    document.title = "Condomínio Alto Padrão Estância Velha | 350 Lotes a partir de 500m²";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Pré-lançamento exclusivo: condomínio fechado de terrenos em Estância Velha com 350 lotes a partir de 500m². Vista deslumbrante, piscina aquecida e infraestrutura de alto padrão. Cadastre-se para acesso antecipado.");
    }
  }, []);

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
          <FormSection 
            projectId={projectId}
            projectSlug="estanciavelha"
            allowBrokerSelection={true} 
          />
          <DisclaimerSection />
        </main>
        <Footer />
        <FloatingCTA />
      </div>
    </>
  );
};

export default EstanciaVelha;
