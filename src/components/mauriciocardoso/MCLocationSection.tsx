const MCLocationSection = () => {
  return (
    <section className="py-16 md:py-24 lg:py-40 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section Label */}
          <div className="text-center mb-10 md:mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--mc-forest))] font-medium">
              Localização
            </span>
          </div>

          {/* Main Content - Editorial layout */}
          <div className="space-y-10 md:space-y-16">
            {/* Title */}
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-[hsl(var(--mc-charcoal))] text-center leading-[1.2] tracking-[0.01em]">
              O Endereço Fala Por Si
            </h2>

            {/* Divider */}
            <div className="w-12 md:w-16 h-px bg-[hsl(var(--mc-sage))] mx-auto" />

            {/* Text Content - Editorial */}
            <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 text-center">
              <h3 className="font-serif text-lg sm:text-xl md:text-2xl text-[hsl(var(--mc-charcoal))] leading-relaxed">
                Rua Maurício Cardoso.
                <br />
                <span className="italic text-[hsl(var(--mc-forest))]">
                  Um endereço que atravessa gerações.
                </span>
              </h3>
              
              <p className="text-[hsl(var(--mc-earth))] leading-[1.8] md:leading-[1.9] text-sm sm:text-base md:text-lg px-2">
                Mais do que uma localização, a Maurício Cardoso é um símbolo de prestígio, 
                tradição e valorização constante. Um eixo nobre, central e desejado, 
                onde morar sempre foi sinônimo de status e inteligência patrimonial.
              </p>
            </div>

            {/* Quote Block - Fixed contrast */}
            <div className="relative py-8 md:py-12">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-[hsl(var(--mc-sage))]" />
              <blockquote className="pl-6 md:pl-8 lg:pl-12 max-w-2xl">
                <p className="font-serif text-base sm:text-lg md:text-xl text-[hsl(var(--mc-charcoal))] leading-relaxed italic">
                  "Aqui, o entorno é consolidado.
                  <br />
                  O estilo de vida é elevado.
                  <br />
                  E as oportunidades são naturalmente raras."
                </p>
              </blockquote>
            </div>

            {/* Highlights - Minimal horizontal lines */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 pt-4 md:pt-8">
              {[
                { title: "Prestígio", text: "Um símbolo de status há décadas" },
                { title: "Tradição", text: "Endereço que atravessa gerações" },
                { title: "Valorização", text: "Crescimento patrimonial consistente" },
              ].map((item, index) => (
                <div key={index} className="text-center space-y-2 md:space-y-3">
                  <div className="w-6 md:w-8 h-px bg-[hsl(var(--mc-sage))] mx-auto" />
                  <h4 className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--mc-charcoal))] font-medium">
                    {item.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-[hsl(var(--mc-earth))]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer Text */}
            <p className="text-center text-[hsl(var(--mc-charcoal))] font-medium text-sm sm:text-base md:text-lg pt-4 md:pt-8 px-2">
              Morar neste endereço é uma escolha consciente de quem entende o valor do lugar certo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCLocationSection;
