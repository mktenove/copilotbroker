import { useEffect, useRef, useState } from "react";
import { Building2, Users, Layers, Store, Ruler, Check } from "lucide-react";
import piscinaImage from "@/assets/mauriciocardoso/piscina-wellness.jpg";

const features = [
  { icon: Building2, text: "20 andares com implantação imponente e arquitetura autoral" },
  { icon: Users, text: "Apenas 4 apartamentos por andar — máxima privacidade" },
  { icon: Ruler, text: "Plantas inteligentes de 95 a 125m², 2 e 3 dormitórios" },
  { icon: Layers, text: "1.800m² de lazer e wellness: piscina, fitness, solário, jardins" },
  { icon: Store, text: "5 lojas no térreo que qualificam o entorno com conveniência" },
];

const MCFeaturesSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const imageObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image();
          img.onload = () => setImageLoaded(true);
          img.src = piscinaImage;
          imageObserver.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );
    if (imageRef.current) imageObserver.observe(imageRef.current);
    return () => imageObserver.disconnect();
  }, []);

  return (
    <section
      id="diferenciais"
      ref={sectionRef}
      className="py-20 md:py-32 bg-card relative overflow-hidden"
    >
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container px-4 relative z-10">
        {/* Title */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            UM PROJETO PENSADO{" "}
            <span className="text-gold-gradient">PARA POUCOS</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Cada detalhe foi planejado para gerar desejo, conforto e valorização.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Features List */}
          <div className={`space-y-6 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-all duration-300"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex items-center pt-3">
                  <p className="text-base sm:text-lg text-foreground">{feature.text}</p>
                </div>
              </div>
            ))}

            <div className="pt-4">
              <p className="font-serif text-lg md:text-xl italic text-muted-foreground">
                A arquitetura autoral e contemporânea traduz{" "}
                <span className="text-primary font-semibold">sofisticação</span>{" "}
                atemporal.
              </p>
            </div>
          </div>

          {/* Image */}
          <div
            ref={imageRef}
            className={`relative transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
          >
            <div className="relative rounded-lg overflow-hidden shadow-elegant">
              <div className={`aspect-[4/3] bg-muted transition-opacity duration-500 ${imageLoaded ? 'opacity-0' : 'opacity-100'}`}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
              {imageLoaded && (
                <img
                  src={piscinaImage}
                  alt="Área de lazer e wellness - 1.800m²"
                  className="absolute inset-0 w-full h-full object-cover animate-fade-in"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
            <div className="absolute -inset-2 border border-primary/20 rounded-lg -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default MCFeaturesSection;
