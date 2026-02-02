import { TrendingUp, Percent, Calendar, Shield, Building } from "lucide-react";

const MCInvestmentSection = () => {
  const conditions = [
    {
      icon: Percent,
      value: "20%",
      label: "Entrada",
    },
    {
      icon: Calendar,
      value: "71x",
      label: "Parcelas mensais",
    },
    {
      icon: Shield,
      value: "0%",
      label: "Sem juros",
    },
    {
      icon: TrendingUp,
      value: "INCC",
      label: "Correção",
    },
  ];

  return (
    <section id="investimento" className="py-20 md:py-32 bg-[hsl(var(--mc-stone))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 text-[hsl(var(--mc-sage))]">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm uppercase tracking-[0.2em] font-medium">
                Investimento
              </span>
            </div>
            
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-[hsl(var(--mc-forest))]">
              Valorização e<br />
              <span className="text-[hsl(var(--mc-sage))]">Investimento Inteligente</span>
            </h2>
            
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--mc-sage))] to-transparent mx-auto" />
          </div>

          {/* Intro */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h3 className="font-serif text-xl md:text-2xl text-[hsl(var(--mc-forest))] mb-4">
              Endereço raro. Projeto sólido. Condições estratégicas.
            </h3>
            <p className="text-[hsl(var(--mc-earth))] leading-relaxed">
              A combinação entre localização premium, baixa oferta e um projeto 
              bem dimensionado cria um cenário claro de proteção e crescimento patrimonial.
            </p>
          </div>

          {/* Conditions Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
            {conditions.map((condition, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 text-center shadow-sm border border-[hsl(var(--mc-sage))]/5 hover:shadow-lg hover:border-[hsl(var(--mc-sage))]/20 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-[hsl(var(--mc-sage))]/10 flex items-center justify-center mx-auto mb-4">
                  <condition.icon className="w-6 h-6 text-[hsl(var(--mc-sage))]" />
                </div>
                <div className="font-serif text-3xl md:text-4xl font-bold text-[hsl(var(--mc-sage))] mb-1">
                  {condition.value}
                </div>
                <p className="text-sm text-[hsl(var(--mc-earth))]">
                  {condition.label}
                </p>
              </div>
            ))}
          </div>

          {/* Delivery Info */}
          <div className="bg-gradient-to-r from-[hsl(var(--mc-sage))] to-[hsl(var(--mc-sage-dark))] rounded-3xl p-8 md:p-10 text-center text-white mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Building className="w-6 h-6" />
              <span className="uppercase tracking-wider text-sm font-medium">
                Entrega Prevista
              </span>
            </div>
            <div className="font-serif text-4xl md:text-5xl font-bold mb-4">
              Dezembro 2031
            </div>
            <p className="text-white/80 max-w-xl mx-auto">
              Um modelo que favorece previsibilidade, equilíbrio e visão de longo prazo.
            </p>
          </div>

          {/* Footer Text */}
          <div className="text-center">
            <p className="text-[hsl(var(--mc-earth))] leading-relaxed italic">
              A entrega prevista para dezembro de 2031 reforça o caráter estratégico 
              do investimento, permitindo acompanhar a evolução do projeto e da 
              valorização ao longo do tempo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCInvestmentSection;
