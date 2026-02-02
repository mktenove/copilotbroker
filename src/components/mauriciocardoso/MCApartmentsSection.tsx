import { LayoutGrid, Maximize, BedDouble, Home } from "lucide-react";

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
    <section id="apartamentos" className="py-20 md:py-32 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 text-[hsl(var(--mc-sage))]">
              <LayoutGrid className="w-5 h-5" />
              <span className="text-sm uppercase tracking-[0.2em] font-medium">
                Apartamentos
              </span>
            </div>
            
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-[hsl(var(--mc-earth))]">
              Espaço, Conforto e<br />
              <span className="text-[hsl(var(--mc-sage))]">Experiência de Morar</span>
            </h2>
            
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--mc-sage))] to-transparent mx-auto" />
          </div>

          {/* Intro Text */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h3 className="font-serif text-xl md:text-2xl text-[hsl(var(--mc-forest))] mb-4">
              Apartamentos que acompanham o seu momento de vida.
            </h3>
            <p className="text-[hsl(var(--mc-earth))] leading-relaxed">
              Plantas inteligentes, com metragens entre <strong>95 e 125 m²</strong>, 
              distribuídas em opções de <strong>2 e 3 dormitórios</strong>, pensadas 
              para quem valoriza espaço, fluidez e funcionalidade.
            </p>
          </div>

          {/* Apartments Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {apartments.map((apt, index) => (
              <div
                key={index}
                className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-[hsl(var(--mc-sage))]/5 hover:border-[hsl(var(--mc-sage))]/20"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-[hsl(var(--mc-sage))] to-[hsl(var(--mc-sage-dark))] p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BedDouble className="w-6 h-6" />
                      <span className="font-semibold text-lg">{apt.type}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full">
                      <Maximize className="w-4 h-4" />
                      <span className="font-bold">{apt.area}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  <p className="text-[hsl(var(--mc-earth))] leading-relaxed">
                    {apt.description}
                  </p>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[hsl(var(--mc-forest))] uppercase tracking-wider">
                      Destaques
                    </p>
                    <ul className="space-y-2">
                      {apt.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-[hsl(var(--mc-earth))]">
                          <div className="w-2 h-2 rounded-full bg-[hsl(var(--mc-sage))]" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Text */}
          <div className="text-center">
            <p className="text-[hsl(var(--mc-earth))] leading-relaxed max-w-2xl mx-auto flex items-start gap-3 justify-center">
              <Home className="w-5 h-5 text-[hsl(var(--mc-sage))] flex-shrink-0 mt-1" />
              <span>
                Ambientes amplos, bem proporcionados e preparados para receber diferentes 
                estilos de vida — do casal contemporâneo à família que busca conforto 
                sem abrir mão da localização.
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCApartmentsSection;
