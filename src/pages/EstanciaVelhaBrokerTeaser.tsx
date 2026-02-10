import { useEffect, useRef, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import FormSection from "@/components/FormSection";
import logoEnove from "@/assets/logo-enove.png";

const EstanciaVelhaBrokerTeaser = () => {
  const { brokerSlug } = useParams<{ brokerSlug: string }>();
  const [isVisible, setIsVisible] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [brokerId, setBrokerId] = useState<string | null>(null);
  const [brokerName, setBrokerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [projectRes, brokerRes] = await Promise.all([
        supabase.from("projects").select("id").eq("slug", "estanciavelha").maybeSingle(),
        supabase.from("brokers").select("id, name").eq("slug", brokerSlug!).eq("is_active", true).maybeSingle(),
      ]);

      if (projectRes.data) setProjectId(projectRes.data.id);

      if (brokerRes.data) {
        setBrokerId(brokerRes.data.id);
        setBrokerName(brokerRes.data.name);
      } else {
        setNotFound(true);
      }

      setLoading(false);
    };

    if (brokerSlug) fetchData();
  }, [brokerSlug]);

  if (!loading && notFound) {
    return <Navigate to="/estanciavelha" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Em Breve — {brokerName || "Corretor"} | Enove</title>
        <meta name="description" content="Novos empreendimentos de alto padrão estão chegando ao Vale dos Sinos. Cadastre-se e seja o primeiro a saber." />
        <link rel="canonical" href={`https://onovocondominio.com.br/estanciavelha/${brokerSlug}`} />
        <meta name="robots" content="noindex, nofollow" />
        <script type="text/javascript">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","vbso39eiiq");`}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="py-6 flex justify-center">
          <img src={logoEnove} alt="Enove Imobiliária" className="h-10 sm:h-12" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <div
            ref={heroRef}
            className={`max-w-2xl mx-auto text-center space-y-8 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-sm font-medium text-primary">Novidade Chegando</span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-bold tracking-tight">
              Em Breve
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Novos empreendimentos de alto padrão estão chegando ao Vale dos Sinos. Cadastre-se e seja o primeiro a saber.
            </p>

            <p className="text-primary font-semibold text-lg">Não fique de fora.</p>
          </div>

          <FormSection
            projectId={projectId}
            projectSlug="estanciavelha"
            brokerId={brokerId}
            brokerSlug={brokerSlug}
          />
        </main>

        <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border">
          © {new Date().getFullYear()} Enove Imobiliária. Todos os direitos reservados.
        </footer>
      </div>
    </>
  );
};

export default EstanciaVelhaBrokerTeaser;
