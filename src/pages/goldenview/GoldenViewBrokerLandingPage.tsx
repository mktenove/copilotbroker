import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
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
        navigate("/goldenview");
        return;
      }

      try {
        // Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("id, name, slug, webhook_url")
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
          navigate("/goldenview");
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
          navigate("/goldenview");
          return;
        }

        setProject(projectData);
        setBroker(brokerData);
      } catch (err) {
        console.error("Error:", err);
        navigate("/goldenview");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [brokerSlug, navigate]);

  // Update page metadata
  useEffect(() => {
    if (project && broker) {
      document.title = `GoldenView | ${broker.name} - Enove Imobiliária`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          `Pré-lançamento exclusivo: condomínio fechado de terrenos de alto padrão em Portão. Atendimento personalizado com ${broker.name}.`
        );
      }
    }
  }, [project, broker]);

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

  return (
    <div className="min-h-screen bg-background text-foreground">
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
