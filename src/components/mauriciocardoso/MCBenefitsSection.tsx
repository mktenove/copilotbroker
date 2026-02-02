const MCBenefitsSection = () => {
  return (
    <section className="py-24 md:py-40 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Section Label */}
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--mc-sage))] font-medium">
              Cadastro Antecipado
            </span>
          </div>

          {/* Title */}
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[hsl(var(--mc-charcoal))] text-center leading-[1.2] mb-8">
            Antecipação
            <br />
            <span className="italic text-[hsl(var(--mc-sage))]">sem Promessas</span>
          </h2>

          {/* Divider */}
          <div className="w-16 h-px bg-[hsl(var(--mc-sage))] mx-auto mb-12" />

          {/* Intro */}
          <p className="text-center text-lg text-[hsl(var(--mc-forest))] font-medium mb-12">
            Informação antecipada é vantagem competitiva.
          </p>

          {/* Benefits - Condensed text */}
          <div className="text-center space-y-8 mb-12">
            <p className="text-[hsl(var(--mc-earth))] leading-[1.9]">
              Ao se cadastrar, você passa a integrar um <strong className="text-[hsl(var(--mc-forest))]">grupo restrito</strong> que receberá:
            </p>
            
            <div className="space-y-4 text-[hsl(var(--mc-earth))]">
              <p className="flex items-center justify-center gap-4">
                <span className="w-6 h-px bg-[hsl(var(--mc-sage))]" />
                Informações completas sobre o projeto
              </p>
              <p className="flex items-center justify-center gap-4">
                <span className="w-6 h-px bg-[hsl(var(--mc-sage))]" />
                Atualizações oficiais conforme o avanço do empreendimento
              </p>
              <p className="flex items-center justify-center gap-4">
                <span className="w-6 h-px bg-[hsl(var(--mc-sage))]" />
                Conteúdos exclusivos antes da divulgação ampla
              </p>
            </div>
          </div>

          {/* Footer Quote */}
          <p className="text-center font-serif text-lg md:text-xl text-[hsl(var(--mc-sage))] italic">
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
