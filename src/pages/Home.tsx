import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoEnove from "@/assets/logo-enove.png";
import Footer from "@/components/Footer";

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", whatsapp: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }

    const whatsappNumbers = formData.whatsapp.replace(/\D/g, "");
    if (whatsappNumbers.length < 10 || whatsappNumbers.length > 11) {
      toast.error("Por favor, informe um número de WhatsApp válido.");
      return;
    }

    if (!acceptedTerms) {
      toast.error("Você precisa aceitar os termos para continuar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("leads").insert({
        name: formData.name.trim(),
        whatsapp: formData.whatsapp,
      });

      if (error) throw error;

      toast.success("Cadastro realizado com sucesso! Em breve entraremos em contato.");
      setFormData({ name: "", whatsapp: "" });
      setAcceptedTerms(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Erro ao realizar cadastro. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="container flex justify-center">
          <a
            href="https://www.enoveimobiliaria.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-80"
          >
            <img
              src={logoEnove}
              alt="Enove Imobiliária"
              className="h-12 md:h-14 w-auto"
            />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className={`max-w-2xl w-full text-center transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Suspense Message */}
          <div className="mb-12">
            <p className="text-primary font-medium tracking-widest uppercase mb-4 text-sm">
              Novidade chegando
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Em Breve
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
              A cidade de <span className="text-foreground font-medium">Estância Velha</span> receberá 
              um novo condomínio, que certamente, fará história.
            </p>
            <p className="text-2xl md:text-3xl font-semibold text-primary mb-6">
              Não fique de fora.
            </p>
            <a
              href="/estanciavelha"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Saiba mais
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* Form Card */}
          <div
            ref={formRef}
            className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8"
          >
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
              Cadastre-se para saber mais
            </h2>
            <p className="text-muted-foreground mb-6">
              Seja um dos primeiros a receber informações exclusivas.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <input
                  type="tel"
                  placeholder="Seu WhatsApp (XX) XXXXX-XXXX"
                  value={formData.whatsapp}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })
                  }
                  maxLength={16}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-start gap-3 text-left">
                <input
                  type="checkbox"
                  id="terms-home"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                />
                <label htmlFor="terms-home" className="text-sm text-muted-foreground">
                  Li e aceito os{" "}
                  <a
                    href="/termos"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    Termos de Uso e Política de Privacidade
                  </a>
                  , incluindo o recebimento de informações via WhatsApp.
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Enviando...
                  </span>
                ) : (
                  "QUERO ACESSO ANTECIPADO"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
};

export default Home;
