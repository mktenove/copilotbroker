import { useEffect, useRef, useState } from "react";
import { Target, BarChart3, Users, Gauge, HeartHandshake } from "lucide-react";

const items = [
{ icon: Target, label: "Planejamento estratégico" },
{ icon: BarChart3, label: "Estrutura de marketing e geração de demanda" },
{ icon: Users, label: "Gestão comercial especializada" },
{ icon: Gauge, label: "Operação de vendas orientada por dados" },
{ icon: HeartHandshake, label: "Relacionamento contínuo com leads e clientes" }];


const HomePositioning = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {if (entry.isIntersecting) setIsVisible(true);},
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-28 px-4"
      aria-labelledby="positioning-heading">

      <div className={`container max-w-4xl transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        <div className="divider-gold mx-auto mb-10" aria-hidden="true" />

        <h2 id="positioning-heading" className="section-title text-center mb-8">
          Lançamentos exigem método,{" "}
          <span className="text-primary">não improviso</span>
        </h2>

        <div className="space-y-5 text-base sm:text-lg text-muted-foreground leading-relaxed mb-10">
          <p>
            Lançar um empreendimento não é apenas colocar unidades à venda.
            É construir posicionamento, gerar demanda qualificada e conduzir um processo comercial estruturado capaz de converter interesse em vendas reais.
          </p>
          <p className="text-foreground font-medium">A Enove Select nasceu com esse foco.</p>
          <p>
            Somos especialistas em lançamentos imobiliários e estruturamos toda a jornada comercial do empreendimento:
          </p>
        </div>

        <ul className="space-y-4 mb-10" role="list">
          {items.map(({ icon: Icon, label }, i) =>
          <li
            key={label}
            className={`flex items-center gap-4 transition-all duration-500 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"}`}
            style={{ transitionDelay: `${200 + i * 100}ms` }}>

              <Icon className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
              <span className="text-foreground/90 text-base sm:text-lg">{label}</span>
            </li>
          )}
        </ul>

        <p className="text-center text-lg sm:text-xl font-serif text-primary italic">
          Nosso objetivo é simples: maximizar velocidade de vendas e valorização do produto.
        </p>
      </div>
    </section>);

};

export default HomePositioning;