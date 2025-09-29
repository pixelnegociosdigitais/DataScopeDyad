import React from 'react';
import { createPortal } from 'react-dom';
import { TrashIcon } from '../../components/icons/TrashIcon'; // Caminho corrigido

interface GiveawayParticipant {
    id: string;
    name: string;
    phone?: string;
}

interface WinnerDisplayPopupProps {
    winner: GiveawayParticipant;
    onClose: () => void;
}

const WinnerDisplayPopup: React.FC<WinnerDisplayPopupProps> = ({ winner, onClose }) => {
    return createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-r from-red-500 to-red-700 text-white p-8 rounded-lg shadow-xl text-center max-w-sm w-full relative">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 rounded-full text-white hover:bg-red-800 transition-colors"
                    aria-label="Fechar"
                >
                    <TrashIcon className="h-6 w-6" />
                </button>
                <h3 className="text-3xl font-bold mb-4">🎉 Vencedor! 🎉</h3>
                <div className="flex flex-col items-center justify-center">
                    <img src="/assets/presente.png" alt="Caixa de presente" className="h-32 w-32 object-contain mb-6" />
                    <p className="text-4xl font-extrabold text-white mb-2">{winner.name}</p>
                    {winner.phone && <p className="text-2xl text-white">{winner.phone}</p>}
                </div>
                <button
                    onClick={onClose}
                    className="mt-8 px-6 py-2 text-lg font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                >
                    Fechar
                </button>
            </div>
        </div>,
        document.body
    );
};

export default WinnerDisplayPopup;