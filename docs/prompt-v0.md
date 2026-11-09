# Prompt para v0 (adaptado do OpenSpec Core Finance)

Gere um frontend Next.js + Tailwind + shadcn/ui com o seguinte OpenSpec. O app sera publicado na Vercel e exportado para GitHub.

## 1. Objetivo
Criar um web app em formato de chat, publicado, que responda em portugues sobre contas, saldos e transacoes de um banco de teste, usando MCP como tomada padrao entre a IA e as fontes externas.

## 2. Contexto e persona
- Autora: Valquiria Coelho.
- Assistente: Core Finance.
- Tagline: O núcleo inteligente para suas conexões de Open Finance.
- Tom: empatico, claro, sem jargao, com orientacao pratica.
- Cenario: aplicacao conectada por MCP de Open Finance, usando a Pluggy como gerador de conexao e interface de front-end.
- Nota de arquitetura: servidores MCP STDIO (uvx mcp-server-plaid) rodam localmente/CLI. No app publicado, mantenha integracao web/Edge Function com dados da sandbox. Documente a ponte MCP no README.

## 3. Fontes de dados (MCP)
- Pluggy (Streamable HTTP: https://mcp.pluggy.ai/mcp, sem chave): conceitos de Open Finance brasileiro (Item, connector, consentimento, recursos).
- Plaid (STDIO: uvx mcp-server-plaid, com PLAID_CLIENT_ID e PLAID_SECRET de sandbox): contas, saldos e transacoes ficticias.
- Regra de leitura: na Plaid, valor positivo = saida de dinheiro (debito).
- Regra de rotulo: saldo de cartao de credito deve ser exibido como "fatura em aberto / valor devido", nunca como "saldo disponivel".

## 4. Requisitos funcionais
1. Chat em portugues com historico de conversa.
2. Responder saldo por conta.
3. Listar transacoes recentes.
4. Mostrar 3 padroes de gasto: por categoria, por periodo, por conta.
5. Explicar termos simples (ex.: o que e um Item na Pluggy).
6. Aviso visivel e persistente de que os dados sao ficticios (sandbox).

## 5. Requisitos de UX
- Mensagens curtas, claras e empaticas.
- Valores formatados e sinalizados (entrada vs saida).
- Diferenciar conta corrente (saldo) de cartao (divida).
- Em caso de erro/ausencia de dados, explicar o proximo passo ao usuario.

## 6. Requisitos de seguranca (Etapa 1)
- Chaves e tokens devem permanecer exclusivamente no servidor; nunca devem ser enviados ao navegador nem incluídos no código versionado.
- Nenhuma chave, token ou senha em codigo versionado ou prints.
- A integração publicada usa Route Handlers no Next.js e credenciais somente em variáveis de ambiente do servidor.

## 7. Criterios de aceite
- App publicado e acessivel (Vercel).
- Aviso "Demonstracao · Dados ficticios" visivel e persistente.
- Selo de modo visivel (pilula: "Demonstracao" ou "Integracao ativa").
- Perguntas de exemplo funcionando: "qual e meu saldo?", "quanto gastei este mes?", "mostre meus gastos por categoria".
- Tabelas dos 3 padroes de gasto exibidas na conversa.
- README com caminho pergunta -> tool -> endpoint -> resposta.

## 8. Entregaveis
- App web publicado na Vercel.
- Código Next.js exportável para GitHub, na raiz do repositório core-finance.
- Repositorio GitHub publico (nome em minusculas, sem acento).
- README.md completo.
- Pasta evidencias/ com prints (sem segredos).

## 9. Webhooks (Etapa 2 - planejado)
- Receber avisos de atualizacao de dados (novas transacoes, mudanca de status).
- Validar assinatura/origem e garantir idempotencia.
- Notificar o cliente por push, SMS ou WhatsApp.
- Ver detalhes em docs/webhooks.md.

## 10. Stack e entregas tecnicas
- Framework: Next.js (App Router).
- Estilizacao: Tailwind CSS.
- Componentes: shadcn/ui.
- Fontes: Plus Jakarta Sans ou Manrope (Google Fonts).
- Icones: Lucide.
- Documentacao de design: docs/design-system.md.
- Deploy: Vercel (one-click no v0).
- Estrutura no repositório: aplicação Next.js na raiz, backend/ (protótipo Node/Express), docs/, tests/, scripts/, SECURITY.md e README.md.

## 11. Direcao de arte (obrigatorio)

- Tema escuro por padrao, com opcao de tema claro.
- Fundo azul-petroleo muito escuro (quase preto). Superficies em camadas, bordas de 1px sutis.
- Cor de destaque: coral. Entradas: verde-menta. Saidas: coral/vermelho suave. Nada de roxo generico.
- Fonte: Plus Jakarta Sans ou Manrope. Numeros tabulares (tabular-nums) em todos os valores.
- Grade de 8px, cantos de 16 a 24px, sombras suaves, icones da Lucide.
- Contraste acessivel, foco visivel, responsivo de 360px a 1440px, sem rolagem horizontal.
- Valores da aplicação sempre em BRL, formato "R$ 1.234,56".

## 12. Componentes obrigatorios

### 12.1 Cabecalho
- Monograma "C" em circulo com gradiente sutil.
- Nome da instituicao: "Core Finance".
- Slogan: "O núcleo inteligente para suas conexões de Open Finance".
- Selo de modo (pilula): "Demonstracao · Dados ficticios" ou "Integracao ativa".
- Botao de tema (lua/sol).

### 12.2 Cartao principal (hero)
- "Dinheiro em contas" com numero grande (US$ X.XXX,XX).
- Gradiente sutil no cartao.
- Mini-grafico (sparkline) ao lado do valor.
- Bloco separado "Dividas" em destaque (coral), com valor devido separado do saldo disponivel.

### 12.3 Contas como cartoes visuais
- Contas correntes: estilo cartao de plastico com numero mascarado.
- Cartoes de credito: barra de uso do limite (progresso) e divida bem clara.
- Valores ausentes: texto "Nao informado" em cinza.

### 12.4 Entradas x saidas do periodo
- Dois cartoes pequenos lado a lado.
- Indicador de variacao com seta para cima (verde-menta) ou para baixo (coral).

### 12.5 Gastos por categoria
- Grafico de rosca (donut) com total no centro.
- Legenda com icone colorido e percentual.
- Transferencias e pagamento de divida marcados com asterisco (*) e nota: "nao eh consumo".

### 12.6 Transacoes
- Lista agrupada por dia (data como cabecalho da secao).
- Cada linha: circulo de icone por categoria, nome do estabelecimento, conta e valor alinhado à direita.
- Valor positivo = saida (coral). Valor negativo = entrada (verde-menta).
- Pendentes com selo pequeno.

### 12.7 Chat do Core integrado
- Botao flutuante (FAB) que abre:
  - Desktop: painel lateral (drawer).
  - Celular: tela cheia (modal).
- Bolhas de mensagem (usuario à direita, assistente à esquerda).
- Sugestoes em "chips" abaixo do input.
- Tabelas que rolam na horizontal dentro do chat.

### 12.8 Navegacao
- Desktop: barra lateral recolhivel (Inicio, Contas, Transacoes, Core).
- Celular: barra inferior fixa com icones e rotulos.

## 13. Detalhes de interacao
- Esqueletos de carregamento (shimmer) em cards e listas.
- Estados vazios ilustrados.
- Micro-animacoes curtas: entrada dos cards (fade-up), numeros contando, hover nos cards, transicoes suaves de tema.
- Feedback de foco visivel em todos os interativos.

## 14. Regras de negocio preservadas (nao alterar)
- Valor positivo em transacao = saida de dinheiro (debito).
- Cartao de credito: saldo exibido como "fatura em aberto / valor devido", nunca como "saldo disponivel".
- Dados ficticios (sandbox) sinalizados com selo visivel e persistente.
- Chaves/tokens nunca no frontend nem versionados.

## 15. Instrucoes ao gerador
- Gere componentes reutilizaveis (Chat, Message, Table, Card, Badge, Donut, Sparkline).
- Use mock data de sandbox para transacoes/contas/saldos (ficticios, identifique claramente).
- Nao inclua chaves, tokens ou senhas no codigo.
- Inclua comentarios indicando onde conectar o backend de webhooks/insights depois.
- Nao solicite credenciais e nao faça deploy automatico.
