import { useEffect, useRef, useState } from "react";
import { MessageCircle, LayoutGrid, Zap, BarChart3, Users, Shield } from "lucide-react";

const features = [
  {
    icon: MessageCircle,
    title: "Copiloto WhatsApp",
    description: "IA que responde, qualifica e agenda visitas automaticamente pelo WhatsApp. Nunca mais perca um lead por demora no atendimento.",
  },
  {
    icon: LayoutGrid,
    title: "CRM Kanban Inteligente",
    description: "Visualize todos os seus leads em um painel intuitivo. O Copiloto organiza e move automaticamente cada lead no kanban, do primeiro contato até a venda.",
  },
  {
    icon: Zap,
    title: "Automação de Cadências",
    description: "Configure sequências automáticas de follow-up. O Copilot envia mensagens no timing perfeito para manter o lead engajado.",
  },
  {
    icon: BarChart3,
    title: "Inteligência de Dados",
    description: "Dashboard com métricas em tempo real: taxa de conversão, tempo de resposta, performance por corretor e muito mais.",
  },
  {
    icon: Users,
    title: "Roletas de Distribuição",
    description: "Distribua leads automaticamente entre sua equipe com regras inteligentes. Justo, rápido e rastreável.",
  },
  {
    icon: Shield,
    title: "LGPD Compliant",
    description: "Captação e tratamento de dados 100% conforme a LGPD. Segurança para sua imobiliária e seus clientes.",
  },
];

const CopilotFeatures = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-20 sm:py-28 px-4" id="funcionalidades">
      <div className="container max-w-6xl">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <span className="text-xs font-mono font-semibold tracking-[0.3em] uppercase text-primary mb-4 block">Funcionalidades</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Tudo que você precisa para{" "}
            <span className="text-gold-gradient">vender mais</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Um CRM completo com IA integrada, pensado exclusivamente para o mercado imobiliário.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }, i) => (
            <article
              key={title}
              className={`group p-6 sm:p-8 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm
                hover:border-primary/40 hover:bg-card/60 transition-all duration-500
                ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{ transitionDelay: `${150 + i * 80}ms` }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CopilotFeatures;
