import { useEffect, useState } from "react";
import { ArrowRight, Plane } from "lucide-react";
import copilotLogo from "@/assets/copilot-logo-dark.png";

const CopilotHero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const scrollToPlanos = () => {
    document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Grid pattern background */}
      <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-primary/8 blur-[150px]" aria-hidden="true" />

      <div className={`relative z-10 max-w-5xl mx-auto text-center transition-all duration-1000 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
        {/* Logo */}
        <img
          src={copilotLogo}
          alt="Copilot Broker"
          className="h-20 sm:h-24 md:h-28 mx-auto mb-10"
          loading="eager"
        />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 mb-8 rounded-full border border-primary/30 bg-primary/5 backdrop-blur-sm">
          <Plane className="w-4 h-4 text-primary" />
          <span className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-primary font-mono">
            CRM com Inteligência Artificial
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.08] mb-6 tracking-tight">
          Decole seus{" "}
          <span className="text-gold-gradient">resultados</span>
          <br className="hidden sm:block" />
          {" "}no mercado imobiliário
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto mb-5">
          O copiloto inteligente que automatiza seu atendimento via WhatsApp,
          organiza seus leads e multiplica suas vendas.
        </p>

        <p className="text-sm sm:text-base text-muted-foreground/70 max-w-xl mx-auto mb-10 font-mono">
          Para corretores e imobiliárias que querem vender mais, com menos esforço.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/signup"
            className="btn-primary text-base gap-2"
          >
            Começar Agora
            <ArrowRight className="w-5 h-5" />
          </a>
          <button
            onClick={scrollToPlanos}
            className="btn-outline text-base"
          >
            Ver Planos
          </button>
        </div>

        {/* Stats */}
        <div className={`mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {[
            { value: "10x", label: "mais rápido" },
            { value: "24/7", label: "atendimento" },
            { value: "0", label: "leads perdidos" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <span className="block text-2xl sm:text-3xl font-bold text-primary font-mono">{value}</span>
              <span className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CopilotHero;
