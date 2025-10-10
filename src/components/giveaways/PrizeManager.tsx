import React, { useState, useCallback } from 'react';
import { Prize, Company, User } from '../../../types';
import { supabase } from '../../integrations/supabase/client';
import { showError, showSuccess } from '../../utils/toast';
import { CreateIcon } from '@/components/icons/CreateIcon';
import { PencilIcon } from '@/components/icons/PencilIcon';
import { TrashIcon } from '@/components/icons/TrashIcon';
import ConfirmationDialog from '../ConfirmationDialog';
import { logActivity } from '../../utils/logger';

interface PrizeManagerProps {
    currentCompany: Company;
    currentUser: User;
    prizes: Prize[];
    onPrizesUpdate: () => void;
    canPerformGiveaways: boolean; // Adicionado prop de permissão
}

const PrizeManager: React.FC<PrizeManagerProps> = ({ currentCompany, currentUser, prizes, onPrizesUpdate, canPerformGiveaways }) => {
    const [showPrizeModal, setShowPrizeModal] = useState(false);
    const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
    const [prizeFormName, setPrizeFormName] = useState('');
    const [prizeFormDescription, setPrizeFormDescription] = useState('');
    const [prizeFormRank, setPrizeFormRank] = useState<number | string>('');
    const [showDeletePrizeDialog, setShowDeletePrizeDialog] = useState(false);
    const [prizeToDelete, setPrizeToDelete] = useState<Prize | null>(null);

    // O componente PrizeManager agora é renderizado condicionalmente pelo pai,
    // então não precisamos de um retorno null aqui.

    const handleOpenPrizeModal = (prize: Prize | null = null) => {
        if (!canPerformGiveaways) {
            showError('Você não tem permissão para gerenciar prêmios.');
            return;
        }
        setEditingPrize(prize);
        setPrizeFormName(prize?.name || '');
        setPrizeFormDescription(prize?.description || '');
        setPrizeFormRank(prize?.rank || '');
        setShowPrizeModal(true);
    };

    const handleClosePrizeModal = () => {
        setShowPrizeModal(false);
        setEditingPrize(null);
        setPrizeFormName('');
        setPrizeFormDescription('');
        setPrizeFormRank('');
    };

    const handleSavePrize = async () => {
        if (!canPerformGiveaways) {
            showError('Você não tem permissão para gerenciar prêmios.');
            return;
        }
        if (!prizeFormName.trim()) {
            showError('O nome do prêmio não pode estar vazio.');
            logActivity('WARN', `Tentativa de salvar prêmio sem nome na empresa ${currentCompany.id}.`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany.id);
            return;
        }

        try {
            const rankValue = prizeFormRank === '' ? null : Number(prizeFormRank);
            if (editingPrize) {
                const { error } = await supabase
                    .from('prizes')
                    .update({ name: prizeFormName, description: prizeFormDescription, rank: rankValue })
                    .eq('id', editingPrize.id);
                if (error) throw error;
                showSuccess('Prêmio atualizado com sucesso!');
                logActivity('INFO', `Prêmio '${prizeFormName}' (ID: ${editingPrize.id}) atualizado com sucesso.`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany.id);
            } else {
                const { error } = await supabase
                    .from('prizes')
                    .insert({ company_id: currentCompany.id, name: prizeFormName, description: prizeFormDescription, rank: rankValue });
                if (error) throw error;
                showSuccess('Prêmio criado com sucesso!');
                logActivity('INFO', `Novo prêmio '${prizeFormName}' criado com sucesso para a empresa ${currentCompany.id}.`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany.id);
            }
            onPrizesUpdate();
            handleClosePrizeModal();
        } catch (err: any) {
            console.error('Erro ao salvar prêmio:', err.message);
            showError('Erro ao salvar prêmio: ' + err.message);
            logActivity('ERROR', `Erro ao salvar prêmio '${prizeFormName}' na empresa ${currentCompany.id}: ${err.message}`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany.id);
        }
    };

    const handleDeletePrizeConfirmed = useCallback(async () => {
        if (!canPerformGiveaways) {
            showError('Você não tem permissão para excluir prêmios.');
            return;
        }
        if (!prizeToDelete) return;
        try {
            const { error } = await supabase.from('prizes').delete().eq('id', prizeToDelete.id);
            if (error) throw error;
            showSuccess('Prêmio excluído com sucesso!');
            logActivity('INFO', `Prêmio '${prizeToDelete.name}' (ID: ${prizeToDelete.id}) excluído com sucesso.`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany.id);
            onPrizesUpdate();
        } catch (err: any) {
            console.error('Erro ao excluir prêmio:', err.message);
            showError('Erro ao excluir prêmio: ' + err.message);
            logActivity('ERROR', `Erro ao excluir prêmio '${prizeToDelete.name}' (ID: ${prizeToDelete.id}): ${err.message}`, 'GIVEAWAYS', currentUser.id, currentUser.email, currentCompany.id);
        } finally {
            setShowDeletePrizeDialog(false);
            setPrizeToDelete(null);
        }
    }, [prizeToDelete, onPrizesUpdate, currentUser, currentCompany, canPerformGiveaways]);

    const confirmDeletePrize = useCallback((prize: Prize) => {
        if (!canPerformGiveaways) {
            showError('Você não tem permissão para excluir prêmios.');
            return;
        }
        setPrizeToDelete(prize);
        setShowDeletePrizeDialog(true);
    }, [canPerformGiveaways]);

    return (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-text-main">Gerenciar Prêmios</h3>
                <button
                    onClick={() => handleOpenPrizeModal()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                    <CreateIcon className="h-4 w-4" /> Adicionar Prêmio
                </button>
            </div>
            {prizes.length === 0 ? (
                <p className="text-text-light text-sm">Nenhum prêmio cadastrado ainda. Adicione um para começar!</p>
            ) : (
                <ul className="space-y-2">
                    {prizes.map(prize => (
                        <li key={prize.id} className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm border border-gray-100">
                            <div>
                                <p className="font-medium text-gray-800">
                                    {prize.rank ? `${prize.rank}º Lugar: ` : ''}{prize.name}
                                </p>
                                {prize.description && <p className="text-sm text-gray-500">{prize.description}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleOpenPrizeModal(prize)}
                                    className="p-2 text-gray-400 hover:text-primary rounded-full hover:bg-primary/10 transition-colors"
                                    aria-label="Editar prêmio"
                                >
                                    <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => confirmDeletePrize(prize)}
                                    className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-colors"
                                    aria-label="Excluir prêmio"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {showPrizeModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-xl font-bold text-text-main mb-4">{editingPrize ? 'Editar Prêmio' : 'Adicionar Novo Prêmio'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="prize-name" className="block text-sm font-medium text-gray-700">Nome do Prêmio</label>
                                <input type="text" id="prize-name" value={prizeFormName} onChange={(e) => setPrizeFormName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700" required />
                            </div>
                            <div>
                                <label htmlFor="prize-description" className="block text-sm font-medium text-gray-700">Descrição (Opcional)</label>
                                <textarea id="prize-description" value={prizeFormDescription} onChange={(e) => setPrizeFormDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700" />
                            </div>
                            <div>
                                <label htmlFor="prize-rank" className="block text-sm font-medium text-gray-700">Ordem (Lugar)</label>
                                <input type="number" id="prize-rank" value={prizeFormRank} onChange={(e) => setPrizeFormRank(e.target.value === '' ? '' : Number(e.target.value))} min="1" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-700" />
                                <p className="text-xs text-gray-500 mt-1">Defina a ordem deste prêmio no sorteio (ex: 1 para 1º lugar).</p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={handleClosePrizeModal} className="px-4 py-2 font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors">Cancelar</button>
                            <button onClick={handleSavePrize} className="px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark transition-colors">{editingPrize ? 'Salvar Alterações' : 'Adicionar Prêmio'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeletePrizeDialog && prizeToDelete && (
                <ConfirmationDialog
                    title="Confirmar Exclusão de Prêmio"
                    message={`Tem certeza que deseja excluir o prêmio "${prizeToDelete.name}"? Esta ação não pode ser desfeita.`}
                    confirmText="Excluir"
                    onConfirm={handleDeletePrizeConfirmed}
                    cancelText="Cancelar"
                    onCancel={() => setShowDeletePrizeDialog(false)}
                />
            )}
        </div>
    );
};

export default PrizeManager;