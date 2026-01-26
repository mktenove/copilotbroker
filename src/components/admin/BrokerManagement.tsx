import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, ExternalLink, RefreshCw, Copy, Check } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

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
        .order("created_at", { ascending: false }) as any);

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
        <RefreshCw className="w-8 h-8 animate-spin text-[#FFFF00] mx-auto mb-4" />
        <p className="text-slate-400">Carregando corretores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de adicionar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Corretores</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button
              onClick={() => handleOpenDialog()}
              className="flex items-center gap-2 px-4 py-2 bg-[#FFFF00] text-black font-medium rounded-lg hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" />
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0f0f12] border border-[#2a2a2e] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FFFF00]/50"
                  placeholder="Nome do corretor"
                />
                {!editingBroker && formData.name && (
                  <p className="mt-1 text-xs text-slate-500">
                    URL: /estanciavelha/{generateSlug(formData.name)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0f0f12] border border-[#2a2a2e] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FFFF00]/50 disabled:opacity-50"
                  placeholder="email@exemplo.com"
                  disabled={!!editingBroker}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Empreendimentos
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-[#2a2a2e] rounded-lg p-3 bg-[#0f0f12]">
                  {projects.length > 0 ? (
                    projects.map(project => (
                      <label key={project.id} className="flex items-center gap-2 cursor-pointer hover:bg-[#1e1e22] p-1 rounded">
                        <Checkbox
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={() => toggleProject(project.id)}
                        />
                        <span className="text-sm text-white">{project.name}</span>
                        <span className="text-xs text-slate-500">({project.city})</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Nenhum projeto disponível</p>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Selecione os empreendimentos que este corretor pode vender
                </p>
              </div>

              {!editingBroker && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0f0f12] border border-[#2a2a2e] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FFFF00]/50"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="flex-1 px-4 py-3 border border-[#2a2a2e] rounded-lg text-white hover:bg-[#1e1e22] transition-colors"
                  >
                    Cancelar
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-[#FFFF00] text-black font-medium rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de corretores */}
      {brokers.length === 0 ? (
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl p-12 text-center">
          <p className="text-slate-400">Nenhum corretor cadastrado ainda.</p>
        </div>
      ) : (
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1e1e22] border-b border-[#2a2a2e]">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Nome</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Projetos</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Link</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2e]">
                {brokers.map((broker) => (
                  <tr key={broker.id} className="hover:bg-[#1e1e22] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-white">{broker.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-400">{broker.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {broker.projects && broker.projects.length > 0 ? (
                          broker.projects.map(project => (
                            <span key={project.id} className="px-2 py-0.5 text-xs rounded-full bg-[#2a2a2e] text-slate-300 border border-[#3a3a3e]">
                              {project.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">Nenhum</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleBrokerStatus(broker)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          broker.is_active
                            ? "bg-[#FFFF00]/10 text-[#FFFF00] hover:bg-[#FFFF00]/20"
                            : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        }`}
                      >
                        {broker.is_active ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-[#0f0f12] px-2 py-1 rounded text-slate-300">/estanciavelha/{broker.slug}</code>
                        <button
                          onClick={() => copyLink(broker.slug)}
                          className="p-1 hover:bg-[#2a2a2e] rounded transition-colors"
                          title="Copiar link"
                        >
                          {copiedSlug === broker.slug ? (
                            <Check className="w-4 h-4 text-[#FFFF00]" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                        <a
                          href={`/estanciavelha/${broker.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-[#2a2a2e] rounded transition-colors"
                          title="Abrir página"
                        >
                          <ExternalLink className="w-4 h-4 text-slate-500" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDialog(broker)}
                          className="p-2 hover:bg-[#2a2a2e] rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => deleteBroker(broker)}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerManagement;
