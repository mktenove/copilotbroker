import { useEffect, useState } from "react";
import { useParams, useLocation, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/use-page-tracking";
import {
  MCHeader,
  MCHeroSection,
  MCLocationSection,
  MCFeaturesSection,
  MCTargetSection,
  MCUrgencySection,
  MCBenefitsSection,
  MCCallToActionSection,
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

      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("slug", "mauriciocardoso")
        .eq("city_slug", "novohamburgo")
        .single();

      if (project) setProjectId(project.id);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
        <meta property="og:description" content="Na Rua Maurício Cardoso, o endereço mais icônico de Novo Hamburgo, surge um empreendimento que redefine o morar contemporâneo." />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta name="robots" content="noindex, nofollow" />

        <script>
          {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1447260256915517');
          fbq('track', 'PageView');`}
        </script>
        <noscript>
          {`<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1447260256915517&ev=PageView&noscript=1" />`}
        </noscript>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <MCHeader brokerName={brokerName} />
        <MCHeroSection />
        <MCLocationSection />
        <MCFeaturesSection />
        <MCTargetSection />
        <MCUrgencySection />
        <MCBenefitsSection />
        <MCCallToActionSection />
        <MCFormSection projectId={projectId} brokerId={brokerId} submitted={submitted} />
        <MCFloatingCTA />
        <MCFooter />
      </div>
    </>
  );
};

export default MauricioCardosoBrokerLandingPage;
