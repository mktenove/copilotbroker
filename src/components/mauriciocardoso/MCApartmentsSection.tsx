const MCApartmentsSection = () => {
  const apartments = [
    {
      type: "2 Dormitórios",
      area: "95 m²",
      description: "Ideal para casais contemporâneos que valorizam espaço e funcionalidade",
      features: ["2 suítes", "Living integrado", "Sacada"],
    },
    {
      type: "3 Dormitórios",
      area: "125 m²",
      description: "Perfeito para famílias que buscam conforto sem abrir mão da localização",
      features: ["1 suíte plena + 2 demi suítes", "Living integrado", "Sacada"],
    },
  ];

  return (
    <section id="apartamentos" className="py-16 md:py-24 lg:py-40 bg-[hsl(var(--mc-stone))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Label */}
          <div className="text-center mb-10 md:mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--mc-forest))] font-medium">
              Apartamentos
            </span>
          </div>

          {/* Title - Mobile optimized */}
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[hsl(var(--mc-charcoal))] text-center leading-[1.2] mb-6 md:mb-8">
            Espaço, Conforto e
            <br />
            <span className="italic text-[hsl(var(--mc-forest))]">Experiência de Morar</span>
          </h2>

          {/* Subtitle */}
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-20 px-2">
            <p className="text-[hsl(var(--mc-earth))] leading-[1.8] md:leading-[1.9] text-sm sm:text-base">
              Plantas inteligentes, com metragens entre <strong className="text-[hsl(var(--mc-charcoal))]">95 e 125 m²</strong>, 
              distribuídas em opções de <strong className="text-[hsl(var(--mc-charcoal))]">2 e 3 dormitórios</strong>.
            </p>
          </div>

          {/* Apartments Cards - Clean design with proper contrast */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 lg:gap-12 mb-10 md:mb-16">
            {apartments.map((apt, index) => (
              <div
                key={index}
                className="bg-[hsl(var(--mc-cream))] border-t-2 border-[hsl(var(--mc-forest))] pt-6 md:pt-8 pb-8 md:pb-10 px-5 md:px-8"
              >
                {/* Header */}
                <div className="flex items-baseline justify-between mb-4 md:mb-6">
                  <span className="text-[10px] sm:text-xs uppercase tracking-[0.15em] md:tracking-[0.2em] text-[hsl(var(--mc-charcoal))] font-medium">
                    {apt.type}
                  </span>
                  <span className="font-serif text-2xl sm:text-3xl text-[hsl(var(--mc-forest))]">
                    {apt.area}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[hsl(var(--mc-earth))] leading-relaxed mb-6 md:mb-8 text-xs sm:text-sm">
                  {apt.description}
                </p>

                {/* Features - Minimal list with proper contrast */}
                <div className="space-y-2 md:space-y-3">
                  {apt.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 md:gap-4">
                      <div className="w-3 md:w-4 h-px bg-[hsl(var(--mc-forest))]" />
                      <span className="text-xs sm:text-sm text-[hsl(var(--mc-charcoal))]">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Text */}
          <p className="text-center text-[hsl(var(--mc-earth))] leading-[1.8] md:leading-[1.9] max-w-2xl mx-auto text-xs sm:text-sm px-2">
            Ambientes amplos, bem proporcionados e preparados para receber diferentes 
            estilos de vida — do casal contemporâneo à família que busca conforto.
          </p>
        </div>
      </div>
    </section>
  );
};

export default MCApartmentsSection;
