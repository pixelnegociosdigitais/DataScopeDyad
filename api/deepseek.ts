import type { VercelRequest, VercelResponse } from '@vercel/node';

// Configuração da API do DeepSeek (apenas no servidor)
const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/chat/completions';

/**
 * Prompt especializado para Expomarau 2025
 */
function getSystemPrompt(): string {
  return `Você é um assistente especializado em Expomarau 2025. Você deve responder APENAS sobre tópicos relacionados à Expomarau 2025, que é uma feira de exposições e eventos em Marau, Rio Grande do Sul, Brasil.

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
}

/**
 * Verifica se a mensagem é relacionada à Expomarau 2025
 */
function isExpomarauRelated(message: string): boolean {
  const keywords = [
    'expomarau', 'expo marau', 'marau', 'rio grande do sul', 'feira', 'exposição',
    'evento', 'expositores', 'programação', 'visitação', '2025'
  ];

  const messageLower = message.toLowerCase();
  return keywords.some(keyword => messageLower.includes(keyword));
}

/**
 * Filtra a resposta para garantir que seja sobre Expomarau 2025
 */
function filterResponse(response: string, originalMessage: string): string {
  if (!isExpomarauRelated(originalMessage)) {
    return 'Desculpe, eu sou especializado apenas em informações sobre a Expomarau 2025. Posso ajudá-lo com informações sobre datas, expositores, programação, localização e tudo relacionado à feira. Como posso ajudá-lo com a Expomarau 2025?';
  }

  const responseLower = response.toLowerCase();
  const expomarauKeywords = ['expomarau', 'feira', 'exposição', 'marau', 'evento', 'expositores'];

  const hasRelevantContent = expomarauKeywords.some(keyword =>
    responseLower.includes(keyword)
  );

  if (!hasRelevantContent) {
    return `Sobre a Expomarau 2025: ${response}\n\nSe você tiver mais dúvidas específicas sobre a Expomarau 2025, ficarei feliz em ajudar!`;
  }

  return response;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!API_KEY) {
    console.error('DEEPSEEK_API_KEY não configurada');
    return res.status(500).json({
      error: 'API do DeepSeek não configurada no servidor'
    });
  }

  try {
    const { message } = req.body as { message?: string };

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    const requestBody = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1024
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro na API do DeepSeek:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });

      if (response.status === 400) {
        return res.status(400).json({ error: 'Erro na requisição para o DeepSeek' });
      } else if (response.status === 401 || response.status === 403) {
        return res.status(500).json({ error: 'Acesso negado: Chave da API inválida ou sem permissões' });
      } else if (response.status === 429) {
        return res.status(429).json({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos' });
      } else if (response.status >= 500) {
        return res.status(500).json({ error: 'Erro interno do servidor DeepSeek. Tente novamente mais tarde' });
      }

      return res.status(500).json({ error: `Erro na API do DeepSeek: ${response.status}` });
    }

    const data = await response.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: 'Nenhuma resposta foi gerada pelo DeepSeek' });
    }

    const filteredResponse = filterResponse(content, message);
    return res.status(200).json({ response: filteredResponse });

  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    return res.status(500).json({
      error: 'Não foi possível processar sua mensagem. Tente novamente.'
    });
  }
}