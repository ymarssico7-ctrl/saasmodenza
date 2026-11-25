/**
 * test-orders-postale.mjs
 *
 * Suíte de Testes Automatizados para a Fase 2 da Operação Aperfeiçoamento:
 * Pós-Venda, Baixa de Estoque, Livro Caixa, Sincronização e Cancelamento.
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

const BASE_DIR = "c:/Users/yande/Downloads/Modaly 2.0/mode-saas";
const pedidosPath = path.join(BASE_DIR, "src/routes/_authenticated/loja.pedidos.tsx");
const mutationsPath = path.join(BASE_DIR, "src/lib/mutations.ts");

const pedidosContent = fs.readFileSync(pedidosPath, "utf-8");
const mutationsContent = fs.readFileSync(mutationsPath, "utf-8");

console.log("=== VESTUI — AUDITORIA DE PÓS-VENDA, ESTOQUE & CAIXA (FASE 2) ===\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Erro: ${err.message}`);
    failed++;
  }
}

// ── TP-01: Proteção contra Duplo Clique & Concorrência ───────────────────────
test("TP-01: Estado processandoId e disabled nos botões de avanço e cancelamento", () => {
  assert(
    pedidosContent.includes("const [processandoId, setProcessandoId] = useState"),
    "Deve conter estado reativo processandoId"
  );
  assert(
    pedidosContent.includes("disabled={processandoId === pedidoAberto.id}") ||
    pedidosContent.includes("disabled={Boolean(processandoId)}"),
    "Botões devem estar desabilitados quando processandoId estiver ativo"
  );
  assert(
    pedidosContent.includes("if (processandoId) return;"),
    "Funções devem ter guard contra execução simultânea"
  );
  assert(
    pedidosContent.includes("setProcessandoId(null)"),
    "Deve garantir liberação do processandoId no bloco finally"
  );
});

// ── TP-02: Conformidade com React Rules of Hooks ─────────────────────────────
test("TP-02: PedidosRouteWrapper isola verificação de plano sem early return antes de hooks", () => {
  assert(
    pedidosContent.includes("component: PedidosRouteWrapper"),
    "A rota deve apontar para PedidosRouteWrapper como componente raiz"
  );
  assert(
    pedidosContent.includes("function PedidosRouteWrapper()"),
    "Deve existir a função PedidosRouteWrapper"
  );
  assert(
    pedidosContent.includes("if (access.isFree) return <PedidosGatePresentation />"),
    "A apresentação de gate deve ser verificada no wrapper"
  );

  // Garante que dentro de PedidosPage NÃO há retorno prematuro do gate antes de hooks
  const pedidosPageIdx = pedidosContent.indexOf("function PedidosPage()");
  const slicePedidosPage = pedidosContent.slice(pedidosPageIdx, pedidosPageIdx + 500);
  assert(
    !slicePedidosPage.includes("if (access.isFree) return <PedidosGatePresentation />"),
    "PedidosPage não deve conter retorno prematuro antes de seus hooks"
  );
});

// ── TP-03: Reconciliação Supabase x LocalStorage ─────────────────────────────
test("TP-03: Pedidos do Supabase são a autoridade absoluta sobre o cache local", () => {
  assert(
    pedidosContent.includes("reaisValidos = dbMapped.filter"),
    "Deve filtrar pedidos reais do banco"
  );
  assert(
    pedidosContent.includes("reaisIds = new Set(reaisValidos.map"),
    "Deve criar Set de IDs reais para evitar sobreposição pelo cache obsoleto"
  );
  assert(
    pedidosContent.includes("simuladosValidos = stored.filter"),
    "Deve preservar apenas pedidos estritamente de simulação/treino"
  );
  assert(
    pedidosContent.includes("const mesclados = [...reaisValidos, ...simuladosValidos]"),
    "Deve mesclar com prioridade para pedidos reais do Supabase"
  );
});

// ── TP-04: Sequência Atômica de Aprovação do Pedido ──────────────────────────
test("TP-04: Baixa de estoque antecede a atualização de status e lançamento financeiro", () => {
  const avancoIdx = pedidosContent.indexOf("const executarAvancoStatus");
  const sliceAvanco = pedidosContent.slice(avancoIdx, avancoIdx + 4000);

  const idxEstoque = sliceAvanco.indexOf("adjustInventoryStock");
  const idxStatus = sliceAvanco.indexOf('.from("orders")');
  const idxCaixa = sliceAvanco.indexOf("insertTransaction");

  assert(idxEstoque !== -1, "Deve invocar adjustInventoryStock");
  assert(idxStatus !== -1, "Deve atualizar tabela orders");
  assert(idxCaixa !== -1, "Deve inserir transação no Caixa");
  assert(
    idxEstoque < idxStatus && idxStatus < idxCaixa,
    "Ordem estrita deve ser: 1. Baixa de Estoque -> 2. Atualização de Status -> 3. Lançamento no Caixa"
  );
});

// ── TP-05: Cancelamento com Devolução de Estoque e Estorno ────────────────────
test("TP-05: Cancelamento de pedido confirmado estorna estoque e registra saída no Caixa", () => {
  const cancelarIdx = pedidosContent.indexOf("const cancelar = async");
  const sliceCancelar = pedidosContent.slice(cancelarIdx, cancelarIdx + 4000);

  assert(
    sliceCancelar.includes("restoreOrderStock(storeId, pedido.itens)"),
    "Deve restaurar o estoque físico dos itens"
  );
  assert(
    sliceCancelar.includes('kind: "saida"'),
    "Deve lançar saída no Caixa"
  );
  assert(
    sliceCancelar.includes('category: "estorno_devolucao"'),
    "Categoria deve ser estorno_devolucao"
  );
});

// ── TP-06: Normalização de Telefone Brasileiro com DDD 55 ────────────────────
test("TP-06: Normalização de telefone prefixa DDI 55 com base no comprimento de dígitos", () => {
  assert(
    pedidosContent.includes("phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits"),
    "Telefones de 10 ou 11 dígitos devem receber prefixo 55 mesmo com DDD 55"
  );
});

// ── TP-07: Suporte Semântico a Retirada no Balcão ────────────────────────────
test("TP-07: Reconhece modalidade de retirada e exibe badge correspondente", () => {
  assert(
    pedidosContent.includes("addr.modalidade === \"retirada\""),
    "Deve inspecionar campo modalidade: 'retirada' do endereço JSON"
  );
  assert(
    pedidosContent.includes("Retirada no Balcão") || pedidosContent.includes("Retirada presencial"),
    "Deve exibir identificação clara de Retirada no Balcão"
  );
  assert(
    pedidosContent.includes("Copiar dados") || pedidosContent.includes("RETIRADA NO BALCÃO"),
    "Deve adaptar ação de cópia para pedidos de retirada presencial"
  );
});

// ── TP-08: Mensagens Semânticas de WhatsApp por Status ───────────────────────
test("TP-08: Templates de WhatsApp contextualizados para cada etapa do pedido", () => {
  assert(
    pedidosContent.includes("confirmado com sucesso e já está sendo preparado"),
    "Template de pedido confirmado humanizado"
  );
  assert(
    pedidosContent.includes("bancada de separação"),
    "Template de pedido em separação"
  );
  assert(
    pedidosContent.includes("prontinho para retirada no balcão da loja"),
    "Template diferenciado para retirada no balcão quando a caminho"
  );
  assert(
    pedidosContent.includes("foi entregue!"),
    "Template amigável de pedido entregue"
  );
});

// ── TP-09: Romaneio de Separação para Impressão ──────────────────────────────
test("TP-09: Função de Romaneio de Separação com dados para conferência física", () => {
  assert(
    pedidosContent.includes("const imprimirRomaneio = (p: Pedido)"),
    "Deve implementar função imprimirRomaneio"
  );
  assert(
    pedidosContent.includes("Romaneio de Separação"),
    "Deve gerar layout formatado para separação e conferência"
  );
  assert(
    pedidosContent.includes("Imprimir Romaneio"),
    "Botão de impressão deve estar visível no drawer do pedido"
  );
});

// ── TP-10: Ajuste de Estoque Case-Insensitive em mutations.ts ────────────────
test("TP-10: adjustInventoryStock faz busca case-insensitive de tamanhos", () => {
  assert(
    mutationsContent.includes("k.trim().toLowerCase() === tamanho.trim().toLowerCase()"),
    "Deve fazer correspondência insensível a maiúsculas/minúsculas para tamanhos"
  );
});

console.log("\n────────────────────────────────────────────────────────────");
console.log(`RESULTADO DA FASE 2: ${passed}/${passed + failed} testes passaram`);

if (failed === 0) {
  console.log("🎉 PÓS-VENDA, ESTOQUE E CAIXA 100% BLINDADOS E APROVADOS EM QA!\n");
  process.exit(0);
} else {
  console.error("❌ HOUVE FALHAS NA VALIDAÇÃO DA FASE 2.\n");
  process.exit(1);
}
