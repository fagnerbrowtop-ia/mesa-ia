## EXPLICAÇÃO

Analisei o código do servidor e encontrei dois problemas principais:

**Problema 1:** As funções `detectAgent()` e `cleanMention()` estão com strings vazias onde deveriam ter os padrões de menção como `@claude`, `@gpt`, etc. Por isso o roteamento não funciona corretamente.

**Problema 2:** O servidor espera uma pasta `public/` com o frontend, que provavelmente não existe ainda.

A correção é simples: precisamos reescrever essas duas funções com os padrões corretos.

---

## CÓDIGO CORRIGIDO

```javascript
function detectAgent(texto) {
  const t = texto.toLowerCase();
  if (t.includes('@claude') || t.startsWith('claude')) return 'claude';
  if (t.includes('@gpt') || t.includes('@chatgpt') || t.startsWith('gpt')) return 'gpt';
  if (t.includes('@gemini') || t.startsWith('gemini')) return 'gemini';
  if (t.includes('@diabo') || t.includes('advogado do diabo')) return 'diabo';
  return 'claude';
}

function cleanMention(texto) {
  return texto
    .replace(/@(claude|gpt|chatgpt|gemini|diabo)\s*/gi, '')
    .replace(/^(claude|gpt|chatgpt|gemini|diabo)[,:\s]+/gi, '')
    .trim();
}
```
