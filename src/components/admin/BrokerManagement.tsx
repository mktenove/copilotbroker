import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InviteMemberModal } from "./InviteMemberModal";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, RefreshCw, Copy, Check, Clock, Mail, Crown, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppInput, isValidBrazilianWhatsApp } from "@/components/ui/whatsapp-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrokerActivitySheet } from "./BrokerActivitySheet";
import { useBrokersLastAccess } from "@/hooks/use-broker-activity";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import TeamView from "./TeamView";
import LeaderManagement from "./LeaderManagement";

interface Project {
  id: string;
  name: string;
  city: string;
}

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
  projects?: Project[];
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

interface RoletaMembro {
  roleta_id: string;
  corretor_id: string;
  ativo: boolean;
}

interface BrokerFormData {
  name: string;
  email: string;
  whatsapp: string;
  password: string;
  lider_id: string;
}

const BrokerManagement = () => {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [roletas, setRoletas] = useState<Roleta[]>([]);
  const [roletasMembros, setRoletasMembros] = useState<RoletaMembro[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [formData, setFormData] = useState<BrokerFormData>({
    name: "",
    email: "",
    whatsapp: "",
    password: "",
    lider_id: "",
  });
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [selectedBrokerForHistory, setSelectedBrokerForHistory] = useState<Broker | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  
  const { lastAccessMap, leadsCountMap, fetchLastAccess } = useBrokersLastAccess();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetchBrokers();
    fetchProjects();
    fetchLeaders();
    fetchRoletas();
  };

  const fetchLeaders = async () => {
    try {
      // Get user_ids with leader role
      const { data: rolesData, error: rolesError } = await (supabase
        .from("user_roles" as any)
        .select("user_id")
        .eq("role", "leader") as any);

      if (rolesError) throw rolesError;

      const leaderUserIds = (rolesData || []).map((r: { user_id: string }) => r.user_id);
      if (leaderUserIds.length === 0) {
        setLeaders([]);
        return;
      }

      // Get broker info for those users
      const { data: brokersData, error: brokersError } = await (supabase
        .from("brokers" as any)
        .select("id, name, user_id")
        .in("user_id", leaderUserIds) as any);

      if (brokersError) throw brokersError;
      setLeaders((brokersData || []) as Leader[]);
    } catch (error) {
      console.error("Erro ao buscar líderes:", error);
    }
  };

  const fetchRoletas = async () => {
    try {
      const { data, error } = await (supabase
        .from("roletas" as any)
        .select("id, nome, lider_id, ativa") as any);

      if (error) throw error;
      setRoletas((data || []) as Roleta[]);

      // Also fetch roletas_membros for the "Todos" tab badges
      const { data: membrosData } = await (supabase
        .from("roletas_membros" as any)
        .select("roleta_id, corretor_id, ativo")
        .eq("ativo", true) as any);

      setRoletasMembros((membrosData || []) as RoletaMembro[]);
    } catch (error) {
      console.error("Erro ao buscar roletas:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, city")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProjects((data || []) as Project[]);
    } catch (error) {
      console.error("Erro ao buscar projetos:", error);
    }
  };

  const fetchBrokers = async () => {
    setIsLoading(true);
    try {
      const { data: brokersData, error: brokersError } = await (supabase
        .from("brokers" as any)
        .select("*")
        .order("name", { ascending: true }) as any);

      if (brokersError) throw brokersError;

      const { data: brokerProjectsData } = await supabase
        .from("broker_projects")
        .select("broker_id, project:projects(id, name, city)")
        .eq("is_active", true);

      const brokersWithProjects = (brokersData || []).map((broker: Broker) => {
        const brokerProjects = (brokerProjectsData || [])
          .filter((bp: any) => bp.broker_id === broker.id)
          .map((bp: any) => bp.project)
          .filter((p: Project | null): p is Project => p !== null);
        
        return { ...broker, projects: brokerProjects };
      });

      setBrokers(brokersWithProjects as Broker[]);
      
      const brokerIds = (brokersWithProjects as Broker[]).map(b => b.id);
      if (brokerIds.length > 0) {
        fetchLastAccess(brokerIds);
      }
    } catch (error) {
      console.error("Erro ao buscar corretores:", error);
      toast.error("Erro ao carregar corretores.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleOpenDialog = async (broker?: Broker) => {
    if (broker) {
      setEditingBroker(broker);
      setFormData({
        name: broker.name,
        email: broker.email,
        whatsapp: broker.whatsapp || "",
        password: "",
        lider_id: broker.lider_id || "",
      });
      
      const { data } = await supabase
        .from("broker_projects")
        .select("project_id")
        .eq("broker_id", broker.id)
        .eq("is_active", true);
      
      setSelectedProjects(data?.map(bp => bp.project_id) || []);
    } else {
      setEditingBroker(null);
      setFormData({ name: "", email: "", whatsapp: "", password: "", lider_id: "" });
      setSelectedProjects([]);
    }
    setIsDialogOpen(true);
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const syncBrokerProjects = async (brokerId: string, projectIds: string[]) => {
    await supabase
      .from("broker_projects")
      .delete()
      .eq("broker_id", brokerId);
    
    if (projectIds.length > 0) {
      const { error } = await supabase
        .from("broker_projects")
        .insert(projectIds.map(projectId => ({
          broker_id: brokerId,
          project_id: projectId,
          is_active: true
        })));
      
      if (error) throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Nome e email são obrigatórios.");
      return;
    }

    if (formData.whatsapp && !isValidBrazilianWhatsApp(formData.whatsapp)) {
      toast.error("WhatsApp inválido. Use o formato completo com código do Brasil (+55).");
      return;
    }

    if (!editingBroker && !formData.password) {
      toast.error("Senha é obrigatória para novos corretores.");
      return;
    }

    if (!editingBroker && formData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingBroker) {
        const { error } = await (supabase
          .from("brokers" as any)
          .update({
            name: formData.name.trim(),
            whatsapp: formData.whatsapp.trim() || null,
            lider_id: formData.lider_id || null,
          })
          .eq("id", editingBroker.id) as any);

        if (error) throw error;

        await syncBrokerProjects(editingBroker.id, selectedProjects);
        toast.success("Corretor atualizado com sucesso!");
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Erro ao criar usuário");

        const userId = authData.user.id;
        const slug = generateSlug(formData.name);

        const { error: brokerError } = await (supabase
          .from("brokers" as any)
          .insert({
            user_id: userId,
            name: formData.name.trim(),
            slug,
            email: formData.email.trim(),
            whatsapp: formData.whatsapp.trim() || null,
            lider_id: formData.lider_id || null,
          }) as any);

        if (brokerError) throw brokerError;

        const { error: roleError } = await (supabase
          .from("user_roles" as any)
          .insert({
            user_id: userId,
            role: "broker",
          }) as any);

        if (roleError) throw roleError;

        const { data: newBroker } = await (supabase
          .from("brokers" as any)
          .select("id")
          .eq("user_id", userId)
          .single() as any);

        if (newBroker && selectedProjects.length > 0) {
          await syncBrokerProjects(newBroker.id, selectedProjects);
        }

        toast.success(`Corretor criado com sucesso!`);
      }

      setIsDialogOpen(false);
      setEditingBroker(null);
      setFormData({ name: "", email: "", whatsapp: "", password: "", lider_id: "" });
      setSelectedProjects([]);
      fetchAll();
    } catch (error: any) {
      console.error("Erro ao salvar corretor:", error);
      if (error.message?.includes("duplicate key")) {
        toast.error("Email ou slug já está em uso.");
      } else {
        toast.error(error.message || "Erro ao salvar corretor.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleBrokerStatus = async (broker: Broker) => {
    try {
      const { error } = await (supabase
        .from("brokers" as any)
        .update({ is_active: !broker.is_active })
        .eq("id", broker.id) as any);

      if (error) throw error;
      toast.success(broker.is_active ? "Corretor desativado." : "Corretor ativado.");
      fetchBrokers();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do corretor.");
    }
  };

  const deleteBroker = async (broker: Broker) => {
    if (!confirm(`Tem certeza que deseja excluir ${broker.name}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await (supabase
        .from("brokers" as any)
        .delete()
        .eq("id", broker.id) as any);

      if (error) throw error;
      toast.success("Corretor excluído com sucesso.");
      fetchBrokers();
    } catch (error) {
      console.error("Erro ao excluir corretor:", error);
      toast.error("Erro ao excluir corretor.");
    }
  };

  const copyLink = async (slug: string) => {
    const url = `${window.location.origin}/corretor/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando corretores...</p>
      </div>
    );
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

  const getProgressPercentage = (leads: number): number => {
    if (leads === 0) return 5;
    if (leads <= 5) return 20;
    if (leads <= 10) return 40;
    if (leads <= 20) return 60;
    if (leads <= 50) return 80;
    return 100;
  };

  const getLeaderName = (liderId: string | null) => {
    if (!liderId) return null;
    return leaders.find(l => l.id === liderId)?.name || null;
  };

  const getBrokerRoletas = (brokerId: string) => {
    const roletaIds = roletasMembros
      .filter(rm => rm.corretor_id === brokerId)
      .map(rm => rm.roleta_id);
    return roletas.filter(r => roletaIds.includes(r.id) && r.ativa);
  };

  const activeCount = brokers.filter(b => b.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Corretores</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} ativo{activeCount !== 1 ? 's' : ''} · {leaders.length} líder{leaders.length !== 1 ? 'es' : ''} · {brokers.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground font-semibold rounded-xl hover:brightness-110 transition-all border border-border"
          >
            <Users className="w-5 h-5" />
            Convidar Membro
          </button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button
                onClick={() => handleOpenDialog()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="w-5 h-5" />
                Novo Corretor
              </button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBroker ? "Editar Corretor" : "Novo Corretor"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#141417] border border-[#2a2a2e] rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Nome do corretor"
                />
                {!editingBroker && formData.name && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    URL: /estanciavelha/{generateSlug(formData.name)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-[#141417] border border-[#2a2a2e] rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  placeholder="email@exemplo.com"
                  disabled={!!editingBroker}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  WhatsApp
                </label>
                <WhatsAppInput
                  value={formData.whatsapp}
                  onChange={(value) => setFormData({ ...formData, whatsapp: value })}
                  className="w-full"
                />
              </div>

              {/* Leader select */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Líder da Equipe
                </label>
                <Select
                  value={formData.lider_id}
                  onValueChange={(value) => setFormData({ ...formData, lider_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="w-full h-11 bg-[#141417] border-[#2a2a2e]">
                    <SelectValue placeholder="Sem líder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem líder</SelectItem>
                    {leaders.map(leader => (
                      <SelectItem key={leader.id} value={leader.id}>
                        {leader.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Projects */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Empreendimentos
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-[#2a2a2e] rounded-lg p-3 bg-[#141417]">
                  {projects.length > 0 ? (
                    projects.map(project => (
                      <label key={project.id} className="flex items-center gap-2 cursor-pointer hover:bg-[#2a2a2e] p-1 rounded">
                        <Checkbox
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={() => toggleProject(project.id)}
                        />
                        <span className="text-sm text-foreground">{project.name}</span>
                        <span className="text-xs text-muted-foreground">({project.city})</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum projeto disponível</p>
                  )}
                </div>
              </div>

              {!editingBroker && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="equipes" className="w-full">
        <TabsList className="bg-card/50 border border-border">
          <TabsTrigger value="equipes" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Users className="w-3.5 h-3.5" />
            Equipes
          </TabsTrigger>
          <TabsTrigger value="todos" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            Todos os Corretores
          </TabsTrigger>
          <TabsTrigger value="lideres" className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Crown className="w-3.5 h-3.5" />
            Líderes
          </TabsTrigger>
        </TabsList>

        {/* Tab: Equipes */}
        <TabsContent value="equipes">
          <TeamView
            brokers={brokers}
            leaders={leaders}
            leadsCountMap={leadsCountMap}
            lastAccessMap={lastAccessMap}
            onRefresh={fetchAll}
          />
        </TabsContent>

        {/* Tab: Todos os Corretores */}
        <TabsContent value="todos">
          {brokers.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <p className="text-muted-foreground">Nenhum corretor cadastrado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {brokers.map((broker) => {
                const lastAccess = lastAccessMap[broker.id];
                const leadsCount = leadsCountMap[broker.id] || 0;
                const leaderName = getLeaderName(broker.lider_id);
                const brokerRoletas = getBrokerRoletas(broker.id);
                
                return (
                  <div
                    key={broker.id}
                    onClick={() => setSelectedBrokerForHistory(broker)}
                    className={cn(
                      "relative rounded-xl cursor-pointer",
                      "bg-card border border-border",
                      "hover:border-primary/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)]",
                      "transition-all duration-200 ease-out",
                      "group overflow-hidden",
                      !broker.is_active && "ring-2 ring-destructive/50"
                    )}
                  >
                    <div className="p-3">
                      {/* Row 1: Status + Leader badge + Date */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border",
                            broker.is_active
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-red-500/20 text-red-400 border-red-500/40"
                          )}>
                            {broker.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                          {leaderName && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 border-primary/30 text-primary">
                              <Crown className="w-2.5 h-2.5" />
                              {leaderName}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(new Date(broker.created_at), "dd/MM HH:mm")}
                        </span>
                      </div>

                      {/* Row 2: Name */}
                      <h4 className="font-semibold text-foreground text-sm leading-snug line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                        {broker.name}
                      </h4>

                      {/* Row 3: Email */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{broker.email}</span>
                      </div>

                      {/* Row 4: Progress bar */}
                      <div className="mb-3">
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              broker.is_active ? "bg-primary" : "bg-destructive"
                            )}
                            style={{ width: `${getProgressPercentage(leadsCount)}%` }}
                          />
                        </div>
                      </div>

                      {/* Row 5: Projects + Roleta badges */}
                      <div className="flex flex-wrap gap-1.5 mb-3 min-h-[22px]">
                        {broker.projects?.slice(0, 2).map(project => (
                          <span key={project.id} className="px-2 py-0.5 text-[10px] rounded-md bg-muted text-muted-foreground border border-border">
                            {project.name}
                          </span>
                        ))}
                        {(broker.projects?.length || 0) > 2 && (
                          <span className="px-2 py-0.5 text-[10px] rounded-md bg-muted text-muted-foreground">
                            +{broker.projects!.length - 2}
                          </span>
                        )}
                        {brokerRoletas.map(r => (
                          <Badge key={r.id} variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-accent/40 text-accent-foreground">
                            🎯 {r.nome}
                          </Badge>
                        ))}
                        {(!broker.projects || broker.projects.length === 0) && brokerRoletas.length === 0 && (
                          <span className="text-[10px] text-muted-foreground">Nenhum projeto</span>
                        )}
                      </div>

                      {/* Row 6: Actions */}
                      <div className="flex items-center gap-1 mb-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); copyLink(broker.slug); }}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 min-h-[40px] md:min-h-0 md:py-1.5",
                            "bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg",
                            "font-medium text-xs transition-all"
                          )}
                        >
                          {copiedSlug === broker.slug ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSlug === broker.slug ? 'Copiado!' : 'Link'}</span>
                        </button>
                        
                        <div className="flex-1" />
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenDialog(broker); }}
                          className="p-2 md:p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Edit2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </button>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteBroker(broker); }}
                          className="p-2 md:p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </button>
                      </div>

                      {/* Row 7: Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5 border border-border">
                            <AvatarFallback className={cn("text-white text-[9px] font-medium bg-gradient-to-br", getAvatarGradient(broker.name))}>
                              {broker.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-muted-foreground">•</span>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{lastAccess ? formatDistanceToNow(new Date(lastAccess), { addSuffix: false, locale: ptBR }) : '—'}</span>
                          </div>
                        </div>
                        
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {leadsCount} lead{leadsCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Líderes */}
        <TabsContent value="lideres">
          <LeaderManagement
            brokers={brokers}
            leaders={leaders}
            leadsCountMap={leadsCountMap}
            roletas={roletas}
            onRefresh={fetchAll}
          />
        </TabsContent>
      </Tabs>

      {/* Broker history sheet */}
      <BrokerActivitySheet
        broker={selectedBrokerForHistory}
        isOpen={!!selectedBrokerForHistory}
        onClose={() => setSelectedBrokerForHistory(null)}
      />
      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSuccess={fetchAll}
      />
    </div>
  );
};

export default BrokerManagement;
