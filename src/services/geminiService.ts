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

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: message
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
        console.error('Erro na API do Gemini:', errorData);
        throw new Error(`Erro na API do Gemini: ${response.status} ${response.statusText}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('Nenhuma resposta foi gerada pelo Gemini.');
      }

      const geminiResponse = data.candidates[0].content.parts[0].text;

      // Adiciona a resposta do Gemini ao histórico
      this.addMessageToHistory(sessionId, {
        role: 'model',
        content: geminiResponse,
        timestamp: new Date(),
      });

      return geminiResponse;

    } catch (error) {
      console.error('Erro ao enviar mensagem para o Gemini:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Não foi possível processar sua mensagem. Tente novamente.');
    }
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