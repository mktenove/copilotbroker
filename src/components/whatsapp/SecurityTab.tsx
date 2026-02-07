import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useWhatsAppInstance } from "@/hooks/use-whatsapp-instance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Shield, AlertOctagon, Check, Clock } from "lucide-react";
import { DailyStatsChart } from "./DailyStatsChart";
import { OptoutsList } from "./OptoutsList";
import { ErrorLogsCard } from "./ErrorLogsCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function SecurityTab() {
  const { instance, togglePause, updateSettings } = useWhatsAppInstance();
  const [hourlyLimit, setHourlyLimit] = useState(instance?.hourly_limit || 30);
  const [dailyLimit, setDailyLimit] = useState(instance?.daily_limit || 150);
  const [workStart, setWorkStart] = useState(instance?.working_hours_start || "09:00");
  const [workEnd, setWorkEnd] = useState(instance?.working_hours_end || "21:00");

  // Fetch broker ID
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

  // Update local state when instance loads
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

  const warmupProgress = instance ? (instance.warmup_day / 14) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Kill Switch */}
      <Card className={instance?.is_paused 
        ? "bg-destructive/10 border-destructive/30" 
        : "bg-[#1a1a1d] border-[#2a2a2e]"
      }>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-destructive" />
            Botão de Emergência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 mb-4">
            {instance?.is_paused 
              ? "Todos os envios estão pausados. Clique para retomar."
              : "Pause imediatamente todos os envios em caso de problemas."
            }
          </p>
          <Button
            onClick={handleKillSwitch}
            variant={instance?.is_paused ? "default" : "destructive"}
            className={instance?.is_paused 
              ? "bg-green-600 hover:bg-green-700" 
              : ""
            }
          >
            {instance?.is_paused ? "▶ Retomar Envios" : "⛔ PARAR TODOS OS ENVIOS"}
          </Button>
        </CardContent>
      </Card>

      {/* Warmup Progress */}
      <Card className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            🔥 Aquecimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">
              Dia {instance?.warmup_day || 1} de 14
            </span>
            <span className="text-amber-400">
              {instance?.warmup_stage === "normal" ? "Completo" : "Em andamento"}
            </span>
          </div>
          <Progress value={warmupProgress} className="h-2" />
          <p className="text-xs text-slate-400">
            O aquecimento gradual aumenta seus limites de envio ao longo de 14 dias para proteger seu número.
          </p>
        </CardContent>
      </Card>

      {/* Daily Stats Chart */}
      {broker?.id && <DailyStatsChart brokerId={broker.id} />}

      {/* Opt-outs List */}
      <OptoutsList />

      {/* Error Logs */}
      {broker?.id && <ErrorLogsCard brokerId={broker.id} />}

      {/* Limits Settings */}
      <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Limites de Envio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hourly Limit */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Limite por hora</span>
              <span className="text-sm text-white font-mono">{hourlyLimit}</span>
            </div>
            <Slider
              value={[hourlyLimit]}
              onValueChange={([v]) => setHourlyLimit(v)}
              min={10}
              max={60}
              step={5}
              className="w-full"
            />
          </div>

          {/* Daily Limit */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Limite por dia</span>
              <span className="text-sm text-white font-mono">{dailyLimit}</span>
            </div>
            <Slider
              value={[dailyLimit]}
              onValueChange={([v]) => setDailyLimit(v)}
              min={30}
              max={300}
              step={10}
              className="w-full"
            />
          </div>

          {/* Working Hours */}
          <div className="space-y-3">
            <span className="text-sm text-slate-400">Horário de envio</span>
            <div className="flex items-center gap-3">
              <Input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="bg-[#0d0d0f] border-[#2a2a2e] text-white w-32"
              />
              <span className="text-slate-400 text-sm">até</span>
              <Input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="bg-[#0d0d0f] border-[#2a2a2e] text-white w-32"
              />
            </div>
          </div>

          <Button 
            onClick={handleSaveSettings}
            className="w-full"
          >
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      {/* Active Rules */}
      <Card className="bg-[#1a1a1d] border-[#2a2a2e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Regras Anti-Spam Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[
              "Intervalo 60-240s entre mensagens",
              "Máx. 2 links por mensagem",
              "Deduplicação (não repetir no mesmo dia)",
              "Opt-out automático por palavras-chave",
              "Pausa em 5 erros consecutivos",
              `Horário de envio: ${workStart.slice(0, 5)} - ${workEnd.slice(0, 5)}`,
            ].map((rule, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-slate-400">{rule}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
