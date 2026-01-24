import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/types/project";
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
import { RefreshCw } from "lucide-react";
import { usePageTracking } from "@/hooks/use-page-tracking";

const ProjectLandingPage = () => {
  const { citySlug, projectSlug } = useParams<{ citySlug: string; projectSlug: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track page view with project ID once loaded
  usePageTracking(project?.id);

  useEffect(() => {
    const fetchProject = async () => {
      if (!citySlug || !projectSlug) {
        navigate("/");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("city_slug", citySlug)
          .eq("slug", projectSlug)
          .eq("is_active", true)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          // Projeto não encontrado, redireciona para home
          navigate("/");
          return;
        }

        setProject(data as unknown as Project);
      } catch (error) {
        console.error("Erro ao buscar projeto:", error);
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [citySlug, projectSlug, navigate]);

  // Update page meta for this specific project
  useEffect(() => {
    if (project) {
      document.title = `${project.name} | ${project.city}`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          project.description || 
          `Pré-lançamento exclusivo: ${project.name} em ${project.city}. Cadastre-se para acesso antecipado.`
        );
      }
    }
  }, [project]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null; // Will redirect
  }

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
            projectId={project.id}
            projectSlug={project.slug}
            allowBrokerSelection={true}
            webhookUrl={project.webhook_url}
          />
          <DisclaimerSection />
        </main>
        <Footer />
        <FloatingCTA />
      </div>
    </>
  );
};

export default ProjectLandingPage;
