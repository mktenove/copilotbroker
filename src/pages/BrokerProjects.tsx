import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { useBrokerProjects } from "@/hooks/use-broker-projects";
import { useTenant } from "@/contexts/TenantContext";
import { ProjectStatus, PROJECT_STATUS_CONFIG } from "@/types/project";
import { toast } from "sonner";
import {
  Building2,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Plus,
  Link as LinkIcon,
  RefreshCw,
  ArrowLeft,
  Save,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { BrokerLayout } from "@/components/broker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectFormData {
  name: string;
  slug: string;
  city: string;
  city_slug: string;
  description: string;
  status: ProjectStatus;
  hero_title: string;
  hero_subtitle: string;
  webhook_url: string;
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

const initialFormData: ProjectFormData = {
  name: "",
  slug: "",
  city: "",
  city_slug: "",
  description: "",
  status: "pre_launch",
  hero_title: "",
  hero_subtitle: "",
  webhook_url: "",
};

const BrokerProjects = () => {
  const navigate = useNavigate();
  const { role, brokerId, isLoading: isRoleLoading } = useUserRole();
  const { tenantId } = useTenant();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssociateDialogOpen, setIsAssociateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [editingSlug, setEditingSlug] = useState("");
  const [isSlugEditing, setIsSlugEditing] = useState(false);
  const [projectToRemove, setProjectToRemove] = useState<string | null>(null);

  const {
    broker,
    brokerProjects,
    unassociatedProjects,
    isLoading,
    isSaving,
    addProject,
    createAndAddProject,
    removeProject,
    updateSlug,
    pendingCount,
  } = useBrokerProjects(brokerId);

  // Auth check
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Redirect based on role
  useEffect(() => {
    if (!isRoleLoading && role === "admin") {
      navigate("/admin");
    }
    if (!isRoleLoading && role !== "broker") {
      navigate("/auth");
    }
  }, [role, isRoleLoading, navigate]);

  // Set editing slug when broker loads
  useEffect(() => {
    if (broker?.slug) {
      setEditingSlug(broker.slug);
    }
  }, [broker?.slug]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  const copyUrl = async (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(url);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const copyAllUrls = async () => {
    const allUrls = brokerProjects
      .map((bp) => `${bp.project.name}: ${window.location.origin}${bp.url}`)
      .join("\n");
    await navigator.clipboard.writeText(allUrls);
    toast.success("Todos os links copiados!");
  };

  const openLanding = (url: string) => {
    window.open(url, "_blank");
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug || !formData.city || !formData.city_slug) return;
    if (!tenantId) {
      toast.error("Tenant não identificado.");
      return;
    }

    const projectData = {
      name: formData.name.trim(),
      slug: toSlug(formData.slug),
      city: formData.city.trim(),
      city_slug: toSlug(formData.city_slug),
      description: formData.description.trim() || null,
      status: formData.status,
      hero_title: formData.hero_title.trim() || null,
      hero_subtitle: formData.hero_subtitle.trim() || null,
      webhook_url: formData.webhook_url.trim() || null,
      tenant_id: tenantId,
    };

    const success = await createAndAddProject(projectData);
    if (success) {
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
    }
  };

  const handleAddProjects = async () => {
    for (const projectId of selectedProjectIds) {
      await addProject(projectId);
    }
    setSelectedProjectIds([]);
    setIsAssociateDialogOpen(false);
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleRemoveProject = async () => {
    if (!projectToRemove) return;
    await removeProject(projectToRemove);
    setProjectToRemove(null);
  };

  const handleSaveSlug = async () => {
    if (editingSlug === broker?.slug) {
      setIsSlugEditing(false);
      return;
    }

    const slugFormatted = editingSlug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    const success = await updateSlug(slugFormatted);
    if (success) {
      setIsSlugEditing(false);
      setEditingSlug(slugFormatted);
    }
  };

  const brokerInitial = broker?.name?.charAt(0).toUpperCase() || "C";

  if (isRoleLoading || isLoading) {
    return (
    <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "broker") {
    return null;
  }

  return (
    <BrokerLayout
      brokerName={broker?.name}
      brokerInitial={brokerInitial}
      viewMode={viewMode}
      onViewChange={setViewMode}
      onLogout={handleLogout}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/corretor/admin")}
            className="p-2 rounded-lg hover:bg-[#2a2a2e] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Meus Empreendimentos</h1>
            <p className="text-sm text-muted-foreground">
              {brokerProjects.length} {brokerProjects.length === 1 ? 'ativo' : 'ativos'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {brokerProjects.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAllUrls}
              className="text-xs bg-[#1e1e22] border border-[#2a2a2e] hover:bg-[#2a2a2e]"
            >
              <ClipboardList className="w-4 h-4 mr-1" />
              Copiar todos
            </Button>
          )}

          <Button size="sm" className="text-xs bg-[#FFFF00] text-black hover:brightness-110" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Novo Empreendimento
          </Button>
        </div>
      </div>

      {/* Pending Projects Banner */}
      {pendingCount > 0 && (
        <div className="bg-[#1e1e22] border border-yellow-500/30 rounded-lg p-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-yellow-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {pendingCount === 1 
                    ? "Novo empreendimento disponível!" 
                    : `${pendingCount} novos empreendimentos disponíveis!`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pendingCount === 1 
                    ? "Adicione à sua carteira e comece a captar leads" 
                    : "Adicione à sua carteira e amplie sua captação"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAssociateDialogOpen(true)}
              className="bg-[#FFFF00] hover:brightness-110 text-black shrink-0 text-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar agora
            </Button>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid gap-3 mb-6">
        {brokerProjects.length === 0 ? (
          <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-lg p-8 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Você ainda não está associado a nenhum empreendimento.
            </p>
            <Button className="bg-[#FFFF00] text-black hover:brightness-110" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Empreendimento
            </Button>
          </div>
        ) : (
          brokerProjects.map((bp) => (
            <div
              key={bp.id}
              className="bg-[#1e1e22] border border-[#2a2a2e] rounded-lg p-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate text-sm">
                      {bp.project.name}
                    </h3>
                    <span className="text-[10px] text-muted-foreground bg-[#2a2a2e] px-1.5 py-0.5 rounded shrink-0">
                      {bp.project.city}
                    </span>
                  </div>
                  <code className="text-[11px] text-muted-foreground/70 break-all block">
                    {window.location.origin}{bp.url}
                  </code>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyUrl(bp.url)}
                    className="p-1.5 rounded-md bg-[#2a2a2e]/50 text-muted-foreground hover:text-primary hover:bg-[#2a2a2e] transition-colors"
                    title="Copiar link"
                  >
                    {copiedUrl === bp.url ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => openLanding(bp.url)}
                    className="p-1.5 rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                    title="Abrir landing page"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setProjectToRemove(bp.id)}
                    disabled={isSaving}
                    className="p-1.5 rounded-md bg-[#2a2a2e]/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    title="Remover empreendimento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Slug Editor */}
      <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-lg p-3">
        <div className="flex items-center gap-2 mb-3">
          <LinkIcon className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Seu Link Personalizado</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Slug (usado em todos os links)
            </Label>
            <div className="flex gap-2">
              <Input
                value={editingSlug}
                onChange={(e) => {
                  setIsSlugEditing(true);
                  setEditingSlug(e.target.value);
                }}
                placeholder="seu-nome"
                className="bg-[#141417] border-[#2a2a2e]"
              />
              {isSlugEditing && (
                <Button
                  onClick={handleSaveSlug}
                  disabled={isSaving || !editingSlug.trim()}
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Este slug será usado em todos os seus links de empreendimentos.
            Alterar aqui atualizará automaticamente todos os links.
          </p>
        </div>
      </div>

      {/* Create New Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) setFormData(initialFormData); }}>
        <DialogContent className="bg-[#1e1e22] border-[#2a2a2e] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Empreendimento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Nome do Empreendimento *</Label>
              <Input
                id="proj-name"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = toSlug(name);
                  setFormData(prev => ({ ...prev, name, slug }));
                }}
                placeholder="Ex: Residencial Alto da Serra"
                className="bg-[#141417] border-[#2a2a2e]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proj-city">Cidade *</Label>
                <Input
                  id="proj-city"
                  value={formData.city}
                  onChange={(e) => {
                    const city = e.target.value;
                    const city_slug = toSlug(city);
                    setFormData(prev => ({ ...prev, city, city_slug }));
                  }}
                  placeholder="Portão"
                  className="bg-[#141417] border-[#2a2a2e]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: ProjectStatus) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="bg-[#141417] border-[#2a2a2e]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              URL: /{formData.city_slug || "cidade"}/{formData.slug || "empreendimento"}/{broker?.slug || "seu-slug"}
            </p>

            <div className="space-y-2">
              <Label htmlFor="proj-description">Descrição</Label>
              <Textarea
                id="proj-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição curta do empreendimento..."
                rows={2}
                className="bg-[#141417] border-[#2a2a2e]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-hero-title">Título do Hero</Label>
              <Input
                id="proj-hero-title"
                value={formData.hero_title}
                onChange={(e) => setFormData(prev => ({ ...prev, hero_title: e.target.value }))}
                placeholder="Seu Futuro Endereço de Alto Padrão"
                className="bg-[#141417] border-[#2a2a2e]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-hero-subtitle">Subtítulo do Hero</Label>
              <Input
                id="proj-hero-subtitle"
                value={formData.hero_subtitle}
                onChange={(e) => setFormData(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                placeholder="Terrenos a partir de 500m²"
                className="bg-[#141417] border-[#2a2a2e]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-webhook">Webhook URL (opcional)</Label>
              <Input
                id="proj-webhook"
                type="url"
                value={formData.webhook_url}
                onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                placeholder="https://webhook.example.com/..."
                className="bg-[#141417] border-[#2a2a2e]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => { setIsCreateDialogOpen(false); setFormData(initialFormData); }}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !formData.name || !formData.slug || !formData.city || !formData.city_slug}
                className="bg-[#FFFF00] text-black hover:brightness-110 disabled:opacity-40"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Criar Empreendimento"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Associate Existing Projects Dialog */}
      {unassociatedProjects.length > 0 && (
        <Dialog open={isAssociateDialogOpen} onOpenChange={setIsAssociateDialogOpen}>
          <DialogContent className="bg-[#1e1e22] border-[#2a2a2e]">
            <DialogHeader>
              <DialogTitle className="text-foreground">Adicionar Empreendimentos</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Selecione os empreendimentos que deseja trabalhar:
              </p>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {unassociatedProjects.map((project) => (
                  <label
                    key={project.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#141417] border border-[#2a2a2e] cursor-pointer hover:border-primary/30 transition-colors"
                  >
                    <Checkbox
                      checked={selectedProjectIds.includes(project.id)}
                      onCheckedChange={() => toggleProjectSelection(project.id)}
                    />
                    <div>
                      <p className="font-medium text-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.city}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => { setSelectedProjectIds([]); setIsAssociateDialogOpen(false); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddProjects}
                  disabled={selectedProjectIds.length === 0 || isSaving}
                  className="bg-[#FFFF00] text-black hover:brightness-110 disabled:opacity-40"
                >
                  {isSaving ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!projectToRemove} onOpenChange={() => setProjectToRemove(null)}>
        <AlertDialogContent className="bg-[#1e1e22] border-[#2a2a2e]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Remover Empreendimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este empreendimento? Você poderá adicioná-lo novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BrokerLayout>
  );
};

export default BrokerProjects;
