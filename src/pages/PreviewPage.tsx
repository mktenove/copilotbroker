import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LandingPageRenderer, buildDefault } from "@/pages/LandingPage";
import { Project, LandingPageData } from "@/types/project";

export default function PreviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [lp, setLp] = useState<LandingPageData | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [broker, setBroker] = useState<{ id: string; name: string; slug: string; whatsapp?: string | null } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const { data: proj } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
      if (!proj) return;
      setProject(proj as Project);
      setLp((proj as any).landing_page_data ?? buildDefault(proj as Project));

      const { data: bp } = await (supabase.from("broker_projects" as any)
        .select("broker:brokers(id, name, slug, whatsapp)")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle());
      if (bp?.broker) setBroker(bp.broker as any);
    })();
  }, [projectId]);

  if (!lp || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f12]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return <LandingPageRenderer lp={lp} project={project} broker={broker} />;
}
