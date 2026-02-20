import { useEffect, useRef, useState } from "react";
import { Zap, CheckCircle2, Bell, Phone } from "lucide-react";

const benefits = [
  { icon: Zap, text: "Acesso antecipado ao lançamento" },
  { icon: CheckCircle2, text: "Prioridade real na escolha dos apartamentos" },
  { icon: Bell, text: "Informações oficiais antes de qualquer divulgação pública" },
  { icon: Phone, text: "Contato direto no momento exato da abertura de vendas" }
];

const MCBenefitsSection = () => {
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
      id="beneficios"
      ref={sectionRef}
      className="py-20 md:py-32 bg-background relative overflow-hidden"
    >
      <div className="container px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              O CADASTRO NÃO É PARA CURIOSOS.
            </h2>
            <p className="font-serif text-xl md:text-2xl text-primary">
              É para quem não quer perder.
            </p>
          </div>

          <div className={`mb-12 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-center text-muted-foreground mb-8">
              Ao se cadastrar, você garante:
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div
                  key={benefit.text}
                  className={`flex items-center gap-4 p-5 bg-card rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-500 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                  }`}
                  style={{ transitionDelay: `${300 + index * 100}ms` }}
                >
                  <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-foreground">
                    <span className="text-primary mr-1">✔</span>
                    {benefit.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`text-center transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="divider-gold mx-auto mb-8" />
            <p className="text-lg text-muted-foreground mb-2">
              Sem cadastro, você entra na fila.
            </p>
            <p className="font-serif text-xl md:text-2xl font-semibold text-foreground">
              E fila não escolhe apartamento.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCBenefitsSection;
