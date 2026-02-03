import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, RefreshCw, Copy, Check, Clock, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { WhatsAppInput, isValidBrazilianWhatsApp } from "@/components/ui/whatsapp-input";
import { Checkbox } from "@/components/ui/checkbox";
import { BrokerActivitySheet } from "./BrokerActivitySheet";
import { useBrokersLastAccess } from "@/hooks/use-broker-activity";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  created_at: string;
  projects?: Project[];
}

interface BrokerFormData {
  name: string;
  email: string;
  whatsapp: string;
  password: string;
}

const BrokerManagement = () => {
  const [brokers, setBrokers] = useState<Broker[]>([]);
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
  });
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [selectedBrokerForHistory, setSelectedBrokerForHistory] = useState<Broker | null>(null);
  
  const { lastAccessMap, leadsCountMap, fetchLastAccess } = useBrokersLastAccess();

  useEffect(() => {
    fetchBrokers();
    fetchProjects();
  }, []);

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
      // Fetch brokers
      const { data: brokersData, error: brokersError } = await (supabase
        .from("brokers" as any)
        .select("*")
        .order("name", { ascending: true }) as any);

      if (brokersError) throw brokersError;

      // Fetch broker_projects to get project associations
      const { data: brokerProjectsData } = await supabase
        .from("broker_projects")
        .select("broker_id, project:projects(id, name, city)")
        .eq("is_active", true);

      // Map projects to brokers
      const brokersWithProjects = (brokersData || []).map((broker: Broker) => {
        const brokerProjects = (brokerProjectsData || [])
          .filter((bp: any) => bp.broker_id === broker.id)
          .map((bp: any) => bp.project)
          .filter((p: Project | null): p is Project => p !== null);
        
        return { ...broker, projects: brokerProjects };
      });

      setBrokers(brokersWithProjects as Broker[]);
      
      // Buscar último acesso e contagem de leads
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
      });
      
      // Fetch associated projects for this broker
      const { data } = await supabase
        .from("broker_projects")
        .select("project_id")
        .eq("broker_id", broker.id)
        .eq("is_active", true);
      
      setSelectedProjects(data?.map(bp => bp.project_id) || []);
    } else {
      setEditingBroker(null);
      setFormData({ name: "", email: "", whatsapp: "", password: "" });
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
    // Remove all existing associations
    await supabase
      .from("broker_projects")
      .delete()
      .eq("broker_id", brokerId);
    
    // Insert new associations
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

    // Validate WhatsApp if provided
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
        // Atualizar corretor existente
        const { error } = await (supabase
          .from("brokers" as any)
          .update({
            name: formData.name.trim(),
            whatsapp: formData.whatsapp.trim() || null,
          })
          .eq("id", editingBroker.id) as any);

        if (error) throw error;

        // Sincronizar projetos
        await syncBrokerProjects(editingBroker.id, selectedProjects);

        toast.success("Corretor atualizado com sucesso!");
      } else {
        // Criar novo usuário no Auth
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

        // Criar registro na tabela brokers
        const { error: brokerError } = await (supabase
          .from("brokers" as any)
          .insert({
            user_id: userId,
            name: formData.name.trim(),
            slug,
            email: formData.email.trim(),
            whatsapp: formData.whatsapp.trim() || null,
          }) as any);

        if (brokerError) throw brokerError;

        // Criar role do corretor
        const { error: roleError } = await (supabase
          .from("user_roles" as any)
          .insert({
            user_id: userId,
            role: "broker",
          }) as any);

        if (roleError) throw roleError;

        // Buscar o broker recém criado para obter o ID
        const { data: newBroker } = await (supabase
          .from("brokers" as any)
          .select("id")
          .eq("user_id", userId)
          .single() as any);

        // Sincronizar projetos
        if (newBroker && selectedProjects.length > 0) {
          await syncBrokerProjects(newBroker.id, selectedProjects);
        }

        toast.success(`Corretor criado! URL: /estanciavelha/${slug}`);
      }

      setIsDialogOpen(false);
      setEditingBroker(null);
      setFormData({ name: "", email: "", whatsapp: "", password: "" });
      setSelectedProjects([]);
      fetchBrokers();
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
    const url = `${window.location.origin}/estanciavelha/${slug}`;
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

  // Cores para avatares baseadas no nome
  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-blue-500 to-purple-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-pink-500 to-rose-600',
      'from-indigo-500 to-blue-600',
      'from-amber-500 to-orange-600',
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  // Barra de progresso baseada em leads
  const getProgressPercentage = (leads: number): number => {
    if (leads === 0) return 5;
    if (leads <= 5) return 20;
    if (leads <= 10) return 40;
    if (leads <= 20) return 60;
    if (leads <= 50) return 80;
    return 100;
  };

  const activeCount = brokers.filter(b => b.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Corretores</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} corretor{activeCount !== 1 ? 'es' : ''} ativo{activeCount !== 1 ? 's' : ''} de {brokers.length} total
          </p>
        </div>
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
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
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

              {/* Seleção de Empreendimentos */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Empreendimentos
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-3 bg-background">
                  {projects.length > 0 ? (
                    projects.map(project => (
                      <label key={project.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
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
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione os empreendimentos que este corretor pode vender
                </p>
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

      {/* Grid de Cards Estilo Kanban */}
      {brokers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Nenhum corretor cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {brokers.map((broker) => {
            const lastAccess = lastAccessMap[broker.id];
            const leadsCount = leadsCountMap[broker.id] || 0;
            
            return (
              <div
                key={broker.id}
                onClick={() => setSelectedBrokerForHistory(broker)}
                className={cn(
                  "relative rounded-xl cursor-pointer",
                  "bg-[#1e1e22] border border-[#2a2a2e]",
                  "hover:border-primary/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)]",
                  "transition-all duration-200 ease-out",
                  "group overflow-hidden",
                  !broker.is_active && "ring-2 ring-red-400/50"
                )}
              >
                <div className="p-3">
                  {/* Row 1: Status + Data de cadastro */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border",
                      broker.is_active
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-red-500/20 text-red-400 border-red-500/40"
                    )}>
                      {broker.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {format(new Date(broker.created_at), "dd/MM HH:mm")}
                    </span>
                  </div>

                  {/* Row 2: Nome */}
                  <h4 className="font-semibold text-white text-sm leading-snug line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                    {broker.name}
                  </h4>

                  {/* Row 3: Email */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                    <Mail className="w-3 h-3 text-slate-500" />
                    <span className="truncate">{broker.email}</span>
                  </div>

                  {/* Row 4: Barra de progresso */}
                  <div className="mb-3">
                    <div className="h-1 w-full bg-slate-700/50 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          broker.is_active ? "bg-primary" : "bg-red-500"
                        )}
                        style={{ width: `${getProgressPercentage(leadsCount)}%` }}
                      />
                    </div>
                  </div>

                  {/* Row 5: Projetos */}
                  <div className="flex flex-wrap gap-1.5 mb-3 min-h-[22px]">
                    {broker.projects?.slice(0, 2).map(project => (
                      <span key={project.id} className="px-2 py-0.5 text-[10px] rounded-md bg-[#2a2a2e] text-slate-300 border border-[#3a3a3e]">
                        {project.name}
                      </span>
                    ))}
                    {(broker.projects?.length || 0) > 2 && (
                      <span className="px-2 py-0.5 text-[10px] rounded-md bg-[#2a2a2e] text-slate-400">
                        +{broker.projects!.length - 2}
                      </span>
                    )}
                    {(!broker.projects || broker.projects.length === 0) && (
                      <span className="text-[10px] text-slate-500">Nenhum projeto</span>
                    )}
                  </div>

                  {/* Row 6: Ações */}
                  <div className="flex items-center gap-1 mb-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); copyLink(broker.slug); }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 min-h-[40px] md:min-h-0 md:py-1.5",
                        "bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg",
                        "font-medium text-xs transition-all"
                      )}
                    >
                      {copiedSlug === broker.slug ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSlug === broker.slug ? 'Copiado!' : 'Link'}</span>
                    </button>
                    
                    <div className="flex-1" />
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenDialog(broker); }}
                      className="p-2 md:p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-700/50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    </button>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteBroker(broker); }}
                      className="p-2 md:p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    </button>
                  </div>

                  {/* Row 7: Footer com métricas */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-5 h-5 border border-[#2a2a2e]">
                        <AvatarFallback className={cn("text-white text-[9px] font-medium bg-gradient-to-br", getAvatarGradient(broker.name))}>
                          {broker.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-slate-600">•</span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{lastAccess ? formatDistanceToNow(new Date(lastAccess), { addSuffix: false, locale: ptBR }) : '—'}</span>
                      </div>
                    </div>
                    
                    <span className="text-[10px] text-slate-400 font-medium">
                      {leadsCount} lead{leadsCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sheet de Histórico do Corretor */}
      <BrokerActivitySheet
        broker={selectedBrokerForHistory}
        isOpen={!!selectedBrokerForHistory}
        onClose={() => setSelectedBrokerForHistory(null)}
      />
    </div>
  );
};

export default BrokerManagement;
