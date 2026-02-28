import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, RefreshCw, Search, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface BillingEvent {
  id: string; type: string; stripe_event_id: string; processed: boolean; created_at: string; payload: any;
}

const SuperAdminBilling = () => {
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase.from("billing_events" as any).select("*").order("created_at", { ascending: false }).limit(200) as any);
      if (error) throw error;
      setEvents(data || []);
    } catch { toast.error("Erro ao carregar eventos"); } finally { setIsLoading(false); }
  };

  const filtered = events.filter(e => !search || e.type.toLowerCase().includes(search.toLowerCase()) || e.stripe_event_id.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Helmet><title>Billing | Super Admin</title></Helmet>
      <div className="text-white">
        <div className="border-b border-[#2a2a2e] bg-[#0f0f12] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#FFFF00]" />
            <h1 className="text-xl font-bold">Billing Events / Webhooks</h1>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading} className="border-[#2a2a2e] text-slate-300 hover:text-white">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tipo ou event ID..." className="pl-10 bg-[#1e1e22] border-[#2a2a2e] text-white" />
          </div>

          <Card className="bg-[#1e1e22] border-[#2a2a2e]">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-500"><Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>Nenhum evento encontrado</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2a2a2e] text-slate-500 text-xs uppercase">
                        <th className="text-left py-3 px-4">Tipo</th>
                        <th className="text-left py-3 px-4">Event ID</th>
                        <th className="text-left py-3 px-4">Processado</th>
                        <th className="text-left py-3 px-4">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(ev => (
                        <tr key={ev.id} className="border-b border-[#2a2a2e]/40 hover:bg-[#2a2a2e]/20">
                          <td className="py-3 px-4"><Badge variant="outline" className="text-xs border-[#FFFF00]/20 text-[#FFFF00]/80 font-mono">{ev.type}</Badge></td>
                          <td className="py-3 px-4 text-xs text-slate-400 font-mono">{ev.stripe_event_id.slice(0, 24)}…</td>
                          <td className="py-3 px-4">
                            {ev.processed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-yellow-400" />}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 tabular-nums">{new Date(ev.created_at).toLocaleString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SuperAdminBilling;
