import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/use-page-tracking";
import {
  MCHeader,
  MCHeroSection,
  MCLocationSection,
  MCConceptSection,
  MCApartmentsSection,
  MCWellnessSection,
  MCTargetSection,
  MCInvestmentSection,
  MCBenefitsSection,
  MCFormSection,
  MCFloatingCTA,
  MCFooter,
} from "@/components/mauriciocardoso";

const MauricioCardosoLandingPage = () => {
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  
  usePageTracking(projectId);

  useEffect(() => {
    const fetchProject = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id")
        .eq("slug", "mauriciocardoso")
        .eq("city_slug", "novohamburgo")
        .single();

      if (data) {
        setProjectId(data.id);
      }
    };

    fetchProject();
  }, []);

  return (
    <>
      <Helmet>
        <title>Mauricio Cardoso | Apartamentos de Alto Padrão em Novo Hamburgo</title>
        <meta
          name="description"
          content="Empreendimento residencial na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo. Apartamentos de 95 a 125m², 2 e 3 dormitórios. 1.800m² de lazer e wellness."
        />
        <meta property="og:title" content="Mauricio Cardoso | Alto Padrão em Novo Hamburgo" />
        <meta
          property="og:description"
          content="Na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo, surge um empreendimento que redefine o morar contemporâneo."
        />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <link rel="canonical" href="https://onovocondominio.com.br/novohamburgo/mauriciocardoso" />
        
        {/* JSON-LD Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            "name": "Mauricio Cardoso",
            "description": "Empreendimento residencial de alto padrão na Rua Maurício Cardoso, Novo Hamburgo",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Rua Maurício Cardoso",
              "addressLocality": "Novo Hamburgo",
              "addressRegion": "RS",
              "addressCountry": "BR"
            },
            "offers": {
              "@type": "Offer",
              "priceCurrency": "BRL",
              "availability": "https://schema.org/PreOrder"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-[hsl(var(--mc-cream))]">
        <MCHeader />
        <MCHeroSection />
        <MCLocationSection />
        <MCConceptSection />
        <MCApartmentsSection />
        <MCWellnessSection />
        <MCTargetSection />
        <MCInvestmentSection />
        <MCBenefitsSection />
        <MCFormSection projectId={projectId} />
        <MCFloatingCTA />
        <MCFooter />
      </div>
    </>
  );
};

export default MauricioCardosoLandingPage;
