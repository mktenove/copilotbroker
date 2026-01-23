-- Permitir que admins deletem leads
CREATE POLICY "Admins podem deletar leads"
ON public.leads
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Deletar documentos e interações do lead antes (cascade manual via código)
-- Adicionar política para deletar documentos relacionados
CREATE POLICY "Admins podem deletar documentos"
ON public.lead_documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar política para deletar interações relacionadas  
CREATE POLICY "Admins podem deletar interacoes"
ON public.lead_interactions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar política para deletar attribution relacionada
CREATE POLICY "Admins podem deletar lead attribution"
ON public.lead_attribution
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));