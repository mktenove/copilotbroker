import { Helmet } from "react-helmet-async";
import logoEnove from "@/assets/logo-enove.png";
import Footer from "@/components/Footer";
import {
  HomeHero,
  HomePositioning,
  HomeDifferentials,
  HomeProcess,
  HomePartnership,
  HomeCTA,
} from "@/components/home";

const Home = () => {
  return (
    <>
      <Helmet>
        <title>Enove | Plataforma de Lançamentos Imobiliários no RS</title>
        <meta
          name="description"
          content="A Enove é a parceira estratégica de incorporadoras para lançamentos imobiliários no Rio Grande do Sul. Estratégia, marketing e operação comercial de alta performance."
        />
        <meta property="og:title" content="Enove | Plataforma de Lançamentos Imobiliários no RS" />
        <meta
          property="og:description"
          content="Transformamos lançamentos em cases de sucesso. Estratégia, tecnologia e operação comercial de alta performance para incorporadoras."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://onovocondominio.com.br/" />
        <link rel="canonical" href="https://onovocondominio.com.br/" />
      </Helmet>

      {/* Skip to main content */}
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
        <main id="main-content" className="flex-1" role="main">
          <HomeHero />
          <HomePositioning />
          <HomeDifferentials />
          <HomeProcess />
          <HomePartnership />
          <HomeCTA />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Home;
