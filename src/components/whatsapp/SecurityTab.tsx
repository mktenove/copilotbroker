import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useWhatsAppInstance } from "@/hooks/use-whatsapp-instance";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Shield, AlertOctagon, ChevronDown } from "lucide-react";
import { DailyStatsChart } from "./DailyStatsChart";
import { OptoutsList } from "./OptoutsList";
import { ErrorLogsCard } from "./ErrorLogsCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function SecurityTab() {
  const { instance, togglePause, updateSettings } = useWhatsAppInstance();
  const [hourlyLimit, setHourlyLimit] = useState(instance?.hourly_limit || 30);
  const [dailyLimit, setDailyLimit] = useState(instance?.daily_limit || 150);
  const [workStart, setWorkStart] = useState(instance?.working_hours_start || "09:00");
  const [workEnd, setWorkEnd] = useState(instance?.working_hours_end || "21:00");
  const [optoutsOpen, setOptoutsOpen] = useState(false);

  const { data: broker } = useQuery({
    queryKey: ["current-broker-security"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("brokers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      return data;
    },
  });

  useEffect(() => {
    if (instance) {
      setHourlyLimit(instance.hourly_limit || 30);
      setDailyLimit(instance.daily_limit || 150);
      setWorkStart(instance.working_hours_start || "09:00");
      setWorkEnd(instance.working_hours_end || "21:00");
    }
  }, [instance]);

  const handleKillSwitch = async () => {
    if (instance) {
      await togglePause(!instance.is_paused);
    }
  };

  const handleSaveSettings = async () => {
    await updateSettings({
      hourly_limit: hourlyLimit,
      daily_limit: dailyLimit,
      working_hours_start: workStart,
      working_hours_end: workEnd,
    });
  };

  const isPaused = instance?.is_paused;

  const rules = [
    "Intervalo 60-240s",
    "Máx. 2 links/msg",
    "Deduplicação diária",
    "Opt-out automático",
    "Pausa em 5 erros",
    `${workStart.slice(0, 5)}–${workEnd.slice(0, 5)}`,
  ];

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#2a2a2e]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isPaused ? "bg-red-500 animate-pulse" : "bg-green-500 animate-pulse"}`} />
            <span className="text-sm font-medium text-slate-300">
              {isPaused ? "Pausado" : "Protegido"}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            🔥 Dia {instance?.warmup_day || 1}/14
          </span>
        </div>

        <Button
          onClick={handleKillSwitch}
          variant="ghost"
          size="sm"
          className={isPaused
            ? "border border-green-500/20 text-green-400 hover:bg-green-500/10 hover:text-green-300 text-xs"
            : "border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs"
          }
        >
          <AlertOctagon className="w-3.5 h-3.5 mr-1.5" />
          {isPaused ? "Retomar" : "Parar envios"}
        </Button>
      </div>

      {/* Controls */}
      <div className="space-y-5">
        <span className="text-sm font-medium text-slate-300">Limites de envio</span>

        <div className="flex gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Por hora</span>
              <span className="text-xs text-slate-300 font-mono">{hourlyLimit}</span>
            </div>
            <Slider
              value={[hourlyLimit]}
              onValueChange={([v]) => setHourlyLimit(v)}
              min={10}
              max={60}
              step={5}
            />
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Por dia</span>
              <span className="text-xs text-slate-300 font-mono">{dailyLimit}</span>
            </div>
            <Slider
              value={[dailyLimit]}
              onValueChange={([v]) => setDailyLimit(v)}
              min={30}
              max={300}
              step={10}
            />
          </div>
        </div>

        <div className="border-t border-[#2a2a2e] pt-4 space-y-3">
          <span className="text-xs text-slate-500">Horário de envio</span>
          <div className="flex items-center gap-3">
            <Input
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              className="bg-[#0d0d0f] border-[#2a2a2e] text-white w-28 text-xs h-8"
            />
            <span className="text-slate-600 text-xs">até</span>
            <Input
              type="time"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              className="bg-[#0d0d0f] border-[#2a2a2e] text-white w-28 text-xs h-8"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSaveSettings}
            variant="ghost"
            size="sm"
            className="border border-[#2a2a2e] text-slate-400 hover:text-slate-200 text-xs"
          >
            Salvar
          </Button>
        </div>
      </div>

      {/* Monitoring */}
      {broker?.id && <DailyStatsChart brokerId={broker.id} />}
      {broker?.id && <ErrorLogsCard brokerId={broker.id} />}

      {/* Anti-spam rules as pills */}
      <div className="pt-2 border-t border-[#2a2a2e]">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-400">Regras ativas</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {rules.map((rule, i) => (
            <span
              key={i}
              className="bg-[#1e1e22] text-slate-400 text-xs px-3 py-1 rounded-full border border-[#2a2a2e]"
            >
              {rule}
            </span>
          ))}
        </div>
      </div>

      {/* Opt-outs collapsible */}
      <Collapsible open={optoutsOpen} onOpenChange={setOptoutsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors w-full pt-2 border-t border-[#2a2a2e]">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${optoutsOpen ? "rotate-180" : ""}`} />
          Opt-outs
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <OptoutsList />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
