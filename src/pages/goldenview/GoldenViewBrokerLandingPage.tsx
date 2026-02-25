import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

interface Broker {
  id: string;
  name: string;
  slug: string;
}

const GoldenViewBrokerLandingPage = () => {
  const { brokerSlug } = useParams<{ brokerSlug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [broker, setBroker] = useState<Broker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Track page view
  usePageTracking(project?.id);

  useEffect(() => {
    const fetchData = async () => {
      if (!brokerSlug) {
        navigate("/portao/goldenview");
        return;
      }

      try {
        // Fetch project using city_slug + slug
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("id, name, slug, webhook_url")
          .eq("city_slug", "portao")
          .eq("slug", "goldenview")
          .eq("is_active", true)
          .maybeSingle();

        if (projectError || !projectData) {
          console.error("GoldenView project not found");
          navigate("/");
          return;
        }

        // Fetch broker
        const { data: brokerData, error: brokerError } = await supabase
          .from("brokers")
          .select("id, name, slug")
          .eq("slug", brokerSlug)
          .eq("is_active", true)
          .maybeSingle();

        if (brokerError || !brokerData) {
          console.error("Broker not found:", brokerSlug);
          navigate("/portao/goldenview");
          return;
        }

        // Verify broker is associated with this project
        const { data: association, error: assocError } = await supabase
          .from("broker_projects")
          .select("id")
          .eq("broker_id", brokerData.id)
          .eq("project_id", projectData.id)
          .eq("is_active", true)
          .maybeSingle();

        if (assocError || !association) {
          console.error("Broker not associated with GoldenView project");
          navigate("/portao/goldenview");
          return;
        }

        setProject(projectData);
        setBroker(brokerData);
      } catch (err) {
        console.error("Error:", err);
        navigate("/portao/goldenview");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [brokerSlug, navigate]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!project || !broker) {
    return null;
  }

  const canonicalUrl = `https://onovocondominio.lovable.app/portao/goldenview/${broker.slug}`;
  const ogImageUrl = "https://onovocondominio.lovable.app/goldenview-og.jpg";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": `GoldenView Residencial - ${broker.name}`,
    "description": `Condomínio fechado de alto padrão em Portão - RS. Atendimento personalizado com ${broker.name}.`,
    "url": canonicalUrl,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Portão",
      "addressRegion": "RS",
      "addressCountry": "BR"
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-14 sm:pb-0">
      <Helmet>
        <title>GoldenView | {broker.name} - Condomínio em Portão</title>
        <meta name="title" content={`GoldenView | ${broker.name} - Condomínio em Portão`} />
        <meta name="description" content={`Pré-lançamento exclusivo: condomínio fechado de alto padrão em Portão. Atendimento personalizado com ${broker.name}. Vista panorâmica e segurança 24h.`} />
        <meta name="keywords" content="condomínio fechado Portão, terrenos alto padrão Portão RS, GoldenView Residencial, Construsinos, Maricler" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Enove Imobiliária" />
        <meta property="og:title" content={`GoldenView | ${broker.name}`} />
        <meta property="og:description" content={`Pré-lançamento em Portão. Atendimento personalizado com ${broker.name}.`} />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`GoldenView | ${broker.name}`} />
        <meta name="twitter:description" content="Pré-lançamento exclusivo em Portão." />
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
          brokerId={broker.id}
          brokerSlug={broker.slug}
          webhookUrl={project.webhook_url}
        />
      </main>
      
      <GVFooter />
      <GVFloatingCTA />
    </div>
  );
};

export default GoldenViewBrokerLandingPage;
