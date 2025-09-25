import React, { useState, useEffect } from 'react';
import { User, Company } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { GiftIcon } from './icons/GiftIcon';

interface GiveawaysProps {
    currentUser: User;
    currentCompany: Company;
}

const Giveaways: React.FC<GiveawaysProps> = ({ currentUser, currentCompany }) => {
    const [participants, setParticipants] = useState<User[]>([]);
    const [winner, setWinner] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchParticipants();
    }, [currentCompany.id]);

    const fetchParticipants = async () => {
        setLoading(true);
        setError(null);
        try {
            // Busca todos os perfis da mesma empresa do usuário logado
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .eq('company_id', currentCompany.id);

            if (error) {
                throw error;
            }

            if (data) {
                const fetchedParticipants: User[] = data.map(profile => ({
                    id: profile.id,
                    fullName: profile.full_name || 'Nome Desconhecido',
                    email: profile.email || 'email@desconhecido.com',
                    role: currentUser.role, // A role não é relevante para o sorteio, pode ser a do usuário atual
                    profilePictureUrl: profile.avatar_url || undefined,
                }));
                setParticipants(fetchedParticipants);
            }
        } catch (err: any) {
            console.error('Erro ao buscar participantes:', err.message);
            setError('Não foi possível carregar os participantes para o sorteio.');
        } finally {
            setLoading(false);
        }
    };

    const handleDraw = () => {
        if (participants.length === 0) {
            alert('Não há participantes para realizar o sorteio!');
            return;
        }

        const randomIndex = Math.floor(Math.random() * participants.length);
        setWinner(participants[randomIndex]);
    };

    if (loading) {
        return <div className="text-center py-8 text-text-light">Carregando participantes...</div>;
    }

    if (error) {
        return <div className="text-center py-8 text-red-600">{error}</div>;
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="flex items-center gap-4 mb-6">
                <GiftIcon className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold text-text-main">Sorteios da Empresa</h2>
            </div>
            <p className="text-text-light mb-6">
                Realize sorteios entre os usuários cadastrados na sua empresa ({currentCompany.name}).
            </p>

            <div className="mb-6">
                <h3 className="text-lg font-semibold text-text-main mb-2">Participantes ({participants.length})</h3>
                {participants.length > 0 ? (
                    <ul className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-4 bg-gray-50">
                        {participants.map(p => (
                            <li key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
                                {p.profilePictureUrl ? (
                                    <img src={p.profilePictureUrl} alt={p.fullName} className="h-8 w-8 rounded-full object-cover" />
                                ) : (
                                    <div className="h-8 w-8 p-1 bg-gray-200 rounded-full text-gray-500 flex items-center justify-center text-xs">
                                        <GiftIcon className="h-4 w-4" />
                                    </div>
                                )}
                                <span className="text-gray-700">{p.fullName} ({p.email})</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-text-light text-sm">Nenhum participante encontrado para esta empresa.</p>
                )}
            </div>

            <div className="flex justify-center mb-8">
                <button
                    onClick={handleDraw}
                    className="px-8 py-3 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={participants.length === 0}
                >
                    Realizar Sorteio!
                </button>
            </div>

            {winner && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-lg text-center shadow-inner">
                    <h3 className="text-xl font-bold mb-3">🎉 Vencedor! 🎉</h3>
                    <div className="flex flex-col items-center justify-center">
                        {winner.profilePictureUrl ? (
                            <img src={winner.profilePictureUrl} alt={winner.fullName} className="h-24 w-24 rounded-full object-cover mb-4 border-4 border-green-300" />
                        ) : (
                            <div className="h-24 w-24 p-4 bg-green-200 rounded-full text-green-600 flex items-center justify-center mb-4">
                                <GiftIcon className="h-12 w-12" />
                            </div>
                        )}
                        <p className="text-2xl font-bold text-green-900">{winner.fullName}</p>
                        <p className="text-lg text-green-700">{winner.email}</p>
                    </div>
                    <button
                        onClick={() => setWinner(null)}
                        className="mt-6 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                    >
                        Limpar Vencedor
                    </button>
                </div>
            )}
        </div>
    );
};

export default Giveaways;