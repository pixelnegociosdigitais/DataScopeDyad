import React from 'react';

interface LoginErrorAlertProps {
    message: string;
    onClose: () => void;
}

const LoginErrorAlert: React.FC<LoginErrorAlertProps> = ({ message, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header com ícone de erro */}
                <div className="bg-red-50 px-6 py-4 border-b border-red-100">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-lg font-semibold text-red-800">
                                Erro de Autenticação
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Conteúdo da mensagem */}
                <div className="px-6 py-4">
                    <p className="text-gray-700 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Botões de ação */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginErrorAlert;