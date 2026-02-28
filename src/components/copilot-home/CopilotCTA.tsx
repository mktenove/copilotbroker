import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plane } from "lucide-react";

const CopilotCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-20 sm:py-28 px-4 bg-card/30">
      <div className={`container max-w-3xl text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        <Plane className="w-10 h-10 text-primary mx-auto mb-6" />

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
          Pronto para{" "}
          <span className="text-gold-gradient">decolar?</span>
        </h2>

        <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto">
          Junte-se aos corretores que já estão vendendo mais com o Copilot Broker.
          Comece hoje e veja resultados em minutos.
        </p>

        <a
          href="/auth"
          className="btn-primary text-base inline-flex items-center gap-3"
        >
          Criar Minha Conta Grátis
          <ArrowRight className="w-5 h-5" />
        </a>

        <p className="text-xs text-muted-foreground/60 mt-6 font-mono">
          Sem cartão de crédito · Cancele quando quiser
        </p>
      </div>
    </section>
  );
};

export default CopilotCTA;
