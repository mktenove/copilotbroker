import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

/**
 * Componente centralizado para gerenciar manifest PWA e meta tags Apple por rota.
 * Resolve o problema de conflitos entre múltiplos manifests.
 */
const AppHead = () => {
  const { pathname } = useLocation();

  // Determinar qual configuração usar baseado na rota
  const isCRMRoute = 
    pathname.startsWith("/admin") || 
    pathname.startsWith("/corretor") || 
    pathname === "/auth";

  const isAdminRoute = pathname.startsWith("/admin");
  const isBrokerRoute = pathname.startsWith("/corretor");
  const isAuthRoute = pathname === "/auth";

  // Selecionar manifest apropriado
  let manifestPath = "/manifest.json";
  if (isAdminRoute) {
    manifestPath = "/manifest-crm.json";
  } else if (isBrokerRoute) {
    manifestPath = "/manifest-crm-broker.json";
  } else if (isAuthRoute) {
    manifestPath = "/manifest-crm-auth.json";
  }

  // Configurações baseadas no tipo de rota
  const appTitle = isCRMRoute ? "CRM" : "Enove";
  const themeColor = isCRMRoute ? "#0f0f12" : "#B8860B";

  return (
    <Helmet>
      {/* Manifest PWA - único por rota */}
      <link rel="manifest" href={manifestPath} />
      
      {/* Apple Web App Tags */}
      <meta name="apple-mobile-web-app-title" content={appTitle} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* Theme Color */}
      <meta name="theme-color" content={themeColor} />
      
      {/* Favicon & Apple Touch Icon */}
      <link rel="icon" type="image/png" href="/favicon-enove.png" />
      <link rel="apple-touch-icon" href="/favicon-enove.png" />
    </Helmet>
  );
};

export default AppHead;
