import { useEffect, useRef, useState } from "react";
import { Megaphone, Trophy, ShieldCheck } from "lucide-react";

const cards = [
  {
    icon: Megaphone,
    title: "Equipe de marketing própria especializada em lançamentos",
    description: "Planejamos, criamos e executamos toda a estratégia de comunicação do empreendimento.",
    items: [
      "Posicionamento e naming",
      "Branding e storytelling do produto",
      "Estratégia de mídia e tráfego pago",
      "Landing pages e funis de captação",
      "Automação e nutrição de leads",
      "Conteúdo e campanhas de conversão",
    ],
    highlight: "Marketing e vendas trabalham integrados desde o primeiro dia.",
  },
  {
    icon: Trophy,
    title: "Corretores especialistas em alta performance",
    description: "Nossa equipe é treinada exclusivamente para lançamentos imobiliários.",
    items: [
      "Processo comercial estruturado",
      "Scripts e playbooks próprios",
      "Gestão ativa de leads",
      "Acompanhamento de métricas de conversão",
      "Cultura de performance e metas",
    ],
    highlight: "Cada lead é tratado como uma oportunidade real de venda.",
  },
  {
    icon: ShieldCheck,
    title: "Primeira imobiliária do RS completamente adaptada à LGPD",
    description: "Segurança jurídica e conformidade são pilares fundamentais em nossa operação.",
    items: [
      "Captação e tratamento de dados conforme LGPD",
      "Processos auditáveis e rastreáveis",
      "Segurança no armazenamento de informações",
      "Proteção da incorporadora e do cliente final",
    ],
    highlight: "Parceiros precisam de segurança. Nós entregamos.",
  },
];

const HomeDifferentials = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-12 sm:py-16 px-4 bg-card/30"
      aria-labelledby="differentials-heading"
    >
      <div className="container max-w-6xl">
        <div className={`text-center mb-14 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="divider-gold mx-auto mb-6" aria-hidden="true" />
          <h2 id="differentials-heading" className="section-title mb-4">
            Muito além da{" "}
            <span className="text-primary">intermediação</span>
          </h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            Somos uma operação completa de lançamentos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {cards.map(({ icon: Icon, title, description, items, highlight }, i) => (
            <article
              key={title}
              className={`card-luxury flex flex-col transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${200 + i * 150}ms` }}
            >
              <Icon className="w-8 h-8 text-primary mb-5" aria-hidden="true" />
              <h3 className="font-serif text-xl sm:text-2xl font-semibold text-foreground mb-3 leading-snug">
                {title}
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base mb-5">{description}</p>

              <ul className="space-y-2 mb-6 flex-1" role="list">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="text-sm font-medium text-primary border-t border-border/50 pt-4">
                {highlight}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeDifferentials;
