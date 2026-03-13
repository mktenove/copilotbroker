import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProjectStatus } from "@/types/project";

interface CreateProjectData {
  name: string;
  slug: string;
  city: string;
  city_slug: string;
  description?: string | null;
  status: ProjectStatus;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  webhook_url?: string | null;
  tenant_id?: string | null;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  city: string;
  city_slug: string | null;
}

interface BrokerProject {
  id: string;
  project: Project;
  url: string;
}

interface Broker {
  id: string;
  slug: string;
  name: string;
}

export function useBrokerProjects(brokerId?: string | null) {
  const [broker, setBroker] = useState<Broker | null>(null);
  const [brokerProjects, setBrokerProjects] = useState<BrokerProject[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch broker info
  const fetchBroker = useCallback(async () => {
    if (!brokerId) return;

    const { data, error } = await supabase
      .from("brokers")
      .select("id, slug, name")
      .eq("id", brokerId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching broker:", error);
      return;
    }

    setBroker(data);
  }, [brokerId]);

  // Fetch projects associated with the broker
  const fetchBrokerProjects = useCallback(async () => {
    if (!brokerId || !broker) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("broker_projects")
        .select(`
          id,
          project:projects(id, name, slug, city, city_slug)
        `)
        .eq("broker_id", brokerId)
        .eq("is_active", true);

      if (error) throw error;

      const projects = (data || [])
        .filter((bp: any) => bp.project)
        .map((bp: any) => ({
          id: bp.id,
          project: bp.project as Project,
          url: `/${bp.project.city_slug}/${bp.project.slug}/${broker.slug}`,
        }));

      setBrokerProjects(projects);
    } catch (error) {
      console.error("Error fetching broker projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [brokerId, broker]);

  // Fetch all available active projects
  const fetchAvailableProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, slug, city, city_slug")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching available projects:", error);
      return;
    }

    setAvailableProjects(data || []);
  }, []);

  // Add project to broker
  const addProject = async (projectId: string) => {
    if (!brokerId) return false;

    setIsSaving(true);
    try {
      // Check if already exists (might be inactive)
      const { data: existing } = await supabase
        .from("broker_projects")
        .select("id, is_active")
        .eq("broker_id", brokerId)
        .eq("project_id", projectId)
        .maybeSingle();

      if (existing) {
        if (existing.is_active) {
          toast.info("Este empreendimento já está associado.");
          return false;
        }

        // Reactivate
        const { error } = await supabase
          .from("broker_projects")
          .update({ is_active: true })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("broker_projects")
          .insert({
            broker_id: brokerId,
            project_id: projectId,
            is_active: true,
          });

        if (error) throw error;
      }

      toast.success("Empreendimento adicionado!");
      await fetchBrokerProjects();
      return true;
    } catch (error) {
      console.error("Error adding project:", error);
      toast.error("Erro ao adicionar empreendimento.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Create a new project and auto-associate with this broker (uses Edge Function to bypass RLS)
  const createAndAddProject = async (projectData: CreateProjectData) => {
    if (!brokerId) return false;

    setIsSaving(true);
    try {
      const res = await supabase.functions.invoke("create-broker-project", {
        body: {
          name: projectData.name,
          slug: projectData.slug,
          city: projectData.city,
          city_slug: projectData.city_slug,
          description: projectData.description || null,
          status: projectData.status,
          hero_title: projectData.hero_title || null,
          hero_subtitle: projectData.hero_subtitle || null,
          webhook_url: projectData.webhook_url || null,
          tenant_id: projectData.tenant_id || null,
        },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success("Empreendimento criado e adicionado!");
      await fetchBrokerProjects();
      await fetchAvailableProjects();
      return true;
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error(error?.message || String(error), { duration: 8000 });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Remove project from broker
  const removeProject = async (brokerProjectId: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("broker_projects")
        .update({ is_active: false })
        .eq("id", brokerProjectId);

      if (error) throw error;

      toast.success("Empreendimento removido!");
      await fetchBrokerProjects();
      return true;
    } catch (error) {
      console.error("Error removing project:", error);
      toast.error("Erro ao remover empreendimento.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Update broker slug
  const updateSlug = async (newSlug: string) => {
    if (!brokerId || !newSlug.trim()) return false;

    setIsSaving(true);
    try {
      // Check if slug is available
      const { data: existing } = await supabase
        .from("brokers")
        .select("id")
        .eq("slug", newSlug)
        .neq("id", brokerId)
        .maybeSingle();

      if (existing) {
        toast.error("Este link já está em uso por outro corretor.");
        return false;
      }

      const { error } = await supabase
        .from("brokers")
        .update({ slug: newSlug })
        .eq("id", brokerId);

      if (error) throw error;

      // Update local state
      setBroker((prev) => prev ? { ...prev, slug: newSlug } : null);
      
      // Refresh project URLs
      setBrokerProjects((prev) =>
        prev.map((bp) => ({
          ...bp,
          url: `/${bp.project.city_slug}/${bp.project.slug}/${newSlug}`,
        }))
      );

      toast.success("Link atualizado com sucesso!");
      return true;
    } catch (error) {
      console.error("Error updating slug:", error);
      toast.error("Erro ao atualizar link.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Check if a slug is available
  const checkSlugAvailability = async (slug: string) => {
    if (!slug.trim() || !brokerId) return false;

    const { data } = await supabase
      .from("brokers")
      .select("id")
      .eq("slug", slug)
      .neq("id", brokerId)
      .maybeSingle();

    return !data;
  };

  // Generate URL for a project
  const getProjectUrl = (project: Project) => {
    if (!broker) return "";
    return `/${project.city_slug}/${project.slug}/${broker.slug}`;
  };

  // Get projects not yet associated
  const unassociatedProjects = availableProjects.filter(
    (p) => !brokerProjects.some((bp) => bp.project.id === p.id)
  );

  useEffect(() => {
    fetchBroker();
    fetchAvailableProjects();
  }, [fetchBroker, fetchAvailableProjects]);

  useEffect(() => {
    if (broker) {
      fetchBrokerProjects();
    }
  }, [broker, fetchBrokerProjects]);

  return {
    broker,
    brokerProjects,
    availableProjects,
    unassociatedProjects,
    isLoading,
    isSaving,
    addProject,
    createAndAddProject,
    removeProject,
    updateSlug,
    checkSlugAvailability,
    getProjectUrl,
    refetch: fetchBrokerProjects,
    totalProjects: availableProjects.length,
    pendingCount: unassociatedProjects.length,
  };
}
