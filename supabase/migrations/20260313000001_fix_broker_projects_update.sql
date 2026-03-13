-- Allow brokers to update (deactivate) their own broker_projects associations
-- The existing FOR ALL policy fails WITH CHECK when setting is_active=false
-- because the new row no longer satisfies (is_active = true)

CREATE POLICY "broker_updates_own_associations"
ON public.broker_projects FOR UPDATE
USING (broker_id = get_my_broker_id() OR is_super_admin())
WITH CHECK (broker_id = get_my_broker_id() OR is_super_admin());
