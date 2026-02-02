const MCLocationSection = () => {
  return (
    <section className="py-24 md:py-40 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section Label */}
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[hsl(var(--mc-sage))] font-medium">
              Localização
            </span>
          </div>

          {/* Main Content - Editorial layout */}
          <div className="space-y-16">
            {/* Title */}
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-[hsl(var(--mc-charcoal))] text-center leading-[1.2] tracking-[0.01em]">
              O Endereço Fala Por Si
            </h2>

            {/* Divider */}
            <div className="w-16 h-px bg-[hsl(var(--mc-sage))] mx-auto" />

            {/* Text Content - Editorial */}
            <div className="max-w-2xl mx-auto space-y-8 text-center">
              <h3 className="font-serif text-xl md:text-2xl text-[hsl(var(--mc-forest))] leading-relaxed">
                Rua Maurício Cardoso.
                <br />
                <span className="italic text-[hsl(var(--mc-sage))]">
                  Um endereço que atravessa gerações.
                </span>
              </h3>
              
              <p className="text-[hsl(var(--mc-earth))] leading-[1.9] text-base md:text-lg">
                Mais do que uma localização, a Maurício Cardoso é um símbolo de prestígio, 
                tradição e valorização constante. Um eixo nobre, central e desejado, 
                onde morar sempre foi sinônimo de status e inteligência patrimonial.
              </p>
            </div>

            {/* Quote Block */}
            <div className="relative py-12">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-[hsl(var(--mc-sage))]/30" />
              <blockquote className="pl-8 md:pl-12 max-w-2xl">
                <p className="font-serif text-lg md:text-xl text-[hsl(var(--mc-forest))] leading-relaxed italic">
                  "Aqui, o entorno é consolidado.
                  <br />
                  O estilo de vida é elevado.
                  <br />
                  E as oportunidades são naturalmente raras."
                </p>
              </blockquote>
            </div>

            {/* Highlights - Minimal horizontal lines */}
            <div className="grid md:grid-cols-3 gap-8 pt-8">
              {[
                { title: "Prestígio", text: "Um símbolo de status há décadas" },
                { title: "Tradição", text: "Endereço que atravessa gerações" },
                { title: "Valorização", text: "Crescimento patrimonial consistente" },
              ].map((item, index) => (
                <div key={index} className="text-center space-y-3">
                  <div className="w-8 h-px bg-[hsl(var(--mc-sage))] mx-auto" />
                  <h4 className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--mc-forest))] font-medium">
                    {item.title}
                  </h4>
                  <p className="text-sm text-[hsl(var(--mc-earth))]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer Text */}
            <p className="text-center text-[hsl(var(--mc-forest))] font-medium text-base md:text-lg pt-8">
              Morar neste endereço é uma escolha consciente de quem entende o valor do lugar certo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCLocationSection;
