import React from 'react';
import { createPortal } from 'react-dom';

interface CountdownPopupProps {
    countdown: number;
    progress: number;
}

const CountdownPopup: React.FC<CountdownPopupProps> = ({ countdown, progress }) => {
    return createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-blue-500 text-white p-8 rounded-lg shadow-xl text-center max-w-sm w-full relative">
                <h3 className="text-3xl font-bold mb-4">Sorteando...</h3>
                <div className="flex flex-col items-center justify-center">
                    <p className="text-6xl font-extrabold text-white mb-4">{countdown}</p>
                    <div className="w-full bg-blue-300 rounded-full h-4 mb-4 overflow-hidden">
                        <div
                            className="bg-white h-4 rounded-full transition-all duration-50 ease-linear"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-lg text-blue-100">Aguarde, estamos escolhendo o sortudo(s)!</p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CountdownPopup;