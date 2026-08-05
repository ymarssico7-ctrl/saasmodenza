# Modé — SaaS financeiro para lojistas de moda

Sistema completo com identidade visual premium inspirada na Apple: tipografia grande e precisa, muito espaço em branco, cartões translúcidos, cantos generosos, animações discretas e uma única cor de destaque.

## Direção visual

- Paleta: base off-white quente (#FBFAF8) / superfície branca, tinta grafite (#1B1B1F), destaque único em índigo profundo (#3A3AF0) com variação suave para gradientes, verdes e âmbares apenas para status (pago, a vencer, vencido).
- Tema claro e escuro completos, com tokens semânticos (nada de cor fixa em componentes).
- Tipografia: display geométrica para títulos + sans neutra para texto, com hierarquia forte (números grandes nos cards financeiros).
- Componentes: cartões com sombra difusa e borda de 1px translúcida, raio 20-24px, tabelas leves sem grade pesada, sheets/drawers em vez de modais quando fizer sentido, estados vazios ilustrados com ação clara.
- Micro-interações: transições de 200-300ms, contadores animados nos KPIs, feedback por toast em toda ação.

## Estrutura de navegação

Sidebar retrátil no desktop, tab bar no mobile: Dashboard, Precificação, Caixa, Pró-labore, Fiado, Relatório, Estoque, Metas, Clientes, Configurações. Rotas protegidas separadas das rotas públicas (login, cadastro, recuperar senha, onboarding).

## Backend

Ativar Lovable Cloud para autenticação (e-mail/senha + recuperação por e-mail), banco de dados e storage (logo da loja, fotos de peças). Todas as tabelas por usuário/loja com políticas de acesso restritas ao dono. Semente com dados de demonstração para as telas nunca aparecerem vazias na primeira visita.

Tabelas: perfis/lojas, movimentações de caixa, peças precificadas, pró-labore, fiados e pagamentos, clientes, estoque (com grade de tamanhos), metas mensais, membros da loja.

## Fases de entrega

**Fase 1 — Fundação e identidade**
Design system (tokens, tipografia, componentes base), Cloud ativado, cadastro/login/recuperação de senha, onboarding em 3 passos (loja e cidade, pró-labore desejado, meta do mês), shell de navegação.

**Fase 2 — Núcleo financeiro**
Dashboard com os 6 cards (entradas, saídas, saldo, fiados em aberto, progresso da meta, status do pró-labore) e últimas movimentações. Módulo Caixa completo (entrada/saída, categorias, formas de pagamento, filtro por mês, totais, editar, excluir com confirmação). Módulo Pró-labore (valor fixo, registro de retirada, status do mês, percentual do faturamento, alerta acima de 40%, histórico de 6 meses).

**Fase 3 — Precificação e Fiado**
Calculadora de precificação com cálculo em tempo real (custo real, preço mínimo, preço sugerido, lucro por peça) e histórico de peças. Fiado com lista de clientes, total em aberto, cadastro, pagamentos parciais, status pago/a vencer/vencido, lembrete por WhatsApp com mensagem pronta, histórico por cliente, editar e excluir.

**Fase 4 — Relatórios e módulos do Plano Crescimento**
Relatório do mês com comparativo do mês anterior e exportação/compartilhamento (imagem e PDF simples). Estoque com grade de tamanhos, foto, filtro por categoria, alerta de estoque baixo, relatórios de mais e menos vendidas, valor total em custo e em venda. Metas com progresso, quanto falta e projeção de fechamento. Histórico de clientes. Lembrete automático de fiado (notificação interna a 3 dias do vencimento + mensagem editável).

**Fase 5 — Configurações e acabamento**
Editar loja, logo, nome da dona, telefone e cidade, alterar senha, plano atual e renovação, usuário extra, cancelar plano com confirmação, sair da conta. Passagem final de polimento: estados vazios, estados de carregamento, responsividade, acessibilidade e SEO por rota.

## Regras aplicadas em todo o sistema

Valores sempre em R$ com formatação pt-BR, datas em DD/MM/AAAA, confirmação antes de qualquer exclusão, estado vazio com ação orientada em toda tela, feedback visual (toast) após cada ação.

## Notas técnicas

TanStack Start com rotas em `src/routes`, TanStack Query para leitura de dados, tokens em `src/styles.css` (Tailwind v4 `@theme inline`, cores em oklch), fontes carregadas via `<link>` no root, lógica de servidor em server functions. Cálculos financeiros centralizados em módulos utilitários puros para reuso entre dashboard, relatório e metas.
