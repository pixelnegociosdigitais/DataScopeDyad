import React, { useState } from 'react';
import { Chat, User } from '../../../types';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import GeminiChatWindow from './GeminiChatWindow';

interface ChatLayoutProps {
    currentUser: User;
    currentCompanyId: string;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ currentUser, currentCompanyId }) => {
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [showGeminiChat, setShowGeminiChat] = useState(false);

    const handleSelectChat = (chat: Chat | null) => {
        setSelectedChat(chat);
        setShowGeminiChat(false);
    };

    const handleBackToChatList = () => {
        setSelectedChat(null);
        setShowGeminiChat(false);
    };

    const handleOpenGeminiChat = () => {
        setSelectedChat(null);
        setShowGeminiChat(true);
    };

    const currentSelectedChatId = selectedChat?.id || null;

    return (
        <div className="h-full flex flex-col">
            {showGeminiChat ? (
                <GeminiChatWindow currentUser={currentUser} onBack={handleBackToChatList} />
            ) : selectedChat ? (
                <ChatWindow chat={selectedChat} currentUser={currentUser} onBack={handleBackToChatList} />
            ) : (
                <ChatList 
                    currentUser={currentUser} 
                    onSelectChat={handleSelectChat}
                    selectedChatId={currentSelectedChatId}
                    currentCompanyId={currentCompanyId} // Passar currentCompanyId
                    onOpenGeminiChat={handleOpenGeminiChat} // Nova prop para abrir chat com Gemini
                />
            )}
        </div>
    );
};

export default ChatLayout;