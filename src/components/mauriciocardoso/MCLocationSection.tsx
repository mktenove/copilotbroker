import { Crown, History, TrendingUp, MapPin } from "lucide-react";

const MCLocationSection = () => {
  const highlights = [
    {
      icon: Crown,
      title: "Prestígio",
      description: "Um símbolo de status e sofisticação há décadas",
    },
    {
      icon: History,
      title: "Tradição",
      description: "Endereço que atravessa gerações",
    },
    {
      icon: TrendingUp,
      title: "Valorização",
      description: "Crescimento patrimonial consistente",
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-[hsl(var(--mc-cream))]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center gap-2 text-[hsl(var(--mc-sage))]">
              <MapPin className="w-5 h-5" />
              <span className="text-sm uppercase tracking-[0.2em] font-medium">
                Localização
              </span>
            </div>
            
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-[hsl(var(--mc-earth))]">
              O Endereço Fala Por Si
            </h2>
            
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--mc-sage))] to-transparent mx-auto" />
          </div>

          {/* Main Content */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            {/* Text Content */}
            <div className="space-y-6">
              <h3 className="font-serif text-2xl md:text-3xl text-[hsl(var(--mc-forest))] leading-relaxed">
                Rua Maurício Cardoso.
                <br />
                <span className="text-[hsl(var(--mc-sage))]">
                  Um endereço que atravessa gerações.
                </span>
              </h3>
              
              <p className="text-[hsl(var(--mc-earth))] leading-relaxed text-lg">
                Mais do que uma localização, a Maurício Cardoso é um símbolo de prestígio, 
                tradição e valorização constante. Um eixo nobre, central e desejado, 
                onde morar sempre foi sinônimo de status e inteligência patrimonial.
              </p>
              
              <div className="space-y-4 pt-4">
                <p className="text-[hsl(var(--mc-earth))] italic border-l-2 border-[hsl(var(--mc-sage))] pl-4">
                  Aqui, o entorno é consolidado.
                  <br />
                  O estilo de vida é elevado.
                  <br />
                  E as oportunidades são naturalmente raras.
                </p>
              </div>
              
              <p className="text-[hsl(var(--mc-sage-dark))] font-medium text-lg pt-4">
                Morar neste endereço é uma escolha consciente de quem entende o valor do lugar certo.
              </p>
            </div>

            {/* Highlights Cards */}
            <div className="space-y-4">
              {highlights.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-6 bg-white rounded-2xl shadow-sm border border-[hsl(var(--mc-sage))]/10 hover:shadow-lg hover:border-[hsl(var(--mc-sage))]/30 transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[hsl(var(--mc-sage))]/10 flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-[hsl(var(--mc-sage))]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[hsl(var(--mc-forest))] mb-1">
                      {item.title}
                    </h4>
                    <p className="text-[hsl(var(--mc-earth))] text-sm">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCLocationSection;
