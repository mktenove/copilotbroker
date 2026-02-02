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
    <section id="apartamentos" className="py-24 md:py-40 bg-[hsl(var(--mc-stone))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Label */}
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--mc-sage))] font-medium">
              Apartamentos
            </span>
          </div>

          {/* Title */}
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[hsl(var(--mc-charcoal))] text-center leading-[1.2] mb-8">
            Espaço, Conforto e
            <br />
            <span className="italic text-[hsl(var(--mc-sage))]">Experiência de Morar</span>
          </h2>

          {/* Subtitle */}
          <div className="text-center max-w-2xl mx-auto mb-20">
            <p className="text-[hsl(var(--mc-earth))] leading-[1.9]">
              Plantas inteligentes, com metragens entre <strong className="text-[hsl(var(--mc-forest))]">95 e 125 m²</strong>, 
              distribuídas em opções de <strong className="text-[hsl(var(--mc-forest))]">2 e 3 dormitórios</strong>.
            </p>
          </div>

          {/* Apartments Cards - Clean design */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 mb-16">
            {apartments.map((apt, index) => (
              <div
                key={index}
                className="bg-[hsl(var(--mc-cream))] border-t-2 border-[hsl(var(--mc-sage))] pt-8 pb-10 px-8"
              >
                {/* Header */}
                <div className="flex items-baseline justify-between mb-6">
                  <span className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--mc-forest))] font-medium">
                    {apt.type}
                  </span>
                  <span className="font-serif text-3xl text-[hsl(var(--mc-sage))]">
                    {apt.area}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[hsl(var(--mc-earth))] leading-relaxed mb-8 text-sm">
                  {apt.description}
                </p>

                {/* Features - Minimal list */}
                <div className="space-y-3">
                  {apt.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-4 text-[hsl(var(--mc-charcoal))]">
                      <div className="w-4 h-px bg-[hsl(var(--mc-sage))]" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Text */}
          <p className="text-center text-[hsl(var(--mc-earth))] leading-[1.9] max-w-2xl mx-auto text-sm">
            Ambientes amplos, bem proporcionados e preparados para receber diferentes 
            estilos de vida — do casal contemporâneo à família que busca conforto.
          </p>
        </div>
      </div>
    </section>
  );
};

export default MCApartmentsSection;
