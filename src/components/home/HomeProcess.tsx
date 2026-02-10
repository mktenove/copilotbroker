import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Pré-lançamento",
    description: "Construção da base de demanda e posicionamento do produto.",
    items: [
      "Estratégia comercial",
      "Criação da jornada do cliente",
      "Estruturação da captação de leads",
      "Formação da lista qualificada de interessados",
    ],
  },
  {
    number: "02",
    title: "Lançamento",
    description: "Execução coordenada para alta velocidade de vendas.",
    items: [
      "Gestão de plantões e equipe",
      "Operação de vendas orientada por dados",
      "Acompanhamento em tempo real",
      "Conversão intensiva de leads",
    ],
  },
  {
    number: "03",
    title: "Pós-lançamento",
    description: "Continuidade do processo até a última unidade vendida.",
    items: [
      "Gestão de estoque",
      "Campanhas de giro",
      "Relacionamento com clientes",
      "Suporte comercial contínuo",
    ],
  },
];

const HomeProcess = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-28 px-4"
      aria-labelledby="process-heading"
    >
      <div className="container max-w-5xl">
        <div className={`text-center mb-14 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="divider-gold mx-auto mb-10" aria-hidden="true" />
          <h2 id="process-heading" className="section-title mb-4">
            Participamos de todo o{" "}
            <span className="text-primary">ciclo do lançamento</span>
          </h2>
        </div>

        <div className="space-y-8 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
          {steps.map(({ number, title, description, items }, i) => (
            <article
              key={number}
              className={`relative transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${200 + i * 150}ms` }}
            >
              {/* Number */}
              <span className="block font-serif text-5xl sm:text-6xl font-bold text-primary/15 mb-2 leading-none select-none" aria-hidden="true">
                {number}
              </span>

              <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground mb-3">
                {title}
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base mb-5">{description}</p>

              <ul className="space-y-2" role="list">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className={`text-center text-lg sm:text-xl font-serif text-primary italic mt-14 transition-all duration-700 delay-700 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          Nosso compromisso não termina no dia do lançamento.
        </p>
      </div>
    </section>
  );
};

export default HomeProcess;
