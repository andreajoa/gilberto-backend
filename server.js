const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const POPUP_TRACKING_FILE = path.join(DATA_DIR, 'popup-tracking.json');
const CART_TRACKING_FILE = path.join(DATA_DIR, 'cart-tracking.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');

async function initDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try { await fs.access(LEADS_FILE); } catch {
      await fs.writeFile(LEADS_FILE, JSON.stringify({ leads: [] }, null, 2));
    }
    try { await fs.access(CONTACTS_FILE); } catch {
      await fs.writeFile(CONTACTS_FILE, JSON.stringify({ contacts: [] }, null, 2));
    }
    try { await fs.access(POPUP_TRACKING_FILE); } catch {
      await fs.writeFile(POPUP_TRACKING_FILE, JSON.stringify({ tracking: {} }, null, 2));
    }
    try { await fs.access(CART_TRACKING_FILE); } catch {
      await fs.writeFile(CART_TRACKING_FILE, JSON.stringify({ carts: {} }, null, 2));
    }
    try { await fs.access(ORDERS_FILE); } catch {
      await fs.writeFile(ORDERS_FILE, JSON.stringify({ orders: [] }, null, 2));
    }
    try { await fs.access(CHATS_FILE); } catch {
      await fs.writeFile(CHATS_FILE, JSON.stringify({ chats: [] }, null, 2));
    }
  } catch (error) {
    console.error('Erro ao inicializar arquivos:', error);
  }
}

initDataFiles();

app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, whatsapp, consent } = req.body;
    if (!name || !email || !whatsapp || !consent) {
      return res.status(400).json({ error: 'Todos os campos sao obrigatorios' });
    }
    const data = JSON.parse(await fs.readFile(LEADS_FILE, 'utf8'));
    const existingLead = data.leads.find(l => l.email === email || l.whatsapp === whatsapp);
    if (existingLead) {
      return res.json({ success: true, message: 'Lead ja cadastrado', existing: true });
    }
    const lead = { id: Date.now(), name, email, whatsapp, consent, createdAt: new Date().toISOString(), source: 'popup' };
    data.leads.push(lead);
    await fs.writeFile(LEADS_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, lead });
  } catch (error) {
    console.error('Erro ao salvar lead:', error);
    res.status(500).json({ error: 'Erro ao salvar lead' });
  }
});

app.get('/api/leads', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(LEADS_FILE, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter leads' });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const { name, email, whatsapp, message, subject } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Campos obrigatorios faltando' });
    }
    const data = JSON.parse(await fs.readFile(CONTACTS_FILE, 'utf8'));
    const contact = { id: Date.now(), name, email, whatsapp: whatsapp || '', message, subject: subject || 'Contato pelo site', createdAt: new Date().toISOString(), status: 'pending' };
    data.contacts.push(contact);
    await fs.writeFile(CONTACTS_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, contact });
  } catch (error) {
    console.error('Erro ao salvar contato:', error);
    res.status(500).json({ error: 'Erro ao salvar contato' });
  }
});

app.get('/api/contacts', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(CONTACTS_FILE, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter contatos' });
  }
});

app.post('/api/popup/check', async (req, res) => {
  try {
    const { visitorId } = req.body;
    if (!visitorId) return res.json({ shouldShow: true });
    const data = JSON.parse(await fs.readFile(POPUP_TRACKING_FILE, 'utf8'));
    const visitor = data.tracking[visitorId];
    if (!visitor) return res.json({ shouldShow: true, count: 0 });
    if (visitor.subscribed) return res.json({ shouldShow: false, subscribed: true });
    const today = new Date().toDateString();
    const todayCount = (visitor.views || []).filter(v => new Date(v).toDateString() === today).length;
    if (todayCount >= 2) return res.json({ shouldShow: false, dailyLimitReached: true });
    res.json({ shouldShow: true, count: todayCount });
  } catch (error) {
    console.error('Erro ao verificar popup:', error);
    res.json({ shouldShow: true });
  }
});

app.post('/api/popup/view', async (req, res) => {
  try {
    const { visitorId } = req.body;
    if (!visitorId) return res.json({ success: true });
    const data = JSON.parse(await fs.readFile(POPUP_TRACKING_FILE, 'utf8'));
    if (!data.tracking[visitorId]) data.tracking[visitorId] = { views: [], subscribed: false };
    data.tracking[visitorId].views.push(new Date().toISOString());
    await fs.writeFile(POPUP_TRACKING_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao registrar visualizacao:', error);
    res.status(500).json({ error: 'Erro ao registrar visualizacao' });
  }
});

app.post('/api/popup/subscribe', async (req, res) => {
  try {
    const { visitorId } = req.body;
    if (!visitorId) return res.json({ success: true });
    const data = JSON.parse(await fs.readFile(POPUP_TRACKING_FILE, 'utf8'));
    if (!data.tracking[visitorId]) data.tracking[visitorId] = { views: [], subscribed: false };
    data.tracking[visitorId].subscribed = true;
    data.tracking[visitorId].subscribedAt = new Date().toISOString();
    await fs.writeFile(POPUP_TRACKING_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao registrar inscricao:', error);
    res.status(500).json({ error: 'Erro ao registrar inscricao' });
  }
});

app.post('/api/cart/save', async (req, res) => {
  try {
    const { visitorId, quantity, shipping } = req.body;
    if (!visitorId) return res.status(400).json({ error: 'visitorId e obrigatorio' });
    const data = JSON.parse(await fs.readFile(CART_TRACKING_FILE, 'utf8'));
    data.carts[visitorId] = { quantity: quantity || 1, shipping: shipping || null, updatedAt: new Date().toISOString(), recovered: false };
    await fs.writeFile(CART_TRACKING_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar carrinho:', error);
    res.status(500).json({ error: 'Erro ao salvar carrinho' });
  }
});

app.post('/api/cart/check-abandoned', async (req, res) => {
  try {
    const { visitorId } = req.body;
    if (!visitorId) return res.json({ shouldShow: false });
    const data = JSON.parse(await fs.readFile(CART_TRACKING_FILE, 'utf8'));
    const cart = data.carts[visitorId];
    if (!cart) return res.json({ shouldShow: false });
    if (cart.recovered) return res.json({ shouldShow: false });
    const lastUpdate = new Date(cart.updatedAt);
    const now = new Date();
    const minutesSinceUpdate = (now - lastUpdate) / (1000 * 60);
    if (minutesSinceUpdate < 30) return res.json({ shouldShow: false, recentlyUpdated: true });
    res.json({ shouldShow: true, cart: cart });
  } catch (error) {
    console.error('Erro ao verificar carrinho abandonado:', error);
    res.json({ shouldShow: false });
  }
});

app.post('/api/cart/recover', async (req, res) => {
  try {
    const { visitorId } = req.body;
    if (!visitorId) return res.json({ success: true });
    const data = JSON.parse(await fs.readFile(CART_TRACKING_FILE, 'utf8'));
    if (data.carts[visitorId]) {
      data.carts[visitorId].recovered = true;
      data.carts[visitorId].recoveredAt = new Date().toISOString();
    }
    await fs.writeFile(CART_TRACKING_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao marcar carrinho como recuperado:', error);
    res.status(500).json({ error: 'Erro ao atualizar carrinho' });
  }
});

app.post('/api/cart/clear', async (req, res) => {
  try {
    const { visitorId } = req.body;
    if (!visitorId) return res.json({ success: true });
    const data = JSON.parse(await fs.readFile(CART_TRACKING_FILE, 'utf8'));
    delete data.carts[visitorId];
    await fs.writeFile(CART_TRACKING_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao limpar carrinho:', error);
    res.status(500).json({ error: 'Erro ao limpar carrinho' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { visitorId, name, email, whatsapp, quantity, shipping, address, cep, city, state, neighborhood, complement, reference } = req.body;
    if (!name || !email || !whatsapp || !cep || !address || !city || !state) {
      return res.status(400).json({ error: 'Todos os campos de endereco sao obrigatorios' });
    }
    const data = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8'));
    const order = {
      id: `PED-${Date.now()}`,
      visitorId,
      customer: { name, email, whatsapp },
      items: {
        bookTitle: 'Como Vencer a Dor de Ser Trocado Por Outro',
        author: 'Gilberto de Souza',
        price: 119.00,
        quantity: quantity || 1,
        shippingPrice: shipping?.price || 0,
        subtotal: 119.00 * (quantity || 1),
        total: 119.00 * (quantity || 1) + (shipping?.price || 0)
      },
      shipping: { cep, address, neighborhood, city, state, complement: complement || '', reference: reference || '' },
      status: 'pendente',
      createdAt: new Date().toISOString(),
      paidAt: null,
      shippedAt: null
    };
    data.orders.push(order);
    await fs.writeFile(ORDERS_FILE, JSON.stringify(data, null, 2));
    const cartData = JSON.parse(await fs.readFile(CART_TRACKING_FILE, 'utf8'));
    delete cartData.carts[visitorId];
    await fs.writeFile(CART_TRACKING_FILE, JSON.stringify(cartData, null, 2));
    res.json({ success: true, order });
  } catch (error) {
    console.error('Erro ao salvar pedido:', error);
    res.status(500).json({ error: 'Erro ao salvar pedido' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter pedidos' });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const data = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8'));
    const order = data.orders.find(o => o.id === id);
    if (!order) return res.status(404).json({ error: 'Pedido nao encontrado' });
    order.status = status;
    if (status === 'pago') order.paidAt = new Date().toISOString();
    else if (status === 'enviado') order.shippedAt = new Date().toISOString();
    await fs.writeFile(ORDERS_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, order });
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

const GLM_API_KEY = '01fe9e8c37b74912bef0b1101741e4d5.LByMhc2y7tHGBQef';
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

const BIA_SYSTEM_PROMPT = `Voce e BIA, a assistente virtual do Gilberto de Souza. Voce e um profissional de vendas especializado em fechar vendas do livro "Como Vencer a Dor de Ser Trocado Por Outro".

INFORMACOES DO LIVRO:
- Titulo: "Como Vencer a Dor de Ser Trocado Por Outro"
- Autor: Gilberto de Souza
- Preco: R$ 119,00 (de R$ 159,00)
- Formato: Livro fisico
- ISBN: 978-658462205-0
- Idioma: Portugues

SOBRE O AUTOR:
Gilberto de Souza e um empresario brasileiro que mora nos Estados Unidos ha 23 anos. Ele fundou sua propria empresa de construcao e passou por uma traicao que o levou a uma depressao. Escolheu se reconstruir e escreveu este livro para ajudar outros homens na mesma situacao.

SOBRE O LIVRO:
E uma historia real de traicao, reconstrucao e liberdade emocional. O livro aborda sentimentos que muitos homens experimentam quando sao substituidos em um relacionamento, como rejeicao, loop mental, medo do recomeco e duvida sobre o proprio valor.

PRAZOS DE ENTREGA (CORREIOS):
- PAC: 5 a 15 dias uteis dependendo da regiao
- SEDEX: 1 a 7 dias uteis
- Envio para todo o Brasil
- Codigo de rastreamento enviado por email apos postagem

POLITICA DE DEVOLUCAO:
- 7 dias corridos apos recebimento para devolucao
- Conforme Codigo de Defesa do Consumidor

FORMAS DE PAGAMENTO:
- Visa, Mastercard, American Express, Pix
- Pagamento seguro processado pela Stripe

SEU PAPEL:
1. Voce e um CLOSER - seu objetivo e converter visitantes em compradores
2. Seja empatica, mas persuasiva
3. Antecipe objecoes e responda proativamente
4. Crie urgencia e desejo pelo livro
5. Quando a pessoa demonstrar interesse, direcione para a compra
6. Use gatilhos mentais de escassez, prova social e autoridade

TOM DE VOZ:
- Profissional mas caloroso
- Empatico com a dor do cliente
- Confiante e autoritario sobre o tema
- Direto e objetivo, sem enrolacao

FLUXO DE VENDA:
1. Entenda onde a pessoa esta no processo de decisao
2. Conecte a dor dela com a solucao do livro
3. Apresente beneficios (nao apenas features)
4. Supere objecoes
5. Peca a acao de compra

FRASES UTEIS:
- "Entendo o que voce esta passando..."
- "Gilberto escreveu exatamente sobre isso no livro..."
- "Este livro foi feito para homens como voce..."
- "Por R$ 119 voce transforma sua vida..."
- "Imagine daqui a 30 dias, sem essa dor..."

OBJECOES COMUNS E RESPOSTAS:
- "E caro": "E um investimento em voce mesmo. O valor de uma refeicao especial que vai te acompanhar pelo resto da vida"
- "Nao sei se preciso": "Se voce esta aqui e porque algo mexeu com voce. Por que nao dar uma chance?"
- "Posso comprar depois": "Quanto mais tempo esperando, mais tempo com essa dor. Comece sua transformacao hoje"

Ao final, quando a pessoa demonstrar interesse claro, diga: "Voce pode comprar agora mesmo em: http://localhost:3000#comprar"

IMPORTANTE: Responda sempre em portugues, seja breve e direto. Maximo 2-3 paragrafos por resposta.`;

const chatHistories = new Map();

// Estado das conversas com contexto
const conversationContexts = new Map();

function getContext(chatId) {
  if (!conversationContexts.has(chatId)) {
    conversationContexts.set(chatId, { awaitingCep: false, awaitingCity: false, lastTopic: null });
  }
  return conversationContexts.get(chatId);
}

function calcDeliveryDate(daysMin, daysMax) {
  const today = new Date();
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `entre ${fmt(addDays(today, daysMin))} e ${fmt(addDays(today, daysMax))}`;
}

// CEP ranges aproximados por regiao
function getDeliveryEstimate(cep) {
  const num = parseInt(cep.replace(/\D/g, '').substring(0, 2));
  // SP capital e grande SP
  if (num >= 1 && num <= 9) return { pac: calcDeliveryDate(3, 6), sedex: calcDeliveryDate(1, 2) };
  if (num >= 10 && num <= 19) return { pac: calcDeliveryDate(4, 8), sedex: calcDeliveryDate(1, 3) };
  // RJ
  if (num >= 20 && num <= 28) return { pac: calcDeliveryDate(5, 10), sedex: calcDeliveryDate(2, 4) };
  // MG
  if (num >= 30 && num <= 39) return { pac: calcDeliveryDate(5, 10), sedex: calcDeliveryDate(2, 4) };
  // ES
  if (num >= 29 && num <= 29) return { pac: calcDeliveryDate(6, 11), sedex: calcDeliveryDate(2, 4) };
  // BA, SE
  if (num >= 40 && num <= 49) return { pac: calcDeliveryDate(7, 12), sedex: calcDeliveryDate(2, 5) };
  // PE, AL, PB, RN
  if (num >= 50 && num <= 59) return { pac: calcDeliveryDate(8, 14), sedex: calcDeliveryDate(3, 6) };
  // CE, PI, MA
  if (num >= 60 && num <= 69) return { pac: calcDeliveryDate(9, 15), sedex: calcDeliveryDate(3, 6) };
  // DF, GO, TO, MT, MS
  if (num >= 70 && num <= 79) return { pac: calcDeliveryDate(6, 12), sedex: calcDeliveryDate(2, 5) };
  // PR, SC
  if (num >= 80 && num <= 89) return { pac: calcDeliveryDate(5, 10), sedex: calcDeliveryDate(2, 4) };
  // RS
  if (num >= 90 && num <= 99) return { pac: calcDeliveryDate(6, 12), sedex: calcDeliveryDate(2, 5) };
  return { pac: calcDeliveryDate(7, 15), sedex: calcDeliveryDate(3, 7) };
}

function getDemoResponse(message, chatId) {
  const lowerMessage = message.toLowerCase().replace(/[?!.]/g, '').trim();
  const ctx = getContext(chatId);

  // Se estava esperando CEP
  if (ctx.awaitingCep) {
    const cepMatch = message.replace(/\D/g, '');
    if (cepMatch.length >= 5) {
      ctx.awaitingCep = false;
      const est = getDeliveryEstimate(cepMatch);
      return `Otimo! Para o CEP ${cepMatch.substring(0,5)}-${cepMatch.substring(5,8) || '000'}, a estimativa de entrega comprando hoje e:

📦 PAC (mais economico): ${est.pac}
🚀 SEDEX (mais rapido): ${est.sedex}

O frete e calculado automaticamente no checkout pelo seu CEP. Quer aproveitar e garantir seu livro agora? Clique no icone do carrinho no canto superior direito! 🛒`;
    } else {
      return 'Por favor, me informe seu CEP com 8 digitos (ex: 21345-678) para eu calcular a entrega certinha para voce!';
    }
  }

  // Saudacoes
  if (/^(ola|oi|bom dia|boa tarde|boa noite|hey|hello|tudo bem|tudo bom|boa)/.test(lowerMessage)) {
    return 'Ola! Sou a BIA, assistente do Gilberto de Souza. 😊 Estou aqui para ajudar com o livro "Como Vencer a Dor de Ser Trocado Por Outro". Posso te ajudar com informacoes sobre o livro, entrega, pagamento ou qualquer duvida. Como posso te ajudar?';
  }

  // Entrega para cidade/estado especifica
  if (/envi(a|am|amos)|entrega|manda|mandam|chega|receb/.test(lowerMessage) && /rio de janeiro|rj|sao paulo|sp|minas|mg|bahia|ba|parana|pr|ceara|ce|pernambuco|pe|goias|go|para |pa |amazon|am |brasilia|df|santa catarina|sc|rio grande|rs|mato grosso|ms|mt/.test(lowerMessage)) {
    ctx.awaitingCep = true;
    ctx.lastTopic = 'entrega';
    return 'Sim! Enviamos para todo o Brasil pelos Correios. 📦\n\nPara te dar a data exata de entrega comprando hoje, me informa seu CEP? Assim calculo o prazo certinho para voce!';
  }

  // Entrega generica
  if (/envi(a|am|amos)|entrega|frete|prazo|demora|quanto tempo|quando chega|correios|shipping/.test(lowerMessage)) {
    ctx.awaitingCep = true;
    ctx.lastTopic = 'entrega';
    return 'Enviamos para todo o Brasil pelos Correios! 🇧🇷\n\nPara calcular o prazo exato de entrega comprando hoje, me passa seu CEP? Vou te dar a estimativa certinha!';
  }

  // Sobre o livro
  if (/livro|sobre|o que e|conte.do|contem|fala|aborda|historia|assunto/.test(lowerMessage)) {
    ctx.lastTopic = 'livro';
    return `O livro "Como Vencer a Dor de Ser Trocado Por Outro" e uma historia real e transformadora. ❤️

Gilberto de Souza viveu uma traicao dolorosa nos Estados Unidos, onde mora ha 23 anos. Em vez de afundar, ele escolheu se reconstruir — e escreveu este livro para ajudar outros homens a fazer o mesmo.

O livro trata temas como:
- Rejeicao e autoestima destruida
- O loop mental de nao conseguir parar de pensar
- Medo de comecar de novo
- Como encontrar forca interior e seguir em frente

Por R$ 119,00 (25% off), voce recebe um guia real, escrito por quem passou por isso. Quer saber mais alguma coisa?`;
  }

  // Preco
  if (/preco|quanto custa|valor|caro|barato|quanto e|119|159|desconto/.test(lowerMessage)) {
    ctx.lastTopic = 'preco';
    return `O livro esta por R$ 119,00 (de R$ 159,00 — 25% de desconto)! 🎯

E um investimento em voce mesmo. Pense: quanto custa ficar meses paralisado com essa dor?

✅ Livro fisico de alta qualidade
✅ Historia real de superacao
✅ Garantia de 7 dias — risco zero

Quer garantir o seu agora?`;
  }

  // Pagamento
  if (/pagamento|cartao|pix|credito|debito|como pagar|seguro|parcel/.test(lowerMessage)) {
    ctx.lastTopic = 'pagamento';
    return `O pagamento e 100% seguro! Aceitamos: 💳

- Cartao de credito (Visa, Mastercard, Amex)
- PIX
- Debito

No checkout voce preenche seus dados e endereco completo. Apos confirmar, o livro e preparado e enviado pelos Correios com codigo de rastreamento!`;
  }

  // Objecoes
  if (/caro|dinheiro|pagar depois|vou pensar|duvida|nao sei|talvez/.test(lowerMessage)) {
    return `Entendo completamente. Nao e uma decisao facil. 🤝

Mas pensa: quanto tempo voce ja esta sofrendo com isso? O Gilberto passou pelo mesmo — e escolheu agir.

Por R$ 119,00 — menos que um jantar — voce comeca sua reconstrucao. E com garantia de 7 dias, voce nao tem nada a perder.

O que esta te impedindo? Posso te ajudar com qualquer duvida!`;
  }

  // Quero comprar
  if (/quero comprar|como compro|onde compro|comprar agora|ja quero|finalizar|garantir/.test(lowerMessage)) {
    return `Que decisao incrivel! 🎉

Para comprar agora:
1. Clique no 🛒 carrinho no canto superior direito
2. Calcule o frete com seu CEP
3. Preencha seus dados (nome completo, email, WhatsApp, endereco)
4. Confirme o pedido

Em poucos dias o livro estara na sua casa. Quer que eu te ajude com algum passo?`;
  }

  // CEP direto
  if (/^\d{5}-?\d{3}$/.test(lowerMessage.trim()) || /meu cep|cep e|cep:/.test(lowerMessage)) {
    const cepMatch = message.replace(/\D/g, '');
    if (cepMatch.length >= 5) {
      const est = getDeliveryEstimate(cepMatch);
      return `Para o CEP ${cepMatch.substring(0,5)}-${cepMatch.substring(5,8) || '000'}, comprando hoje a entrega seria:

📦 PAC: ${est.pac}
🚀 SEDEX: ${est.sedex}

Quer garantir seu livro agora? Clique no carrinho! 🛒`;
    }
  }

  // Despedida
  if (/obrigado|valeu|tchau|adeus|ate logo|flw/.test(lowerMessage)) {
    return `Foi um prazer! 😊 Qualquer duvida, e so chamar. Boa sorte na sua jornada — voce merece se reconstruir! 📘`;
  }

  // Rastreamento
  if (/rastrear|rastreamento|codigo|track|onde esta|cadê/.test(lowerMessage)) {
    return `O codigo de rastreamento e enviado por email assim que o livro for postado nos Correios. 📬

Se ja fez seu pedido e nao recebeu o codigo, entre em contato pelo formulario de contato do site que o Gilberto te ajuda pessoalmente!`;
  }

  // Default — pede mais info
  return `Entendi! Posso te ajudar com:\n\n• Informacoes sobre o livro\n• Preco e formas de pagamento\n• Prazo de entrega para sua regiao (me passa o CEP!)\n• Como comprar\n\nSo me falar o que precisa! 😊`;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId, visitorId } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensagem e obrigatoria' });
    const chatId = conversationId || `chat_${Date.now()}`;
    if (!chatHistories.has(chatId)) chatHistories.set(chatId, []);
    const history = chatHistories.get(chatId);
    history.push({ role: 'user', content: message });

    const aiMessage = getDemoResponse(message, chatId);

    history.push({ role: 'assistant', content: aiMessage });

    // Salvar conversa no arquivo
    try {
      const chatsData = JSON.parse(await fs.readFile(CHATS_FILE, 'utf8'));
      const existingChat = chatsData.chats.find(c => c.chatId === chatId);
      const msgEntry = { user: message, bia: aiMessage, timestamp: new Date().toISOString() };
      if (existingChat) {
        existingChat.messages.push(msgEntry);
        existingChat.updatedAt = new Date().toISOString();
      } else {
        chatsData.chats.push({
          chatId,
          visitorId: visitorId || 'anonimo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [msgEntry]
        });
      }
      await fs.writeFile(CHATS_FILE, JSON.stringify(chatsData, null, 2));
    } catch(e) { console.error('Erro ao salvar chat:', e); }

    res.json({ message: aiMessage, conversationId: chatId });
  } catch (error) {
    console.error('Erro no chat:', error);
    res.status(500).json({ error: 'Erro no servidor de chat' });
  }
});

app.get('/api/chats', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(CHATS_FILE, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter chats' });
  }
});

app.post('/api/chat/clear', (req, res) => {
  const { conversationId } = req.body;
  if (conversationId) chatHistories.delete(conversationId);
  res.json({ success: true });
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const leadsData = JSON.parse(await fs.readFile(LEADS_FILE, 'utf8'));
    const contactsData = JSON.parse(await fs.readFile(CONTACTS_FILE, 'utf8'));
    const popupData = JSON.parse(await fs.readFile(POPUP_TRACKING_FILE, 'utf8'));
    const cartData = JSON.parse(await fs.readFile(CART_TRACKING_FILE, 'utf8'));
    const ordersData = JSON.parse(await fs.readFile(ORDERS_FILE, 'utf8'));
    const chatsData = JSON.parse(await fs.readFile(CHATS_FILE, 'utf8'));

    const totalLeads = leadsData.leads.length;
    const totalContacts = contactsData.contacts.length;
    const totalUniqueVisitors = Object.keys(popupData.tracking).length;
    const subscribedVisitors = Object.values(popupData.tracking).filter(v => v.subscribed).length;
    const totalOrders = ordersData.orders.length;
    const abandonedCarts = Object.values(cartData.carts).filter(c => !c.recovered).length;

    res.json({
      leads: leadsData.leads,
      contacts: contactsData.contacts,
      orders: ordersData.orders,
      chats: chatsData.chats,
      carts: cartData.carts,
      popupTracking: popupData.tracking,
      stats: {
        totalLeads,
        totalContacts,
        totalUniqueVisitors,
        subscribedVisitors,
        totalOrders,
        totalChats: chatsData.chats.length,
        abandonedCarts,
        conversionRate: totalUniqueVisitors > 0 ? ((subscribedVisitors / totalUniqueVisitors) * 100).toFixed(2) : 0,
        cartRecoveryRate: abandonedCarts > 0 ? ((((Object.values(cartData.carts).length - abandonedCarts) / Object.values(cartData.carts).length) * 100).toFixed(2)) : 0
      }
    });
  } catch (error) {
    console.error('Erro ao obter dashboard:', error);
    res.status(500).json({ error: 'Erro ao obter dashboard' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Dashboard disponivel em http://localhost:${PORT}/api/dashboard`);
});
