import { Check, Users } from "lucide-react";

const MCTargetSection = () => {
  const criteria = [
    "Coloca endereço acima de qualquer outro critério",
    "Busca segurança patrimonial e valorização consistente",
    "Valoriza exclusividade e baixa densidade",
    "Prefere projetos sólidos a modismos passageiros",
    "Enxerga o imóvel como moradia e patrimônio",
  ];

  return (
    <section className="py-20 md:py-32 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 text-[hsl(var(--mc-sage))]">
              <Users className="w-5 h-5" />
              <span className="text-sm uppercase tracking-[0.2em] font-medium">
                Para Quem
              </span>
            </div>
            
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-[hsl(var(--mc-earth))]">
              Para Quem é<br />
              <span className="text-[hsl(var(--mc-sage))]">Esse Empreendimento</span>
            </h2>
            
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--mc-sage))] to-transparent mx-auto" />
          </div>

          {/* Intro */}
          <div className="text-center mb-12">
            <p className="text-xl text-[hsl(var(--mc-forest))] font-medium">
              Este projeto é para quem:
            </p>
          </div>

          {/* Criteria List */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[hsl(var(--mc-sage))]/10 mb-12">
            <ul className="space-y-5">
              {criteria.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-4 group"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--mc-sage))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--mc-sage))] transition-colors">
                    <Check className="w-4 h-4 text-[hsl(var(--mc-sage))] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-lg text-[hsl(var(--mc-earth))] pt-0.5">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer Text */}
          <div className="text-center">
            <p className="text-lg text-[hsl(var(--mc-earth))] leading-relaxed">
              <span className="font-semibold text-[hsl(var(--mc-forest))]">
                Famílias, investidores e profissionais consolidados
              </span>{" "}
              que escolhem com critério — e não por impulso.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCTargetSection;
