import React from 'react';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                {/* Cabeçalho */}
                <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg 
                            className="w-6 h-6 text-blue-600" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                            />
                        </svg>
                    </div>
                    <h3 className="ml-3 text-lg font-semibold text-gray-900">
                        Redefinição de Senha
                    </h3>
                </div>

                {/* Conteúdo */}
                <div className="mb-6">
                    <p className="text-gray-700 leading-relaxed">
                        Por favor, entre em contato com o administrador do sistema para redefinir sua senha.
                    </p>
                </div>

                {/* Botão OK */}
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordModal;