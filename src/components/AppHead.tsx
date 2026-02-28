import { Helmet } from "react-helmet-async";

const AppHead = () => {
  return (
    <Helmet>
      <link rel="manifest" href="/manifest.json" />
      <meta name="apple-mobile-web-app-title" content="Copilot Broker" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="theme-color" content="#0f0f12" />
      <link rel="icon" type="image/png" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/favicon.ico" />
    </Helmet>
  );
};

export default AppHead;
