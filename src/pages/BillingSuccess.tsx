import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CheckCircle, Plane } from "lucide-react";
import copilotLogo from "@/assets/copilot-logo-dark.png";

const BillingSuccess = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const sessionId = new URLSearchParams(window.location.search).get("session_id");

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          navigate(sessionId ? `/signup?session_id=${sessionId}` : "/signup");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate, sessionId]);

  return (
    <>
      <Helmet><title>Pagamento Confirmado | Copilot Broker</title></Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <img src={copilotLogo} alt="Copilot Broker" className="h-14 mx-auto mb-8 opacity-60" />
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 font-mono">
            Pagamento confirmado!
          </h1>
          <p className="text-muted-foreground font-mono text-sm mb-6">
            Estamos liberando seu acesso. Você será redirecionado em {countdown}s...
          </p>
          <div className="flex items-center justify-center gap-2 text-primary/50">
            <Plane className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest">Preparando decolagem</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default BillingSuccess;
