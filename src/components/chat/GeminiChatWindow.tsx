import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../../types';
import { geminiService, GeminiMessage } from '../../services/geminiService';
import { showError } from '../../utils/toast';
import { ArrowLeftIcon } from '../../../components/icons/ArrowLeftIcon';
import { SendIcon } from '../../../components/icons/SendIcon';

interface GeminiChatWindowProps {
  currentUser: User;
  onBack: () => void;
}

const GeminiChatWindow: React.FC<GeminiChatWindowProps> = ({ currentUser, onBack }) => {
  const [messages, setMessages] = useState<GeminiMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = `gemini-${currentUser.id}`;

  useEffect(() => {
    // Verificar se o Gemini está configurado
    const configInfo = geminiService.getConfigInfo();
    setIsConfigured(configInfo.configured);

    // Carregar histórico existente
    const history = geminiService.getChatHistory(sessionId);
    setMessages(history);

    // Adicionar mensagem de boas-vindas se não houver histórico
    if (history.length === 0 && configInfo.configured) {
      const welcomeMessage: GeminiMessage = {
        role: 'model',
        content: `Olá ${currentUser.fullName}! Sou o Gemini, seu assistente de IA. Como posso ajudá-lo hoje?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [currentUser, sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!isConfigured) {
      showError('Gemini não está configurado. Verifique se a chave da API está definida.');
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Adicionar mensagem do usuário imediatamente
      const newUserMessage: GeminiMessage = {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newUserMessage]);

      // Enviar para o Gemini
      const response = await geminiService.sendMessage(userMessage, sessionId);

      // Adicionar resposta do Gemini
      const geminiMessage: GeminiMessage = {
        role: 'model',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, geminiMessage]);

    } catch (error) {
      console.error('Erro ao enviar mensagem para o Gemini:', error);
      showError(error instanceof Error ? error.message : 'Erro ao comunicar com o Gemini');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    geminiService.clearChatHistory(sessionId);
    setMessages([]);
    const welcomeMessage: GeminiMessage = {
      role: 'model',
      content: `Olá ${currentUser.fullName}! Sou o Gemini, seu assistente de IA. Como posso ajudá-lo hoje?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  if (!isConfigured) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <button
            onClick={onBack}
            className="mr-3 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <span className="text-lg font-bold">G</span>
            </div>
            <h3 className="text-xl font-bold">Chat com Gemini</h3>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Gemini não configurado
            </h3>
            <p className="text-gray-600 mb-4">
              Para usar o chat com Gemini, é necessário configurar a chave da API no arquivo .env.local
            </p>
            <p className="text-sm text-gray-500">
              Adicione: GEMINI_API_KEY=sua_chave_aqui
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-3 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
              <span className="text-lg font-bold">G</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">Chat com Gemini</h3>
              <p className="text-sm opacity-90">Assistente de IA do Google</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={clearChat}
          className="px-3 py-1 text-sm bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
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
                  : 'bg-gray-100 text-gray-800 border'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 border rounded-lg px-4 py-2 max-w-xs">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600">Gemini está digitando...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem para o Gemini..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiChatWindow;