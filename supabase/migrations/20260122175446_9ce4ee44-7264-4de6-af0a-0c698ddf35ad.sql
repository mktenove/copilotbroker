-- Allow authenticated users to insert their own broker profile
CREATE POLICY "Usuários podem criar seu próprio perfil de corretor"
ON public.brokers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow brokers to update their own profile
CREATE POLICY "Corretores podem atualizar seu próprio perfil"
ON public.brokers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to auto-assign broker role when a broker profile is created
CREATE OR REPLACE FUNCTION public.assign_broker_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user already has the broker role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.user_id AND role = 'broker'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'broker');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to call the function after a broker is inserted
CREATE TRIGGER on_broker_created
AFTER INSERT ON public.brokers
FOR EACH ROW
EXECUTE FUNCTION public.assign_broker_role();