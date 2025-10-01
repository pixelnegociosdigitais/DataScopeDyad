import React, { useState, useEffect, useRef } from 'react';
import { SendIcon } from '../../../components/icons/SendIcon';
import { supabase } from '../../integrations/supabase/client'; // Importar supabase

interface MessageInputProps {
    chatId: string; // Nova prop para o ID do chat
    onSendMessage: (content: string) => void;
    disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ chatId, onSendMessage, disabled = false }) => {
    const [message, setMessage] = useState('');
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const broadcastTypingStatus = (isTyping: boolean) => {
        if (!chatId || !supabase.auth.currentUser) return;
        supabase.channel(`chat_${chatId}`).send({
            type: 'broadcast',
            event: 'typing_status',
            payload: { userId: supabase.auth.currentUser.id, isTyping },
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMessage(value);

        // Transmitir início da digitação se o campo não estava vazio e não há timeout ativo
        if (value.length > 0 && typingTimeoutRef.current === null) {
            broadcastTypingStatus(true);
        }

        // Limpar timeout anterior, se houver
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Definir um novo timeout para transmitir o fim da digitação após um pequeno atraso
        typingTimeoutRef.current = setTimeout(() => {
            broadcastTypingStatus(false);
            typingTimeoutRef.current = null;
        }, 1500); // Parar de digitar após 1.5 segundos sem input
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSendMessage(message.trim());
            setMessage('');
            // Garantir que o status de digitação seja parado após enviar a mensagem
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
            broadcastTypingStatus(false);
        }
    };

    // Limpar o timeout ao desmontar o componente
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    return (
        <form onSubmit={handleSubmit} className="flex items-center p-4 bg-white border-t border-gray-200">
            <input
                type="text"
                value={message}
                onChange={handleInputChange}
                placeholder="Digite sua mensagem..."
                className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-light text-gray-700 mr-3"
                disabled={disabled}
            />
            <button
                type="submit"
                className="p-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={disabled || !message.trim()}
                aria-label="Enviar mensagem"
            >
                <SendIcon className="h-6 w-6" />
            </button>
        </form>
    );
};

export default MessageInput;