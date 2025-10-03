import React, { useState } from 'react';
import { Chat, User } from '../../../types';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';

interface ChatLayoutProps {
    currentUser: User;
    currentCompanyId: string;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ currentUser, currentCompanyId }) => {
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

    const handleSelectChat = (chat: Chat | null) => {
        setSelectedChat(chat);
    };

    const handleBackToChatList = () => {
        setSelectedChat(null);
    };

    return (
        <div className="h-full flex flex-col">
            {selectedChat ? (
                <ChatWindow chat={selectedChat} currentUser={currentUser} onBack={handleBackToChatList} />
            ) : (
                <ChatList 
                    currentUser={currentUser} 
                    onSelectChat={handleSelectChat as (chat: Chat | null) => void} // Asserção de tipo explícita
                    onCreateChat={() => { /* Implementar lógica de criação de chat */ }}
                    selectedChatId={selectedChat?.id || null}
                />
            )}
        </div>
    );
};

export default ChatLayout;