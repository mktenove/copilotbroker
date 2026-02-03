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

  const canonicalUrl = "https://onovocondominio.com.br/novohamburgo/mauriciocardoso";
  const ogImageUrl = "https://onovocondominio.com.br/mauriciocardoso-og.jpg";

  // Rich Residence Schema
  const residenceSchema = {
    "@context": "https://schema.org",
    "@type": "Residence",
    "@id": `${canonicalUrl}#residence`,
    "name": "Mauricio Cardoso Residencial",
    "description": "Empreendimento residencial de alto padrão na Rua Maurício Cardoso, Novo Hamburgo. Apartamentos de 95 a 125m², 2 e 3 dormitórios, com 1.800m² de lazer e wellness.",
    "url": canonicalUrl,
    "image": ogImageUrl,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Rua Maurício Cardoso",
      "addressLocality": "Novo Hamburgo",
      "addressRegion": "RS",
      "addressCountry": "BR",
      "postalCode": "93510-250"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "-29.6879",
      "longitude": "-51.1309"
    },
    "amenityFeature": [
      { "@type": "LocationFeatureSpecification", "name": "Piscina aquecida", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Academia completa", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Spa e wellness", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Salão de festas", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Playground", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Segurança 24h", "value": true }
    ],
    "floorSize": {
      "@type": "QuantitativeValue",
      "minValue": 95,
      "maxValue": 125,
      "unitCode": "MTK"
    },
    "numberOfRooms": "2 a 3 dormitórios",
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
        "name": "Qual o tamanho dos apartamentos no Mauricio Cardoso?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Os apartamentos variam de 95m² a 125m², com opções de 2 e 3 dormitórios, todos com acabamento de alto padrão."
        }
      },
      {
        "@type": "Question",
        "name": "Quais são as opções de lazer do empreendimento?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "O empreendimento conta com 1.800m² de área de lazer e wellness, incluindo piscina aquecida, academia completa, spa, salão de festas, playground e muito mais."
        }
      },
      {
        "@type": "Question",
        "name": "Onde fica localizado o Mauricio Cardoso?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "O empreendimento está localizado na Rua Maurício Cardoso, considerado o endereço mais icônico de Novo Hamburgo, RS."
        }
      },
      {
        "@type": "Question",
        "name": "Quando será o lançamento do Mauricio Cardoso?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "O empreendimento está em fase de pré-lançamento em 2026. Cadastre-se para receber informações exclusivas e condições especiais."
        }
      }
    ]
  };

  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Início", "item": "https://onovocondominio.com.br" },
      { "@type": "ListItem", "position": 2, "name": "Novo Hamburgo", "item": "https://onovocondominio.com.br/novohamburgo" },
      { "@type": "ListItem", "position": 3, "name": "Mauricio Cardoso", "item": canonicalUrl }
    ]
  };

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>Mauricio Cardoso | Apartamentos de Alto Padrão em Novo Hamburgo</title>
        <meta name="title" content="Mauricio Cardoso | Apartamentos de Alto Padrão em Novo Hamburgo" />
        <meta
          name="description"
          content="Empreendimento residencial na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo. Apartamentos de 95 a 125m², 2 e 3 dormitórios. 1.800m² de lazer e wellness."
        />
        <meta name="keywords" content="apartamentos Novo Hamburgo, Rua Maurício Cardoso, alto padrão Novo Hamburgo RS, apartamentos 3 dormitórios, wellness residencial, lançamento imobiliário 2026, apartamentos 95m², apartamentos 125m²" />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Enove Imobiliária" />
        <meta property="og:title" content="Mauricio Cardoso | Alto Padrão em Novo Hamburgo" />
        <meta
          property="og:description"
          content="Na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo, surge um empreendimento que redefine o morar contemporâneo."
        />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Mauricio Cardoso - Apartamentos de alto padrão em Novo Hamburgo" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content="Mauricio Cardoso | Alto Padrão em Novo Hamburgo" />
        <meta name="twitter:description" content="Apartamentos de 95 a 125m² na Rua Maurício Cardoso." />
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

        {/* Microsoft Clarity - Mauricio Cardoso */}
        <script type="text/javascript">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "vbsme5eo3h");`}
        </script>
      </Helmet>

      {/* Skip to main content - Accessibility */}
      <a 
        href="#cadastro" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[hsl(var(--mc-forest))] focus:text-white focus:rounded-lg"
      >
        Pular para o cadastro
      </a>

      <div className="min-h-screen bg-[hsl(var(--mc-cream))] light" data-theme="light">
        <MCHeader />
        <main id="main-content" role="main">
          <MCHeroSection />
          <MCLocationSection />
          <MCConceptSection />
          <MCApartmentsSection />
          <MCWellnessSection />
          <MCTargetSection />
          <MCInvestmentSection />
          <MCBenefitsSection />
          <MCFormSection projectId={projectId} />
        </main>
        <MCFloatingCTA />
        <MCFooter />
      </div>
    </>
  );
};

export default MauricioCardosoLandingPage;
