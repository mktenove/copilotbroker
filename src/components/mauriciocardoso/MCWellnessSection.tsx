import { Leaf, Heart, Waves, Sun } from "lucide-react";
import piscinaImage from "@/assets/mauriciocardoso/piscina-wellness.jpg";

const MCWellnessSection = () => {
  const features = [
    { icon: Waves, label: "Piscina" },
    { icon: Heart, label: "Fitness" },
    { icon: Sun, label: "Solário" },
    { icon: Leaf, label: "Jardins" },
  ];

  return (
    <section id="lazer" className="py-20 md:py-32 bg-[hsl(var(--mc-forest))] relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="space-y-8 text-white order-2 lg:order-1">
              {/* Section Header */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-[hsl(var(--mc-sage-light))]">
                  <Leaf className="w-5 h-5" />
                  <span className="text-sm uppercase tracking-[0.2em] font-medium">
                    Wellness
                  </span>
                </div>
                
                <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
                  Lazer, Wellness e<br />
                  <span className="text-[hsl(var(--mc-sage-light))]">
                    Qualidade de Vida
                  </span>
                </h2>
              </div>

              {/* Stats */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 inline-block">
                <div className="text-5xl md:text-6xl font-serif font-bold text-[hsl(var(--mc-sage-light))]">
                  1.800 m²
                </div>
                <p className="text-white/80 mt-2">
                  dedicados ao bem-estar
                </p>
              </div>

              {/* Description */}
              <p className="text-lg text-white/90 leading-relaxed">
                Uma área de lazer completa, planejada para proporcionar experiências 
                reais de descanso, convivência e equilíbrio. Espaços que valorizam o 
                tempo, a saúde e a qualidade de vida — sem excessos, sem desperdícios, 
                apenas o essencial bem executado.
              </p>

              {/* Features */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <feature.icon className="w-6 h-6 text-[hsl(var(--mc-sage-light))]" />
                    <span className="text-sm text-white/80">{feature.label}</span>
                  </div>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="border-l-2 border-[hsl(var(--mc-sage-light))] pl-6 italic text-[hsl(var(--mc-sage-light))] text-xl">
                "Viver bem também é saber desacelerar no lugar certo."
              </blockquote>
            </div>

            {/* Image */}
            <div className="order-1 lg:order-2">
              <div className="relative">
                <div className="absolute -inset-4 bg-[hsl(var(--mc-sage))]/20 rounded-3xl blur-2xl" />
                <img
                  src={piscinaImage}
                  alt="Área de lazer e wellness"
                  className="relative rounded-3xl shadow-2xl w-full object-cover aspect-[4/3]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCWellnessSection;
