// Simulação da API do Gemini para desenvolvimento local
// Este arquivo simula o comportamento da API serverless

// Função para simular delay de rede
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para gerar resposta simulada
function generateMockResponse(message) {
  const responses = [
    "Olá! Sou o assistente da Expomarau 2025. A feira acontecerá em Marabá, Pará, e será um grande evento de exposições e negócios da região.",
    "A Expomarau 2025 contará com diversos expositores dos setores agropecuário, industrial e de serviços. Será uma excelente oportunidade para networking e novos negócios.",
    "Para mais informações sobre datas, horários e como participar da Expomarau 2025, recomendo entrar em contato com a organização do evento.",
    "A Expomarau é tradicionalmente um dos maiores eventos de Marabá, reunindo empresários, produtores rurais e visitantes de toda a região do Pará."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// Handler principal
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas aceitar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Simular delay de rede
    await delay(500 + Math.random() * 1000);

    // Gerar resposta simulada
    const response = generateMockResponse(message);

    return res.status(200).json({ 
      response: response,
      timestamp: new Date().toISOString(),
      mode: 'development'
    });

  } catch (error) {
    console.error('Erro na API simulada do Gemini:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor (simulado)',
      details: error.message 
    });
  }
}