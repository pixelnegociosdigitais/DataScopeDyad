// API serverless para integração com Google Gemini
// Mantém a chave da API segura no servidor

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

    // Chave da API do Gemini (deve ser configurada nas variáveis de ambiente)
    const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!API_KEY) {
      console.error('GEMINI_API_KEY não configurada');
      return res.status(500).json({ error: 'Configuração da API não encontrada' });
    }

    // URL da API do Google Gemini
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

    // Prompt especializado para Expomarau 2025
    const systemPrompt = `Você é um assistente especializado em Expomarau 2025. Você deve responder APENAS sobre tópicos relacionados à Expomarau 2025, que é uma feira de exposições e eventos em Marabá, Pará.

INSTRUÇÕES IMPORTANTES:
1. Responda SOMENTE sobre Expomarau 2025
2. Se a pergunta não for sobre Expomarau 2025, responda educadamente que você só pode ajudar com informações sobre a Expomarau 2025
3. Seja informativo, prestativo e profissional
4. Se não souber uma informação específica sobre a Expomarau 2025, seja honesto e sugira onde a pessoa pode encontrar mais informações

TÓPICOS QUE VOCÊ PODE ABORDAR:
- Informações gerais sobre a Expomarau 2025
- Datas, horários e localização do evento
- Expositores e empresas participantes
- Programação de atividades
- Como participar ou visitar
- Contatos e informações organizacionais
- Novidades e destaques do evento

Responda sempre em português brasileiro de forma clara e objetiva.`;

    // Preparar o payload para a API do Gemini
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\nPergunta do usuário: ${message}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // Fazer requisição para a API do Gemini
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro na API do Gemini:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return res.status(response.status).json({ 
        error: `Erro na API do Gemini: ${response.status} ${response.statusText}` 
      });
    }

    const data = await response.json();

    // Verificar se há resposta válida
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Resposta inválida da API do Gemini:', data);
      return res.status(500).json({ error: 'Resposta inválida da API do Gemini' });
    }

    const geminiResponse = data.candidates[0].content.parts[0].text;

    return res.status(200).json({ 
      response: geminiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro interno na API do Gemini:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}