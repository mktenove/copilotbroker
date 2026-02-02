import { Bell, FileText, Lock, Star } from "lucide-react";

const MCBenefitsSection = () => {
  const benefits = [
    {
      icon: FileText,
      title: "Informações Completas",
      description: "Acesso a todos os detalhes sobre o projeto",
    },
    {
      icon: Bell,
      title: "Atualizações Oficiais",
      description: "Acompanhe o avanço do empreendimento",
    },
    {
      icon: Star,
      title: "Conteúdos Exclusivos",
      description: "Receba antes da divulgação ampla",
    },
    {
      icon: Lock,
      title: "Sem Compromisso",
      description: "Apenas informação qualificada",
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 text-[hsl(var(--mc-sage))]">
              <Star className="w-5 h-5" />
              <span className="text-sm uppercase tracking-[0.2em] font-medium">
                Cadastro Antecipado
              </span>
            </div>
            
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-[hsl(var(--mc-earth))]">
              Antecipação<br />
              <span className="text-[hsl(var(--mc-sage))]">sem Promessas</span>
            </h2>
            
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--mc-sage))] to-transparent mx-auto" />
          </div>

          {/* Intro */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xl text-[hsl(var(--mc-forest))] font-medium">
              Informação antecipada é vantagem competitiva.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl p-6 text-center shadow-sm border border-[hsl(var(--mc-sage))]/5 hover:shadow-lg hover:border-[hsl(var(--mc-sage))]/20 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-full bg-[hsl(var(--mc-sage))]/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-[hsl(var(--mc-sage))] transition-colors">
                  <benefit.icon className="w-7 h-7 text-[hsl(var(--mc-sage))] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-[hsl(var(--mc-forest))] mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-[hsl(var(--mc-earth))]">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>

          {/* Intro Text */}
          <div className="bg-white rounded-3xl p-8 md:p-10 text-center shadow-sm border border-[hsl(var(--mc-sage))]/10">
            <p className="text-lg text-[hsl(var(--mc-earth))] leading-relaxed mb-6">
              Ao se cadastrar, você passa a integrar um <strong className="text-[hsl(var(--mc-forest))]">grupo restrito</strong> que receberá:
            </p>
            <ul className="text-[hsl(var(--mc-earth))] space-y-2 mb-8">
              <li>✓ Informações completas sobre o projeto</li>
              <li>✓ Atualizações oficiais conforme o avanço do empreendimento</li>
              <li>✓ Conteúdos exclusivos antes da divulgação ampla</li>
            </ul>
            <p className="text-[hsl(var(--mc-sage-dark))] font-medium italic">
              Sem compromisso. Sem promessas antecipadas.
              <br />
              Apenas acesso qualificado às informações certas, no momento certo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCBenefitsSection;
