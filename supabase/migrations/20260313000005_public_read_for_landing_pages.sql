-- Allow anonymous (unauthenticated) users to read active projects for public landing pages
CREATE POLICY "public_can_read_active_projects"
ON public.projects FOR SELECT
USING (is_active = true);

-- Allow anonymous users to read brokers (needed to resolve broker slug)
CREATE POLICY "public_can_read_brokers"
ON public.brokers FOR SELECT
USING (true);

-- Allow anonymous users to verify broker-project associations
CREATE POLICY "public_can_read_active_broker_projects"
ON public.broker_projects FOR SELECT
USING (is_active = true);
