import React from 'react';

interface ConfirmationDialogProps {
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    cancelText?: string;
    onCancel?: () => void;
    showCancelButton?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    title,
    message,
    confirmText,
    onConfirm,
    cancelText = 'Cancelar',
    onCancel,
    showCancelButton = true,
}) => {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-sm mx-auto">
                <h3 className="text-xl font-bold text-text-main mb-4">{title}</h3>
                <p className="text-text-light mb-6">{message}</p>
                <div className="flex justify-center gap-4">
                    {showCancelButton && onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-6 py-2 font-semibold text-primary border border-primary rounded-md hover:bg-primary/10 shadow-sm transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-primary-dark shadow-sm transition-colors"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationDialog;