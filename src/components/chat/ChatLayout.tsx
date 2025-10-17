import React, { useState } from 'react';
import { Chat, User } from '../../../types';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import DeepseekChatWindow from './DeepseekChatWindow';

interface ChatLayoutProps {
    currentUser: User;
    currentCompanyId: string;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ currentUser, currentCompanyId }) => {
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [showDeepseekChat, setShowDeepseekChat] = useState(false);

    const handleSelectChat = (chat: Chat | null) => {
        setSelectedChat(chat);
        setShowDeepseekChat(false);
    };

    const handleBackToChatList = () => {
        setSelectedChat(null);
        setShowDeepseekChat(false);
    };

    const handleOpenDeepseekChat = () => {
        setSelectedChat(null);
        setShowDeepseekChat(true);
    };

    const currentSelectedChatId = selectedChat?.id || null;

    return (
        <div className="h-full flex flex-col">
            {showDeepseekChat ? (
                <DeepseekChatWindow currentUser={currentUser} onBack={handleBackToChatList} />
            ) : selectedChat ? (
                <ChatWindow chat={selectedChat} currentUser={currentUser} onBack={handleBackToChatList} />
            ) : (
                <ChatList 
                    currentUser={currentUser} 
                    onSelectChat={handleSelectChat}
                    selectedChatId={currentSelectedChatId}
                    currentCompanyId={currentCompanyId} // Passar currentCompanyId
                    onOpenDeepseekChat={handleOpenDeepseekChat} // Nova prop para abrir chat com DeepSeek
                />
            )}
        </div>
    );
};

export default ChatLayout;