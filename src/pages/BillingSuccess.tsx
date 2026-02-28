import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CheckCircle, Plane } from "lucide-react";
import copilotLogo from "@/assets/copilot-logo-dark.png";

const BillingSuccess = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          navigate("/onboarding");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <>
      <Helmet><title>Pagamento Confirmado | Copilot Broker</title></Helmet>
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <img src={copilotLogo} alt="Copilot Broker" className="h-10 mx-auto mb-8 opacity-60" />
          <div className="w-20 h-20 rounded-full bg-[#FFFF00]/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#FFFF00]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 font-mono">
            Pagamento confirmado!
          </h1>
          <p className="text-slate-400 font-mono text-sm mb-6">
            Estamos liberando seu acesso. Você será redirecionado em {countdown}s...
          </p>
          <div className="flex items-center justify-center gap-2 text-[#FFFF00]/50">
            <Plane className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest">Preparando decolagem</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default BillingSuccess;
