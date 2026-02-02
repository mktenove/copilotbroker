const MCConceptSection = () => {
  const stats = [
    { value: "20", label: "Andares", description: "Implantação imponente" },
    { value: "4", label: "Aptos/Andar", description: "Máxima privacidade" },
    { value: "5", label: "Lojas", description: "Térreo qualificado" },
  ];

  return (
    <section id="conceito" className="py-16 md:py-24 lg:py-40 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Label */}
          <div className="text-center mb-10 md:mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--mc-forest))] font-medium">
              Conceito
            </span>
          </div>

          {/* Title - Mobile optimized */}
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-[hsl(var(--mc-charcoal))] text-center leading-[1.2] tracking-[0.01em] mb-6 md:mb-8">
            Um projeto pensado para poucos.
          </h2>

          {/* Description */}
          <p className="text-center max-w-2xl mx-auto text-[hsl(var(--mc-earth))] leading-[1.8] md:leading-[1.9] text-sm sm:text-base md:text-lg mb-12 md:mb-20 px-2">
            Com 20 andares e uma implantação imponente, o empreendimento foi desenhado 
            para equilibrar presença arquitetônica, privacidade e exclusividade.
          </p>

          {/* Stats - Responsive giant numbers */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 lg:gap-12 mb-12 md:mb-20">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-light text-[hsl(var(--mc-forest))] leading-none mb-2 md:mb-4 transition-colors group-hover:text-[hsl(var(--mc-sage))]">
                  {stat.value}
                </div>
                <div className="text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.15em] md:tracking-[0.2em] text-[hsl(var(--mc-charcoal))] font-medium mb-1 md:mb-2">
                  {stat.label}
                </div>
                <p className="text-[10px] sm:text-xs md:text-sm text-[hsl(var(--mc-earth))] hidden sm:block">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-12 md:w-16 h-px bg-[hsl(var(--mc-sage))] mx-auto mb-10 md:mb-16" />

          {/* Highlight Text */}
          <div className="max-w-2xl mx-auto text-center space-y-4 md:space-y-6 px-2">
            <p className="text-sm sm:text-base md:text-lg text-[hsl(var(--mc-earth))] leading-[1.8] md:leading-[1.9]">
              São apenas <strong className="text-[hsl(var(--mc-charcoal))] font-medium">4 apartamentos por andar</strong>, 
              garantindo conforto, silêncio e uma experiência residencial superior.
            </p>
            <p className="text-sm sm:text-base md:text-lg text-[hsl(var(--mc-earth))] leading-[1.8] md:leading-[1.9]">
              No térreo, <strong className="text-[hsl(var(--mc-charcoal))] font-medium">5 lojas</strong> qualificam 
              o entorno e agregam conveniência sem interferir na dinâmica do morar.
            </p>
            <p className="font-serif text-base sm:text-lg md:text-xl text-[hsl(var(--mc-forest))] italic pt-2 md:pt-4">
              A arquitetura autoral e contemporânea traduz sofisticação atemporal.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCConceptSection;
