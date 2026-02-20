import { useEffect, useRef, useState } from "react";
import { UserCheck, Mail, MousePointerClick, ShoppingCart, AlertTriangle } from "lucide-react";

const priorities = [
  { icon: UserCheck, text: "Se cadastra antes" },
  { icon: Mail, text: "Recebe as informações primeiro" },
  { icon: MousePointerClick, text: "Escolhe o melhor andar" },
  { icon: ShoppingCart, text: "Garante condições especiais" }
];

const MCUrgencySection = () => {
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

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-32 bg-card relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />

      <div className="container px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              AGORA, A PARTE{" "}
              <span className="text-gold-gradient">MAIS IMPORTANTE</span>
            </h2>
          </div>

          {/* Alert Box */}
          <div className={`bg-background border-2 border-primary/30 rounded-lg p-8 mb-12 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-8 h-8 text-primary" />
              <h3 className="font-serif text-xl md:text-2xl font-bold text-foreground">
                OS MELHORES APARTAMENTOS NÃO CHEGAM AO MERCADO ABERTO.
              </h3>
            </div>

            <p className="text-muted-foreground mb-6">
              Eles ficam com quem:
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {priorities.map((item, index) => (
                <div
                  key={item.text}
                  className={`flex items-center gap-3 p-4 bg-card rounded-lg border border-border/50 transition-all duration-500 ${
                    isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'
                  }`}
                  style={{ transitionDelay: `${300 + index * 100}ms` }}
                >
                  <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className={`text-center space-y-6 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-lg text-muted-foreground">
              <span className="text-primary">👉</span>{" "}
              Quando o público geral descobrir, os melhores andares já terão dono.
            </p>
            <p className="text-muted-foreground">
              E quem ficou de fora vai ouvir a frase clássica:
            </p>
            <div className="inline-block bg-primary/10 border border-primary/30 rounded-lg px-8 py-4">
              <p className="font-serif text-xl md:text-2xl font-bold text-primary">
                "Esses já foram vendidos."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCUrgencySection;
