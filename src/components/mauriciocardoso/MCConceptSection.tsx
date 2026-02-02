const MCConceptSection = () => {
  const stats = [
    { value: "20", label: "Andares", description: "Implantação imponente" },
    { value: "4", label: "Aptos/Andar", description: "Máxima privacidade" },
    { value: "5", label: "Lojas", description: "Térreo qualificado" },
  ];

  return (
    <section id="conceito" className="py-24 md:py-40 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Label */}
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--mc-sage))] font-medium">
              Conceito
            </span>
          </div>

          {/* Title */}
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-[hsl(var(--mc-charcoal))] text-center leading-[1.2] tracking-[0.01em] mb-8">
            Um projeto pensado para poucos.
          </h2>

          {/* Description */}
          <p className="text-center max-w-2xl mx-auto text-[hsl(var(--mc-earth))] leading-[1.9] text-base md:text-lg mb-20">
            Com 20 andares e uma implantação imponente, o empreendimento foi desenhado 
            para equilibrar presença arquitetônica, privacidade e exclusividade.
          </p>

          {/* Stats - Giant numbers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 mb-20">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="font-serif text-7xl md:text-8xl lg:text-9xl font-light text-[hsl(var(--mc-forest))] leading-none mb-4 transition-colors group-hover:text-[hsl(var(--mc-sage))]">
                  {stat.value}
                </div>
                <div className="text-sm uppercase tracking-[0.2em] text-[hsl(var(--mc-charcoal))] font-medium mb-2">
                  {stat.label}
                </div>
                <p className="text-sm text-[hsl(var(--mc-earth))]">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-16 h-px bg-[hsl(var(--mc-sage))] mx-auto mb-16" />

          {/* Highlight Text */}
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <p className="text-base md:text-lg text-[hsl(var(--mc-earth))] leading-[1.9]">
              São apenas <strong className="text-[hsl(var(--mc-forest))] font-medium">4 apartamentos por andar</strong>, 
              garantindo conforto, silêncio e uma experiência residencial superior.
            </p>
            <p className="text-base md:text-lg text-[hsl(var(--mc-earth))] leading-[1.9]">
              No térreo, <strong className="text-[hsl(var(--mc-forest))] font-medium">5 lojas</strong> qualificam 
              o entorno e agregam conveniência sem interferir na dinâmica do morar.
            </p>
            <p className="font-serif text-lg md:text-xl text-[hsl(var(--mc-forest))] italic pt-4">
              A arquitetura autoral e contemporânea traduz sofisticação atemporal.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCConceptSection;
