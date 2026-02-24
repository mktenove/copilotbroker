
-- =============================================
-- INBOX INTELIGENTE + COPILOTO IA
-- =============================================

-- 1. CONVERSATIONS TABLE
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id uuid NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  phone text NOT NULL,
  phone_normalized text NOT NULL,
  status text NOT NULL DEFAULT 'unread',
  ai_mode text NOT NULL DEFAULT 'copilot',
  is_archived boolean NOT NULL DEFAULT false,
  last_message_at timestamptz DEFAULT now(),
  last_message_preview text,
  last_message_direction text DEFAULT 'inbound',
  unread_count integer NOT NULL DEFAULT 0,
  opportunity_score integer DEFAULT 0,
  temperature integer DEFAULT 5,
  copilot_suggestions_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_conversations_broker_id ON public.conversations(broker_id);
CREATE INDEX idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX idx_conversations_phone_normalized ON public.conversations(phone_normalized);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE UNIQUE INDEX idx_conversations_broker_phone ON public.conversations(broker_id, phone_normalized);

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corretores veem suas conversas"
  ON public.conversations FOR SELECT
  USING (
    broker_id = get_my_broker_id()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role_or_leader(auth.uid())
  );

CREATE POLICY "Corretores inserem suas conversas"
  ON public.conversations FOR INSERT
  WITH CHECK (
    broker_id = get_my_broker_id()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Corretores atualizam suas conversas"
  ON public.conversations FOR UPDATE
  USING (
    broker_id = get_my_broker_id()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins podem deletar conversas"
  ON public.conversations FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. CONVERSATION MESSAGES TABLE
CREATE TABLE public.conversation_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'outbound',
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  sender_name text,
  sent_by text DEFAULT 'human',
  status text NOT NULL DEFAULT 'sent',
  uazapi_message_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conv_messages_conversation_id ON public.conversation_messages(conversation_id);
CREATE INDEX idx_conv_messages_created_at ON public.conversation_messages(created_at DESC);

-- RLS
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso via conversa"
  ON public.conversation_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE broker_id = get_my_broker_id()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role_or_leader(auth.uid())
  );

CREATE POLICY "Inserir mensagens na conversa"
  ON public.conversation_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE broker_id = get_my_broker_id()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. COPILOT CONFIGS TABLE
CREATE TABLE public.copilot_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id uuid NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Meu Copiloto',
  personality text NOT NULL DEFAULT 'consultivo',
  persuasion_level integer NOT NULL DEFAULT 50,
  objectivity_level integer NOT NULL DEFAULT 50,
  use_mental_triggers boolean NOT NULL DEFAULT true,
  allow_emojis boolean NOT NULL DEFAULT true,
  language_style text NOT NULL DEFAULT 'proximo',
  commercial_priority text NOT NULL DEFAULT 'agendamento',
  commercial_focus text NOT NULL DEFAULT 'presencial',
  incentive_visit boolean NOT NULL DEFAULT true,
  incentive_call boolean NOT NULL DEFAULT false,
  followup_auto boolean NOT NULL DEFAULT false,
  followup_tone text NOT NULL DEFAULT 'consultivo',
  auto_close_inactive boolean NOT NULL DEFAULT false,
  max_autonomy text NOT NULL DEFAULT 'suggest_only',
  property_type text NOT NULL DEFAULT 'lancamentos',
  region text,
  target_audience text,
  brand_positioning text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT copilot_configs_broker_unique UNIQUE (broker_id)
);

-- RLS
ALTER TABLE public.copilot_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corretor vê seu copilot"
  ON public.copilot_configs FOR SELECT
  USING (
    broker_id = get_my_broker_id()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Corretor cria seu copilot"
  ON public.copilot_configs FOR INSERT
  WITH CHECK (broker_id = get_my_broker_id());

CREATE POLICY "Corretor atualiza seu copilot"
  ON public.copilot_configs FOR UPDATE
  USING (broker_id = get_my_broker_id());

-- 4. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;

-- 5. Update trigger for conversations
CREATE OR REPLACE FUNCTION public.update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_updated_at();

-- 6. Auto-update conversation on new message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    last_message_direction = NEW.direction,
    unread_count = CASE WHEN NEW.direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
    status = CASE WHEN NEW.direction = 'inbound' THEN 'unread' ELSE status END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_new_conversation_message
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message();

-- 7. Auto-link conversation to lead by phone
CREATE OR REPLACE FUNCTION public.auto_link_conversation_lead()
RETURNS TRIGGER AS $$
DECLARE
  _lead_id uuid;
BEGIN
  IF NEW.lead_id IS NULL THEN
    SELECT id INTO _lead_id
    FROM public.leads
    WHERE broker_id = NEW.broker_id
      AND (
        replace(replace(replace(replace(whatsapp, '+', ''), '-', ''), ' ', ''), '(', '') 
        LIKE '%' || RIGHT(regexp_replace(NEW.phone_normalized, '[^0-9]', '', 'g'), 11) || '%'
      )
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF _lead_id IS NOT NULL THEN
      NEW.lead_id = _lead_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_link_conversation
  BEFORE INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_conversation_lead();
