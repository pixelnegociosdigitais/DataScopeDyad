import React from 'react';
import { createPortal } from 'react-dom';
import { GiveawayWinner } from '../../types'; // Importar GiveawayWinner

interface WinnerDisplayPopupProps {
    winners: GiveawayWinner[]; // Agora aceita um array de vencedores
    onClose: () => void;
}

const WinnerDisplayPopup: React.FC<WinnerDisplayPopupProps> = ({ winners, onClose }) => {
    return createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-r from-red-500 to-red-700 text-white p-8 rounded-lg shadow-xl text-center max-w-lg w-full relative">
                <h3 className="text-3xl font-bold mb-4">🎉 Vencedor(es)! 🎉</h3>
                <div className="flex flex-col items-center justify-center space-y-6 max-h-96 overflow-y-auto pr-2">
                    {winners.map((winnerEntry, index) => (
                        <div key={winnerEntry.id} className="bg-red-600 p-4 rounded-lg w-full">
                            <p className="text-xl font-semibold mb-2">
                                {winnerEntry.rank}º Lugar: {winnerEntry.prize?.name || 'Prêmio Desconhecido'}
                            </p>
                            <p className="text-3xl font-extrabold text-white mb-1">{winnerEntry.winner_name}</p>
                            {winnerEntry.winner_phone && <p className="text-xl text-red-100">{winnerEntry.winner_phone}</p>}
                            {winnerEntry.winner_email && <p className="text-lg text-red-100">{winnerEntry.winner_email}</p>}
                        </div>
                    ))}
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