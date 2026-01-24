import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
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

  const canonicalUrl = "https://onovocondominio.lovable.app/estanciavelha";
  const ogImageUrl = "https://onovocondominio.lovable.app/og-image.jpg";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "Enove Imobiliária",
    "description": "Comercialização exclusiva do novo condomínio de alto padrão em Estância Velha - RS",
    "url": canonicalUrl,
    "telephone": "+55-51-0000-0000",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Estância Velha",
      "addressRegion": "RS",
      "addressCountry": "BR"
    },
    "areaServed": {
      "@type": "City",
      "name": "Estância Velha"
    },
    "makesOffer": {
      "@type": "Offer",
      "itemOffered": {
        "@type": "Product",
        "name": "Lotes em Condomínio Fechado",
        "description": "350 lotes exclusivos a partir de 500m² em condomínio fechado de alto padrão"
      }
    }
  };

  return (
    <>
      {/* Skip to main content - Accessibility */}
      <Helmet>
        <title>Condomínio Alto Padrão Estância Velha | 350 Lotes a partir de 500m²</title>
        <meta name="title" content="Condomínio Alto Padrão Estância Velha | 350 Lotes a partir de 500m²" />
        <meta name="description" content="Pré-lançamento exclusivo: condomínio fechado de terrenos em Estância Velha com 350 lotes a partir de 500m². Vista deslumbrante, piscina aquecida e infraestrutura de alto padrão." />
        <meta name="keywords" content="condomínio fechado Estância Velha, terrenos Vale dos Sinos, lotes alto padrão RS, Ábaco Incorporadora, Enove Imobiliária, lançamento imobiliário 2025" />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Enove Imobiliária" />
        <meta property="og:title" content="Novo Condomínio em Estância Velha | Lançamento 2025" />
        <meta property="og:description" content="Cadastre-se para acesso antecipado ao maior lançamento imobiliário de Estância Velha. 350 lotes exclusivos a partir de 500m²." />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Condomínio de alto padrão em Estância Velha - Vista aérea" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content="Novo Condomínio em Estância Velha | Lançamento 2025" />
        <meta name="twitter:description" content="Cadastre-se para acesso antecipado. 350 lotes exclusivos a partir de 500m²." />
        <meta name="twitter:image" content={ogImageUrl} />

        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

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
