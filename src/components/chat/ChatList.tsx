import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Chat, User, ChatParticipant, UserRole } from '../../../types';
import { showError, showSuccess } from '../../utils/toast';
import { PlusIcon } from '../../../components/icons/PlusIcon'; 
import { TrashIcon } from '../../../components/icons/TrashIcon'; // Usando TrashIcon em vez de DeleteIcon

interface ChatListProps {
    currentUser: User;
    currentCompanyId: string;
    onSelectChat: (chat: Chat | null) => void;
    onCreateChat: () => void;
    selectedChatId: string | null;
}

const ChatList: React.FC<ChatListProps> = ({ currentUser, currentCompanyId, onSelectChat, onCreateChat, selectedChatId }) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchChats = useCallback(async () => {
        setLoading(true);
        try {
            const { data: chatParticipants, error: participantsError } = await supabase
                .from('chat_participants')
                .select(`
                    chat_id,
                    chats (
                        id,
                        name,
                        is_group_chat,
                        last_message_at,
                        company_id
                    ),
                    unread_count
                `)
                .eq('user_id', currentUser.id);

            if (participantsError) throw participantsError;

            const chatIds = chatParticipants.map(cp => cp.chat_id);

            if (chatIds.length === 0) {
                setChats([]);
                setLoading(false);
                return;
            }

            // Fetch all participants for these chats to determine individual chat names
            const { data: allParticipants, error: allParticipantsError } = await supabase
                .from('chat_participants')
                .select(`
                    chat_id,
                    profiles(id, full_name, avatar_url)
                `)
                .in('chat_id', chatIds);

            if (allParticipantsError) throw allParticipantsError;

            const chatsWithDetails = chatParticipants.map(cp => {
                const chatData = cp.chats as Chat;
                const unreadCount = cp.unread_count;
                const participantsInChat = allParticipants.filter(p => p.chat_id === chatData.id);

                let chatDisplayName = chatData.name;
                if (!chatData.is_group_chat) {
                    const otherParticipant = participantsInChat.find(p => p.profiles?.id !== currentUser.id);
                    chatDisplayName = otherParticipant?.profiles?.full_name || 'Chat Individual';
                }

                return {
                    ...chatData,
                    displayName: chatDisplayName,
                    unread_count: unreadCount,
                    participants: participantsInChat.map(p => p.profiles) // Attach profiles for display
                };
            });

            setChats(chatsWithDetails as Chat[]);
        } catch (error: any) {
            console.error('Erro ao buscar chats:', error.message);
            showError('Não foi possível carregar os chats.');
        } finally {
            setLoading(false);
        }
    }, [currentUser.id]);

    useEffect(() => {
        fetchChats();

        const channel = supabase
            .channel(`public:chats`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, payload => {
                // Refetch chats on any change to ensure list is up-to-date
                fetchChats();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${currentUser.id}` }, payload => {
                // Refetch chats if current user's participation changes
                fetchChats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchChats, currentUser.id]);

    const handleDeleteChat = async (chatId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta conversa? Esta ação é irreversível e removerá todas as mensagens e participantes.')) {
            return;
        }

        try {
            // 1. Delete messages
            const { error: messagesError } = await supabase
                .from('messages')
                .delete()
                .eq('chat_id', chatId);

            if (messagesError) throw messagesError;

            // 2. Delete chat participants
            const { error: participantsError } = await supabase
                .from('chat_participants')
                .delete()
                .eq('chat_id', chatId);

            if (participantsError) throw participantsError;

            // 3. Delete the chat itself
            const { error: chatError } = await supabase
                .from('chats')
                .delete()
                .eq('id', chatId);

            if (chatError) throw chatError;

            showSuccess('Conversa excluída com sucesso!');
            fetchChats(); // Refresh the list
            if (selectedChatId === chatId) {
                onSelectChat(null); // Deselect the chat if it was the one open
            }
        } catch (error: any) {
            console.error('Erro ao excluir conversa:', error.message);
            showError('Não foi possível excluir a conversa.');
        }
    };

    const canDeleteChat = currentUser.role === UserRole.ADMINISTRATOR || currentUser.role === UserRole.DEVELOPER;

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-text-main">Chats</h2>
                <button
                    onClick={onCreateChat}
                    className="p-2 rounded-full bg-primary text-white hover:bg-primary-dark transition-colors"
                    title="Iniciar Novo Chat"
                >
                    <PlusIcon className="h-5 w-5" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <p className="p-4 text-text-light">Carregando chats...</p>
                ) : chats.length === 0 ? (
                    <p className="p-4 text-text-light">Nenhum chat encontrado. Inicie um novo!</p>
                ) : (
                    chats.map(chat => (
                        <div
                            key={chat.id}
                            className={`flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedChatId === chat.id ? 'bg-blue-50 border-l-4 border-primary' : ''}`}
                            onClick={() => onSelectChat(chat)}
                        >
                            <div className="flex-1">
                                <h4 className="font-semibold text-text-main">{chat.displayName}</h4>
                                {chat.unread_count > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                        {chat.unread_count}
                                    </span>
                                )}
                            </div>
                            {canDeleteChat && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent selecting the chat when deleting
                                        handleDeleteChat(chat.id);
                                    }}
                                    className="p-1 rounded-full text-red-600 hover:bg-red-100 transition-colors"
                                    title="Excluir Conversa"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ChatList;