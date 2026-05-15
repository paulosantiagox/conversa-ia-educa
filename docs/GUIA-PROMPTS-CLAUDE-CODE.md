# Guia de Prompts — Claude Code App
**Como criar prompts que sempre geram bons resultados**
Paulo Santiago — Grupo Santiago

---

## A lógica por trás dos prompts

Todo bom prompt para o Claude Code tem 5 camadas obrigatórias,
nessa ordem. Pular qualquer uma reduz muito a qualidade do resultado.

### Camada 1 — Contexto e identidade
A nova sessão não sabe nada. Diga quem você é, o que é o sistema,
qual o estilo visual esperado e as regras que nunca quebram.

### Camada 2 — Regras de design antes do código
Descreva o visual com precisão: cores exatas, larguras, comportamentos,
referências visuais. Nunca diga "faça bonito" — diga exatamente o que quer.

### Camada 3 — Sequência lógica
Siga a ordem que um dev real seguiria:
setup → dependências → banco → estrutura → páginas → git
Nunca peça uma página antes de criar o banco.

### Camada 4 — Dados mock desde o início
Sempre peça dados falsos mas realistas para o sistema funcionar
visualmente antes de ter API real. Isso permite testar o design
sem depender de integrações externas.

### Camada 5 — Checklist de confirmação
Termine sempre pedindo que confirme o que foi feito.
Isso força o Claude Code a verificar antes de dizer que terminou.

---

## Estrutura padrão de prompt de setup inicial

```
[NOME DO SISTEMA] — Setup inicial
Pasta: /Users/paulosantiago/ARQUIVOS MAC/7 PROJETOS CLAUDE/[nome-pasta]/

---

## IDENTIDADE VISUAL — LEIA ANTES DE CODAR QUALQUER COISA

[Descreva o estilo: enterprise SaaS / dashboard / command center / etc]
Referências visuais: [Linear, Stripe, Gong, Intercom, etc]

REGRAS DE DESIGN OBRIGATÓRIAS:
- [Regra 1]
- [Regra 2]
- Cores de status: [listar]
- Sem shadows excessivas — border 1px solid sutil
- Ícones: lucide-react apenas

---

## 1. CRIAR PROJETO
[comandos]

## 2. INSTALAR DEPENDÊNCIAS
[npm install ...]

## 3. CONFIGURAR [tailwind, etc]

## 4. CRIAR ESTRUTURA DE PASTAS
src/
├── components/layout/
├── components/shared/
├── pages/
├── hooks/
├── lib/
├── contexts/
└── App.jsx

## 5. CRIAR BANCO (Supabase via MCP)
Projeto: [id]
Schema: [nome]
[SQL das tabelas]

## 6. IMPLEMENTAR PÁGINAS
[descrever cada página com layout detalhado]

## 7. CRIAR CLAUDE.md
[regras obrigatórias do projeto]

## 8. DADOS MOCK
[pedir dados realistas para desenvolvimento]

## 9. GIT + GITHUB
[comandos + MCP GitHub]

## 10. CONFIRMAR FUNCIONAMENTO
[checklist do que deve estar funcionando]
```

---

## Estrutura padrão de prompt de início de sessão

Use isso SEMPRE ao abrir uma nova sessão no Claude Code:

```
Leia o CLAUDE.md e todos os arquivos da pasta docs/ antes de começar.
Confirme que está na branch main: git branch
Se não estiver: git checkout main

Inicia o servidor:
pkill -f vite 2>/dev/null
rm -rf node_modules/.vite
npm run dev -- --port [porta]

Aguarde o servidor subir e confirme que está rodando.
Só depois disso continue com o que eu pedir.

Hoje vamos implementar: [DESCREVER]
```

---

## Estrutura padrão de prompt de implementação

```
Leia o CLAUDE.md antes de começar.
Confirme branch main.

[DESCRIÇÃO DO QUE FAZER]

## 1. VERIFICAR via MCP antes de implementar
[queries SQL de diagnóstico]
Me mostre os resultados antes de implementar qualquer coisa.

## 2. RPCs no Supabase via MCP
[SQL das RPCs se necessário]

## 3. Hook src/hooks/useXXX.js
[descrição]

## 4. Página src/pages/XXX/XXX.jsx
[layout detalhado]

## 5. Atualizar menu e rotas
- Sidebar: label, ícone, seção
- App.jsx: import + rota

## Regras
- NÃO remover nada existente — apenas adicionar
- Estilo [descrever]
- Confirmar com npm run dev sem erros
- Não fazer deploy
- Avisar para fazer Cmd+Shift+R
```

---

## Estrutura padrão de prompt de correção de bug

```
Leia o CLAUDE.md antes de começar.
Confirme branch main.

Corrija o seguinte problema em [ARQUIVO]:
[DESCRIÇÃO DO PROBLEMA]

1. Mostre o conteúdo atual do arquivo
2. Identifique a causa
3. Corrija
4. Confirme com npm run dev
Não fazer deploy.
```

---

## Estrutura padrão de prompt de diagnóstico

```
Leia o CLAUDE.md antes de começar.
Confirme branch main.

APENAS DIAGNÓSTICO — não implemente nada ainda.

Use MCP para verificar os dados disponíveis:
[queries SQL]

Me mostre os resultados e confirme antes de continuar.
```

---

## Comandos rápidos (Claude Code entende esses)

| O que digitar | O que acontece |
|---|---|
| `deploy github` | git add + commit + push |
| `status` | mostra estado atual do projeto |
| `atualiza docs` | atualiza PENDENCIAS.md e CONTEXTO.md |
| `inicia servidor` | pkill vite + limpa cache + npm run dev |

---

## Regras que o Claude Code deve sempre seguir
(cole isso no CLAUDE.md de cada projeto)

```
## Regras obrigatórias

- SEMPRE branch main — nunca worktrees
- SEMPRE pkill -f vite antes de iniciar servidor
- SEMPRE rm -rf node_modules/.vite antes de iniciar
- SEMPRE usar a porta definida no projeto
- NUNCA fazer deploy sem o usuário pedir
- NUNCA remover código existente sem confirmar
- Avisar Cmd+Shift+R após mudanças no Sidebar/App
- Mostrar resultados de diagnóstico ANTES de implementar
- Se encontrar problema nos dados, reportar antes de continuar
```

---

## Como descrever o visual de forma eficiente

Em vez de dizer "faça bonito", seja específico:

❌ Ruim:
"Crie um dashboard bonito com cards"

✅ Bom:
"Dashboard com 2 linhas de MetricCards compactos (altura 80px):
Linha 1: Total conversas | Leads quentes | Alertas | Follow-ups pendentes
Linha 2: Score médio | Sem resposta +24h | Vendas hoje | Taxa fechamento
Abaixo: tabela compacta com filtros sempre visíveis.
Sem espaço vazio excessivo — estilo Stripe Dashboard."

---

## Projetos ativos

| Projeto | Pasta | Porta | Deploy | Schema Supabase |
|---|---|---|---|---|
| Data Global | data-global-claude | 5174 | GitHub → data.3smax.com | vendas |
| ConversIA | conversa-ia-educa | 5175 | GitHub apenas | conversa_ia |

---

## Referências visuais por tipo de sistema

| Tipo de sistema | Referências |
|---|---|
| Analytics / Dashboard | Stripe Dashboard, Linear, Vercel |
| CRM / Inbox | Intercom, HubSpot, Zendesk |
| Command Center / IA | Gong.io, Retool, Datadog |
| Financeiro | Stripe, Brex, Mercury |
| Marketing | Klaviyo, Mailchimp Dashboard |

---

*Documento criado em 13/05/2026 — Paulo Santiago / Grupo Santiago*
