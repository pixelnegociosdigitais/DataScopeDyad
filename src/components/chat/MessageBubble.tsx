import React from 'react';
import { ChatMessage, User } from '../../../types';

interface MessageBubbleProps {
    message: ChatMessage;
    isCurrentUser: boolean;
    sender: User;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser, sender }) => {
    const messageTime = new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`flex items-end max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar (only for other users) */}
                {!isCurrentUser && (
                    <div className="flex-shrink-0 mr-2">
                        {sender.profilePictureUrl ? (
                            <img src={sender.profilePictureUrl} alt={sender.fullName} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                                {sender.fullName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                )}

                <div className={`relative p-3 rounded-lg shadow-sm ${isCurrentUser ? 'bg-primary text-white rounded-br-none' : 'bg-gray-200 text-text-main rounded-bl-none'}`}>
                    {!isCurrentUser && (
                        <p className="font-semibold text-sm mb-1">{sender.fullName}</p>
                    )}
                    <p className="text-sm break-words">{message.content}</p>
                    <span className={`block text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'} text-right`}>
                        {messageTime}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;