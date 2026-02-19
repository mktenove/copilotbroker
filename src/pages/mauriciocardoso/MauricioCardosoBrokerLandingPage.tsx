import { useEffect, useState } from "react";
import { useParams, useLocation, Navigate } from "react-router-dom";
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

const MauricioCardosoBrokerLandingPage = () => {
  const { brokerSlug } = useParams<{ brokerSlug: string }>();
  const location = useLocation();
  const submitted = location.pathname.endsWith("/obrigado");
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [brokerId, setBrokerId] = useState<string | undefined>(undefined);
  const [brokerName, setBrokerName] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  usePageTracking(projectId);

  useEffect(() => {
    const fetchData = async () => {
      if (!brokerSlug) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      // Fetch project
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("slug", "mauriciocardoso")
        .eq("city_slug", "novohamburgo")
        .single();

      if (project) {
        setProjectId(project.id);
      }

      // Fetch broker
      const { data: broker } = await supabase
        .from("brokers")
        .select("id, name")
        .eq("slug", brokerSlug)
        .eq("is_active", true)
        .single();

      if (!broker) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setBrokerId(broker.id);
      setBrokerName(broker.name);
      setIsLoading(false);
    };

    fetchData();
  }, [brokerSlug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--mc-cream))] light flex items-center justify-center" data-theme="light">
        <div className="w-10 h-10 border-4 border-[hsl(var(--mc-sage))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return <Navigate to="/novohamburgo/mauriciocardoso" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Mauricio Cardoso | {brokerName} - Alto Padrão em Novo Hamburgo</title>
        <meta
          name="description"
          content={`Empreendimento residencial na Rua Maurício Cardoso, Novo Hamburgo. Atendimento exclusivo com ${brokerName}. Apartamentos de 95 a 125m².`}
        />
        <meta property="og:title" content={`Mauricio Cardoso | ${brokerName}`} />
        <meta
          property="og:description"
          content="Na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo, surge um empreendimento que redefine o morar contemporâneo."
        />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-[hsl(var(--mc-cream))] light" data-theme="light">
        <MCHeader brokerName={brokerName} />
        <MCHeroSection />
        <MCLocationSection />
        <MCConceptSection />
        <MCApartmentsSection />
        <MCWellnessSection />
        <MCTargetSection />
        <MCInvestmentSection />
        <MCBenefitsSection />
        <MCFormSection projectId={projectId} brokerId={brokerId} submitted={submitted} />
        <MCFloatingCTA />
        <MCFooter />
      </div>
    </>
  );
};

export default MauricioCardosoBrokerLandingPage;
