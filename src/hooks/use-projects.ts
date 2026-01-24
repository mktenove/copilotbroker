import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Project, ProjectStatus } from "@/types/project";
import { toast } from "sonner";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async (includeInactive = false) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProjects((data || []) as unknown as Project[]);
    } catch (error) {
      console.error("Erro ao buscar empreendimentos:", error);
      toast.error("Erro ao carregar empreendimentos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects(true); // Admin view includes inactive
  }, [fetchProjects]);

  const createProject = useCallback(async (projectData: Partial<Project>) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert(projectData as any)
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => [data as unknown as Project, ...prev]);
      toast.success("Empreendimento criado com sucesso!");
      return data as unknown as Project;
    } catch (error) {
      console.error("Erro ao criar empreendimento:", error);
      toast.error("Erro ao criar empreendimento.");
      return null;
    }
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);

      if (error) throw error;

      setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      ));
      toast.success("Empreendimento atualizado!");
      return true;
    } catch (error) {
      console.error("Erro ao atualizar empreendimento:", error);
      toast.error("Erro ao atualizar empreendimento.");
      return false;
    }
  }, []);

  const toggleProjectStatus = useCallback(async (id: string, isActive: boolean) => {
    return updateProject(id, { is_active: isActive });
  }, [updateProject]);

  const getProjectBySlug = useCallback(async (slug: string): Promise<Project | null> => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as Project | null;
    } catch (error) {
      console.error("Erro ao buscar empreendimento:", error);
      return null;
    }
  }, []);

  return {
    projects,
    isLoading,
    fetchProjects,
    createProject,
    updateProject,
    toggleProjectStatus,
    getProjectBySlug
  };
}

export function useProjectStats(projectId?: string) {
  const [stats, setStats] = useState({ totalLeads: 0, todayLeads: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!projectId) {
        setIsLoading(false);
        return;
      }

      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: totalLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId);

        const { count: todayLeads } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId)
          .gte("created_at", today.toISOString());

        setStats({
          totalLeads: totalLeads || 0,
          todayLeads: todayLeads || 0
        });
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [projectId]);

  return { stats, isLoading };
}
