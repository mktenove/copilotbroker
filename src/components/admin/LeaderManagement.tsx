import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Users, ShieldPlus, ShieldMinus, BarChart3, UserPlus, UserMinus, Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Broker {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  email: string;
  whatsapp: string | null;
  is_active: boolean;
  lider_id: string | null;
  nome_equipe: string | null;
  created_at: string;
}

interface Leader {
  id: string;
  name: string;
  user_id: string;
}

interface Roleta {
  id: string;
  nome: string;
  lider_id: string;
  ativa: boolean;
}

interface LeaderManagementProps {
  brokers: Broker[];
  leaders: Leader[];
  leadsCountMap: Record<string, number>;
  roletas: Roleta[];
  onRefresh: () => void;
}

const getAvatarGradient = (name: string) => {
  const gradients = [
    'from-blue-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-yellow-400 to-yellow-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
    'from-cyan-500 to-blue-600',
  ];
  return gradients[name.charCodeAt(0) % gradients.length];
};

const LeaderManagement = ({ brokers, leaders, leadsCountMap, roletas, onRefresh }: LeaderManagementProps) => {
  const [promotingBrokerId, setPromotingBrokerId] = useState<string>("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Promotion modal state
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [teamNameError, setTeamNameError] = useState("");

  // Manage members modal state
  const [managingLeader, setManagingLeader] = useState<Leader | null>(null);
  const [managingMembers, setManagingMembers] = useState<string[]>([]);

  // Edit team name modal state
  const [editingLeader, setEditingLeader] = useState<Leader | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamNameError, setEditTeamNameError] = useState("");

  const promotablebrokers = brokers.filter(b => !leaders.some(l => l.user_id === b.user_id));

  const openPromotionModal = () => {
    if (!promotingBrokerId) return;
    const broker = brokers.find(b => b.id === promotingBrokerId);
    if (!broker) return;

    // Pre-select brokers already assigned to this broker as leader
    const existingSubordinates = brokers
      .filter(b => b.lider_id === broker.id && b.id !== broker.id)
      .map(b => b.id);

    setSelectedMembers(existingSubordinates);
    setTeamName("");
    setTeamNameError("");
    setShowPromotionModal(true);
  };

  const confirmPromotion = async () => {
    if (!promotingBrokerId) return;
    const broker = brokers.find(b => b.id === promotingBrokerId);
    if (!broker) return;

    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setTeamNameError("Nome da equipe é obrigatório.");
      return;
    }

    // Check uniqueness against other brokers' nome_equipe
    const nameExists = brokers.some(
      b => b.nome_equipe?.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      setTeamNameError("Já existe uma equipe com este nome.");
      return;
    }

    setIsPromoting(true);
    try {
      // 1. Insert leader role
      const { error: roleError } = await (supabase
        .from("user_roles" as any)
        .insert({ user_id: broker.user_id, role: "leader" }) as any);

      if (roleError) {
        if (roleError.message?.includes("duplicate")) {
          toast.error("Este corretor já é líder.");
        } else {
          throw roleError;
        }
        return;
      }

      // 2. Save team name on the leader's broker record
      await (supabase
        .from("brokers" as any)
        .update({ nome_equipe: trimmedName })
        .eq("id", broker.id) as any);

      // 3. Assign selected members to the leader
      if (selectedMembers.length > 0) {
        await (supabase
          .from("brokers" as any)
          .update({ lider_id: broker.id })
          .in("id", selectedMembers) as any);
      }

      toast.success(`${broker.name} promovido a líder! Equipe "${trimmedName}" criada.`);
      setPromotingBrokerId("");
      setShowPromotionModal(false);
      onRefresh();
    } catch (error: any) {
      console.error("Erro ao promover:", error);
      toast.error("Erro ao promover corretor.");
    } finally {
      setIsPromoting(false);
    }
  };

  const removeLeader = async (leader: Leader) => {
    if (!confirm(`Remover ${leader.name} como líder? Os corretores da equipe ficarão sem líder.`)) return;

    setRemovingId(leader.id);
    try {
      const { error } = await (supabase
        .from("user_roles" as any)
        .delete()
        .eq("user_id", leader.user_id)
        .eq("role", "leader") as any);

      if (error) throw error;

      await (supabase
        .from("brokers" as any)
        .update({ lider_id: null })
        .eq("lider_id", leader.id) as any);

      toast.success(`${leader.name} removido como líder.`);
      onRefresh();
    } catch (error) {
      console.error("Erro ao remover líder:", error);
      toast.error("Erro ao remover líder.");
    } finally {
      setRemovingId(null);
    }
  };

  // Edit team name
  const openEditTeamName = (leader: Leader) => {
    const leaderBroker = brokers.find(b => b.user_id === leader.user_id);
    setEditTeamName(leaderBroker?.nome_equipe || "");
    setEditTeamNameError("");
    setEditingLeader(leader);
  };

  const saveTeamName = async () => {
    if (!editingLeader) return;
    const trimmed = editTeamName.trim();
    if (!trimmed) {
      setEditTeamNameError("Nome da equipe é obrigatório.");
      return;
    }
    const leaderBroker = brokers.find(b => b.user_id === editingLeader.user_id);
    const nameExists = brokers.some(
      b => b.nome_equipe?.toLowerCase() === trimmed.toLowerCase() && b.id !== leaderBroker?.id
    );
    if (nameExists) {
      setEditTeamNameError("Já existe uma equipe com este nome.");
      return;
    }
    try {
      const { error } = await (supabase
        .from("brokers" as any)
        .update({ nome_equipe: trimmed })
        .eq("id", leaderBroker?.id) as any);
      if (error) throw error;
      toast.success(`Nome da equipe atualizado para "${trimmed}".`);
      setEditingLeader(null);
      onRefresh();
    } catch (error) {
      console.error("Erro ao atualizar nome da equipe:", error);
      toast.error("Erro ao atualizar nome da equipe.");
    }
  };

  // Manage members
  const openManageMembers = (leader: Leader) => {
    const currentMembers = brokers
      .filter(b => b.lider_id === leader.id && b.id !== leader.id)
      .map(b => b.id);
    setManagingMembers(currentMembers);
    setManagingLeader(leader);
  };

  const saveMembers = async () => {
    if (!managingLeader) return;
    try {
      // Remove all current members from this leader
      await (supabase
        .from("brokers" as any)
        .update({ lider_id: null })
        .eq("lider_id", managingLeader.id) as any);

      // Assign selected members
      if (managingMembers.length > 0) {
        await (supabase
          .from("brokers" as any)
          .update({ lider_id: managingLeader.id })
          .in("id", managingMembers) as any);
      }

      toast.success("Membros da equipe atualizados!");
      setManagingLeader(null);
      onRefresh();
    } catch (error) {
      console.error("Erro ao atualizar membros:", error);
      toast.error("Erro ao atualizar membros.");
    }
  };

  const toggleMember = (brokerId: string) => {
    setSelectedMembers(prev =>
      prev.includes(brokerId)
        ? prev.filter(id => id !== brokerId)
        : [...prev, brokerId]
    );
  };

  const toggleManagingMember = (brokerId: string) => {
    setManagingMembers(prev =>
      prev.includes(brokerId)
        ? prev.filter(id => id !== brokerId)
        : [...prev, brokerId]
    );
  };

  // Available brokers for member selection (not leaders, not the broker being promoted)
  const availableMembersForPromotion = brokers.filter(
    b => b.id !== promotingBrokerId && !leaders.some(l => l.user_id === b.user_id)
  );

  const availableMembersForManaging = managingLeader
    ? brokers.filter(b => b.user_id !== managingLeader.user_id && !leaders.some(l => l.user_id === b.user_id && l.id !== managingLeader.id))
    : [];

  return (
    <div className="space-y-6">
      {/* Promote broker section */}
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <ShieldPlus className="w-4 h-4 text-primary" />
          Promover Corretor a Líder
        </h3>
        <div className="flex items-center gap-3">
          <Select value={promotingBrokerId} onValueChange={setPromotingBrokerId}>
            <SelectTrigger className="flex-1 h-9 text-sm">
              <SelectValue placeholder="Selecionar corretor..." />
            </SelectTrigger>
            <SelectContent>
              {promotablebrokers.map(broker => (
                <SelectItem key={broker.id} value={broker.id}>
                  {broker.name}
                </SelectItem>
              ))}
              {promotablebrokers.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Todos os corretores já são líderes
                </div>
              )}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={openPromotionModal}
            disabled={!promotingBrokerId || isPromoting}
            className="shrink-0"
          >
            Promover
          </Button>
        </div>
      </div>

      {/* Promotion Modal */}
      <Dialog open={showPromotionModal} onOpenChange={setShowPromotionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Nova Equipe
            </DialogTitle>
            <DialogDescription>
              Defina o nome da equipe e selecione os membros iniciais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="teamName">Nome da Equipe *</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => { setTeamName(e.target.value); setTeamNameError(""); }}
                placeholder="Ex: Sharks, Eagles, Alpha..."
                autoFocus
              />
              {teamNameError && (
                <p className="text-xs text-destructive">{teamNameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Membros da Equipe</Label>
              <p className="text-xs text-muted-foreground">Selecione os corretores que farão parte desta equipe.</p>
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                {availableMembersForPromotion.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum corretor disponível</p>
                ) : (
                  availableMembersForPromotion.map(broker => (
                    <label
                      key={broker.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedMembers.includes(broker.id)}
                        onCheckedChange={() => toggleMember(broker.id)}
                      />
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className={cn("text-white text-[9px] font-medium bg-gradient-to-br", getAvatarGradient(broker.name))}>
                          {broker.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">{broker.name}</span>
                      {!broker.is_active && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 ml-auto">Inativo</Badge>
                      )}
                    </label>
                  ))
                )}
              </div>
              {selectedMembers.length > 0 && (
                <p className="text-xs text-muted-foreground">{selectedMembers.length} membro{selectedMembers.length !== 1 ? 's' : ''} selecionado{selectedMembers.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromotionModal(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmPromotion} disabled={isPromoting}>
              {isPromoting ? "Criando..." : "Confirmar Promoção"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Modal */}
      <Dialog open={!!managingLeader} onOpenChange={(open) => !open && setManagingLeader(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Gerenciar Membros — {managingLeader?.name}
            </DialogTitle>
            <DialogDescription>
              Adicione ou remova corretores desta equipe.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
            {availableMembersForManaging.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum corretor disponível</p>
            ) : (
              availableMembersForManaging.map(broker => (
                <label
                  key={broker.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={managingMembers.includes(broker.id)}
                    onCheckedChange={() => toggleManagingMember(broker.id)}
                  />
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className={cn("text-white text-[9px] font-medium bg-gradient-to-br", getAvatarGradient(broker.name))}>
                      {broker.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">{broker.name}</span>
                </label>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManagingLeader(null)}>
              Cancelar
            </Button>
            <Button onClick={saveMembers}>
              Salvar Membros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Name Modal */}
      <Dialog open={!!editingLeader} onOpenChange={(open) => !open && setEditingLeader(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Editar Nome da Equipe
            </DialogTitle>
            <DialogDescription>
              Altere o nome da equipe de {editingLeader?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="editTeamName">Nome da Equipe *</Label>
            <Input
              id="editTeamName"
              value={editTeamName}
              onChange={(e) => { setEditTeamName(e.target.value); setEditTeamNameError(""); }}
              placeholder="Ex: Sharks, Eagles..."
              autoFocus
            />
            {editTeamNameError && (
              <p className="text-xs text-destructive">{editTeamNameError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLeader(null)}>Cancelar</Button>
            <Button onClick={saveTeamName}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leaders list */}
      {leaders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum líder cadastrado. Promova um corretor acima.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leaders.map(leader => {
            const teamMembers = brokers.filter(b => b.lider_id === leader.id);
            const teamLeads = teamMembers.reduce((sum, b) => sum + (leadsCountMap[b.id] || 0), 0);
            const leaderRoletas = roletas.filter(r => r.lider_id === leader.id);
            const leaderBroker = brokers.find(b => b.user_id === leader.user_id);
            const teamDisplayName = leaderBroker?.nome_equipe;

            return (
              <div
                key={leader.id}
                className="rounded-xl border border-border bg-card/50 p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 border-2 border-primary/30">
                    <AvatarFallback className={cn("text-white text-sm font-semibold bg-gradient-to-br", getAvatarGradient(leader.name))}>
                      {leader.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">{leader.name}</span>
                      <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
                    </div>
                    {teamDisplayName && (
                      <span className="text-xs font-medium text-primary/80">Equipe {teamDisplayName}</span>
                    )}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {teamMembers.length} corretor{teamMembers.length !== 1 ? 'es' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {teamLeads} leads
                      </span>
                    </div>

                    {leaderRoletas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {leaderRoletas.map(r => (
                          <Badge key={r.id} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            {r.nome}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => openEditTeamName(leader)}
                      title="Editar nome da equipe"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => openManageMembers(leader)}
                      title="Gerenciar membros"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeLeader(leader)}
                      disabled={removingId === leader.id}
                      title="Remover como líder"
                    >
                      <ShieldMinus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeaderManagement;
