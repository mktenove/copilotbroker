

# Adicionar Microsoft Clarity na página Mauricio Cardoso

## Objetivo
Integrar o Microsoft Clarity com ID `vbsme5eo3h` especificamente na landing page do Mauricio Cardoso.

## Observação Importante
O site já possui um Clarity global (ID `v8po2iwagn`) configurado no `index.html`. Isso significa que esta página terá **dois trackings Clarity**:
- Global: `v8po2iwagn` (aplicado em todo o site)
- Específico: `vbsme5eo3h` (apenas nesta página)

Isso é intencional? Se quiser apenas o novo ID nesta página, seria necessário uma abordagem diferente. Por ora, seguirei adicionando o script específico.

---

## Implementação

### Arquivo a modificar
`src/pages/mauriciocardoso/MauricioCardosoLandingPage.tsx`

### Mudança
Adicionar o script do Clarity dentro do `<Helmet>`, após os schemas JSON-LD existentes:

```tsx
{/* Microsoft Clarity - Mauricio Cardoso */}
<script type="text/javascript">
  {`(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "vbsme5eo3h");`}
</script>
```

---

## Detalhes Técnicos
- O script será injetado no `<head>` pelo React Helmet quando o usuário acessar a página
- O Clarity ID `vbsme5eo3h` será carregado de forma assíncrona
- Não afeta outras páginas do site

---

## Resultado Esperado
Após publicar, a página `/novohamburgo/mauriciocardoso` terá o tracking do Microsoft Clarity com o ID `vbsme5eo3h`, permitindo monitorar mapas de calor, gravações de sessão e métricas de UX específicas deste empreendimento.

