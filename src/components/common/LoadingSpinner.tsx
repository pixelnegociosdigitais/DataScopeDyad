import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = 'Carregando...',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div 
        className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`}
        role="status"
        aria-label="Carregando"
      />
      {message && (
        <p className="mt-4 text-sm text-gray-600 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

// Componente de erro para fallback
export const LoadingError: React.FC<{ 
  error: Error; 
  onRetry?: () => void;
  message?: string;
}> = ({ 
  error, 
  onRetry,
  message = 'Erro ao carregar componente'
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-red-500 mb-4">
        <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {message}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        {error.message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
};

export default LoadingSpinner;