# Documentação das Tabelas do Banco de Dados - DataScopeDyad

## Resumo Geral

**Total de tabelas identificadas:** 17 tabelas  
**Status:** Todas as tabelas estão acessíveis e funcionais  
**Estado atual:** Todas as tabelas estão vazias (0 registros)  
**Data da verificação:** Janeiro 2025

---

## Lista Completa das Tabelas

### 1. **answers**
- **Descrição:** Tabela para armazenar respostas
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Respostas de usuários a perguntas/questionários

### 2. **chat_participants**
- **Descrição:** Participantes de chats
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Relaciona usuários com chats específicos

### 3. **chats**
- **Descrição:** Conversas/chats do sistema
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Armazena informações de conversas entre usuários

### 4. **companies**
- **Descrição:** Empresas cadastradas
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Dados das empresas que utilizam o sistema

### 5. **giveaway_winners**
- **Descrição:** Vencedores de sorteios
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Registra vencedores de promoções/sorteios

### 6. **logs**
- **Descrição:** Logs do sistema
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Auditoria e registro de atividades do sistema

### 7. **messages**
- **Descrição:** Mensagens do sistema
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Mensagens trocadas entre usuários nos chats

### 8. **module_permissions**
- **Descrição:** Permissões de módulos
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Controle de acesso a diferentes módulos do sistema

### 9. **notices**
- **Descrição:** Avisos/notificações
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Notificações gerais do sistema

### 10. **prices**
- **Descrição:** Preços
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Tabela de preços de produtos/serviços

### 11. **prizes**
- **Descrição:** Prêmios
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Prêmios disponíveis em sorteios/promoções

### 12. **profiles**
- **Descrição:** Perfis de usuários
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Informações detalhadas dos perfis de usuários

### 13. **questions**
- **Descrição:** Perguntas
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Perguntas de questionários/surveys

### 14. **survey_responses**
- **Descrição:** Respostas de pesquisas
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Respostas completas de usuários a pesquisas

### 15. **survey_templates**
- **Descrição:** Modelos de pesquisa
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Templates reutilizáveis para criação de pesquisas

### 16. **surveys**
- **Descrição:** Pesquisas/questionários
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Pesquisas criadas no sistema

### 17. **user_notices**
- **Descrição:** Avisos específicos de usuários
- **Status:** ✅ Acessível
- **Registros:** 0
- **Uso provável:** Notificações direcionadas a usuários específicos

---

## Análise dos Relacionamentos Prováveis

Com base nos nomes das tabelas, podemos inferir os seguintes relacionamentos:

### **Módulo de Usuários**
- `profiles` → Perfis de usuários
- `companies` → Empresas dos usuários
- `module_permissions` → Permissões por módulo

### **Módulo de Pesquisas**
- `surveys` → Pesquisas principais
- `survey_templates` → Templates de pesquisas
- `questions` → Perguntas das pesquisas
- `answers` → Respostas individuais
- `survey_responses` → Respostas completas

### **Módulo de Comunicação**
- `chats` → Conversas
- `chat_participants` → Participantes das conversas
- `messages` → Mensagens das conversas

### **Módulo de Notificações**
- `notices` → Avisos gerais
- `user_notices` → Avisos específicos por usuário

### **Módulo de Promoções**
- `prizes` → Prêmios disponíveis
- `giveaway_winners` → Vencedores de sorteios
- `prices` → Preços/valores

### **Módulo de Sistema**
- `logs` → Auditoria e logs do sistema

---

## Status da Verificação

### ✅ **Sucessos**
- Todas as 17 tabelas foram identificadas e estão acessíveis
- Conexão com o banco de dados está funcionando corretamente
- Credenciais do Supabase estão configuradas adequadamente
- Tanto `prices` quanto `prizes` existem (eram variações testadas)

### ⚠️ **Observações**
- Todas as tabelas estão atualmente vazias (0 registros)
- Não foi possível obter a estrutura detalhada das colunas devido às tabelas estarem vazias
- Algumas tentativas de descobrir estrutura via INSERT falharam silenciosamente

### 🔧 **Próximos Passos Recomendados**
1. Popular as tabelas com dados de teste para verificar estruturas
2. Implementar as funcionalidades que utilizam essas tabelas
3. Criar relacionamentos entre as tabelas conforme necessário
4. Implementar validações e constraints apropriadas

---

## Configuração Técnica

**URL do Supabase:** `https://dffhmzdqdmesoigksudw.supabase.co`  
**Projeto ID:** `dffhmzdqdmesoigksudw`  
**Schema:** `public`  
**Cliente utilizado:** `@supabase/supabase-js`

---

*Documentação gerada automaticamente em Janeiro 2025*