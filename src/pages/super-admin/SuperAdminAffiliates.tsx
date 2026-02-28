import { Helmet } from "react-helmet-async";
import { Handshake } from "lucide-react";

const SuperAdminAffiliates = () => (
  <>
    <Helmet><title>Afiliados | Super Admin</title></Helmet>
    <div className="text-white">
      <div className="border-b border-[#2a2a2e] bg-[#0f0f12] px-6 py-4">
        <div className="flex items-center gap-2">
          <Handshake className="w-5 h-5 text-[#FFFF00]" />
          <h1 className="text-xl font-bold">Afiliados</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">Em breve</p>
      </div>
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Handshake className="w-16 h-16 mx-auto mb-4 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-400">Módulo de Afiliados</h2>
          <p className="text-sm text-slate-600 mt-2">Este módulo está em desenvolvimento e estará disponível em breve.</p>
        </div>
      </div>
    </div>
  </>
);

export default SuperAdminAffiliates;
