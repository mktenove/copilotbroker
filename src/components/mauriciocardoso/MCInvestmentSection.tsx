const MCInvestmentSection = () => {
  const conditions = [
    { value: "20%", label: "Entrada" },
    { value: "71x", label: "Parcelas mensais" },
    { value: "0%", label: "Sem juros" },
    { value: "INCC", label: "Correção" },
  ];

  return (
    <section id="investimento" className="py-16 md:py-24 lg:py-40 bg-[hsl(var(--mc-stone))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Label */}
          <div className="text-center mb-10 md:mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--mc-forest))] font-medium">
              Investimento
            </span>
          </div>

          {/* Title - Mobile optimized */}
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[hsl(var(--mc-charcoal))] text-center leading-[1.2] mb-6 md:mb-8">
            Valorização e
            <br />
            <span className="italic text-[hsl(var(--mc-forest))]">Investimento Inteligente</span>
          </h2>

          {/* Subtitle */}
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-20 px-2">
            <p className="font-serif text-base sm:text-lg md:text-xl text-[hsl(var(--mc-charcoal))] mb-3 md:mb-4">
              Endereço raro. Projeto sólido. Condições estratégicas.
            </p>
            <p className="text-[hsl(var(--mc-earth))] leading-[1.8] md:leading-[1.9] text-xs sm:text-sm">
              A combinação entre localização premium, baixa oferta e um projeto 
              bem dimensionado cria um cenário claro de proteção e crescimento patrimonial.
            </p>
          </div>

          {/* Conditions - Clean grid, numbers focused */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 lg:gap-12 mb-12 md:mb-20">
            {conditions.map((condition, index) => (
              <div key={index} className="text-center">
                <div className="font-serif text-3xl sm:text-4xl md:text-5xl text-[hsl(var(--mc-forest))] mb-1 md:mb-2">
                  {condition.value}
                </div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.1em] md:tracking-[0.15em] text-[hsl(var(--mc-charcoal))]">
                  {condition.label}
                </p>
              </div>
            ))}
          </div>

          {/* Delivery Info - Typography focused with good contrast */}
          <div className="bg-[hsl(var(--mc-forest))] py-10 md:py-12 lg:py-16 px-6 md:px-8 text-center text-white mb-8 md:mb-12">
            <span className="text-[10px] uppercase tracking-[0.4em] text-white/60 block mb-4 md:mb-6">
              Entrega Prevista
            </span>
            <div className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light mb-3 md:mb-4">
              Dezembro 2031
            </div>
            <p className="text-white/70 max-w-md mx-auto text-xs sm:text-sm leading-relaxed">
              Um modelo que favorece previsibilidade, equilíbrio e visão de longo prazo.
            </p>
          </div>

          {/* Footer Text */}
          <p className="text-center text-[hsl(var(--mc-earth))] leading-[1.8] md:leading-[1.9] text-xs sm:text-sm italic max-w-2xl mx-auto px-2">
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
