import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import FormSection from "@/components/FormSection";
import logoEnove from "@/assets/logo-enove.png";
const EstanciaVelhaTeaser = () => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [visibleItems, setVisibleItems] = useState<number>(0);
  const heroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        // Staggered reveal: increment every 200ms
        let count = 0;
        const interval = setInterval(() => {
          count++;
          setVisibleItems(count);
          if (count >= 6) clearInterval(interval);
        }, 200);
      }
    }, {
      threshold: 0.1
    });
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const fetchProject = async () => {
      const {
        data
      } = await supabase.from("projects").select("id").eq("slug", "estanciavelha").maybeSingle();
      if (data) setProjectId(data.id);
    };
    fetchProject();
  }, []);
  const itemClass = (index: number) => `transition-all duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] ${visibleItems > index ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`;
  return <>
      <Helmet>
        <title>Em Breve — Novo Empreendimento no Vale dos Sinos | Enove</title>
        <meta name="description" content="Novos empreendimentos de alto padrão estão chegando ao Vale dos Sinos. Cadastre-se e seja o primeiro a saber." />
        <link rel="canonical" href="https://onovocondominio.com.br/estanciavelha" />
        <meta property="og:title" content="Em Breve — Novo Empreendimento | Enove" />
        <meta property="og:description" content="Novos empreendimentos de alto padrão estão chegando ao Vale dos Sinos." />
        <meta property="og:url" content="https://onovocondominio.com.br/estanciavelha" />
        <meta property="og:type" content="website" />
        <script type="text/javascript">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","vbso39eiiq");`}
        </script>
      </Helmet>

      <div className="min-h-screen flex flex-col relative overflow-hidden" style={{
      background: `
            radial-gradient(ellipse 60% 50% at 50% 40%, hsl(48 96% 53% / 0.04) 0%, transparent 70%),
            linear-gradient(180deg, #0a0a0d 0%, #0f0f12 40%, #0a0a0d 100%)
          `
    }}>
        {/* Header */}
        <header className="relative py-8 flex justify-center">
          <a href="https://www.enoveimobiliaria.com.br/" target="_blank" rel="noopener noreferrer" className="opacity-80 hover:opacity-100 transition-opacity duration-500">
            <img src={logoEnove} alt="Enove Imobiliária" className="h-10 sm:h-12" />
          </a>
          {/* Gold line */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-12">
          <div ref={heroRef} className="max-w-2xl mx-auto text-center space-y-6">
            {/* Badge */}
            <div className={itemClass(0)}>
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs font-medium text-primary uppercase tracking-[0.25em]">
                  Novidade Chegando
                </span>
              </div>
            </div>

            {/* Title */}
            <div className={itemClass(1)}>
              <h1 className="text-7xl sm:text-8xl md:text-9xl font-serif font-bold tracking-[0.2em] sm:tracking-[0.3em] text-foreground/90 uppercase">
                Em Breve
              </h1>
            </div>

            {/* Gold divider */}
            <div className={itemClass(2)}>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-px bg-gradient-to-r from-transparent to-primary/50" />
                <div className="w-1.5 h-1.5 rotate-45 bg-primary/60" />
                <div className="w-12 h-px bg-gradient-to-l from-transparent to-primary/50" />
              </div>
            </div>

            {/* Subtitle */}
            <div className={itemClass(3)}>
              <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed font-light tracking-wide">
                Novos empreendimentos de alto padrão estão chegando ao Vale dos Sinos. Cadastre-se e seja o primeiro a saber.
              </p>
            </div>

            {/* Quote */}
            <div className={itemClass(4)}>
              <p className="text-primary font-serif italic text-xl sm:text-2xl tracking-wide">
                <span className="text-primary/40 text-3xl mr-1">"</span>
                Não fique de fora.
                <span className="text-primary/40 text-3xl ml-1">"</span>
              </p>
            </div>
          </div>

          {/* Form */}
          <div className={`w-full max-w-lg mx-auto mt-10 ${itemClass(5)}`}>
            <FormSection projectId={projectId} projectSlug="estanciavelha" allowBrokerSelection={true} />
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 text-center">
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mx-auto mb-4" />
          <p className="text-[11px] text-muted-foreground/60 tracking-widest uppercase">
            © {new Date().getFullYear()} Enove Imobiliária
          </p>
        </footer>
      </div>
    </>;
};
export default EstanciaVelhaTeaser;