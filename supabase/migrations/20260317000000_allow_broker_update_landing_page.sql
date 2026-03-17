-- Allow brokers to update landing_page_data and landing_page_status
-- on projects they are associated with via broker_projects.
-- This covers both standalone brokers and tenant brokers who are
-- not members of tenant_memberships (i.e. not covered by tenant_projects_update).

CREATE POLICY "broker_can_update_landing_page"
ON public.projects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.broker_projects bp
    JOIN public.brokers b ON b.id = bp.broker_id
    WHERE bp.project_id = projects.id
      AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.broker_projects bp
    JOIN public.brokers b ON b.id = bp.broker_id
    WHERE bp.project_id = projects.id
      AND b.user_id = auth.uid()
  )
);
