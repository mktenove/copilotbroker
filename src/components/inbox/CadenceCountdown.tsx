import { useState, useEffect, useCallback } from "react";
import { Timer, MessageSquare, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PendingMessage {
  id: string;
  message: string;
  scheduled_at: string;
  step_number: number | null;
  status: string;
}

interface CadenceCountdownProps {
  leadId: string | null;
  brokerId: string;
}

export function CadenceCountdown({ leadId, brokerId }: CadenceCountdownProps) {
  const [pending, setPending] = useState<PendingMessage | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  const fetchNext = useCallback(async () => {
    if (!leadId) return;
    const { data } = await supabase
      .from("whatsapp_message_queue")
      .select("id, message, scheduled_at, step_number, status")
      .eq("lead_id", leadId)
      .eq("broker_id", brokerId)
      .in("status", ["queued", "scheduled"])
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    setPending(data as PendingMessage | null);
  }, [leadId, brokerId]);

  useEffect(() => {
    fetchNext();
    // Realtime updates
    if (!leadId) return;
    const channel = supabase
      .channel(`cadence-countdown-${leadId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "whatsapp_message_queue",
        filter: `lead_id=eq.${leadId}`,
      }, () => fetchNext())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNext, leadId]);

  // Countdown timer
  useEffect(() => {
    if (!pending) return;
    const update = () => {
      const diff = new Date(pending.scheduled_at).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Enviando...");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) {
        setTimeLeft(`${h}h ${m}min`);
      } else if (m > 0) {
        setTimeLeft(`${m}min ${s}s`);
      } else {
        setTimeLeft(`${s}s`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [pending]);

  if (!pending) return null;

  const preview = pending.message.length > 120
    ? pending.message.substring(0, 120) + "…"
    : pending.message;

  const stepLabel = pending.step_number
    ? `Etapa ${pending.step_number}`
    : "Mensagem automática";

  return (
    <div className="mx-3 mb-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in slide-in-from-top-1 duration-300">
      <div className="flex items-center gap-2 mb-1.5">
        <Timer className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        <span className="text-[11px] font-medium text-emerald-400">
          Cadência ativa — {stepLabel}
        </span>
        <span className="ml-auto text-[11px] font-mono font-bold text-emerald-300 tabular-nums">
          {timeLeft}
        </span>
      </div>
      <div className="flex items-start gap-1.5">
        <MessageSquare className="w-3 h-3 text-emerald-500/50 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
          {preview}
        </p>
      </div>
    </div>
  );
}
