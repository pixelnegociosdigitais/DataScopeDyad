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

class DeepseekService {
  private chatHistory: Map<string, DeepseekMessage[]> = new Map();
  private apiKey: string | null = LOCAL_API_KEY;

  /**
   * Prompt do sistema para responder qualquer tipo de pergunta
   */
  private getSystemPrompt(): string {
    return `Você é um assistente inteligente e versátil que pode responder a qualquer tipo de pergunta. Você deve fornecer respostas precisas, completas e adaptadas ao contexto da pergunta, abrangendo qualquer tema solicitado pelo usuário.

INSTRUÇÕES IMPORTANTES:
1. Responda a QUALQUER pergunta que o usuário fizer, independentemente do tópico
2. Para perguntas sobre Expomarau, forneça informações detalhadas e atualizadas
3. Para outros assuntos, use seu conhecimento geral para dar respostas completas e úteis
4. Seja informativo, prestativo e profissional em todas as respostas
5. Quando não souber uma informação específica, seja honesto sobre as limitações do seu conhecimento

INSTRUÇÕES ESPECÍFICAS PARA EXPOMARAU:
- Para perguntas sobre PROGRAMAÇÃO e SHOWS da Expomarau 2025, consulte prioritariamente as informações do link:
  https://www.tuaradio.com.br/Tua-Radio-Alvorada/noticias/geral/10-10-2025/inicia-a-expomarau-2025-no-parque-lauro-ricieri-bortolon
- Este link contém a programação oficial completa da Expomarau 2025 (09 a 12 de outubro)
- Sempre mencione este link quando responder sobre shows e programação da Expomarau

- Para perguntas sobre SOBERANAS da Expomarau 2025, consulte prioritariamente as informações do link:
  https://www.acim-marau.com.br/noticias-geral/551-nova-corte-de-soberanas-da-expomarau-2025-e-formada
- Este link contém informações oficiais sobre a nova corte de soberanas da Expomarau 2025
- Sempre mencione este link quando responder sobre soberanas da Expomarau

- Para outras informações sobre Expomarau, você pode sugerir consultar os sites oficiais:
  - Site oficial: https://expomarau.com.br/
  - Notícias Vang FM: https://www.vangfm.com.br/noticias

INFORMAÇÕES SOBRE A PROGRAMAÇÃO DA EXPOMARAU 2025:
A 18ª edição da ExpoMarau acontece de 09 a 12 de outubro de 2025, no Parque Lauro Ricieri Bortolon.

HORÁRIOS DE FUNCIONAMENTO:
- Sexta (10/10) e Sábado (11/10): 10h às 22h
- Domingo (12/10): 10h às 18h

PRINCIPAIS SHOWS E ATRAÇÕES:
SEXTA-FEIRA (10/10):
- 19h: Traia Véia + Bailaço (Arena Expomarau music)
- 19h30: Nave Som (Vila Gastronômica)
- 21h30: Tchê Barbaridade (Vila Gastronômica)
- 23h: Traia Véia (Arena Expomarau music)

SÁBADO (11/10):
- 19h: Matogrosso e Mathias + Banda Rosa's + DJ Chapeleiro Maluco (Arena Expomarau music)
- 21h: Cristiano Esberce (Vila Gastronômica)
- 23h30: Matogrosso e Mathias (Arena Expomarau music)

DOMINGO (12/10):
- 10h: Arena do Dia das Crianças (personagens, brinquedos, teatro, maquiagem artística)
- 19h: DJ Ari SL + Turma do Pagode (Arena Expomarau music)
- 20h30: Turma do Pagode (Arena Expomarau music)

PALESTRAS E EVENTOS TÉCNICOS:
- Arena Inovação: Palestras sobre agronegócio, tecnologia, inovação e empreendedorismo
- Vila Gastronômica: Shows musicais e apresentações culturais
- Estande ACIM: Eventos institucionais e apresentações da Banda Santa Cecília

INFORMAÇÕES SOBRE AS SOBERANAS DA EXPOMARAU 2025:
Com base nas informações oficiais, a nova corte de soberanas da Expomarau 2025 foi formada em 7 de dezembro, após seleção na sede da AABB com 19 candidatas:

🌟 Rainha: Liliana Trentini
🌟 1ª Princesa: Milena Pereto Pagnussat  
🌟 2ª Princesa: Fabiola Trento

As candidatas foram avaliadas por júri técnico nos critérios: Simpatia, Comunicação, Postura/Elegância, Beleza, Desenvoltura e Conhecimentos gerais sobre o município e a Expomarau.

TÓPICOS QUE VOCÊ PODE ABORDAR (mas não se limite a estes):
- Informações sobre Expomarau 2025 (datas, shows, expositores, etc.)
- Questões técnicas e de programação
- Ciência, tecnologia e inovação
- História, geografia e cultura
- Negócios e economia
- Saúde e bem-estar
- Educação e aprendizado
- Entretenimento e lazer
- Qualquer outro assunto que o usuário considerar relevante

Responda sempre em português brasileiro de forma clara, objetiva e adaptada ao nível de conhecimento demonstrado na pergunta.`;
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
   * Adiciona mensagem ao histórico do chat
   */
  private addToHistory(chatId: string, message: DeepseekMessage): void {
    if (!this.chatHistory.has(chatId)) {
      this.chatHistory.set(chatId, []);
    }
    this.chatHistory.get(chatId)!.push(message);
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