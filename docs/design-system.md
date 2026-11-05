# Design System — Core Finance

## Princípios
- **Inspiração:** Revolut, Nubank, Wise (nível de acabamento, sem cópia de marcas).
- **Sensação:** confiável, limpo, premium.
- **Tema escuro por padrão**, com opção de tema claro.
- **Fundo:** azul-petróleo muito escuro (quase preto).
- **Superfícies:** em camadas, bordas de 1px sutis.
- **Cor de destaque:** coral.
- **Entradas:** verde-menta. **Saídas:** coral/vermelho suave.
- **Nada de roxo genérico.**
- **Tipografia:** Plus Jakarta Sans ou Manrope (Google Fonts), números tabulares (`tabular-nums`) em todos os valores. Títulos fortes, rótulos pequenos em cinza.
- **Grade:** 8px. **Cantos:** 16 a 24px. **Sombras:** suaves. **Ícones:** Lucide.
- **Contraste acessível, foco visível, responsivo 360px a 1440px, sem rolagem horizontal.**
- **Valores sempre em USD**, formato "US$ 1.234,56".

## Cores (tokens sugeridos)

| Token | Uso | Exemplo (dark) |
|---|---|---|
| `--bg` | Fundo principal | `#0b161d` (azul-petróleo quase preto) |
| `--surface` | Cartões/paineis | `#13232c` |
| `--surface-elev` | Sobreposições modais | `#1a2e38` |
| `--border` | Borda 1px sutil | `#1f3a45` |
| `--text` | Texto principal | `#e8f2f6` |
| `--text-muted` | Rótulos/legenda | `#8aa5b1` |
| `--accent` | Destaque/coral | `#ff6b55` |
| `--inflow` | Entrada/verde-menta | `#4ade80` |
| `--outflow` | Saída/coral suave | `#ff8a74` |
| `--ink` | Texto sobre acento | `#ffffff` |

## Tipografia

| Escala | Uso | Tamanho | Peso |
|---|---|---|---|
| `--text-xs` | Rótulo pequeno | 0.75rem | 500 |
| `--text-sm` | Rótulo/corpo | 0.875rem | 400/500 |
| `--text-base` | Corpo padrão | 1rem | 400 |
| `--text-lg` | Título pequeno | 1.125rem | 600 |
| `--text-xl` | Título médio | 1.25rem | 600 |
| `--text-2xl` | Título grande | 1.5rem | 700 |
| `--text-3xl` | Hero número | 2.25rem | 700 |
| `--text-4xl` | Hero principal | 3rem | 800 |

Todos os valores monetários usam `font-variant-numeric: tabular-nums`.

## Componentes

### 1. Cabeçalho
- Monograma "C" em círculo com gradiente sutil.
- Nome da instituicao: "Core Finance".
- Tagline: "O núcleo inteligente para suas conexões de Open Finance".
- Selo de modo (píldula): "Demonstração · Dados fictícios" ou "Integração ativa".
- Botão de tema (lua/sol).

### 2. Cartão principal (hero)
- "Dinheiro em contas" com número grande (US$ X.XXX,XX).
- Gradiente sutil no cartão.
- Mini-gráfico (sparkline) ao lado do valor.
- Bloco separado "Dívidas" em destaque (coral), com valor devido separado do saldo disponível.

### 3. Contas como cartões visuais
- Contas correntes: estilo cartão de plástico com número mascarado.
- Cartões de crédito: barra de uso do limite (progresso) e dívida bem clara.
- Valores ausentes: texto "Não informado" em cinza.

### 4. Entradas x saídas do período
- Dois cartões pequenos lado a lado.
- Indicador de variação com seta para cima (verde-menta) ou para baixo (coral).

### 5. Gastos por categoria
- Gráfico de rosca (donut) com total no centro.
- Legenda com ícone colorido e percentual.
- Transferências e pagamento de dívida marcados com asterisco (*) e nota: "não é consumo".

### 6. Transações
- Lista agrupada por dia (data como cabeçalho da seção).
- Cada linha: círculo de ícone por categoria, nome do estabelecimento, conta, valor alinhado à direita.
- Valor positivo = saída (coral). Valor negativo = entrada (verde-menta).
- Pendentes com selo pequeno.

### 7. Chat do Core integrado
- Botão flutuante (FAB) que abre:
  - Desktop: painel lateral (drawer).
  - Celular: tela cheia (modal).
- Bolhas de mensagem (usuário à direita, assistente à esquerda).
- Sugestões em "chips" abaixo do input.
- Tabelas que rolam na horizontal dentro do chat.

### 8. Navegação
- Desktop: barra lateral recolhível (Início, Contas, Transações, Core).
- Celular: barra inferior fixa com ícones e rótulos.

## Detalhes de interação
- Esqueletos de carregamento (shimmer) em cartões e listas.
- Estados vazios ilustrados.
- Micro-animações curtas: entrada dos cartões (fade-up), números contando, hover nos cartões, transições suaves de tema.
- Feedback de foco visível em todos os interativos.

## Regras de negócio preservadas (não alterar)
- Valor positivo em transação = saída de dinheiro (débito).
- Cartão de crédito: saldo exibido como "fatura em aberto / valor devido", nunca como "saldo disponível".
- Dados fictícios (sandbox) sinalizados com selo visível e persistente.
- Chaves/tokens nunca no frontend nem versionados.
