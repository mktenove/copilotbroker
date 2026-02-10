import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/5551997010323";

const HomeCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="contato"
      ref={sectionRef}
      className="py-20 sm:py-28 px-4"
      aria-labelledby="cta-heading"
    >
      <div className={`container max-w-2xl text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        <div className="divider-gold mx-auto mb-10" aria-hidden="true" />

        <h2 id="cta-heading" className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-foreground mb-6">
          Vamos lançar{" "}
          <span className="text-primary">juntos?</span>
        </h2>

        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-10">
          Se você busca um parceiro preparado para estruturar e conduzir o lançamento do seu próximo empreendimento, queremos conversar.
        </p>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-base inline-flex items-center gap-3"
          aria-label="Entrar em contato via WhatsApp (abre em nova aba)"
        >
          <MessageCircle className="w-5 h-5" aria-hidden="true" />
          Entrar em Contato
        </a>
      </div>
    </section>
  );
};

export default HomeCTA;
