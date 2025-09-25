import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dffhmzdqdmesoigksudw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmZmhtemRxZG1lc29pZ2tzdWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MjcwMzksImV4cCI6MjA3NDQwMzAzOX0.6IL7tzGQ9yzdu-QzjM4jVPOUYF5f5ozczGLDvKR9GTc";

// Armazenamento em memória para a sessão do Supabase.
// Isso garante que nenhum dado de sessão seja persistido no localStorage.
// O usuário precisará fazer login toda vez que a página for recarregada.
const memoryStore: { [key: string]: string } = {};

const inMemoryStorage = {
  getItem: (key: string) => {
    return memoryStore[key] || null;
  },
  setItem: (key: string, value: string) => {
    memoryStore[key] = value;
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
};

const supabaseOptions: SupabaseClientOptions<"public"> = {
    auth: {
        storage: inMemoryStorage,
        autoRefreshToken: true,
        persistSession: true, // Necessário para que o cliente tente usar o 'storage' fornecido
        detectSessionInUrl: true,
    },
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, supabaseOptions);