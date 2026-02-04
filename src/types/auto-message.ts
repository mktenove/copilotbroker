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
export const DEFAULT_AUTO_MESSAGE = `Olá {nome_lead}! 👋

Sou {nome_corretor}, da Enove Incorporadora.
Vi que você tem interesse no {empreendimento}!

Posso te enviar mais informações?`;
