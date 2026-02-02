const MCTargetSection = () => {
  const criteria = [
    "Coloca endereço acima de qualquer outro critério",
    "Busca segurança patrimonial e valorização consistente",
    "Valoriza exclusividade e baixa densidade",
    "Prefere projetos sólidos a modismos passageiros",
    "Enxerga o imóvel como moradia e patrimônio",
  ];

  return (
    <section className="py-24 md:py-40 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Section Label */}
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--mc-sage))] font-medium">
              Para Quem
            </span>
          </div>

          {/* Title */}
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[hsl(var(--mc-charcoal))] text-center leading-[1.2] mb-8">
            Para Quem é
            <br />
            <span className="italic text-[hsl(var(--mc-sage))]">Esse Empreendimento</span>
          </h2>

          {/* Intro */}
          <p className="text-center text-lg text-[hsl(var(--mc-forest))] font-medium mb-16">
            Este projeto é para quem:
          </p>

          {/* Criteria List - Horizontal lines */}
          <div className="space-y-0 mb-16">
            {criteria.map((item, index) => (
              <div
                key={index}
                className="py-5 border-t border-[hsl(var(--mc-sage))]/20 flex items-center gap-6 group"
              >
                <div className="w-8 h-px bg-[hsl(var(--mc-sage))] group-hover:w-12 transition-all duration-300" />
                <span className="text-[hsl(var(--mc-earth))] text-base leading-relaxed">
                  {item}
                </span>
              </div>
            ))}
            <div className="border-t border-[hsl(var(--mc-sage))]/20" />
          </div>

          {/* Footer Text */}
          <p className="text-center text-[hsl(var(--mc-earth))] leading-[1.9]">
            <span className="font-medium text-[hsl(var(--mc-forest))]">
              Famílias, investidores e profissionais consolidados
            </span>{" "}
            que escolhem com critério — e não por impulso.
          </p>
        </div>
      </div>
    </section>
  );
};

export default MCTargetSection;
