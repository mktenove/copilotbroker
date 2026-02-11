import { useEffect, useRef, useState } from "react";

const HomePartnership = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-12 sm:py-16 px-4 bg-card/30"
      aria-labelledby="partnership-heading"
    >
      <div className={`container max-w-3xl text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        <div className="divider-gold mx-auto mb-6" aria-hidden="true" />

        <h2 id="partnership-heading" className="section-title mb-8">
          Parcerias de longo prazo são o{" "}
          <span className="text-primary">nosso foco</span>
        </h2>

        <div className="space-y-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
          <p>
            Não buscamos apenas intermediar vendas.
            Buscamos construir relações duradouras com incorporadoras que desejam crescer de forma estruturada e consistente.
          </p>
          <p>
            Trabalhamos com visão de longo prazo, transparência e alinhamento de objetivos.
          </p>
        </div>

        <p className="text-xl sm:text-2xl font-serif text-primary font-medium mt-10">
          O sucesso do empreendimento é o nosso sucesso.
        </p>
      </div>
    </section>
  );
};

export default HomePartnership;
