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

  const canonicalUrl = "https://onovocondominio.lovable.app/portao/goldenview";
  const ogImageUrl = "https://onovocondominio.lovable.app/goldenview-og.jpg";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "GoldenView Residencial",
    "description": "Condomínio fechado de alto padrão em Portão - RS. Vista panorâmica e infraestrutura completa.",
    "url": canonicalUrl,
    "telephone": "+55-51-0000-0000",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Portão",
      "addressRegion": "RS",
      "addressCountry": "BR"
    },
    "areaServed": {
      "@type": "City",
      "name": "Portão"
    },
    "makesOffer": {
      "@type": "Offer",
      "itemOffered": {
        "@type": "Product",
        "name": "Lotes em Condomínio Fechado GoldenView",
        "description": "Terrenos exclusivos de alto padrão com vista panorâmica em condomínio fechado"
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>GoldenView | Condomínio de Alto Padrão em Portão - RS</title>
        <meta name="title" content="GoldenView | Condomínio de Alto Padrão em Portão" />
        <meta name="description" content="Pré-lançamento exclusivo: condomínio fechado de terrenos de alto padrão em Portão. Vista panorâmica, segurança 24h e valorização garantida. Construsinos + Maricler." />
        <meta name="keywords" content="condomínio fechado Portão, terrenos alto padrão Portão RS, GoldenView Residencial, Construsinos, Maricler, lotes Portão 2026, condomínio vista panorâmica" />
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

        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
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
      
      <main>
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
