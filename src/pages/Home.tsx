import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import logoEnove from "@/assets/logo-enove.png";
import Footer from "@/components/Footer";
import { usePageTracking, trackLeadAttribution } from "@/hooks/use-page-tracking";

const Home = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", whatsapp: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const formRef = useRef<HTMLElement>(null);

  // Track page view
  usePageTracking();

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
      const { data: insertedLead, error } = await supabase
        .from("leads")
        .insert({
          name: formData.name.trim(),
          whatsapp: formData.whatsapp,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Track lead attribution
      if (insertedLead?.id) {
        await trackLeadAttribution(insertedLead.id);
      }

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
    <>
      {/* Skip to main content - Accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg"
      >
        Pular para o conteúdo principal
      </a>

      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="py-4 px-4 sm:py-6" role="banner">
          <nav className="container flex justify-center" aria-label="Navegação principal">
            <a
              href="https://www.enoveimobiliaria.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
              aria-label="Visitar site da Enove Imobiliária (abre em nova aba)"
            >
              <img
                src={logoEnove}
                alt="Enove Imobiliária - Logo"
                className="h-10 sm:h-12 md:h-14 w-auto"
                width="140"
                height="56"
                loading="eager"
              />
            </a>
          </nav>
        </header>

        {/* Main Content */}
        <main 
          id="main-content" 
          className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12"
          role="main"
        >
          <article
            className={`max-w-2xl w-full text-center transition-all duration-700 ease-out ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {/* Hero Section */}
            <header className="mb-8 sm:mb-12">
              <p className="text-primary font-medium tracking-widest uppercase mb-3 sm:mb-4 text-xs sm:text-sm">
                Novidade chegando
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
                Em Breve
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed mb-4 sm:mb-6 px-2">
                A cidade de{" "}
                <strong className="text-foreground font-medium">Estância Velha</strong>{" "}
                receberá um novo condomínio, que certamente, fará história.
              </p>
              <p 
                className="text-xl sm:text-2xl md:text-3xl font-semibold text-primary mb-4 sm:mb-6"
                aria-label="Chamada principal"
              >
                Não fique de fora.
              </p>
              <Link
                to="/estanciavelha"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg px-2 py-1"
                aria-label="Saiba mais sobre o empreendimento"
              >
                Saiba mais
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </Link>
            </header>

            {/* Lead Capture Form */}
            <section
              ref={formRef}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 sm:p-6 md:p-8"
              aria-labelledby="form-heading"
            >
              <h2 
                id="form-heading" 
                className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-2"
              >
                Cadastre-se para saber mais
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-5 sm:mb-6">
                Seja um dos primeiros a receber informações exclusivas.
              </p>

              <form 
                onSubmit={handleSubmit} 
                className="space-y-4"
                aria-label="Formulário de cadastro para acesso antecipado"
              >
                <div>
                  <label htmlFor="name" className="sr-only">Nome completo</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 sm:py-3.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground text-base"
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="whatsapp" className="sr-only">Número de WhatsApp</label>
                  <input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    autoComplete="tel"
                    inputMode="numeric"
                    placeholder="Seu WhatsApp (XX) XXXXX-XXXX"
                    value={formData.whatsapp}
                    onChange={(e) =>
                      setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) })
                    }
                    maxLength={16}
                    className="w-full px-4 py-3 sm:py-3.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground text-base"
                    aria-required="true"
                  />
                </div>

                <div className="flex items-start gap-3 text-left">
                  <input
                    type="checkbox"
                    id="terms-home"
                    name="terms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 min-w-[16px] rounded border-border text-primary focus:ring-primary/50 cursor-pointer"
                    aria-required="true"
                    aria-describedby="terms-description"
                  />
                  <label 
                    id="terms-description"
                    htmlFor="terms-home" 
                    className="text-xs sm:text-sm text-muted-foreground cursor-pointer"
                  >
                    Li e aceito os{" "}
                    <Link
                      to="/termos"
                      target="_blank"
                      className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                      rel="noopener"
                    >
                      Termos de Uso e Política de Privacidade
                    </Link>
                    , incluindo o recebimento de informações via WhatsApp.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-h-[48px] text-sm sm:text-base"
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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
                      <span>Enviando...</span>
                    </span>
                  ) : (
                    "QUERO ACESSO ANTECIPADO"
                  )}
                </button>
              </form>
            </section>
          </article>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Home;
