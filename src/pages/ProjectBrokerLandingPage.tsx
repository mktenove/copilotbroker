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

interface Broker {
  id: string;
  name: string;
  slug: string;
  whatsapp: string | null;
  is_active: boolean;
}

const ProjectBrokerLandingPage = () => {
  const { citySlug, projectSlug, brokerSlug } = useParams<{ citySlug: string; projectSlug: string; brokerSlug: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [broker, setBroker] = useState<Broker | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track page view with project ID once loaded
  usePageTracking(project?.id);

  useEffect(() => {
    const fetchData = async () => {
      if (!citySlug || !projectSlug || !brokerSlug) {
        navigate("/");
        return;
      }

      try {
        // Fetch project using city_slug + slug
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("city_slug", citySlug)
          .eq("slug", projectSlug)
          .eq("is_active", true)
          .maybeSingle();

        if (projectError) throw projectError;

        if (!projectData) {
          navigate("/");
          return;
        }

        // Fetch broker and verify they're associated with this project
        const { data: brokerData, error: brokerError } = await supabase
          .from("brokers")
          .select("id, name, slug, whatsapp, is_active")
          .eq("slug", brokerSlug)
          .eq("is_active", true)
          .maybeSingle();

        if (brokerError) throw brokerError;

        if (!brokerData) {
          // Corretor não encontrado, redireciona para landing do projeto
          navigate(`/${citySlug}/${projectSlug}`);
          return;
        }

        // Check if broker is associated with this project
        const { data: association } = await supabase
          .from("broker_projects")
          .select("id")
          .eq("broker_id", brokerData.id)
          .eq("project_id", (projectData as any).id)
          .eq("is_active", true)
          .maybeSingle();

        if (!association) {
          // Corretor não está associado ao projeto
          navigate(`/${citySlug}/${projectSlug}`);
          return;
        }

        setProject(projectData as unknown as Project);
        setBroker(brokerData as Broker);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [citySlug, projectSlug, brokerSlug, navigate]);

  // Update page meta
  useEffect(() => {
    if (project && broker) {
      document.title = `${project.name} | ${broker.name}`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          "content",
          `Pré-lançamento exclusivo com ${broker.name}: ${project.name} em ${project.city}. Cadastre-se para acesso antecipado.`
        );
      }
    }
  }, [project, broker]);

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

  if (!project || !broker) {
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
            brokerId={broker.id}
            brokerSlug={broker.slug}
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

export default ProjectBrokerLandingPage;
