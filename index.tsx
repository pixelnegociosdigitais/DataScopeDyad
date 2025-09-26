import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthSessionProvider } from './src/context/AuthSessionContext';
import ToastProvider from './src/components/ToastProvider'; // Importar ToastProvider

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthSessionProvider>
      <ToastProvider /> {/* Adicionar ToastProvider aqui */}
      <App />
    </AuthSessionProvider>
  </React.StrictMode>
);