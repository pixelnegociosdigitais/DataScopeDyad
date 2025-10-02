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
    }
  } catch (err) {
    console.error('Erro inesperado ao tentar registrar log:', err);
  }
};