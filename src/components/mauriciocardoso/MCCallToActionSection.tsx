import { useEffect, useRef, useState } from "react";
import { MapPin, Star, Building2, Layers } from "lucide-react";

const features = [
  { icon: MapPin, text: "Endereço nobre" },
  { icon: Star, text: "Alto padrão" },
  { icon: Building2, text: "20 andares" },
  { icon: Layers, text: "1.800m² wellness" }
];

const MCCallToActionSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const scrollToForm = () => {
    document.getElementById("cadastro")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-32 bg-card relative overflow-hidden"
    >
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              SEJA HONESTO{" "}
              <span className="text-gold-gradient">COM VOCÊ MESMO</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-8">
              Projetos com:
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {features.map((feature, index) => (
                <div
                  key={feature.text}
                  className={`flex items-center gap-2 px-4 py-2 bg-background rounded-full border border-primary/30 transition-all duration-500 ${
                    isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <feature.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{feature.text}</span>
                </div>
              ))}
            </div>

            <p className="text-muted-foreground">
              <span className="text-primary">👉</span>{" "}
              Não ficam disponíveis por muito tempo.
            </p>
          </div>

          {/* Investment Info */}
          <div className={`mb-12 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
              {[
                { value: "20%", label: "Entrada" },
                { value: "71x", label: "Parcelas" },
                { value: "0%", label: "Sem juros" },
                { value: "Dez/31", label: "Entrega" },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="font-serif text-2xl sm:text-3xl md:text-4xl text-primary mb-1">
                    {item.value}
                  </div>
                  <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quote */}
          <div className={`mb-12 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-muted-foreground mb-4">
              Esse é o tipo de empreendimento que, meses depois, as pessoas dizem:
            </p>
            <p className="font-serif text-2xl md:text-3xl italic text-foreground mb-8">
              "Eu quase comprei."
            </p>
            <div className="space-y-2">
              <p className="text-muted-foreground line-through">Quase não constrói patrimônio.</p>
              <p className="text-muted-foreground line-through">Quase não garante qualidade de vida.</p>
              <p className="font-serif text-xl font-semibold text-destructive">Quase não vale nada.</p>
            </div>
          </div>

          {/* Final CTA */}
          <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            <div className="divider-gold mx-auto mb-8" />
            <p className="text-lg text-muted-foreground mb-4">
              Este empreendimento vai acontecer com ou sem você.
            </p>
            <p className="text-muted-foreground mb-8">A diferença é:</p>
            <p className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-8">
              <span className="text-primary">👉</span>{" "}
              Você vai comprar ou vai assistir outros comprarem?
            </p>
            <button
              onClick={scrollToForm}
              className="btn-primary text-base px-10 py-5 animate-pulse-slow"
            >
              Quero Acesso Antecipado
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCCallToActionSection;
