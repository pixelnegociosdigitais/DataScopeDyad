import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { Chat, User, ChatParticipant, UserRole } from '../../../types';
import { showError, showSuccess } from '../../utils/toast';
import { PlusIcon } from '../../../components/icons/PlusIcon'; 
import { TrashIcon } from '../../../components/icons/TrashIcon'; // Usando TrashIcon em vez de DeleteIcon
import ConfirmationDialog from '../ConfirmationDialog'; // Importar ConfirmationDialog

// Interface para a estrutura de dados retornada pelo Supabase para chat_participants com profiles
interface RawChatParticipantData {
    chat_id: string;
    user_id: string;
    joined_at: string;
    unread_count: number;
    profiles: Array<{ // Corrigido para esperar um array de perfis
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        role: UserRole | null;
        email: string | null;
    }> | null; // Supabase pode retornar um array de objetos ou null para 'profiles'
}

interface ChatListProps {
    currentUser: User;
    onSelectChat: (chat: Chat | null) => void;
    onCreateChat: () => void;
    selectedChatId: string | null;
}

const ChatList: React.FC<ChatListProps> = ({ currentUser, onSelectChat, onCreateChat, selectedChatId }) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false); // Estado para o diálogo de confirmação
    const [chatToDelete, setChatToDelete] = useState<Chat | null>(null); // Chat a ser excluído

    const fetchChats = useCallback(async () => {
        setLoading(true);
        try {
            // Primeiro, buscar os chats dos quais o usuário é participante
            const { data: chatParticipantsData, error: participantsError } = await supabase
                .from('chat_participants')
                .select(`
                    chat_id,
                    unread_count,
                    chats (
                        id,
                        name,
                        is_group_chat,
                        last_message_at,
                        company_id,
                        created_at
                    )
                `)
                .eq('user_id', currentUser.id);

            if (participantsError) throw participantsError;

            const chatIds = chatParticipantsData.map(cp => cp.chat_id);

            if (chatIds.length === 0) {
                setChats([]);
                setLoading(false);
                return;
            }

            // Em seguida, buscar todos os participantes para esses chats, incluindo seus perfis
            const { data: allParticipantsData, error: allParticipantsError } = await supabase
                .from('chat_participants')
                .select(`
                    chat_id,
                    user_id,
                    joined_at,
                    unread_count,
                    profiles(id, full_name, avatar_url, role, email)
                `)
                .in('chat_id', chatIds);

            if (allParticipantsError) throw allParticipantsError;

            const chatsWithDetails: Chat[] = chatParticipantsData.map((cp: {
                chat_id: string;
                unread_count: number;
                chats: Array<{
                    id: string;
                    name: string | null;
                    is_group_chat: boolean | null;
                    last_message_at: string | null;
                    company_id: string | null;
                    created_at: string;
                }>;
            }) => {
                const rawChatData = cp.chats[0]; 

                if (!rawChatData) {
                    console.warn(`Dados do chat ausentes para o participante ${cp.chat_id}`);
                    return null;
                }

                const unreadCount: number = cp.unread_count;
                
                const participantsInChat: ChatParticipant[] = (allParticipantsData as RawChatParticipantData[])
                    .filter(p => p.chat_id === rawChatData.id)
                    .map(p => {
                        // Extrair o primeiro perfil do array, se existir
                        const rawProfileDataArray = p.profiles;
                        const profileData = rawProfileDataArray && rawProfileDataArray.length > 0 ? rawProfileDataArray[0] : null;
                        
                        return {
                            chat_id: p.chat_id,
                            user_id: p.user_id,
                            joined_at: p.joined_at,
                            unread_count: p.unread_count,
                            profiles: profileData ? {
                                id: profileData.id,
                                fullName: profileData.full_name || '',
                                role: profileData.role as UserRole,
                                email: profileData.email || '',
                                profilePictureUrl: profileData.avatar_url || undefined,
                            } : undefined,
                        };
                    });

                let chatDisplayName: string | null = rawChatData.name;
                if (!rawChatData.is_group_chat) {
                    const otherParticipant = participantsInChat.find(p => p.profiles?.id !== currentUser.id);
                    chatDisplayName = otherParticipant?.profiles?.fullName || 'Chat Individual';
                }

                return {
                    id: rawChatData.id,
                    created_at: rawChatData.created_at,
                    company_id: rawChatData.company_id,
                    name: rawChatData.name,
                    is_group_chat: rawChatData.is_group_chat,
                    last_message_at: rawChatData.last_message_at,
                    displayName: chatDisplayName,
                    unread_count: unreadCount,
                    participants: participantsInChat,
                };
            }).filter(Boolean) as Chat[];

            setChats(chatsWithDetails);
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (_payload) => {
                fetchChats();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${currentUser.id}` }, (_payload) => {
                fetchChats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchChats, currentUser.id]);

    const handleDeleteChatConfirmed = useCallback(async () => {
        if (!chatToDelete) return;

        try {
            const { error: messagesError } = await supabase
                .from('messages')
                .delete()
                .eq('chat_id', chatToDelete.id);

            if (messagesError) throw messagesError;

            const { error: participantsError } = await supabase
                .from('chat_participants')
                .delete()
                .eq('chat_id', chatToDelete.id);

            if (participantsError) throw participantsError;

            const { error: chatError } = await supabase
                .from('chats')
                .delete()
                .eq('id', chatToDelete.id);

            if (chatError) throw chatError;

            showSuccess('Conversa excluída com sucesso!');
            fetchChats();
            if (selectedChatId === chatToDelete.id) {
                onSelectChat(null);
            }
        } catch (error: any) {
            console.error('Erro ao excluir conversa:', error.message);
            showError('Não foi possível excluir a conversa.');
        } finally {
            setShowDeleteChatConfirm(false);
            setChatToDelete(null);
        }
    }, [chatToDelete, fetchChats, onSelectChat, selectedChatId]);

    const handleDeleteChat = useCallback((chat: Chat) => {
        setChatToDelete(chat);
        setShowDeleteChatConfirm(true);
    }, []);

    const canDeleteChat = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.DEVELOPER;

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
                                {(chat.unread_count ?? 0) > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                        {chat.unread_count ?? 0}
                                    </span>
                                )}
                            </div>
                            {canDeleteChat && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteChat(chat);
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

            {showDeleteChatConfirm && chatToDelete && (
                <ConfirmationDialog
                    title="Confirmar Exclusão de Conversa"
                    message={`Tem certeza que deseja excluir a conversa "${chatToDelete.displayName}"? Esta ação é irreversível e removerá todas as mensagens e participantes.`}
                    confirmText="Excluir"
                    onConfirm={handleDeleteChatConfirmed}
                    cancelText="Cancelar"
                    onCancel={() => {
                        setShowDeleteChatConfirm(false);
                        setChatToDelete(null);
                    }}
                />
            )}
        </div>
    );
};

export default ChatList;