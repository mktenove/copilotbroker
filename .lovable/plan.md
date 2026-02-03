

# Plano: Criar Imagem OG para Mauricio Cardoso

## Contexto do Projeto

O empreendimento Mauricio Cardoso utiliza:
- **Cores principais**: Verde floresta (forest), tons terrosos (sage, cream, charcoal)
- **Estilo visual**: Editorial, elegante, alto padrão
- **Imagem do prédio**: `predio.png` (fachada do empreendimento)
- **Headline**: "Quando o endereço é definitivo, o projeto precisa estar à altura"

## Especificações da Imagem OG

| Propriedade | Valor |
|-------------|-------|
| Dimensões | 1200 x 630 pixels |
| Formato | JPG |
| Destino | `public/mauriciocardoso-og.jpg` |

## Abordagem

Usar o modelo de geração de imagem AI (Nano banana) para criar uma imagem promocional elegante que combine:

1. **Fundo**: Renderização arquitetônica de prédio residencial moderno de alto padrão
2. **Overlay**: Gradiente verde floresta escuro para contraste
3. **Texto**: 
   - "MAURICIO CARDOSO" (título principal)
   - "Novo Hamburgo | RS" (localização)
   - "Apartamentos de 95 a 125m²" (destaque)

## Prompt para Geração

```text
Professional real estate marketing banner, 1200x630 pixels, modern luxury apartment building facade, 
elegant dark forest green gradient overlay, premium typography with "MAURICIO CARDOSO" in white serif font,
"Novo Hamburgo | RS" subtitle, architectural visualization style, high-end real estate marketing,
sophisticated and minimalist design, Brazilian contemporary architecture
```

## Implementação

1. Chamar API de geração de imagem com prompt otimizado
2. Converter resultado para formato JPG
3. Salvar em `public/mauriciocardoso-og.jpg`

## Resultado Esperado

Uma imagem OG profissional que:
- Represente o alto padrão do empreendimento
- Mantenha consistência visual com a landing page
- Seja otimizada para compartilhamento em redes sociais (WhatsApp, Facebook, LinkedIn)
- Inclua informações essenciais de forma clara e elegante

