const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// MEMÓRIA MULTI-PROJETO
// ─────────────────────────────────────────────

const DATA_FILE = './projetos.json';

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { projetos: {}, ativo: null };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { return { projetos: {}, ativo: null }; }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getProjeto(data, id) {
  if (!data.projetos[id]) {
    data.projetos[id] = { id, nome: 'Novo Projeto', contexto: '', historico: [], criadoEm: new Date().toISOString() };
  }
  return data.projetos[id];
}

// ─────────────────────────────────────────────
// ROTEADOR
// ─────────────────────────────────────────────

function detectAgent(texto) {
  const t = (texto || '').toLowerCase();
  if (t.includes('@claude') || t.startsWith('claude')) return 'claude';
  if (t.includes('@gpt') || t.includes('@chatgpt') || t.startsWith('gpt') || t.startsWith('chatgpt')) return 'gpt';
  if (t.includes('@gemini') || t.startsWith('gemini')) return 'gemini';
  if (t.includes('@diabo') || t.includes('advogado do diabo') || t.startsWith('diabo')) return 'diabo';
  return 'claude';
}

function cleanMention(texto) {
  return (texto || '')
    .replace(/@claude\s*/gi, '').replace(/@gpt\s*/gi, '').replace(/@chatgpt\s*/gi, '')
    .replace(/@gemini\s*/gi, '').replace(/@diabo\s*/gi, '')
    .replace(/^(claude|gpt|chatgpt|gemini|diabo)[,:\s]+/gi, '').trim();
}

// ─────────────────────────────────────────────
// CONTEXTO
// ─────────────────────────────────────────────

function buildContext(projeto, agente) {
  const papeis = {
    claude: 'Você é Claude, o arquiteto e programador da mesa. Você implementa, organiza código, cria arquiteturas e resolve problemas técnicos.',
    gpt: 'Você é o ChatGPT, o analista estratégico da mesa. Você identifica riscos, avalia escalabilidade, modelo de negócio e onde o projeto pode quebrar.',
    gemini: 'Você é o Gemini, o revisor e pesquisador da mesa. Você simplifica, integra ideias, pesquisa alternativas e traz clareza.',
    diabo: 'Você é o Advogado do Diabo. Sua função é criticar implacavelmente, encontrar falhas, fraquezas e todos os motivos pelos quais o projeto pode fracassar. Seja rigoroso.',
  };

  // Limitar histórico pra economizar tokens — só últimas 8 trocas
  const ultimas = (projeto.historico || []).slice(-8).map(m =>
    `[${m.agente.toUpperCase()}] Fagner: ${m.pergunta}\n${m.agente}: ${m.resposta}`
  ).join('\n\n');

  return `${papeis[agente] || papeis.claude}

Você faz parte de uma mesa de especialistas em IA. Fagner é o CEO da mesa.

${projeto.contexto ? `CONTEXTO DO PROJETO "${projeto.nome}":\n${projeto.contexto}\n` : ''}
${ultimas ? `HISTÓRICO RECENTE:\n${ultimas}` : 'Primeira mensagem deste projeto.'}

Responda de forma direta e útil. Responda em português.`;
}

// ─────────────────────────────────────────────
// APIs
// ─────────────────────────────────────────────

async function callClaude(prompt, contexto, file) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada');

  const userContent = file && file.type && file.type.startsWith('image/')
    ? [
        { type: 'image', source: { type: 'base64', media_type: file.type, data: file.base64 } },
        { type: 'text', text: prompt || 'Analise esta imagem.' }
      ]
    : prompt;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: contexto,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

async function callGPT(prompt, contexto, file) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const userContent = file && file.type && file.type.startsWith('image/')
    ? [
        { type: 'text', text: prompt || 'Analise esta imagem.' },
        { type: 'image_url', image_url: { url: `data:${file.type};base64,${file.base64}` } }
      ]
    : prompt;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: contexto }, { role: 'user', content: userContent }],
      max_tokens: 1024,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

async function callGemini(prompt, contexto, file) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada');

  const parts = file && file.type && file.type.startsWith('image/')
    ? [{ inline_data: { mime_type: file.type, data: file.base64 } }, { text: prompt || 'Analise esta imagem.' }]
    : [{ text: prompt }];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: contexto }] },
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

// ─────────────────────────────────────────────
// ROTAS — PROJETOS
// ─────────────────────────────────────────────

// Listar todos os projetos
app.get('/api/projetos', (req, res) => {
  const data = loadData();
  const lista = Object.values(data.projetos).map(p => ({
    id: p.id, nome: p.nome, criadoEm: p.criadoEm,
    mensagens: p.historico.length,
  }));
  res.json({ projetos: lista, ativo: data.ativo });
});

// Criar projeto
app.post('/api/projetos', (req, res) => {
  const data = loadData();
  const id = `p_${Date.now()}`;
  data.projetos[id] = {
    id, nome: req.body.nome || 'Novo Projeto',
    contexto: '', historico: [], criadoEm: new Date().toISOString()
  };
  data.ativo = id;
  saveData(data);
  res.json({ id, nome: data.projetos[id].nome });
});

// Selecionar projeto ativo
app.post('/api/projetos/:id/ativar', (req, res) => {
  const data = loadData();
  if (!data.projetos[req.params.id]) return res.status(404).json({ erro: 'Não encontrado' });
  data.ativo = req.params.id;
  saveData(data);
  res.json({ ok: true });
});

// Buscar projeto (contexto + histórico)
app.get('/api/projetos/:id', (req, res) => {
  const data = loadData();
  const p = data.projetos[req.params.id];
  if (!p) return res.status(404).json({ erro: 'Não encontrado' });
  res.json(p);
});

// Atualizar nome e contexto
app.put('/api/projetos/:id', (req, res) => {
  const data = loadData();
  const p = data.projetos[req.params.id];
  if (!p) return res.status(404).json({ erro: 'Não encontrado' });
  if (req.body.nome) p.nome = req.body.nome;
  if (req.body.contexto !== undefined) p.contexto = req.body.contexto;
  saveData(data);
  res.json({ ok: true });
});

// Deletar projeto
app.delete('/api/projetos/:id', (req, res) => {
  const data = loadData();
  delete data.projetos[req.params.id];
  if (data.ativo === req.params.id) data.ativo = Object.keys(data.projetos)[0] || null;
  saveData(data);
  res.json({ ok: true });
});

// Limpar histórico do projeto
app.post('/api/projetos/:id/limpar', (req, res) => {
  const data = loadData();
  const p = data.projetos[req.params.id];
  if (!p) return res.status(404).json({ erro: 'Não encontrado' });
  p.historico = [];
  saveData(data);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────
// ROTA — MENSAGEM
// ─────────────────────────────────────────────

app.post('/api/mensagem', async (req, res) => {
  const { texto, file, projetoId } = req.body;
  if (!texto?.trim() && !file) return res.status(400).json({ erro: 'Mensagem vazia' });

  const data = loadData();
  const id = projetoId || data.ativo;
  if (!id || !data.projetos[id]) return res.status(400).json({ erro: 'Nenhum projeto selecionado' });

  const projeto = data.projetos[id];
  const agente = detectAgent(texto);
  const pergunta = cleanMention(texto);
  const contexto = buildContext(projeto, agente);

  try {
    let resposta;
    if (agente === 'claude' || agente === 'diabo') resposta = await callClaude(pergunta, contexto, file);
    else if (agente === 'gpt') resposta = await callGPT(pergunta, contexto, file);
    else if (agente === 'gemini') resposta = await callGemini(pergunta, contexto, file);

    projeto.historico.push({ agente, pergunta, resposta, timestamp: new Date().toISOString() });
    if (projeto.historico.length > 200) projeto.historico = projeto.historico.slice(-200);
    saveData(data);

    res.json({ agente, resposta });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mesa IA rodando na porta ${PORT}`));
