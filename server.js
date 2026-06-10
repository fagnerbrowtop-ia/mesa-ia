const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// MEMÓRIA CENTRAL
// ─────────────────────────────────────────────

const MEMORY_FILE = './memoria.json';

function loadMemory() {
  if (!fs.existsSync(MEMORY_FILE)) return { projeto: '', historico: [] };
  try { return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8')); }
  catch (e) { return { projeto: '', historico: [] }; }
}

function saveMemory(mem) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2));
}

// ─────────────────────────────────────────────
// ROTEADOR — detecta qual IA foi chamada
// ─────────────────────────────────────────────

function detectAgent(texto) {
  const t = texto.toLowerCase();
  if (t.includes('@claude') || t.startsWith('claude')) return 'claude';
  if (t.includes('@gpt') || t.includes('@chatgpt') || t.startsWith('gpt') || t.startsWith('chatgpt')) return 'gpt';
  if (t.includes('@gemini') || t.startsWith('gemini')) return 'gemini';
  if (t.includes('@diabo') || t.includes('advogado do diabo') || t.startsWith('diabo')) return 'diabo';
  return 'claude'; // padrão
}

function cleanMention(texto) {
  return texto
    .replace(/@claude\s*/gi, '')
    .replace(/@gpt\s*/gi, '')
    .replace(/@chatgpt\s*/gi, '')
    .replace(/@gemini\s*/gi, '')
    .replace(/@diabo\s*/gi, '')
    .replace(/^(claude|gpt|chatgpt|gemini|diabo)[,:\s]+/gi, '')
    .trim();
}

// ─────────────────────────────────────────────
// MONTAR CONTEXTO DA MEMÓRIA
// ─────────────────────────────────────────────

function buildContext(mem, agente) {
  const papeis = {
    claude: 'Você é Claude, o arquiteto e programador da mesa. Você implementa, organiza código, cria arquiteturas e resolve problemas técnicos.',
    gpt: 'Você é o ChatGPT, o analista estratégico da mesa. Você identifica riscos, avalia escalabilidade, modelo de negócio e onde o projeto pode quebrar.',
    gemini: 'Você é o Gemini, o revisor e pesquisador da mesa. Você simplifica, integra ideias, pesquisa alternativas e traz clareza. Você tem acesso à internet para buscar informações atualizadas.',
    diabo: 'Você é o Advogado do Diabo. Sua função é criticar implacavelmente, encontrar falhas, fraquezas e todos os motivos pelos quais o projeto pode fracassar. Seja rigoroso.',
  };

  const ultimasMensagens = mem.historico.slice(-20).map(m =>
    `[${m.agente.toUpperCase()}] ${m.pergunta ? `Fagner: ${m.pergunta}\n` : ''}${m.agente}: ${m.resposta}`
  ).join('\n\n');

  return `${papeis[agente] || papeis.claude}

Você faz parte de uma mesa de especialistas em IA trabalhando junto com GPT, Claude e Gemini no mesmo projeto.
Fagner é o CEO da mesa — ele coordena todos vocês.

${mem.projeto ? `CONTEXTO DO PROJETO:\n${mem.projeto}\n` : ''}

${ultimasMensagens ? `HISTÓRICO RECENTE DA MESA:\n${ultimasMensagens}` : 'Essa é a primeira mensagem da mesa.'}

Responda de forma direta e útil. Quando relevante, referencia o que outros membros da mesa disseram. Responda em português.`;
}

// ─────────────────────────────────────────────
// CHAMADAS PARA CADA API
// ─────────────────────────────────────────────

async function callClaude(prompt, contexto, file) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 8192,
      system: contexto,
      messages: [{
        role: 'user',
        content: file && file.type && file.type.startsWith('image/')
          ? [
              { type: 'image', source: { type: 'base64', media_type: file.type, data: file.base64 } },
              { type: 'text', text: prompt || 'Analise esta imagem.' }
            ]
          : prompt
      }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

async function callGPT(prompt, contexto, file) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: contexto },
        { role: 'user', content: file && file.type && file.type.startsWith('image/')
          ? [
              { type: 'text', text: prompt || 'Analise esta imagem.' },
              { type: 'image_url', image_url: { url: `data:${file.type};base64,${file.base64}` } }
            ]
          : prompt
        },
      ],
      max_tokens: 31256,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

async function callGemini(prompt, contexto, file) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: contexto }] },
        contents: [{
          parts: file && file.type && file.type.startsWith('image/')
            ? [
                { inline_data: { mime_type: file.type, data: file.base64 } },
                { text: prompt || 'Analise esta imagem.' }
              ]
            : [{ text: prompt }]
        }],
        generationConfig: { maxOutputTokens: 31245 },
        tools: [{ googleSearch: {} }] // ADICIONADO: Motor de busca ativado
      }),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

// ─────────────────────────────────────────────
// ROTAS
// ─────────────────────────────────────────────

app.get('/api/memoria', (req, res) => {
  res.json(loadMemory());
});

app.post('/api/projeto', (req, res) => {
  const mem = loadMemory();
  mem.projeto = req.body.projeto || '';
  saveMemory(mem);
  res.json({ ok: true });
});

app.post('/api/limpar', (req, res) => {
  const mem = loadMemory();
  mem.historico = [];
  saveMemory(mem);
  res.json({ ok: true });
});

app.post('/api/mensagem', async (req, res) => {
  const { texto, file } = req.body;
  if (!texto?.trim() && !file) return res.status(400).json({ erro: 'Mensagem vazia' });

  const agente = detectAgent(texto || '');
  const pergunta = cleanMention(texto || '');
  const mem = loadMemory();
  const contexto = buildContext(mem, agente);

  try {
    let resposta;
    if (agente === 'claude' || agente === 'diabo') {
      resposta = await callClaude(pergunta, contexto, file);
    } else if (agente === 'gpt') {
      resposta = await callGPT(pergunta, contexto, file);
    } else if (agente === 'gemini') {
      resposta = await callGemini(pergunta, contexto, file);
    }

    mem.historico.push({
      agente,
      pergunta,
      resposta,
      timestamp: new Date().toISOString(),
    });

    if (mem.historico.length > 100) mem.historico = mem.historico.slice(-100);
    saveMemory(mem);

    res.json({ agente, resposta });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mesa IA rodando na porta ${PORT}`));
