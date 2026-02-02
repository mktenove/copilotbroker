import { Building2, Users, Store, Sparkles } from "lucide-react";

const MCConceptSection = () => {
  const stats = [
    {
      icon: Building2,
      value: "20",
      label: "Andares",
      description: "Implantação imponente",
    },
    {
      icon: Users,
      value: "4",
      label: "Aptos/Andar",
      description: "Máxima privacidade",
    },
    {
      icon: Store,
      value: "5",
      label: "Lojas",
      description: "Térreo qualificado",
    },
  ];

  return (
    <section id="conceito" className="py-20 md:py-32 bg-[hsl(var(--mc-stone))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 text-[hsl(var(--mc-sage))]">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm uppercase tracking-[0.2em] font-medium">
                Conceito
              </span>
            </div>
            
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-[hsl(var(--mc-forest))]">
              Um projeto pensado para poucos.
            </h2>
            
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--mc-sage))] to-transparent mx-auto" />
          </div>

          {/* Description */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-lg md:text-xl text-[hsl(var(--mc-earth))] leading-relaxed">
              Com 20 andares e uma implantação imponente, o empreendimento foi desenhado 
              para equilibrar presença arquitetônica, privacidade e exclusividade.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="group bg-white rounded-3xl p-8 text-center shadow-sm hover:shadow-xl transition-all duration-500 border border-[hsl(var(--mc-sage))]/5 hover:border-[hsl(var(--mc-sage))]/20"
              >
                <div className="w-16 h-16 rounded-full bg-[hsl(var(--mc-sage))]/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-[hsl(var(--mc-sage))]/20 transition-colors">
                  <stat.icon className="w-8 h-8 text-[hsl(var(--mc-sage))]" />
                </div>
                <div className="font-serif text-5xl md:text-6xl font-bold text-[hsl(var(--mc-sage))] mb-2">
                  {stat.value}
                </div>
                <div className="text-lg font-semibold text-[hsl(var(--mc-forest))] mb-1">
                  {stat.label}
                </div>
                <p className="text-sm text-[hsl(var(--mc-earth))]">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>

          {/* Highlight Text */}
          <div className="bg-white rounded-3xl p-8 md:p-12 text-center shadow-sm border border-[hsl(var(--mc-sage))]/10">
            <p className="text-lg md:text-xl text-[hsl(var(--mc-earth))] leading-relaxed mb-6">
              São apenas <strong className="text-[hsl(var(--mc-sage-dark))]">4 apartamentos por andar</strong>, 
              garantindo conforto, silêncio e uma experiência residencial superior.
              <br /><br />
              No térreo, <strong className="text-[hsl(var(--mc-sage-dark))]">5 lojas</strong> qualificam 
              o entorno e agregam conveniência sem interferir na dinâmica do morar.
            </p>
            <p className="text-[hsl(var(--mc-forest))] font-medium italic">
              A arquitetura autoral e contemporânea traduz sofisticação atemporal — 
              um projeto criado para se manter relevante hoje e no futuro.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCConceptSection;
