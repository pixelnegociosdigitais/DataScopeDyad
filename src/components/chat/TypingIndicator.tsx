import React from 'react';

interface TypingIndicatorProps {
    senderName: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ senderName }) => {
    return (
        <div className="flex items-center justify-start mb-4">
            <div className="bg-gray-200 text-text-main p-3 rounded-2xl rounded-bl-none shadow-sm animate-pulse">
                <p className="text-sm font-semibold">{senderName} está digitando...</p>
            </div>
        </div>
    );
};

export default TypingIndicator;