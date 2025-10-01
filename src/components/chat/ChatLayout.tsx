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

    const handleSelectChat = (chat: Chat) => {
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
                <ChatList currentUser={currentUser} currentCompanyId={currentCompanyId} onSelectChat={handleSelectChat} />
            )}
        </div>
    );
};

export default ChatLayout;