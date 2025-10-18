// Serviço para integração com a API da Perplexity
// Baseado na estrutura do serviço Gemini existente

// Configuração da API da Perplexity
const API_KEY = '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';
const API_URL = 'https://api.perplexity.ai/chat/completions';

if (!API_KEY) {
  console.warn('Chave da API da Perplexity não encontrada.');
}

export interface PerplexityMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

class PerplexityService {
  private chatHistory: Map<string, PerplexityMessage[]> = new Map();

  /**
   * Prompt especializado para Expomarau 2025 e assuntos gerais
   */
  private getSystemPrompt(): string {
    return `Você é um assistente especializado em Expomarau 2025, mas também pode responder sobre outros assuntos gerais. Sua especialidade principal é a Expomarau 2025, que é uma feira de exposições e eventos que acontece na cidade de MARAU, no estado do RIO GRANDE DO SUL, Brasil.

INFORMAÇÕES IMPORTANTES SOBRE A LOCALIZAÇÃO DA EXPOMARAU:
- A Expomarau acontece em MARAU/RS (Rio Grande do Sul)
- Marau é uma cidade localizada no estado do Rio Grande do Sul

INFORMAÇÕES SOBRE A CIDADE DE MARAU/RS:
- Prefeita atual: Naura Bordignon
- Vice-prefeito atual: Vilmo Zanchin (também Secretário de Agricultura e Desenvolvimento Rural)
- Marau possui 11 secretarias municipais e 1 departamento
- Localizada no Norte do Rio Grande do Sul, região do planalto médio
- Área de mais de 650 quilômetros quadrados
- Site oficial da Prefeitura: pmmarau.com.br
- Para informações detalhadas sobre poder legislativo, executivo e judiciário, consulte o site da Prefeitura Municipal (pmmarau.com.br) ou ACIM (Associação Comercial e Industrial de Marau)

ESTRUTURA ADMINISTRATIVA ATUAL (2025):
- Prefeita: Naura Bordignon
- Vice-prefeito: Vilmo Zanchin
- Secretário de Agricultura e Desenvolvimento Rural: Vilmo Zanchin (acumula com vice-prefeitura)
- Total de 11 secretarias municipais + 1 departamento
- Nova Secretaria de Esporte e Lazer foi criada na atual gestão

INSTRUÇÕES IMPORTANTES:
1. Sua especialidade principal é a Expomarau 2025, mas você pode responder sobre outros assuntos
2. Para perguntas sobre Expomarau, seja detalhado e específico
3. Para perguntas sobre a cidade de Marau/RS, use as informações fornecidas acima. Se não souber uma informação específica, oriente o usuário a consultar o site oficial da Prefeitura (pmmarau.com.br)
4. Para informações sobre poder legislativo e executivo de Marau/RS, oriente a consultar os sites oficiais da Prefeitura Municipal ou da ACIM
5. Para outros assuntos, responda de forma útil e informativa
6. Seja sempre informativo, prestativo e profissional
7. SEMPRE mencione que a Expomarau acontece em Marau/RS quando perguntado sobre localização
8. Responda de forma natural, descontraída, sem incluir links ou referências externas nas suas respostas
9. CUIDADO EXTREMO: Não forneça informações incorretas ou desatualizadas. Se não tiver certeza sobre uma informação específica, seja honesto sobre isso e oriente a consultar fontes oficiais
10. Para informações municipais específicas (como secretários, vereadores, etc.), sempre oriente a consultar o site oficial da Prefeitura de Marau (pmmarau.com.br) para obter dados atualizados

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
- Informações sobre a cidade de Marau/RS (com cuidado especial para precisão)
- Assuntos gerais (tecnologia, cultura, educação, etc.)
- Outras perguntas que possam ser úteis ao usuário

Responda sempre em português brasileiro de forma clara, objetiva, natural e PRECISA.`;
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
   * Envia uma mensagem para a Perplexity e retorna a resposta
   */
  async sendMessage(message: string, sessionId: string = 'default'): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('API da Perplexity não configurada. Verifique se a chave está definida.');
    }

    try {
      // Adiciona a mensagem do usuário ao histórico
      this.addMessageToHistory(sessionId, {
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Prepara as mensagens para a Perplexity (incluindo histórico da sessão)
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
        model: 'llama-3.1-sonar-small-128k-online',
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
        console.error('Erro na API da Perplexity:', {
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
          throw new Error('Erro interno do servidor Perplexity. Tente novamente mais tarde.');
        }
        
        throw new Error(`Erro na API da Perplexity: ${response.status} ${response.statusText}`);
      }

      const data: PerplexityResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Nenhuma resposta foi gerada pela Perplexity.');
      }

      const perplexityResponse = data.choices[0].message.content;

      // Filtro adicional: verifica se a resposta está relacionada à Expomarau 2025
      const filteredResponse = this.filterResponse(perplexityResponse, message);

      // Adiciona a resposta da Perplexity ao histórico
      this.addMessageToHistory(sessionId, {
        role: 'assistant',
        content: filteredResponse,
        timestamp: new Date(),
      });

      return filteredResponse;

    } catch (error) {
      console.error('Erro ao enviar mensagem para a Perplexity:', error);
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
  private addMessageToHistory(sessionId: string, message: PerplexityMessage): void {
    if (!this.chatHistory.has(sessionId)) {
      this.chatHistory.set(sessionId, []);
    }
    this.chatHistory.get(sessionId)!.push(message);
  }

  /**
   * Obtém o histórico de uma sessão
   */
  getChatHistory(sessionId: string = 'default'): PerplexityMessage[] {
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

export const perplexityService = new PerplexityService();
export default perplexityService;