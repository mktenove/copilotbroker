import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import usePageTracking from "@/hooks/use-page-tracking";
import {
  GVHeader,
  GVHeroSection,
  GVPartnersSection,
  GVFeaturesSection,
  GVTargetAudienceSection,
  GVUrgencySection,
  GVBenefitsSection,
  GVCallToActionSection,
  GVFormSection,
  GVFooter,
  GVFloatingCTA
} from "@/components/goldenview";

interface Project {
  id: string;
  name: string;
  slug: string;
  webhook_url: string | null;
}

const GoldenViewLandingPage = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Track page view
  usePageTracking(project?.id);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, slug, webhook_url")
          .eq("city_slug", "portao")
          .eq("slug", "goldenview")
          .eq("is_active", true)
          .maybeSingle();

        if (error) {
          console.error("Error fetching project:", error);
          navigate("/");
          return;
        }

        if (!data) {
          console.error("GoldenView project not found");
          navigate("/");
          return;
        }

        setProject(data);
      } catch (err) {
        console.error("Error:", err);
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [navigate]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const canonicalUrl = "https://onovocondominio.com.br/portao/goldenview";
  const ogImageUrl = "https://onovocondominio.com.br/goldenview-og.jpg";

  // Rich Residence Schema
  const residenceSchema = {
    "@context": "https://schema.org",
    "@type": "Residence",
    "@id": `${canonicalUrl}#residence`,
    "name": "GoldenView Residencial",
    "description": "Condomínio fechado de alto padrão em Portão - RS com vista panorâmica. Lotes de 300m² a 600m² com infraestrutura completa.",
    "url": canonicalUrl,
    "image": ogImageUrl,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Portão",
      "addressRegion": "RS",
      "addressCountry": "BR",
      "postalCode": "93180-000"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "-29.5489",
      "longitude": "-51.1639"
    },
    "amenityFeature": [
      { "@type": "LocationFeatureSpecification", "name": "Vista panorâmica", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Segurança 24h", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Piscina", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Clube", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Quadras esportivas", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Trilhas ecológicas", "value": true }
    ],
    "floorSize": {
      "@type": "QuantitativeValue",
      "minValue": 300,
      "maxValue": 600,
      "unitCode": "MTK"
    },
    "numberOfRooms": "Lotes de 300m² a 600m²",
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
        "name": "Qual o tamanho dos lotes no GoldenView?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Os lotes variam de 300m² a 600m², todos com vista panorâmica e infraestrutura completa."
        }
      },
      {
        "@type": "Question",
        "name": "O condomínio GoldenView tem segurança 24h?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sim, o GoldenView conta com portaria 24h, controle de acesso e sistema de segurança completo com monitoramento por câmeras."
        }
      },
      {
        "@type": "Question",
        "name": "Quais são as opções de lazer do GoldenView?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "O condomínio oferece clube completo com piscina, quadras esportivas, trilhas ecológicas, salão de festas e área gourmet."
        }
      },
      {
        "@type": "Question",
        "name": "Onde fica localizado o GoldenView?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "O GoldenView está localizado em Portão, RS, em uma região privilegiada com vista panorâmica para o Vale dos Sinos."
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
      { "@type": "ListItem", "position": 2, "name": "Portão", "item": "https://onovocondominio.com.br/portao" },
      { "@type": "ListItem", "position": 3, "name": "GoldenView", "item": canonicalUrl }
    ]
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>GoldenView | Condomínio de Alto Padrão em Portão - RS</title>
        <meta name="title" content="GoldenView | Condomínio de Alto Padrão em Portão" />
        <meta name="description" content="Pré-lançamento exclusivo: condomínio fechado de terrenos de alto padrão em Portão. Vista panorâmica, segurança 24h e valorização garantida. Construsinos + Maricler." />
        <meta name="keywords" content="condomínio fechado Portão, terrenos alto padrão Portão RS, GoldenView Residencial, Construsinos, Maricler, lotes Portão 2026, condomínio vista panorâmica, lotes 300m², lotes 600m²" />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Enove Imobiliária" />
        <meta property="og:title" content="GoldenView | Condomínio de Alto Padrão em Portão" />
        <meta property="og:description" content="Pré-lançamento exclusivo em Portão. Condomínio fechado com vista panorâmica e infraestrutura completa. Cadastre-se para acesso antecipado." />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="GoldenView - Condomínio de alto padrão em Portão com vista panorâmica" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content="GoldenView | Condomínio em Portão" />
        <meta name="twitter:description" content="Pré-lançamento exclusivo. Vista panorâmica e segurança 24h." />
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

        {/* Microsoft Clarity - GoldenView */}
        <script type="text/javascript">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "vbsotke2wh");`}
        </script>
      </Helmet>

      {/* Skip to main content link for accessibility */}
      <a
        href="#cadastro"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
      >
        Ir para o cadastro
      </a>

      <GVHeader />
      
      <main id="main-content" role="main">
        <GVHeroSection />
        <GVPartnersSection />
        <GVFeaturesSection />
        <GVTargetAudienceSection />
        <GVUrgencySection />
        <GVBenefitsSection />
        <GVCallToActionSection />
        <GVFormSection
          projectId={project.id}
          webhookUrl={project.webhook_url}
        />
      </main>
      
      <GVFooter />
      <GVFloatingCTA />
    </div>
  );
};

export default GoldenViewLandingPage;
