import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { perplexityService, PerplexityMessage } from '../../services/perplexityService';
import { User } from '../../../types';

interface PerplexityChatWindowProps {
  currentUser: User;
  onBack: () => void;
}

const PerplexityChatWindow: React.FC<PerplexityChatWindowProps> = ({ currentUser, onBack }) => {
  const [messages, setMessages] = useState<PerplexityMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sessionId = `perplexity-${currentUser.id}`;

  useEffect(() => {
    // Carregar histórico existente se houver
    const history = perplexityService.getChatHistory(sessionId);
    if (history.length > 0) {
      setMessages(history);
    } else {
      // Adicionar mensagem de boas-vindas
      const welcomeMessage: PerplexityMessage = {
        role: 'assistant',
        content: 'Olá! Sou seu assistente de IA especializado em Expomarau 2025 e assuntos gerais. Como posso ajudá-lo hoje?',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const showError = (message: string) => {
    const errorMessage: PerplexityMessage = {
      role: 'assistant',
      content: `❌ Erro: ${message}`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, errorMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Verificar se está configurado
      if (!perplexityService.isConfigured()) {
        showError('Perplexity não está configurado. Verifique se a chave da API está definida.');
        setIsLoading(false);
        return;
      }

      // Adicionar mensagem do usuário
      const newUserMessage: PerplexityMessage = {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newUserMessage]);

      // Enviar para a Perplexity
      const response = await perplexityService.sendMessage(userMessage, sessionId);

      // Adicionar resposta da Perplexity
      const perplexityMessage: PerplexityMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, perplexityMessage]);

    } catch (error) {
      console.error('Erro ao enviar mensagem para a Perplexity:', error);
      showError(error instanceof Error ? error.message : 'Erro ao comunicar com a Perplexity');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    perplexityService.clearChatHistory(sessionId);
    setMessages([]);
    const welcomeMessage: PerplexityMessage = {
      role: 'assistant',
      content: 'Olá! Sou seu assistente de IA especializado em Expomarau 2025 e assuntos gerais. Como posso ajudá-lo hoje?',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  // Verificar se está configurado
  if (!perplexityService.isConfigured()) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Perplexity AI</h2>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Perplexity não configurado
            </h3>
            <p className="text-gray-600 mb-4">
              Para usar o chat com Perplexity, é necessário configurar a chave da API no código
            </p>
            <p className="text-sm text-gray-500">
              A chave da API já foi configurada no código
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Perplexity AI</h2>
            <p className="text-sm opacity-90">Assistente de IA Perplexity</p>
          </div>
        </div>
        
        <button
          onClick={handleClearChat}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Limpar Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600">Perplexity está digitando...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Digite sua mensagem para a Perplexity..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerplexityChatWindow;