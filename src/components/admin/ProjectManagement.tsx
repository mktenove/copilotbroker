import { useState } from "react";
import { useProjects, useProjectStats } from "@/hooks/use-projects";
import { Project, PROJECT_STATUS_CONFIG, ProjectStatus } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  MapPin,
  Users,
  ExternalLink,
  Pencil,
  RefreshCw,
} from "lucide-react";

function ProjectStatsCard({ projectId }: { projectId: string }) {
  const { stats, isLoading } = useProjectStats(projectId);
  
  if (isLoading) return <span className="text-slate-500">...</span>;
  
  return (
    <span className="text-sm text-slate-400">
      {stats.totalLeads} leads ({stats.todayLeads} hoje)
    </span>
  );
}

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

export default function ProjectManagement() {
  const { projects, isLoading, fetchProjects, createProject, updateProject, toggleProjectStatus } = useProjects();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);

  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        slug: project.slug,
        city: project.city,
        city_slug: project.city_slug || "",
        description: project.description || "",
        status: project.status,
        hero_title: project.hero_title || "",
        hero_subtitle: project.hero_subtitle || "",
        webhook_url: project.webhook_url || "",
      });
    } else {
      setEditingProject(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug || !formData.city || !formData.city_slug) {
      return;
    }

    const projectData = {
      name: formData.name.trim(),
      slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      city: formData.city.trim(),
      city_slug: formData.city_slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      description: formData.description.trim() || null,
      status: formData.status,
      hero_title: formData.hero_title.trim() || null,
      hero_subtitle: formData.hero_subtitle.trim() || null,
      webhook_url: formData.webhook_url.trim() || null,
    };

    if (editingProject) {
      await updateProject(editingProject.id, projectData);
    } else {
      await createProject(projectData);
    }

    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingProject(null);
  };

  const handleSlugChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      slug: value.toLowerCase().replace(/[^a-z0-9-]/g, "")
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Empreendimentos</h2>
          <p className="text-slate-400">
            Gerencie os empreendimentos e suas landing pages
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => fetchProjects(true)}
            className="bg-[#1e1e22] border-[#2a2a2e] hover:bg-[#2a2a2e] text-slate-400"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-[#FFFF00] text-black hover:brightness-110">
                <Plus className="h-4 w-4 mr-2" />
                Novo Empreendimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProject ? "Editar Empreendimento" : "Novo Empreendimento"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Empreendimento *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Residencial Alto da Serra"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Portão"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city_slug">Slug da Cidade (URL) *</Label>
                      <Input
                        id="city_slug"
                        value={formData.city_slug}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          city_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") 
                        }))}
                        placeholder="portao"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="slug">Slug do Projeto (URL) *</Label>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="goldenview"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: ProjectStatus) => 
                          setFormData(prev => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PROJECT_STATUS_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    URL: /{formData.city_slug || "cidade"}/{formData.slug || "projeto"}
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição curta do empreendimento..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hero_title">Título do Hero</Label>
                    <Input
                      id="hero_title"
                      value={formData.hero_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, hero_title: e.target.value }))}
                      placeholder="Seu Futuro Endereço de Alto Padrão"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hero_subtitle">Subtítulo do Hero</Label>
                    <Input
                      id="hero_subtitle"
                      value={formData.hero_subtitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                      placeholder="Terrenos a partir de 500m²"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webhook_url">Webhook URL (opcional)</Label>
                    <Input
                      id="webhook_url"
                      type="url"
                      value={formData.webhook_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                      placeholder="https://webhook.example.com/..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Webhook específico para este empreendimento
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingProject ? "Salvar Alterações" : "Criar Empreendimento"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-[#FFFF00]" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-[#1e1e22] border border-[#2a2a2e] rounded-xl">
          <div className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-slate-500 mb-4" />
            <p className="text-slate-400">Nenhum empreendimento cadastrado</p>
            <Button 
              variant="outline" 
              className="mt-4 bg-[#1e1e22] border-[#2a2a2e] hover:bg-[#2a2a2e] text-white"
              onClick={() => handleOpenDialog()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro empreendimento
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const statusConfig = PROJECT_STATUS_CONFIG[project.status];
            return (
              <div 
                key={project.id} 
                className={`relative bg-[#1e1e22] border border-[#2a2a2e] rounded-xl overflow-hidden ${!project.is_active ? 'opacity-60' : ''}`}
              >
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                      <p className="flex items-center gap-1 text-slate-400 text-sm">
                        <MapPin className="h-3 w-3" />
                        {project.city}
                      </p>
                    </div>
                    <span 
                      className={`px-2 py-0.5 text-xs rounded-full border ${statusConfig.bgColor} ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
                <div className="px-4 pb-4 space-y-4">
                  {project.description && (
                    <p className="text-sm text-slate-400 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-slate-500" />
                    <ProjectStatsCard projectId={project.id} />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2e]">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={project.is_active}
                        onCheckedChange={(checked) => toggleProjectStatus(project.id, checked)}
                      />
                      <span className="text-sm text-slate-400">
                        {project.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(project)}
                        className="hover:bg-[#2a2a2e] text-slate-400"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="hover:bg-[#2a2a2e] text-slate-400"
                      >
                        <a 
                          href={`/${project.city_slug}/${project.slug}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
