import React from 'react';
import { Prize } from '../../../types';

interface DrawSetupProps {
    prizes: Prize[];
    selectedPrizesForDraw: Prize[];
    onPrizeSelectionChange: (prize: Prize, isChecked: boolean) => void;
}

const DrawSetup: React.FC<DrawSetupProps> = ({ prizes, selectedPrizesForDraw, onPrizeSelectionChange }) => {
    return (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-text-main mb-4">Selecionar Prêmios para o Sorteio</h3>
            {prizes.length === 0 ? (
                <p className="text-text-light text-sm">Cadastre prêmios na seção "Gerenciar Prêmios" para poder sorteá-los.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prizes.map(prize => (
                        <label key={prize.id} className="flex items-center p-3 bg-white rounded-md shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={selectedPrizesForDraw.some(p => p.id === prize.id)}
                                onChange={(e) => onPrizeSelectionChange(prize, e.target.checked)}
                                className="form-checkbox h-5 w-5 text-primary rounded focus:ring-primary"
                            />
                            <div className="ml-3">
                                <p className="font-medium text-gray-800">
                                    {prize.rank ? `${prize.rank}º Lugar: ` : ''}{prize.name}
                                </p>
                                {prize.description && <p className="text-sm text-gray-500">{prize.description}</p>}
                            </div>
                        </label>
                    ))}
                </div>
            )}
            {selectedPrizesForDraw.length > 0 && (
                <div className="mt-4 text-sm text-text-light">
                    Prêmios selecionados para o sorteio (em ordem de classificação):
                    <ul className="list-disc list-inside ml-4">
                        {selectedPrizesForDraw.map((p, index) => (
                            <li key={p.id}>{index + 1}º Lugar: {p.name}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default DrawSetup;