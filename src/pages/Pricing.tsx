import { Helmet } from "react-helmet-async";
import copilotLogo from "@/assets/copilot-logo-dark.png";
import { CopilotPricing, CopilotFooter } from "@/components/copilot-home";

const Pricing = () => {
  return (
    <>
      <Helmet>
        <title>Planos | Copilot Broker</title>
        <meta name="description" content="Escolha o plano ideal do Copilot Broker. CRM com IA para corretores e imobiliárias." />
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/30 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <a href="/">
              <img src={copilotLogo} alt="Copilot Broker" className="h-12" />
            </a>
            <a href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono">
              Já tenho conta
            </a>
          </div>
        </header>

        <main className="flex-1">
          <CopilotPricing />
        </main>

        <CopilotFooter />
      </div>
    </>
  );
};

export default Pricing;
