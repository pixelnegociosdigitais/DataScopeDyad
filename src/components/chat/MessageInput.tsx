import React, { useState } from 'react';
import { SendIcon } from '../../../components/icons/SendIcon'; // Assuming you'll create a SendIcon

interface MessageInputProps {
    onSendMessage: (content: string) => void;
    disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled = false }) => {
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSendMessage(message.trim());
            setMessage('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center p-4 bg-white border-t border-gray-200">
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
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