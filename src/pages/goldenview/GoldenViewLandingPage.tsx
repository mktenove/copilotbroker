import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  // Update page metadata
  useEffect(() => {
    if (project) {
      document.title = "GoldenView | Residencial Alto Padrão em Portão";
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          "Pré-lançamento exclusivo: condomínio fechado de terrenos de alto padrão em Portão. Vista panorâmica, segurança e valorização. Cadastre-se para acesso antecipado."
        );
      }
    }
  }, [project]);

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
          webhookUrl={project.webhook_url}
        />
      </main>
      
      <GVFooter />
      <GVFloatingCTA />
    </div>
  );
};

export default GoldenViewLandingPage;
