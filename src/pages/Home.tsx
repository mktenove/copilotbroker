import { Helmet } from "react-helmet-async";
import {
  CopilotHero,
  CopilotFeatures,
  CopilotHowItWorks,
  CopilotPricing,
  CopilotCTA,
  CopilotFooter,
} from "@/components/copilot-home";

const Home = () => {
  return (
    <>
      <Helmet>
        <title>Copilot Broker | CRM com IA para Corretores de Imóveis</title>
        <meta
          name="description"
          content="O copiloto inteligente do corretor de imóveis. CRM com IA que automatiza WhatsApp, organiza leads e multiplica suas vendas. Decole seus resultados."
        />
        <meta property="og:title" content="Copilot Broker | CRM com IA para Corretores" />
        <meta
          property="og:description"
          content="CRM com inteligência artificial para corretores e imobiliárias. Automatize atendimento, gerencie leads e venda mais."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://onovocondominio.com.br/" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1">
          <CopilotHero />
          <CopilotFeatures />
          <CopilotHowItWorks />
          <CopilotPricing />
          <CopilotCTA />
        </main>
        <CopilotFooter />
      </div>
    </>
  );
};

export default Home;
