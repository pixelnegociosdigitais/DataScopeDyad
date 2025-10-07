import { supabase } from '@/src/integrations/supabase/client';
import { LogEntry } from '@/types'; // Removido UserRole

export const logActivity = async (
  level: LogEntry['level'],
  message: string,
  module: string,
  userId?: string,
  userEmail?: string,
  companyId?: string,
) => {
  try {
    // Verificar se o usuário está autenticado antes de tentar inserir logs
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('Tentativa de registrar log sem sessão autenticada. Ignorando log:', { level, message, module });
      return;
    }

    // Gerar um UUID no lado do cliente para garantir a unicidade,
    // contornando possíveis problemas com o valor padrão do DB.
    const id = crypto.randomUUID();

    const { error } = await supabase.from('logs').insert({
      id, // Fornecer explicitamente o ID gerado
      level,
      message,
      module,
      user_id: userId,
      user_email: userEmail,
      company_id: companyId,
    });

    if (error) {
      console.error('Erro ao registrar log no Supabase:', error);
      // Se o erro for relacionado a RLS, tentar novamente após um pequeno delay
      if (error.code === '42501') {
        console.warn('Erro de RLS detectado. Tentando novamente em 1 segundo...');
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            const { error: retryError } = await supabase.from('logs').insert({
              id: crypto.randomUUID(),
              level,
              message: `[RETRY] ${message}`,
              module,
              user_id: userId,
              user_email: userEmail,
              company_id: companyId,
            });
            if (retryError) {
              console.error('Erro na tentativa de retry do log:', retryError);
            }
          }
        }, 1000);
      }
    }
  } catch (err) {
    console.error('Erro inesperado ao tentar registrar log:', err);
  }
};