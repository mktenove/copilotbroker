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

  // Rich Residence Schema
  const residenceSchema = {
    "@context": "https://schema.org",
    "@type": "Residence",
    "@id": `${canonicalUrl}#residence`,
    "name": "Condomínio Alto Padrão Estância Velha",
    "description": "Condomínio fechado de terrenos em Estância Velha com 350 lotes a partir de 500m². Vista deslumbrante, piscina aquecida e infraestrutura de alto padrão.",
    "url": canonicalUrl,
    "image": ogImageUrl,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Estância Velha",
      "addressRegion": "RS",
      "addressCountry": "BR",
      "postalCode": "93600-000"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "-29.6544",
      "longitude": "-51.1789"
    },
    "amenityFeature": [
      { "@type": "LocationFeatureSpecification", "name": "Vista panorâmica", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Piscina aquecida", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Segurança 24h", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Clube", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Quadras esportivas", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Trilhas", "value": true }
    ],
    "floorSize": {
      "@type": "QuantitativeValue",
      "minValue": 500,
      "unitCode": "MTK"
    },
    "numberOfRooms": "350 lotes a partir de 500m²",
    "petsAllowed": true,
    "tourBookingPage": `${canonicalUrl}#cadastro`
  };

  // FAQ Schema for Rich Snippets
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Qual o tamanho mínimo dos lotes em Estância Velha?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Os lotes têm tamanho mínimo de 500m², ideais para construir a casa dos seus sonhos com amplo espaço."
        }
      },
      {
        "@type": "Question",
        "name": "Quantos lotes estão disponíveis no condomínio?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "São 350 lotes exclusivos disponíveis neste empreendimento de alto padrão em Estância Velha."
        }
      },
      {
        "@type": "Question",
        "name": "O condomínio possui piscina aquecida?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sim, o condomínio conta com piscina aquecida além de clube completo, quadras esportivas e trilhas ecológicas."
        }
      },
      {
        "@type": "Question",
        "name": "Quem é a incorporadora do empreendimento?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "O empreendimento é uma realização da Ábaco Incorporadora com comercialização exclusiva da Enove Imobiliária."
        }
      }
    ]
  };

  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Início", "item": "https://onovocondominio.lovable.app" },
      { "@type": "ListItem", "position": 2, "name": "Estância Velha", "item": canonicalUrl }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Condomínio Alto Padrão Estância Velha | 350 Lotes a partir de 500m²</title>
        <meta name="title" content="Condomínio Alto Padrão Estância Velha | 350 Lotes a partir de 500m²" />
        <meta name="description" content="Pré-lançamento exclusivo: condomínio fechado de terrenos em Estância Velha com 350 lotes a partir de 500m². Vista deslumbrante, piscina aquecida e infraestrutura de alto padrão." />
        <meta name="keywords" content="condomínio fechado Estância Velha, terrenos Vale dos Sinos, lotes alto padrão RS, Ábaco Incorporadora, Enove Imobiliária, lançamento imobiliário 2025, lotes 500m², condomínio piscina aquecida" />
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

        {/* JSON-LD Schemas */}
        <script type="application/ld+json">
          {JSON.stringify(residenceSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
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
