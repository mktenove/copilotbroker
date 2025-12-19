import { useEffect, useRef, useState } from "react";
import { Check, Crown } from "lucide-react";

const benefits = [
  "Prioridade no recebimento dos detalhes oficiais",
  "Acesso prioritário na abertura de vendas",
  "Chance real de escolher os melhores lotes",
];

const BenefitsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 md:py-32 bg-secondary/30 relative overflow-hidden">
      <div className="container relative z-10">
        <div className={`max-w-4xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <h2 className="section-title mb-4">
              Acesso Antecipado <span className="text-primary">às Vendas</span>
            </h2>
            <p className="section-subtitle">
              O cadastro abaixo não é apenas para receber informações.
            </p>
          </div>

          <div className="card-luxury p-8 md:p-12 mb-10">
            <p className="text-lg text-foreground/90 font-medium mb-8 text-center">
              Ele garante:
            </p>
            
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div
                  key={benefit}
                  className={`flex items-start gap-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}
                  style={{ transitionDelay: `${(index + 1) * 150}ms` }}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-lg text-foreground/90 pt-0.5">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`text-center transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <p className="text-foreground/80 text-lg italic">
              Sem cadastro, você será apenas mais um tentando comprar quando todo mundo já comprou.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
