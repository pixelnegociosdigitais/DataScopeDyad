# 🚀 Sistema de Automação - DataScope Dyad

Este projeto implementa uma **combinação completa** de Git Hooks locais e GitHub Actions para automação de CI/CD.

## 📋 Visão Geral

### 🔧 Git Hooks Locais (Validação Rápida)
- **Pre-commit**: Validação antes de cada commit
- **Pre-push**: Validação antes de enviar ao GitHub

### 🌐 GitHub Actions (CI/CD Completo)
- **CI/CD Pipeline**: Build, test e deploy automático
- **Auto Deploy**: Deploy controlado para diferentes ambientes

## 🛠️ Como Funciona

### 1. **Desenvolvimento Local**
```bash
# Ao fazer commit
git add .
git commit -m "feat: nova funcionalidade"
# ✅ Hook pre-commit executa automaticamente:
#    - Verifica sintaxe TypeScript
#    - Testa build
#    - Aprova ou cancela o commit

# Ao fazer push
git push origin main
# ✅ Hook pre-push executa automaticamente:
#    - Verifica sincronização
#    - Testa build de produção
#    - Verifica arquivos grandes
#    - Envia para GitHub
```

### 2. **GitHub Actions (Automático)**
Quando o código chega no GitHub:
- ✅ **Build & Test**: Instala dependências, verifica TypeScript, faz build
- ✅ **Build Android**: Gera APK (apenas no branch main)
- ✅ **Notificações**: Informa status do pipeline

## 📦 Scripts NPM Disponíveis

### 🔍 Validação
```bash
npm run type-check    # Verifica TypeScript
npm run lint          # Executa linting
npm run test          # Executa todos os testes
```

### 🔨 Build
```bash
npm run build         # Build para produção
npm run preview       # Preview do build
```

### 📱 Capacitor
```bash
npm run cap:sync      # Sincroniza com Capacitor
npm run cap:android   # Build Android
npm run cap:ios       # Sincroniza iOS
```

### 🚀 Deploy
```bash
npm run deploy:staging  # Deploy para staging
npm run deploy:prod     # Deploy para produção
```

### 🔒 Git Seguro
```bash
npm run git:safe-push   # Push com validação completa
npm run git:force-push  # Force push seguro
```

### ⚙️ Setup
```bash
npm run setup         # Configuração inicial completa
```

## 🎯 Fluxo de Trabalho Recomendado

### Para Desenvolvimento Diário:
1. **Desenvolva** normalmente
2. **Commit** - hooks validam automaticamente
3. **Push** - hooks fazem validação final
4. **GitHub Actions** executa CI/CD automaticamente

### Para Deploy:
```bash
# Opção 1: Deploy manual
npm run deploy:staging

# Opção 2: Deploy via GitHub Actions
# Vá para Actions > Auto Deploy > Run workflow
```

## 🔧 Configuração de Ambientes

### Variáveis de Ambiente (GitHub Secrets)
Para habilitar deploy automático, configure:

```
# Para Vercel
VERCEL_TOKEN=seu_token
ORG_ID=seu_org_id
PROJECT_ID=seu_project_id

# Para Netlify
NETLIFY_AUTH_TOKEN=seu_token
NETLIFY_SITE_ID=seu_site_id
```

## 📊 Monitoramento

### GitHub Actions
- Acesse: `GitHub > Actions`
- Veja status de todos os builds
- Download de artifacts (APKs, builds)

### Logs Locais
Os hooks mostram logs detalhados:
- ✅ Sucesso: Mensagens verdes
- ❌ Erro: Mensagens vermelhas com dicas

## 🚨 Resolução de Problemas

### Hook não executa?
```bash
# Verificar configuração
git config core.hooksPath

# Reconfigurar se necessário
git config core.hooksPath .git/hooks
```

### Build falha?
```bash
# Testar localmente
npm run test

# Ver erros detalhados
npm run build
```

### GitHub Actions falha?
1. Verifique logs no GitHub
2. Teste localmente com `npm run test`
3. Verifique dependências no `package.json`

## 🎉 Benefícios

### ✅ Validação Local Rápida
- Detecta erros antes do commit
- Economiza tempo de desenvolvimento
- Evita commits quebrados

### ✅ CI/CD Automático
- Build automático no GitHub
- Deploy controlado
- Histórico completo de builds

### ✅ Colaboração Melhorada
- Todos os desenvolvedores têm as mesmas validações
- Processo padronizado
- Qualidade de código garantida

---

## 🔄 Próximos Passos

1. **Teste o sistema** fazendo um commit
2. **Configure secrets** para deploy automático
3. **Personalize workflows** conforme necessário
4. **Adicione testes** automatizados se desejar

**Sistema implementado com sucesso! 🎉**