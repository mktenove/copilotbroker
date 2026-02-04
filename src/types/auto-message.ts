// Auto First Message Types

export interface BrokerAutoMessageRule {
  id: string;
  broker_id: string;
  project_id: string | null;
  is_active: boolean;
  message_content: string;
  delay_minutes: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  project?: { id: string; name: string } | null;
}

export interface AutoMessageRuleFormData {
  project_id: string | null;
  message_content: string;
  delay_minutes: number;
  is_active: boolean;
}

// Template variables
export interface AutoMessageVariables {
  nome_lead: string;
  nome_corretor: string;
  empreendimento: string;
}

// Replace template variables in message content
export const replaceAutoMessageVariables = (
  content: string,
  variables: Partial<AutoMessageVariables>
): string => {
  let result = content;
  if (variables.nome_lead) {
    result = result.replace(/{nome_lead}/g, variables.nome_lead);
  }
  if (variables.nome_corretor) {
    result = result.replace(/{nome_corretor}/g, variables.nome_corretor);
  }
  if (variables.empreendimento) {
    result = result.replace(/{empreendimento}/g, variables.empreendimento);
  }
  return result;
};

// Default message template
export const DEFAULT_AUTO_MESSAGE = `Oi {nome_lead}, tudo bem? 👋
Aqui é {nome_corretor}, da Enove Imobiliária!

Vi agora o seu cadastro para fazer parte da lista VIP do *novo condomínio de Estância Velha* e já quis te chamar pra te explicar com calma como vai funcionar! Foi você mesmo que se cadastrou?`;
