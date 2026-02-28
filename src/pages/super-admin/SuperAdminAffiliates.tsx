import { Helmet } from "react-helmet-async";
import { Handshake } from "lucide-react";

const SuperAdminAffiliates = () => (
  <>
    <Helmet><title>Afiliados | Super Admin</title></Helmet>
    <div className="text-white p-6">
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#1e1e22] border border-[#2a2a2e] flex items-center justify-center mx-auto mb-5">
            <Handshake className="w-10 h-10 text-slate-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-300">Módulo de Afiliados</h2>
          <p className="text-sm text-slate-600 mt-2 max-w-sm">Este módulo está em desenvolvimento e estará disponível em breve.</p>
        </div>
      </div>
    </div>
  </>
);

export default SuperAdminAffiliates;
