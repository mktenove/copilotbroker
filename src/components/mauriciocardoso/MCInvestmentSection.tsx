const MCInvestmentSection = () => {
  const conditions = [
    { value: "20%", label: "Entrada" },
    { value: "71x", label: "Parcelas mensais" },
    { value: "0%", label: "Sem juros" },
    { value: "INCC", label: "Correção" },
  ];

  return (
    <section id="investimento" className="py-24 md:py-40 bg-[hsl(var(--mc-stone))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Label */}
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--mc-sage))] font-medium">
              Investimento
            </span>
          </div>

          {/* Title */}
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[hsl(var(--mc-charcoal))] text-center leading-[1.2] mb-8">
            Valorização e
            <br />
            <span className="italic text-[hsl(var(--mc-sage))]">Investimento Inteligente</span>
          </h2>

          {/* Subtitle */}
          <div className="text-center max-w-2xl mx-auto mb-20">
            <p className="font-serif text-lg md:text-xl text-[hsl(var(--mc-forest))] mb-4">
              Endereço raro. Projeto sólido. Condições estratégicas.
            </p>
            <p className="text-[hsl(var(--mc-earth))] leading-[1.9] text-sm">
              A combinação entre localização premium, baixa oferta e um projeto 
              bem dimensionado cria um cenário claro de proteção e crescimento patrimonial.
            </p>
          </div>

          {/* Conditions - Clean grid, numbers focused */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-20">
            {conditions.map((condition, index) => (
              <div key={index} className="text-center">
                <div className="font-serif text-4xl md:text-5xl text-[hsl(var(--mc-sage))] mb-2">
                  {condition.value}
                </div>
                <p className="text-xs uppercase tracking-[0.15em] text-[hsl(var(--mc-earth))]">
                  {condition.label}
                </p>
              </div>
            ))}
          </div>

          {/* Delivery Info - Typography focused */}
          <div className="bg-[hsl(var(--mc-forest))] py-12 md:py-16 px-8 text-center text-white mb-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-white/50 block mb-6">
              Entrega Prevista
            </span>
            <div className="font-serif text-4xl md:text-5xl lg:text-6xl font-light mb-4">
              Dezembro 2031
            </div>
            <p className="text-white/60 max-w-md mx-auto text-sm leading-relaxed">
              Um modelo que favorece previsibilidade, equilíbrio e visão de longo prazo.
            </p>
          </div>

          {/* Footer Text */}
          <p className="text-center text-[hsl(var(--mc-earth))] leading-[1.9] text-sm italic max-w-2xl mx-auto">
            A entrega prevista para dezembro de 2031 reforça o caráter estratégico 
            do investimento, permitindo acompanhar a evolução do projeto e da 
            valorização ao longo do tempo.
          </p>
        </div>
      </div>
    </section>
  );
};

export default MCInvestmentSection;
