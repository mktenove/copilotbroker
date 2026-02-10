import { useEffect, useRef, useState } from "react";

const HomeHero = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const scrollToCTA = () => {
    document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[85vh] flex items-center justify-center px-4 py-20 sm:py-28 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card/30" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" aria-hidden="true" />

      <div className={`relative z-10 max-w-4xl mx-auto text-center transition-all duration-1000 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-primary/30 bg-primary/5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-slow" aria-hidden="true" />
          <span className="text-xs sm:text-sm font-medium tracking-widest uppercase text-primary">
            Plataforma de Lançamentos
          </span>
        </div>

        <h1 id="hero-heading" className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-foreground leading-[1.1] mb-6">
          O parceiro estratégico para{" "}
          <span className="text-primary">lançamentos imobiliários</span>{" "}
          no RS
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto mb-4">
          Transformamos lançamentos em cases de sucesso através de estratégia, tecnologia e uma operação comercial de alta performance.
        </p>

        <p className="text-base sm:text-lg text-muted-foreground/80 max-w-2xl mx-auto mb-10">
          A Enove atua lado a lado com incorporadoras desde a concepção do produto até a última unidade vendida.
        </p>

        <button
          onClick={scrollToCTA}
          className="btn-primary text-base"
          aria-label="Ir para seção de contato"
        >
          Quero Lançar com a Enove
        </button>
      </div>
    </section>
  );
};

export default HomeHero;
