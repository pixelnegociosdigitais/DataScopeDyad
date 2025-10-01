import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat, ChatMessage, User, ChatParticipant } from '../../../types';
import { supabase } from '../../integrations/supabase/client';
import { showError } from '../../utils/toast';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { ArrowLeftIcon } from '../../../components/icons/ArrowLeftIcon';

interface ChatWindowProps {
    chat: Chat;
    currentUser: User;
    onBack: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, currentUser, onBack }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [participants, setParticipants] = useState<ChatParticipant[]>([]);
    const participantsRef = useRef(participants); // Ref para manter a lista de participantes atualizada
    const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // { userId: userName }
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Atualiza a ref sempre que o estado 'participants' muda
    useEffect(() => {
        participantsRef.current = participants;
    }, [participants]);

    const fetchMessages = useCallback(async () => {
        setLoadingMessages(true);
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:profiles(id, full_name, avatar_url)
            `)
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            showError('Não foi possível carregar as mensagens.');
        } else {
            setMessages(data as ChatMessage[]);
        }
        setLoadingMessages(false);
    }, [chat.id]);

    const fetchParticipants = useCallback(async () => {
        const { data, error } = await supabase
            .from('chat_participants')
            .select(`
                *,
                profiles(id, full_name, avatar_url)
            `)
            .eq('chat_id', chat.id);

        if (error) {
            console.error('Error fetching participants:', error);
        } else {
            setParticipants(data as ChatParticipant[]);
        }
    }, [chat.id]);

    const markChatAsRead = useCallback(async () => {
        if (!currentUser) return;
        const { error } = await supabase
            .from('chat_participants')
            .update({ unread_count: 0 })
            .eq('chat_id', chat.id)
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('Error marking chat as read:', error);
        }
    }, [chat.id, currentUser]);

    useEffect(() => {
        fetchMessages();
        fetchParticipants();
        markChatAsRead();

        const channel = supabase
            .channel(`chat_${chat.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` }, payload => {
                const newMessage = payload.new as ChatMessage;
                // Usar participantsRef.current para acessar a lista de participantes mais recente
                const senderProfile = participantsRef.current.find(p => p.user_id === newMessage.sender_id)?.profiles || currentUser;
                setMessages(prev => [...prev, { ...newMessage, sender: senderProfile }]);
                markChatAsRead(); // Marcar como lido quando uma nova mensagem chega
            })
            .on('broadcast', { event: 'typing_status' }, ({ payload }) => {
                const { userId, isTyping } = payload;
                if (userId === currentUser.id) return; // Ignorar o status de digitação do próprio usuário

                // Usar participantsRef.current para acessar a lista de participantes mais recente
                const participant = participantsRef.current.find(p => p.user_id === userId);
                if (participant?.profiles?.full_name) {
                    setTypingUsers(prev => {
                        const newTypingUsers = { ...prev };
                        if (isTyping) {
                            newTypingUsers[userId] = participant.profiles.full_name;
                        } else {
                            delete newTypingUsers[userId];
                        }
                        return newTypingUsers;
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chat.id, currentUser, fetchMessages, fetchParticipants, markChatAsRead]); // Removido 'participants' das dependências

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    const handleSendMessage = async (content: string) => {
        if (!currentUser) {
            showError('Usuário não autenticado.');
            return;
        }

        const { error } = await supabase.from('messages').insert({
            chat_id: chat.id,
            sender_id: currentUser.id,
            content,
        });

        if (error) {
            console.error('Error sending message:', error);
            showError('Não foi possível enviar a mensagem.');
        }
    };

    const getChatTitle = () => {
        if (chat.is_group_chat) {
            return chat.name || 'Chat em Grupo';
        }
        const otherParticipant = participants.find(p => p.user_id !== currentUser.id);
        return otherParticipant?.profiles?.fullName || 'Chat Individual';
    };

    const typingUserNames = Object.values(typingUsers);

    return (
        <div className="flex flex-col h-full bg-gray-50 rounded-lg shadow-md">
            <div className="flex items-center p-4 bg-white border-b border-gray-200">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Voltar">
                    <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
                </button>
                <h3 className="text-xl font-bold text-text-main ml-4">{getChatTitle()}</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                    <p className="text-center text-text-light">Carregando mensagens...</p>
                ) : messages.length === 0 ? (
                    <p className="text-center text-text-light">Nenhuma mensagem ainda. Comece a conversar!</p>
                ) : (
                    messages.map(msg => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isCurrentUser={msg.sender_id === currentUser.id}
                            sender={msg.sender || currentUser}
                        />
                    ))
                )}
                {typingUserNames.length > 0 && (
                    <TypingIndicator senderName={typingUserNames.join(', ')} />
                )}
                <div ref={messagesEndRef} />
            </div>

            <MessageInput chatId={chat.id} onSendMessage={handleSendMessage} />
        </div>
    );
};

export default ChatWindow;