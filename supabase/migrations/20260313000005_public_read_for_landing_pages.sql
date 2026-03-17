-- Allow anonymous (unauthenticated) users to read active projects for public landing pages
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_can_read_active_projects' AND tablename = 'projects') THEN
    CREATE POLICY "public_can_read_active_projects" ON public.projects FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Allow anonymous users to read brokers (needed to resolve broker slug)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_can_read_brokers' AND tablename = 'brokers') THEN
    CREATE POLICY "public_can_read_brokers" ON public.brokers FOR SELECT USING (true);
  END IF;
END $$;

-- Allow anonymous users to verify broker-project associations
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_can_read_active_broker_projects' AND tablename = 'broker_projects') THEN
    CREATE POLICY "public_can_read_active_broker_projects" ON public.broker_projects FOR SELECT USING (is_active = true);
  END IF;
END $$;
