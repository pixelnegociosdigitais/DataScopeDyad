import React, { useState, useCallback } from 'react';
import { Chat, User } from '../../../types';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import { supabase } from '../../integrations/supabase/client';
import { showError, showSuccess } from '../../utils/toast';

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

    const handleCreateChat = useCallback(async (companyId: string) => {
        try {
            // Create the chat
            const { data: newChatData, error: chatError } = await supabase
                .from('chats')
                .insert({ company_id: companyId, is_group_chat: false })
                .select()
                .single();

            if (chatError) throw chatError;

            // Add current user as participant
            const { error: participantError } = await supabase
                .from('chat_participants')
                .insert({ chat_id: newChatData.id, user_id: currentUser.id });

            if (participantError) throw participantError;

            showSuccess('Novo chat criado com sucesso!');
            // After creation, select the new chat
            // We need to fetch the full chat object including participants for display
            const { data: fetchedChat, error: fetchError } = await supabase
                .from('chats')
                .select(`
                    *,
                    participants:chat_participants(
                        user_id,
                        joined_at,
                        unread_count,
                        profiles(id, full_name, avatar_url, role, email)
                    )
                `)
                .eq('id', newChatData.id)
                .single();

            if (fetchError) throw fetchError;

            // Map fetchedChat to the Chat interface, including displayName
            const mappedChat: Chat = {
                id: fetchedChat.id,
                created_at: fetchedChat.created_at,
                company_id: fetchedChat.company_id,
                name: fetchedChat.name,
                is_group_chat: fetchedChat.is_group_chat,
                last_message_at: fetchedChat.last_message_at,
                unread_count: 0, // New chat starts with 0 unread
                participants: fetchedChat.participants.map((p: any) => ({
                    chat_id: p.chat_id,
                    user_id: p.user_id,
                    joined_at: p.joined_at,
                    unread_count: p.unread_count,
                    profiles: p.profiles ? {
                        id: p.profiles.id,
                        fullName: p.profiles.full_name || '',
                        role: p.profiles.role,
                        email: p.profiles.email || '',
                        profilePictureUrl: p.profiles.avatar_url || undefined,
                    } : undefined,
                })),
                displayName: fetchedChat.name || 'Novo Chat', // Default display name
            };

            setSelectedChat(mappedChat);

        } catch (error: any) {
            console.error('Erro ao criar novo chat:', error.message);
            showError('Não foi possível criar um novo chat.');
        }
    }, [currentUser]);

    return (
        <div className="h-full flex flex-col">
            {selectedChat ? (
                <ChatWindow chat={selectedChat} currentUser={currentUser} onBack={handleBackToChatList} />
            ) : (
                <ChatList 
                    currentUser={currentUser} 
                    onSelectChat={handleSelectChat}
                    onCreateChat={handleCreateChat} // Passar a função implementada
                    selectedChatId={selectedChat ? selectedChat.id : null}
                    currentCompanyId={currentCompanyId} // Passar currentCompanyId
                />
            )}
        </div>
    );
};

export default ChatLayout;