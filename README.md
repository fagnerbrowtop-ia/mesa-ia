# Mesa IA — Fagner 🧠

Chat único com Claude, GPT e Gemini compartilhando a mesma memória.

---

## Como usar

- Digite `@claude` + mensagem → responde Claude
- Digite `@gpt` + mensagem → responde ChatGPT  
- Digite `@gemini` + mensagem → responde Gemini
- Digite `@diabo` + mensagem → Advogado do Diabo (critica tudo)
- Ou use os botões de agente e escreva direto

Todos leem o histórico completo antes de responder.

---

## Deploy no Railway

### 1. GitHub
- Crie repositório `mesa-ia`
- Suba todos os arquivos desta pasta

### 2. Railway
- New Project → Deploy from GitHub → selecione `mesa-ia`

### 3. ⚡ IMPORTANTE — Configurar as chaves de API

Após o deploy, no Railway:
- Clique no projeto → aba **Variables**
- Adicione as seguintes variáveis:

| Variável | Onde pegar |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |

Sem essas chaves, o agente correspondente retorna erro.
Você pode começar só com Claude se quiser (só `ANTHROPIC_API_KEY`).

### 4. Acessar
- Abra o link gerado pelo Railway
- Clique em **Contexto do projeto** e descreva seu projeto
- Comece a conversar com a mesa

---

## Contexto do projeto

Clique em ⚙ **Contexto do projeto** no topo para escrever um resumo do que você está construindo. Esse texto é enviado para todos os agentes antes de responderem — é a "memória compartilhada" deles.

Exemplo de contexto:
```
Projeto: ZapPro — plataforma de disparo WhatsApp
Stack: Node.js + Baileys + Express
Status: sessões por cliente isoladas, painel admin pronto
Desafios atuais: persistência de sessão no Railway, dashboard geral
Objetivo: escalar para 50+ clientes
```

---

## Custos de API

Cada mensagem consome tokens das APIs. Estimativa por resposta:
- Claude: ~$0.003
- GPT-4o: ~$0.005
- Gemini 1.5 Pro: ~$0.002

Para uso pessoal/diário, o custo é muito baixo.
