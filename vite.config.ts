import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [dyadComponentTagger(), react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY || ''),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
       rollupOptions: {
         output: {
           manualChunks: {
             // Separar React e ReactDOM em chunk próprio
             'react-vendor': ['react', 'react-dom'],
             
             // Separar Supabase em chunk próprio
             'supabase-vendor': ['@supabase/supabase-js', '@supabase/auth-ui-react', '@supabase/auth-ui-shared'],
             
             // Separar bibliotecas de gráficos
             'charts-vendor': ['recharts'],
             
             // Separar bibliotecas de PDF e captura
             'pdf-vendor': ['jspdf', 'html2canvas'],
             
             // Separar utilitários
             'utils-vendor': ['react-hot-toast', '@vercel/speed-insights']
           },
           // Configurar nomes de chunks para melhor cache
           chunkFileNames: 'js/[name]-[hash].js',
           entryFileNames: 'js/[name]-[hash].js',
           assetFileNames: 'assets/[name]-[hash].[ext]'
         }
       },
       // Otimizar tamanho dos chunks
       chunkSizeWarningLimit: 1000
     },
    // Otimizações de desenvolvimento
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['recharts', 'jspdf', 'html2canvas']
    }
  };
});
