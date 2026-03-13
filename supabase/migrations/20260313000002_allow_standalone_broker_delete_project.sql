-- Allow standalone broker to delete their own projects
-- This frees up the slug when a project is removed

CREATE POLICY "standalone_broker_can_delete_project"
ON public.projects FOR DELETE
USING (
  tenant_id IS NULL
  AND is_standalone_broker()
  AND EXISTS (
    SELECT 1 FROM public.broker_projects bp
    JOIN public.brokers b ON b.id = bp.broker_id
    WHERE b.user_id = auth.uid()
      AND bp.project_id = projects.id
  )
);
