// Serviço para integração com a API do DeepSeek via rota serverless segura
// A chave da API fica protegida no servidor, não exposta no cliente

// URL da nossa API interna (serverless)
const API_URL = '/api/deepseek';

// Para desenvolvimento local, verificar se existe chave local
const LOCAL_API_KEY = import.meta.env.DEV ? (import.meta.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY) : null;
const IS_DEVELOPMENT = import.meta.env.DEV;

if (IS_DEVELOPMENT && !LOCAL_API_KEY) {
  console.warn('Chave da API do DeepSeek não encontrada para desenvolvimento local. Verifique se VITE_DEEPSEEK_API_KEY está configurada no arquivo .env.local');
}

export interface DeepseekMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

interface DeepseekChatResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

class DeepseekService {
  private chatHistory: Map<string, DeepseekMessage[]> = new Map();
  private apiKey: string | null = LOCAL_API_KEY;

  /**
   * Prompt especializado para Expomarau 2025
   */
  private getSystemPrompt(): string {
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
  private isExpomarauRelated(message: string): boolean {
    const keywords = [
      'expomarau', 'expo marau', 'marau', 'rio grande do sul', 'feira', 'exposição',
      'evento', 'expositores', 'programação', 'visitação', '2025'
    ];

    const messageLower = message.toLowerCase();
    return keywords.some(keyword => messageLower.includes(keyword));
  }

  /**
   * Envia uma mensagem para o DeepSeek via API serverless segura
   */
  async sendMessage(message: string, sessionId: string = 'default'): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('API do DeepSeek não configurada. Verifique a configuração do servidor.');
    }

    try {
      // Adiciona a mensagem do usuário ao histórico
      this.addMessageToHistory(sessionId, {
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Em desenvolvimento, tenta primeiro a API serverless, se falhar usa API direta
      if (IS_DEVELOPMENT && LOCAL_API_KEY) {
        try {
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
          });

          if (!response.ok) {
            console.warn('API serverless não disponível em desenvolvimento, usando API direta do DeepSeek');
            return await this.sendMessageDirect(message, sessionId);
          }

          const data = await response.json();
          if (!data.response) {
            throw new Error('Nenhuma resposta foi gerada pelo DeepSeek.');
          }

          // Adiciona a resposta ao histórico
          this.addMessageToHistory(sessionId, {
            role: 'model',
            content: data.response,
            timestamp: new Date(),
          });

          return data.response;
        } catch (error) {
          console.warn('Erro na API serverless, tentando API direta:', error);
          return await this.sendMessageDirect(message, sessionId);
        }
      }

      // Em produção, usa apenas a API serverless
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro na API serverless DeepSeek:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData
        });

        if (response.status === 429) {
          throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
        } else if (response.status >= 500) {
          throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
        }

        throw new Error(errorData.error || `Erro na API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.response) {
        throw new Error('Nenhuma resposta foi gerada pelo DeepSeek.');
      }

      // Adiciona a resposta ao histórico
      this.addMessageToHistory(sessionId, {
        role: 'model',
        content: data.response,
        timestamp: new Date(),
      });

      return data.response;

    } catch (error) {
      console.error('Erro ao enviar mensagem para o DeepSeek:', error);
      const fallback = 'Desculpe, houve um problema ao consultar o DeepSeek agora. Posso ajudar com informações gerais sobre a Expomarau 2025.';
      this.addMessageToHistory(sessionId, {
        role: 'model',
        content: fallback,
        timestamp: new Date(),
      });
      return fallback;
    }
  }

  /**
   * Método para desenvolvimento local - chama API direta do DeepSeek
   */
  private async sendMessageDirect(message: string, sessionId: string): Promise<string> {
    const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

    const requestBody = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1024
    };

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${LOCAL_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro na API do DeepSeek:', errorData);
      const fallback = 'Desculpe, não consegui obter resposta do DeepSeek no momento. Tente novamente em instantes.';
      const safeText = this.filterResponse(fallback, message);
      this.addMessageToHistory(sessionId, {
        role: 'model',
        content: safeText,
        timestamp: new Date(),
      });
      return safeText;
    }

    const data: DeepseekChatResponse = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) {
      throw new Error('Nenhuma resposta foi gerada pelo DeepSeek.');
    }

    const filteredResponse = this.filterResponse(content, message);

    this.addMessageToHistory(sessionId, {
      role: 'model',
      content: filteredResponse,
      timestamp: new Date(),
    });

    return filteredResponse;
  }

  /**
   * Filtra a resposta para garantir que seja sobre Expomarau 2025
   */
  private filterResponse(response: string, originalMessage: string): string {
    if (!this.isExpomarauRelated(originalMessage)) {
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

  /**
   * Adiciona uma mensagem ao histórico da sessão
   */
  private addMessageToHistory(sessionId: string, message: DeepseekMessage): void {
    if (!this.chatHistory.has(sessionId)) {
      this.chatHistory.set(sessionId, []);
    }
    this.chatHistory.get(sessionId)!.push(message);
  }

  /**
   * Obtém o histórico de uma sessão
   */
  getChatHistory(sessionId: string = 'default'): DeepseekMessage[] {
    return this.chatHistory.get(sessionId) || [];
  }

  /**
   * Limpa o histórico de uma sessão
   */
  clearChatHistory(sessionId: string = 'default'): void {
    this.chatHistory.delete(sessionId);
  }

  /**
   * Verifica se a API está configurada corretamente
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'PLACEHOLDER_API_KEY';
  }

  /**
   * Obtém informações sobre a configuração
   */
  getConfigInfo(): { configured: boolean; hasKey: boolean } {
    return {
      configured: this.isConfigured(),
      hasKey: !!this.apiKey,
    };
  }
}

export const deepseekService = new DeepseekService();
export default deepseekService;