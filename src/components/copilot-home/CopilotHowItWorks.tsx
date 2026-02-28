import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Cadastre-se",
    description: "Crie sua conta em menos de 2 minutos. Sem contratos, sem burocracia.",
  },
  {
    number: "02",
    title: "Conecte seu WhatsApp",
    description: "Escaneie o QR Code e ative o Copiloto IA para responder seus leads automaticamente.",
  },
  {
    number: "03",
    title: "Decole suas vendas",
    description: "Gerencie leads no Kanban, acompanhe métricas e veja seus resultados decolarem.",
  },
];

const CopilotHowItWorks = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-20 sm:py-28 px-4 bg-card/30">
      <div className="container max-w-5xl">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <span className="text-xs font-mono font-semibold tracking-[0.3em] uppercase text-primary mb-4 block">Como funciona</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
            Simples como{" "}
            <span className="text-gold-gradient">decolar</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {steps.map(({ number, title, description }, i) => (
            <div
              key={number}
              className={`relative text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${200 + i * 150}ms` }}
            >
              <span className="block font-mono text-6xl sm:text-7xl font-bold text-primary/10 mb-3 select-none" aria-hidden="true">
                {number}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{title}</h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{description}</p>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 -right-6 w-12 h-px bg-gradient-to-r from-primary/30 to-transparent" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CopilotHowItWorks;
