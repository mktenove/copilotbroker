import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Shuffle, Users, Building2, Clock, Power, PowerOff, RefreshCw, ChevronDown, ChevronUp, Trash2, UserPlus, History, Target, Timer, TimerOff, LogOut } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRoletas, useRoletaLogs } from "@/hooks/use-roletas";
import { Roleta } from "@/types/roleta";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Broker {
  id: string;
  name: string;
  slug: string;
  lider_id: string | null;
}

interface Project {
  id: string;
  name: string;
  city: string;
}

const RoletaManagement = () => {
  const {
    roletas, isLoading, fetchRoletas,
    createRoleta, updateRoleta, toggleRoletaAtiva,
    addMembro, removeMembro, updateMembroOrdem, toggleCheckin,
    addEmpreendimento, removeEmpreendimento, deleteRoleta,
  } = useRoletas();

  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedRoleta, setExpandedRoleta] = useState<string | null>(null);
  const [showLogsFor, setShowLogsFor] = useState<string | null>(null);

  // Form state
  const [formNome, setFormNome] = useState("");
  const [formLiderId, setFormLiderId] = useState("");
  const [formTimeout, setFormTimeout] = useState(10);
  const [formTimeoutAtivo, setFormTimeoutAtivo] = useState(true);
  const [formPausaInicio, setFormPausaInicio] = useState("21:00");
  const [formPausaFim, setFormPausaFim] = useState("09:00");
  const [formSelectedProjects, setFormSelectedProjects] = useState<string[]>([]);

  // Add member state
  const [addMemberRoletaId, setAddMemberRoletaId] = useState<string | null>(null);
  const [selectedBrokerId, setSelectedBrokerId] = useState("");

  // Add empreendimento state
  const [addEmpRoletaId, setAddEmpRoletaId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    fetchBrokersAndProjects();
  }, []);

  const fetchBrokersAndProjects = async () => {
    const [brokersRes, projectsRes] = await Promise.all([
      supabase.from("brokers" as any).select("id, name, slug, lider_id").eq("is_active", true).order("name") as any,
      supabase.from("projects").select("id, name, city").eq("is_active", true).order("name"),
    ]);
    setBrokers((brokersRes.data || []) as Broker[]);
    setProjects((projectsRes.data || []) as Project[]);
  };

  const handleCreate = async () => {
    if (!formNome.trim() || !formLiderId) {
      toast.error("Nome e líder são obrigatórios.");
      return;
    }
    const roletaId = await createRoleta({
      nome: formNome.trim(),
      lider_id: formLiderId,
      tempo_reserva_minutos: formTimeout,
      timeout_ativo: formTimeoutAtivo,
      timeout_pausa_inicio: formPausaInicio,
      timeout_pausa_fim: formPausaFim,
    } as any);
    if (roletaId) {
      // Vincular empreendimentos selecionados
      for (const projectId of formSelectedProjects) {
        await addEmpreendimento(roletaId, projectId);
      }
      setIsCreateOpen(false);
      setFormNome("");
      setFormLiderId("");
      setFormTimeout(10);
      setFormTimeoutAtivo(true);
      setFormPausaInicio("21:00");
      setFormPausaFim("09:00");
      setFormSelectedProjects([]);
    }
  };

  const handleAddMember = async (roletaId: string) => {
    if (!selectedBrokerId) return;
    const roleta = roletas.find(r => r.id === roletaId);
    const maxOrdem = Math.max(0, ...(roleta?.membros || []).map(m => m.ordem));
    const success = await addMembro(roletaId, selectedBrokerId, maxOrdem + 1);
    if (success) {
      setAddMemberRoletaId(null);
      setSelectedBrokerId("");
    }
  };

  const handleAddEmpreendimento = async (roletaId: string) => {
    if (!selectedProjectId) return;
    const success = await addEmpreendimento(roletaId, selectedProjectId);
    if (success) {
      setAddEmpRoletaId(null);
      setSelectedProjectId("");
    }
  };

  // Leaders = brokers with leader role or all brokers for now
  const leaders = brokers;

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando roletas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shuffle className="w-6 h-6 text-primary" />
            Roletas de Leads
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {roletas.filter(r => r.ativa).length} roleta{roletas.filter(r => r.ativa).length !== 1 ? "s" : ""} ativa{roletas.filter(r => r.ativa).length !== 1 ? "s" : ""}
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setFormNome("");
            setFormLiderId("");
            setFormTimeout(10);
            setFormTimeoutAtivo(true);
            setFormPausaInicio("21:00");
            setFormPausaFim("09:00");
            setFormSelectedProjects([]);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:brightness-110">
              <Plus className="w-5 h-5 mr-2" />
              Nova Roleta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Roleta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome da Roleta</Label>
                <Input
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Roleta GoldenView"
                  className="bg-[#141417] border-[#2a2a2e]"
                />
              </div>
              <div>
                <Label>Líder Responsável</Label>
                <Select value={formLiderId} onValueChange={setFormLiderId}>
                  <SelectTrigger className="bg-[#141417] border-[#2a2a2e]">
                    <SelectValue placeholder="Selecione o líder..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leaders.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Tempo máximo para atendimento</Label>
                  <Switch
                    checked={formTimeoutAtivo}
                    onCheckedChange={setFormTimeoutAtivo}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formTimeoutAtivo
                    ? "Lead será redistribuído automaticamente se não atendido. A notificação WhatsApp não exibirá os dados do lead."
                    : "Sem prazo para atendimento. A notificação WhatsApp incluirá nome e telefone do lead."}
                </p>
                {formTimeoutAtivo && (
                  <>
                    <Label className="mt-3 block">Tempo de Reserva: {formTimeout} min</Label>
                    <Slider
                      value={[formTimeout]}
                      onValueChange={([v]) => setFormTimeout(v)}
                      min={1}
                      max={60}
                      step={1}
                      className="mt-2"
                    />
                    <div className="mt-3">
                      <Label className="text-xs">Horário sem transferência</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Select value={formPausaInicio} onValueChange={setFormPausaInicio}>
                          <SelectTrigger className="w-24 bg-[#141417] border-[#2a2a2e] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const h = String(i).padStart(2, "0") + ":00";
                              return <SelectItem key={h} value={h}>{h}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">até</span>
                        <Select value={formPausaFim} onValueChange={setFormPausaFim}>
                          <SelectTrigger className="w-24 bg-[#141417] border-[#2a2a2e] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const h = String(i).padStart(2, "0") + ":00";
                              return <SelectItem key={h} value={h}>{h}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Nesse horário, leads não serão redistribuídos.</p>
                    </div>
                  </>
                )}
              </div>
              <div>
                <Label>Empreendimentos</Label>
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                  {projects.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum empreendimento disponível.</p>
                  ) : (
                    projects.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={formSelectedProjects.includes(p.id)}
                          onCheckedChange={(checked) => {
                            setFormSelectedProjects(prev =>
                              checked
                                ? [...prev, p.id]
                                : prev.filter(id => id !== p.id)
                            );
                          }}
                        />
                        <span className="text-sm text-foreground">{p.name}</span>
                        <span className="text-xs text-muted-foreground">({p.city})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <DialogClose asChild>
                  <Button variant="outline" className="flex-1">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleCreate} className="flex-1 bg-primary text-primary-foreground">
                  Criar Roleta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roletas List */}
      {roletas.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Shuffle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma roleta criada ainda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {roletas.map(roleta => {
            const isExpanded = expandedRoleta === roleta.id;
            const onlineCount = (roleta.membros || []).filter(m => m.status_checkin && m.ativo).length;
            const totalMembros = (roleta.membros || []).filter(m => m.ativo).length;
            const emps = (roleta.empreendimentos || []).filter(e => e.ativo);

            return (
              <div key={roleta.id} className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl overflow-hidden">
                {/* Card Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-[#252528] transition-colors"
                  onClick={() => setExpandedRoleta(isExpanded ? null : roleta.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        roleta.ativa ? "bg-emerald-500" : "bg-red-500"
                      )} />
                      <h3 className="font-semibold text-foreground">{roleta.nome}</h3>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {(roleta as any).timeout_ativo !== false ? `${roleta.tempo_reserva_minutos}min` : "Sem timeout"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        <Users className="w-3 h-3 inline mr-1" />
                        {onlineCount}/{totalMembros} online
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3 inline mr-1" />
                        {emps.length} emp.
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>Líder: <strong className="text-foreground">{roleta.lider?.name || "—"}</strong></span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-[#2a2a2e] p-4 space-y-4">
                    {/* Timeout Settings */}
                    <div className="bg-[#141417] rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {(roleta as any).timeout_ativo !== false ? (
                            <Timer className="w-4 h-4 text-amber-400" />
                          ) : (
                            <TimerOff className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium text-foreground">Tempo máximo para atendimento</span>
                        </div>
                        <Switch
                          checked={(roleta as any).timeout_ativo !== false}
                          onCheckedChange={(checked) => updateRoleta(roleta.id, { timeout_ativo: checked } as any)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(roleta as any).timeout_ativo !== false
                          ? "Lead redistribuído automaticamente se não atendido. Notificação WhatsApp sem dados do lead."
                          : "Sem prazo. Notificação WhatsApp com nome e telefone do lead."}
                      </p>
                      {(roleta as any).timeout_ativo !== false && (
                        <>
                          <div>
                            <Label className="text-xs">Tempo: {roleta.tempo_reserva_minutos} min</Label>
                            <Slider
                              value={[roleta.tempo_reserva_minutos]}
                              onValueChange={([v]) => updateRoleta(roleta.id, { tempo_reserva_minutos: v } as any)}
                              min={1}
                              max={60}
                              step={1}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Horário sem transferência</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Select
                                value={(roleta as any).timeout_pausa_inicio?.slice(0, 5) || "21:00"}
                                onValueChange={(v) => updateRoleta(roleta.id, { timeout_pausa_inicio: v } as any)}
                              >
                                <SelectTrigger className="w-24 bg-[#0e0e11] border-[#2a2a2e] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 24 }, (_, i) => {
                                    const h = String(i).padStart(2, "0") + ":00";
                                    return <SelectItem key={h} value={h}>{h}</SelectItem>;
                                  })}
                                </SelectContent>
                              </Select>
                              <span className="text-xs text-muted-foreground">até</span>
                              <Select
                                value={(roleta as any).timeout_pausa_fim?.slice(0, 5) || "09:00"}
                                onValueChange={(v) => updateRoleta(roleta.id, { timeout_pausa_fim: v } as any)}
                              >
                                <SelectTrigger className="w-24 bg-[#0e0e11] border-[#2a2a2e] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 24 }, (_, i) => {
                                    const h = String(i).padStart(2, "0") + ":00";
                                    return <SelectItem key={h} value={h}>{h}</SelectItem>;
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Nesse horário, leads não serão redistribuídos.</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRoletaAtiva(roleta.id, !roleta.ativa)}
                        className={cn(
                          "text-xs",
                          roleta.ativa ? "text-red-400 hover:text-red-300" : "text-emerald-400 hover:text-emerald-300"
                        )}
                      >
                        {roleta.ativa ? <PowerOff className="w-3 h-3 mr-1" /> : <Power className="w-3 h-3 mr-1" />}
                        {roleta.ativa ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setShowLogsFor(showLogsFor === roleta.id ? null : roleta.id)}
                      >
                        <History className="w-3 h-3 mr-1" />
                        Logs
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-red-400 hover:text-red-300 border-red-400/30 hover:border-red-400/50"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Roleta</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a roleta <strong>"{roleta.nome}"</strong>? Esta ação é irreversível. Todos os logs serão apagados e os leads serão desvinculados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                const success = await deleteRoleta(roleta.id);
                                if (success && expandedRoleta === roleta.id) {
                                  setExpandedRoleta(null);
                                }
                              }}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    {/* Membros */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-foreground">Membros da Fila</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary"
                          onClick={() => setAddMemberRoletaId(addMemberRoletaId === roleta.id ? null : roleta.id)}
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          Adicionar
                        </Button>
                      </div>

                      {addMemberRoletaId === roleta.id && (
                        <div className="flex gap-2 mb-3">
                          <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
                            <SelectTrigger className="flex-1 bg-[#141417] border-[#2a2a2e] text-sm">
                              <SelectValue placeholder="Selecione corretor..." />
                            </SelectTrigger>
                            <SelectContent>
                              {brokers
                                .filter(b => !(roleta.membros || []).some(m => m.corretor_id === b.id))
                                .map(b => (
                                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => handleAddMember(roleta.id)} className="bg-primary text-primary-foreground">
                            Adicionar
                          </Button>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        {(roleta.membros || []).filter(m => m.ativo).sort((a, b) => a.ordem - b.ordem).map((membro, idx) => {
                          const onlineMembros = (roleta.membros || []).filter(m => m.ativo && m.status_checkin).sort((a, b) => a.ordem - b.ordem);
                          const nextOnline = onlineMembros.find(m => m.ordem > roleta.ultimo_membro_ordem_atribuida) || onlineMembros[0];
                          const isNext = nextOnline?.id === membro.id && membro.status_checkin;

                          return (
                            <div key={membro.id} className={cn(
                              "flex items-center justify-between p-2 rounded-lg",
                              isNext && membro.status_checkin ? "bg-primary/10 border border-primary/30" : "bg-[#141417]"
                            )}>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground w-6">#{membro.ordem}</span>
                                <div className={cn("w-2 h-2 rounded-full", membro.status_checkin ? "bg-emerald-500" : "bg-slate-600")} />
                                <Avatar className="w-5 h-5">
                                  <AvatarFallback className="text-[9px] bg-slate-700">
                                    {membro.corretor?.name?.charAt(0) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-foreground">{membro.corretor?.name || "—"}</span>
                                {isNext && (
                                  <Badge className="text-[9px] bg-primary/20 text-primary border-primary/40">Próximo</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {membro.status_checkin && !isNext && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary hover:text-primary/80 p-1 h-auto"
                                    title="Definir como próximo"
                                    onClick={() => updateRoleta(roleta.id, { ultimo_membro_ordem_atribuida: membro.ordem - 1 } as any)}
                                  >
                                    <Target className="w-3 h-3" />
                                  </Button>
                                )}
                                {membro.status_checkin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-orange-400 hover:text-orange-300 p-1 h-auto"
                                    title="Forçar check-out"
                                    onClick={() => toggleCheckin(membro.id, false)}
                                  >
                                    <LogOut className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 p-1 h-auto"
                                  onClick={() => removeMembro(membro.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                        {(roleta.membros || []).filter(m => m.ativo).length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">Nenhum membro adicionado</p>
                        )}
                      </div>
                    </div>

                    {/* Empreendimentos */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-foreground">Empreendimentos</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary"
                          onClick={() => setAddEmpRoletaId(addEmpRoletaId === roleta.id ? null : roleta.id)}
                        >
                          <Building2 className="w-3 h-3 mr-1" />
                          Vincular
                        </Button>
                      </div>

                      {addEmpRoletaId === roleta.id && (
                        <div className="flex gap-2 mb-3">
                          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            <SelectTrigger className="flex-1 bg-[#141417] border-[#2a2a2e] text-sm">
                              <SelectValue placeholder="Selecione empreendimento..." />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.city})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => handleAddEmpreendimento(roleta.id)} className="bg-primary text-primary-foreground">
                            Vincular
                          </Button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {emps.map(emp => (
                          <div key={emp.id} className="flex items-center gap-1.5 px-2 py-1 bg-[#141417] rounded-lg text-xs">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <span className="text-foreground">{emp.empreendimento?.name || "—"}</span>
                            <button onClick={() => removeEmpreendimento(emp.id)} className="text-red-400 hover:text-red-300 ml-1">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {emps.length === 0 && (
                          <p className="text-xs text-muted-foreground">Nenhum empreendimento vinculado</p>
                        )}
                      </div>
                    </div>

                    {/* Logs */}
                    {showLogsFor === roleta.id && (
                      <RoletaLogsSection roletaId={roleta.id} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

function RoletaLogsSection({ roletaId }: { roletaId: string }) {
  const { logs, isLoading } = useRoletaLogs(roletaId);

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Carregando logs...</p>;
  }

  if (logs.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum log registrado.</p>;
  }

  const acaoLabels: Record<string, string> = {
    atribuicao_inicial: "Atribuição inicial",
    fallback_lider: "Fallback para líder",
    timeout_reassinado: "Timeout - Reassinado",
    timeout_fallback_lider: "Timeout - Fallback líder",
    transferencia_manual: "Transferência manual",
    forcar_redistribuicao: "Redistribuição forçada",
    checkin: "Check-in",
    checkout: "Check-out",
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-foreground mb-2">
        <History className="w-3 h-3 inline mr-1" />
        Histórico de Distribuição
      </h4>
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {logs.map(log => (
          <div key={log.id} className="flex items-start gap-2 p-2 bg-[#141417] rounded-lg text-xs">
            <span className="text-muted-foreground shrink-0">
              {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
            <div className="flex-1">
              <span className="font-medium text-foreground">{acaoLabels[log.acao] || log.acao}</span>
              {log.lead && <span className="text-muted-foreground"> — {log.lead.name}</span>}
              {log.de_corretor && <span className="text-red-400"> de {log.de_corretor.name}</span>}
              {log.para_corretor && <span className="text-emerald-400"> → {log.para_corretor.name}</span>}
              {log.motivo && <p className="text-muted-foreground mt-0.5">{log.motivo}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoletaManagement;
