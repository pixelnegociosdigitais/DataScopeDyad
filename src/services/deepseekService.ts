// Serviço para integração com a API do Deepseek
// Baseado na estrutura do serviço Gemini existente

// Configuração da API do Deepseek
const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

if (!API_KEY) {
  console.warn('Chave da API do Deepseek não encontrada. Verifique se DEEPSEEK_API_KEY está configurada no arquivo .env');
}

export interface DeepseekMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface DeepseekResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

class DeepseekService {
  private chatHistory: Map<string, DeepseekMessage[]> = new Map();

  /**
   * Prompt especializado para Expomarau 2025 e assuntos gerais
   */
  private getSystemPrompt(): string {
    return `Você é um assistente especializado em Expomarau 2025, mas também pode responder sobre outros assuntos gerais. Sua especialidade principal é a Expomarau 2025, que é uma feira de exposições e eventos que acontece na cidade de MARAU, no estado do RIO GRANDE DO SUL, Brasil.

INFORMAÇÕES IMPORTANTES SOBRE A LOCALIZAÇÃO DA EXPOMARAU:
- A Expomarau acontece em MARAU/RS (Rio Grande do Sul)
- Marau é uma cidade localizada no estado do Rio Grande do Sul

INSTRUÇÕES IMPORTANTES:
1. Sua especialidade principal é a Expomarau 2025, mas você pode responder sobre outros assuntos
2. Para perguntas sobre Expomarau, seja detalhado e específico
3. Para perguntas sobre a cidade de Marau/RS, forneça informações úteis
4. Para outros assuntos, responda de forma útil e informativa
5. Seja sempre informativo, prestativo e profissional
6. SEMPRE mencione que a Expomarau acontece em Marau/RS quando perguntado sobre localização
7. Responda de forma natural, descontraída, sem incluir links ou referências externas nas suas respostas

TÓPICOS PRIORITÁRIOS (EXPOMARAU 2025):
- Informações gerais sobre a Expomarau 2025
- Datas, horários e localização do evento (Marau/RS)
- Expositores e empresas participantes
- Programação de atividades
- Vila Gastronômica
- Arena Inovação
- Como participar ou visitar
- Contatos e informações organizacionais
- Novidades e destaques do evento

TÓPICOS SECUNDÁRIOS:
- Informações sobre a cidade de Marau/RS
- Assuntos gerais (tecnologia, cultura, educação, etc.)
- Outras perguntas que possam ser úteis ao usuário

Responda sempre em português brasileiro de forma clara, objetiva e natural.`;
  }

  /**
   * Verifica se a mensagem é relacionada à Expomarau 2025 ou outros tópicos que o assistente pode abordar
   */
  private isValidMessage(message: string): boolean {
    // Agora o assistente pode responder sobre qualquer assunto
    // Mantemos a função para compatibilidade, mas sempre retorna true
    return true;
  }

  /**
   * Envia uma mensagem para o Deepseek e retorna a resposta
   */
  async sendMessage(message: string, sessionId: string = 'default'): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('API do Deepseek não configurada. Verifique se a chave DEEPSEEK_API_KEY está definida.');
    }

    try {
      // Adiciona a mensagem do usuário ao histórico
      this.addMessageToHistory(sessionId, {
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Prepara as mensagens para o Deepseek (incluindo histórico da sessão)
      const messages = [
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        ...this.getChatHistory(sessionId).map(msg => ({
          role: msg.role === 'model' ? 'assistant' : msg.role,
          content: msg.content
        }))
      ];

      const requestBody = {
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.95,
        stream: false
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro na API do Deepseek:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          hasApiKey: !!API_KEY
        });
        
        // Mensagens de erro mais específicas
        if (response.status === 400) {
          throw new Error('Erro na requisição: Verifique se a chave da API está correta.');
        } else if (response.status === 401) {
          throw new Error('Acesso negado: Chave da API inválida ou sem permissões.');
        } else if (response.status === 429) {
          throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
        } else if (response.status >= 500) {
          throw new Error('Erro interno do servidor Deepseek. Tente novamente mais tarde.');
        }
        
        throw new Error(`Erro na API do Deepseek: ${response.status} ${response.statusText}`);
      }

      const data: DeepseekResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Nenhuma resposta foi gerada pelo Deepseek.');
      }

      const deepseekResponse = data.choices[0].message.content;

      // Filtro adicional: verifica se a resposta está relacionada à Expomarau 2025
      const filteredResponse = this.filterResponse(deepseekResponse, message);

      // Adiciona a resposta do Deepseek ao histórico
      this.addMessageToHistory(sessionId, {
        role: 'assistant',
        content: filteredResponse,
        timestamp: new Date(),
      });

      return filteredResponse;

    } catch (error) {
      console.error('Erro ao enviar mensagem para o Deepseek:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Não foi possível processar sua mensagem. Tente novamente.');
    }
  }

  /**
   * Filtra a resposta (agora permite qualquer assunto)
   */
  private filterResponse(response: string, originalMessage: string): string {
    // Agora o assistente pode responder sobre qualquer assunto
    // Não há mais necessidade de filtrar por tópico específico
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

export const deepseekService = new DeepseekService();
export default deepseekService;