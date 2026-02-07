

# Reordenar Abas: Seguranca apos Automacao

## Mudanca

Trocar a ordem das abas "Seguranca" e "Automacao" no painel WhatsApp Admin.

**Ordem atual:** Visao Global > Conexao Global > Conexao > Campanhas > Fila > **Seguranca** > **Automacao**

**Nova ordem:** Visao Global > Conexao Global > Conexao > Campanhas > Fila > **Automacao** > **Seguranca**

## Arquivo Afetado

`src/pages/AdminWhatsApp.tsx` - unico arquivo que precisa ser alterado.

Duas areas serao reordenadas:

1. **TabsTrigger** (botoes das abas): mover o trigger de "Automacao" para antes de "Seguranca"
2. **TabsContent** (conteudo das abas): mover o conteudo de "Automacao" para antes de "Seguranca"

Nenhuma outra mudanca necessaria - apenas reposicionamento de blocos JSX existentes.

