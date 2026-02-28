import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Filter, RefreshCw, Search, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BillingEvent {
  id: string; type: string; stripe_event_id: string; processed: boolean; created_at: string; payload: any;
}

const SuperAdminBillingEvents = () => {
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProcessed, setFilterProcessed] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<string[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase.from("billing_events" as any).select("*").order("created_at", { ascending: false }).limit(500) as any);
      if (error) throw error;
      const items = (data || []) as BillingEvent[];
      setEvents(items);
      setEventTypes([...new Set(items.map(e => e.type))].sort());
    } catch { toast.error("Erro ao carregar eventos"); } finally { setIsLoading(false); }
  };

  const reprocess = async (ev: BillingEvent) => {
    setReprocessingId(ev.id);
    try {
      await (supabase.from("billing_events" as any).update({ processed: false } as any).eq("id", ev.id) as any);
      toast.success("Evento marcado para reprocessamento");
      await load();
    } catch { toast.error("Erro ao reprocessar"); } finally { setReprocessingId(null); }
  };

  const filtered = events.filter(e => {
    if (filterProcessed === "yes" && !e.processed) return false;
    if (filterProcessed === "no" && e.processed) return false;
    if (filterType !== "all" && e.type !== filterType) return false;
    if (search && !e.type.toLowerCase().includes(search.toLowerCase()) && !e.stripe_event_id.toLowerCase().includes(search.toLowerCase()) && !JSON.stringify(e.payload).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <Helmet><title>Billing Events Debug | Super Admin</title></Helmet>
      <div className="text-white p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs border-[#FFFF00]/30 text-[#FFFF00]/70 font-mono">{filtered.length} eventos</Badge>
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading} className="border-[#2a2a2e] text-slate-300 hover:text-white bg-transparent">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tipo, event ID ou payload..." className="pl-10 bg-[#1e1e22] border-[#2a2a2e] text-white" />
          </div>
          <div className="min-w-[160px]">
            <label className="text-[11px] text-slate-500 mb-1 block font-mono uppercase tracking-wider">Processado</label>
            <Select value={filterProcessed} onValueChange={setFilterProcessed}>
              <SelectTrigger className="bg-[#1e1e22] border-[#2a2a2e] text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#1e1e22] border-[#2a2a2e]">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Sim</SelectItem>
                <SelectItem value="no">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[220px]">
            <label className="text-[11px] text-slate-500 mb-1 block font-mono uppercase tracking-wider">Tipo</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-[#1e1e22] border-[#2a2a2e] text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#1e1e22] border-[#2a2a2e] max-h-60">
                <SelectItem value="all">Todos os tipos</SelectItem>
                {eventTypes.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500"><Filter className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>Nenhum evento encontrado</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2e] text-slate-500 text-[11px] uppercase tracking-wider font-mono">
                    <th className="text-left py-3 px-4">Tipo</th>
                    <th className="text-left py-3 px-4">Stripe Event ID</th>
                    <th className="text-left py-3 px-4">Processado</th>
                    <th className="text-left py-3 px-4">Data</th>
                    <th className="text-left py-3 px-4">Payload</th>
                    <th className="text-right py-3 px-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ev => (
                    <tr key={ev.id} className="border-b border-[#2a2a2e]/40 hover:bg-[#2a2a2e]/20">
                      <td className="py-3 px-4"><Badge variant="outline" className="text-xs border-[#FFFF00]/20 text-[#FFFF00]/80 font-mono">{ev.type}</Badge></td>
                      <td className="py-3 px-4 text-xs text-slate-400 font-mono max-w-[200px] truncate" title={ev.stripe_event_id}>{ev.stripe_event_id}</td>
                      <td className="py-3 px-4">
                        {ev.processed
                          ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 className="w-4 h-4" /> Sim</span>
                          : <span className="flex items-center gap-1 text-yellow-400 text-xs"><Clock className="w-4 h-4" /> Não</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 tabular-nums font-mono whitespace-nowrap">{new Date(ev.created_at).toLocaleString("pt-BR")}</td>
                      <td className="py-3 px-4">
                        <details className="text-xs">
                          <summary className="text-slate-400 cursor-pointer hover:text-white">Ver payload</summary>
                          <pre className="mt-2 p-2 bg-[#0a0a0c] rounded text-[10px] text-slate-400 max-h-40 overflow-auto whitespace-pre-wrap">{JSON.stringify(ev.payload, null, 2)}</pre>
                        </details>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => reprocess(ev)} disabled={reprocessingId === ev.id || !ev.processed} className="text-slate-400 hover:text-[#FFFF00] text-xs gap-1" title={ev.processed ? "Marcar para reprocessar" : "Já pendente"}>
                          <RotateCcw className={cn("w-3.5 h-3.5", reprocessingId === ev.id && "animate-spin")} />Reprocessar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SuperAdminBillingEvents;
