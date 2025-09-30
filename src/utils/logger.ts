import { supabase } from '@/src/integrations/supabase/client';
import { LogEntry, UserRole } from '@/types';

export const logActivity = async (
  level: LogEntry['level'],
  message: string,
  module: string,
  userId?: string,
  userEmail?: string,
  companyId?: string,
) => {
  try {
    const { error } = await supabase.from('logs').insert({
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