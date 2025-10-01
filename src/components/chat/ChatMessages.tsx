import React, { useRef, useEffect } from 'react';
import { Message, User } from '../../../types';
import { UserIcon } from '../../../components/icons/UserIcon';

interface ChatMessagesProps {
    messages: Message[];
    currentUser: User;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, currentUser }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {messages.map((message, index) => (
                <div
                    key={message.id}
                    className={`flex mb-4 ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                >
                    <div className={`flex items-end gap-2 ${message.sender_id === currentUser.id ? 'flex-row-reverse' : ''}`}>
                        {message.sender_id !== currentUser.id && (
                            message.sender?.profilePictureUrl ? (
                                <img src={message.sender.profilePictureUrl} alt={message.sender.fullName} className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                                <UserIcon className="h-8 w-8 p-1 bg-gray-200 rounded-full text-gray-500" />
                            )
                        )}
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${
                            message.sender_id === currentUser.id
                                ? 'bg-primary text-white rounded-br-none'
                                : 'bg-gray-200 text-text-main rounded-bl-none'
                        }`}>
                            <p className="text-sm">{message.content}</p>
                            <div className={`text-xs mt-1 ${message.sender_id === currentUser.id ? 'text-blue-100' : 'text-gray-500'} text-right`}>
                                {new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                {message.sender_id === currentUser.id && (
                                    <span className="ml-1">
                                        {message.status === 'sent' && '✓'}
                                        {message.status === 'delivered' && '✓✓'}
                                        {message.status === 'read' && '✓✓'} {/* You might want a different icon for read */}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default ChatMessages;