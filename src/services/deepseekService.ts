// Serviço para integração com a API do DeepSeek via rota serverless segura
// A chave da API fica protegida no servidor, não exposta no cliente

// URL da nossa API interna (serverless)
const API_URL = '/api/deepseek';

// Para desenvolvimento local, verificar se existe chave local
const LOCAL_API_KEY = import.meta.env.DEV ? (import.meta.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY) : null;
const IS_DEVELOPMENT = import.meta.env.DEV;
const IS_PRODUCTION = import.meta.env.PROD;

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
4. Para obter informações atualizadas, você pode pesquisar nos seguintes sites oficiais:
   - Site oficial: https://expomarau.com.br/
   - Notícias Vang FM: https://www.vangfm.com.br/noticias
   - Notícias Tua Rádio: https://www.tuaradio.com.br/Tua-Radio-Alvorada/noticias
   - ACIM Marau: https://www.acim-marau.com.br/noticias-geral/573-shows-da-expomarau-2025-sao-oficialmente-lancados
5. Quando não souber uma informação específica, sugira que o usuário consulte os sites oficiais mencionados acima

TÓPICOS QUE VOCÊ PODE ABORDAR:
- Informações gerais sobre a Expomarau 2025
- Datas, horários e localização do evento
- Expositores e empresas participantes
- Programação de atividades e shows
- Como participar ou visitar
- Contatos e informações organizacionais
- Novidades e destaques do evento
- Informações sobre ingressos e valores

FONTES DE INFORMAÇÃO PRIORITÁRIAS:
Sempre que possível, busque informações atualizadas nos sites oficiais mencionados acima para fornecer as informações mais precisas e recentes sobre a Expomarau 2025.

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
   * Envia mensagem para o DeepSeek
   */
  async sendMessage(message: string, sessionId: string = 'default'): Promise<string> {
    try {
      // Em produção, sempre usar a API serverless
      if (IS_PRODUCTION || !LOCAL_API_KEY) {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Erro na API: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.response;

        // Adicionar mensagens ao histórico
        const userMessage: DeepseekMessage = {
          role: 'user',
          content: message,
          timestamp: new Date(),
        };

        const modelMessage: DeepseekMessage = {
          role: 'model',
          content: responseText,
          timestamp: new Date(),
        };

        this.addToHistory(sessionId, userMessage);
        this.addToHistory(sessionId, modelMessage);

        return responseText;
      }

      // Código para desenvolvimento local (quando há chave local)
      if (!this.apiKey || this.apiKey === 'PLACEHOLDER_API_KEY') {
        throw new Error('Chave da API do DeepSeek não configurada');
      }

      const requestBody = {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1024
      };

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${this.apiKey}`,
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

        if (response.status === 401 || response.status === 403) {
          throw new Error('Acesso negado: Chave da API inválida ou sem permissões');
        } else if (response.status === 429) {
          throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos');
        } else if (response.status >= 500) {
          throw new Error('Erro interno do servidor DeepSeek. Tente novamente mais tarde');
        }

        throw new Error(`Erro na API do DeepSeek: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data?.choices?.[0]?.message?.content;

      if (!responseText) {
        throw new Error('Nenhuma resposta foi gerada pelo DeepSeek');
      }

      // Adicionar mensagens ao histórico
      const userMessage: DeepseekMessage = {
        role: 'user',
        content: message,
        timestamp: new Date(),
      };

      const modelMessage: DeepseekMessage = {
        role: 'model',
        content: responseText,
        timestamp: new Date(),
      };

      this.addToHistory(sessionId, userMessage);
      this.addToHistory(sessionId, modelMessage);

      return responseText;

    } catch (error) {
      console.error('Erro ao enviar mensagem para DeepSeek:', error);
      throw error;
    }
  }

  /**
   * Adiciona uma mensagem ao histórico da sessão
   */
  private addToHistory(sessionId: string, message: DeepseekMessage): void {
    if (!this.chatHistory.has(sessionId)) {
      this.chatHistory.set(sessionId, []);
    }
    this.chatHistory.get(sessionId)!.push(message);
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
    // Em produção, sempre consideramos configurado pois a chave está no servidor
    if (IS_PRODUCTION) {
      return true;
    }
    
    // Em desenvolvimento, verificamos se há chave local
    return !!this.apiKey && this.apiKey !== 'PLACEHOLDER_API_KEY';
  }

  /**
   * Obtém informações sobre a configuração
   */
  getConfigInfo(): { configured: boolean; hasKey: boolean } {
    return {
      configured: this.isConfigured(),
      hasKey: IS_PRODUCTION || !!this.apiKey,
    };
  }
}

export const deepseekService = new DeepseekService();
export default deepseekService;