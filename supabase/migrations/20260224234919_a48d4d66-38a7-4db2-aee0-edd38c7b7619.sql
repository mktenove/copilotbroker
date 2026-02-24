
-- 1. Create increment_copilot_count function (used by copilot-ai edge function)
CREATE OR REPLACE FUNCTION public.increment_copilot_count(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversations
  SET copilot_suggestions_count = copilot_suggestions_count + 1,
      updated_at = now()
  WHERE id = _conversation_id;
END;
$function$;

-- 2. RLS: Admins can SELECT all conversations
CREATE POLICY "Admins podem ver todas as conversas"
ON public.conversations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. RLS: Admins can SELECT all conversation messages
CREATE POLICY "Admins podem ver todas as mensagens"
ON public.conversation_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. RLS: Leaders can see conversations of their team
CREATE POLICY "Lideres podem ver conversas do time"
ON public.conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brokers b
    WHERE b.id = conversations.broker_id
      AND b.lider_id = get_my_broker_id()
  )
);

-- 5. RLS: Leaders can see messages of their team's conversations
CREATE POLICY "Lideres podem ver mensagens do time"
ON public.conversation_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.brokers b ON b.id = c.broker_id
    WHERE c.id = conversation_messages.conversation_id
      AND b.lider_id = get_my_broker_id()
  )
);
