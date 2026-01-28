

# Plano: Integração Microsoft Clarity

## Objetivo

Adicionar o Microsoft Clarity para rastreamento de comportamento de usuários (gravações de sessão, mapas de calor, rage clicks).

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `index.html` | Adicionar script do Microsoft Clarity no `<head>` |

## Implementação

Adicionar o script do Clarity logo após o script do Google Analytics, mantendo a organização dos scripts de analytics juntos:

```html
<!-- Microsoft Clarity -->
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "v8po2iwagn");
</script>
```

## Localização no Código

O script será inserido após o bloco do Google Analytics (linhas 51-57) e antes dos preconnects para fontes.

## Resultado Esperado

- Gravações de sessão disponíveis no dashboard do Clarity
- Mapas de calor por página
- Métricas de rage clicks, dead clicks, scroll depth
- Dados coletados automaticamente em todas as páginas do site

