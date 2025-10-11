// Serviço simplificado para integração com a API do Google Gemini
// Usando fetch nativo para evitar problemas de dependências

// Configuração da API do Gemini
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

if (!API_KEY) {
  console.warn('Chave da API do Gemini não encontrada. Verifique se GEMINI_API_KEY está configurada no arquivo .env.local');
}

export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

class GeminiService {
  private chatHistory: Map<string, GeminiMessage[]> = new Map();

  /**
   * Prompt especializado para Expomarau 2025
   */
  private getSystemPrompt(): string {
    return `Você é um assistente especializado em Expomarau 2025. Você deve responder APENAS sobre tópicos relacionados à Expomarau 2025, que é uma feira de exposições e eventos em Marabá, Pará.

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
      'expomarau', 'expo marau', 'marabá', 'pará', 'feira', 'exposição', 
      'evento', 'expositores', 'programação', 'visitação', '2025'
    ];
    
    const messageLower = message.toLowerCase();
    return keywords.some(keyword => messageLower.includes(keyword));
  }

  /**
   * Envia uma mensagem para o Gemini e retorna a resposta
   */
  async sendMessage(message: string, sessionId: string = 'default'): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('API do Gemini não configurada. Verifique se a chave GEMINI_API_KEY está definida.');
    }

    try {
      // Adiciona a mensagem do usuário ao histórico
      this.addMessageToHistory(sessionId, {
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Combina o prompt do sistema com a mensagem do usuário
      const fullMessage = `${this.getSystemPrompt()}\n\nUsuário: ${message}`;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: fullMessage
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      };

      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro na API do Gemini:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          url: `${API_URL}?key=${API_KEY?.substring(0, 10)}...`,
          hasApiKey: !!API_KEY
        });
        
        // Mensagens de erro mais específicas
        if (response.status === 400) {
          // Verificar se é erro de API key inválida
          if (errorData.error && errorData.error.message && errorData.error.message.includes('API key not valid')) {
            throw new Error('Chave da API do Gemini inválida. Verifique se a chave está correta no arquivo .env.local');
          }
          throw new Error('Erro na requisição: Verifique se a chave da API está correta.');
        } else if (response.status === 403) {
          throw new Error('Acesso negado: Chave da API inválida ou sem permissões.');
        } else if (response.status === 429) {
          throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
        } else if (response.status >= 500) {
          throw new Error('Erro interno do servidor Gemini. Tente novamente mais tarde.');
        }
        
        throw new Error(`Erro na API do Gemini: ${response.status} ${response.statusText}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('Nenhuma resposta foi gerada pelo Gemini.');
      }

      const geminiResponse = data.candidates[0].content.parts[0].text;

      // Filtro adicional: verifica se a resposta está relacionada à Expomarau 2025
      const filteredResponse = this.filterResponse(geminiResponse, message);

      // Adiciona a resposta do Gemini ao histórico
      this.addMessageToHistory(sessionId, {
        role: 'model',
        content: filteredResponse,
        timestamp: new Date(),
      });

      return filteredResponse;

    } catch (error) {
      console.error('Erro ao enviar mensagem para o Gemini:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Não foi possível processar sua mensagem. Tente novamente.');
    }
  }

  /**
   * Filtra a resposta para garantir que seja sobre Expomarau 2025
   */
  private filterResponse(response: string, originalMessage: string): string {
    // Se a mensagem original não é sobre Expomarau, retorna resposta padrão
    if (!this.isExpomarauRelated(originalMessage)) {
      return 'Desculpe, eu sou especializado apenas em informações sobre a Expomarau 2025. Posso ajudá-lo com informações sobre datas, expositores, programação, localização e tudo relacionado à feira. Como posso ajudá-lo com a Expomarau 2025?';
    }

    // Verifica se a resposta contém informações relevantes sobre Expomarau
    const responseLower = response.toLowerCase();
    const expomarauKeywords = ['expomarau', 'feira', 'exposição', 'marabá', 'evento', 'expositores'];
    
    const hasRelevantContent = expomarauKeywords.some(keyword => 
      responseLower.includes(keyword)
    );

    // Se a resposta não parece ser sobre Expomarau, adiciona contexto
    if (!hasRelevantContent) {
      return `Sobre a Expomarau 2025: ${response}\n\nSe você tiver mais dúvidas específicas sobre a Expomarau 2025, ficarei feliz em ajudar!`;
    }

    return response;
  }

  /**
   * Adiciona uma mensagem ao histórico da sessão
   */
  private addMessageToHistory(sessionId: string, message: GeminiMessage): void {
    if (!this.chatHistory.has(sessionId)) {
      this.chatHistory.set(sessionId, []);
    }
    this.chatHistory.get(sessionId)!.push(message);
  }

  /**
   * Obtém o histórico de uma sessão
   */
  getChatHistory(sessionId: string = 'default'): GeminiMessage[] {
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
    return !!API_KEY && API_KEY !== 'PLACEHOLDER_API_KEY';
  }

  /**
   * Obtém informações sobre a configuração
   */
  getConfigInfo(): { configured: boolean; hasKey: boolean } {
    return {
      configured: this.isConfigured(),
      hasKey: !!API_KEY,
    };
  }
}

export const geminiService = new GeminiService();
export default geminiService;