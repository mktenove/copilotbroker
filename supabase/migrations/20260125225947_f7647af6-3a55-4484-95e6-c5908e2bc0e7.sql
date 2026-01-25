-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('new_lead', 'stale_lead', 'status_change')),
  title text NOT NULL,
  message text NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (via triggers/functions)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create notification for new lead
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
  broker_user_id uuid;
  lead_name text;
  project_name text;
BEGIN
  -- Get lead name
  lead_name := NEW.name;
  
  -- Get project name if exists
  IF NEW.project_id IS NOT NULL THEN
    SELECT name INTO project_name FROM projects WHERE id = NEW.project_id;
  END IF;
  
  -- Notify all admins
  FOR admin_user_id IN 
    SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, lead_id)
    VALUES (
      admin_user_id,
      'new_lead',
      'Novo Lead Recebido',
      COALESCE('Lead ' || lead_name || ' registrado em ' || COALESCE(project_name, 'projeto não definido'), 'Novo lead recebido'),
      NEW.id
    );
  END LOOP;
  
  -- If lead has a broker, notify the broker too
  IF NEW.broker_id IS NOT NULL THEN
    SELECT user_id INTO broker_user_id FROM brokers WHERE id = NEW.broker_id;
    IF broker_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, lead_id)
      VALUES (
        broker_user_id,
        'new_lead',
        'Novo Lead Atribuído',
        COALESCE('Lead ' || lead_name || ' foi atribuído a você', 'Novo lead atribuído'),
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new lead notification
CREATE TRIGGER on_lead_insert_notify
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_lead();

-- Function to create notification for status change
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
  broker_user_id uuid;
  lead_name text;
  status_label text;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  lead_name := NEW.name;
  
  -- Map status to label
  CASE NEW.status
    WHEN 'registered' THEN status_label := 'Cadastrado';
    WHEN 'inactive' THEN status_label := 'Inativado';
    WHEN 'docs_received' THEN status_label := 'Docs Recebidos';
    WHEN 'info_sent' THEN status_label := 'Info Enviada';
    ELSE status_label := NEW.status;
  END CASE;
  
  -- Only notify for important status changes (registered, inactive)
  IF NEW.status IN ('registered', 'inactive') THEN
    -- Notify all admins
    FOR admin_user_id IN 
      SELECT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, type, title, message, lead_id)
      VALUES (
        admin_user_id,
        'status_change',
        'Lead ' || status_label,
        'O lead ' || lead_name || ' foi marcado como ' || status_label,
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for status change notification
CREATE TRIGGER on_lead_status_change_notify
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_status_change();