const MCBenefitsSection = () => {
  return (
    <section className="py-16 md:py-24 lg:py-40 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Section Label */}
          <div className="text-center mb-10 md:mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--mc-forest))] font-medium">
              Cadastro Antecipado
            </span>
          </div>

          {/* Title - Mobile optimized */}
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[hsl(var(--mc-charcoal))] text-center leading-[1.2] mb-6 md:mb-8">
            Antecipação
            <br />
            <span className="italic text-[hsl(var(--mc-forest))]">sem Promessas</span>
          </h2>

          {/* Divider */}
          <div className="w-12 md:w-16 h-px bg-[hsl(var(--mc-sage))] mx-auto mb-8 md:mb-12" />

          {/* Intro */}
          <p className="text-center text-base sm:text-lg text-[hsl(var(--mc-charcoal))] font-medium mb-8 md:mb-12">
            Informação antecipada é vantagem competitiva.
          </p>

          {/* Benefits - Condensed text */}
          <div className="text-center space-y-6 md:space-y-8 mb-8 md:mb-12 px-2">
            <p className="text-[hsl(var(--mc-earth))] leading-[1.8] md:leading-[1.9] text-sm sm:text-base">
              Ao se cadastrar, você passa a integrar um <strong className="text-[hsl(var(--mc-charcoal))]">grupo restrito</strong> que receberá:
            </p>
            
            <div className="space-y-3 md:space-y-4 text-[hsl(var(--mc-charcoal))] text-sm sm:text-base">
              <p className="flex items-center justify-center gap-3 md:gap-4">
                <span className="w-5 md:w-6 h-px bg-[hsl(var(--mc-forest))]" />
                Informações completas sobre o projeto
              </p>
              <p className="flex items-center justify-center gap-3 md:gap-4">
                <span className="w-5 md:w-6 h-px bg-[hsl(var(--mc-forest))]" />
                Atualizações oficiais conforme o avanço
              </p>
              <p className="flex items-center justify-center gap-3 md:gap-4">
                <span className="w-5 md:w-6 h-px bg-[hsl(var(--mc-forest))]" />
                Conteúdos exclusivos antes da divulgação
              </p>
            </div>
          </div>

          {/* Footer Quote */}
          <p className="text-center font-serif text-base sm:text-lg md:text-xl text-[hsl(var(--mc-forest))] italic px-2">
            Sem compromisso. Sem promessas antecipadas.
            <br />
            Apenas acesso qualificado às informações certas, no momento certo.
          </p>
        </div>
      </div>
    </section>
  );
};

export default MCBenefitsSection;
