// ─── Tipos de Dados ────────────────────────────────────────────────────────────
// Arquivo de tipos e utilitários. Todos os dados reais residem no Supabase
// (inventory_items, customers, stores) ou no localStorage isolado por storeId.

export type Categoria = "Blusas" | "Calças" | "Vestidos" | "Saias" | "Acessórios";

export type Produto = {
  id: string;
  nome: string;
  categoria: Categoria;
  imagem: string;
  preco: number;
  precoPromocional?: number;
  promocaoInicio?: string;
  promocaoFim?: string;
  estoque: number;
  tamanhos: string[];
  cores: string[];
  ativo: boolean;
  destaque: boolean;
  precoOculto: boolean;
  criadoEm: string;
  vendas: number;
};

// ─── Status de Pedido ─────────────────────────────────────────────────────────

export type StatusPedido =
  "novo" | "confirmado" | "em_separacao" | "enviado" | "entregue" | "cancelado";

export const statusPedidoLabel: Record<StatusPedido, string> = {
  novo: "Novo",
  confirmado: "Confirmado",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const fluxoStatus: StatusPedido[] = [
  "novo",
  "confirmado",
  "em_separacao",
  "enviado",
  "entregue",
];

// ─── Tipo de Pedido ───────────────────────────────────────────────────────────

export type Pedido = {
  id: string;
  numero: string;
  cliente: string;
  telefone: string;
  cidade: string;
  criadoEm: string;
  status: StatusPedido;
  origem: "WhatsApp" | "Checkout";
  pagamento: "Pix" | "Cartão de crédito" | "Cartão de débito" | "Dinheiro na entrega";
  entrega: "Retirada na loja" | "Entrega local" | "Correios PAC" | "Correios SEDEX";
  endereco: string;
  rastreio?: string;
  frete: number;
  desconto: number;
  cupom?: string;
  itens: {
    produtoId: string;
    nome: string;
    tamanho: string;
    cor: string;
    qtd: number;
    preco: number;
  }[];
};

export function totalPedido(p: Pedido): number {
  const subtotal = p.itens.reduce((acc, i) => acc + i.preco * i.qtd, 0);
  return subtotal + p.frete - p.desconto;
}

// ─── Tipo de Cupom ────────────────────────────────────────────────────────────

export type Cupom = {
  id: string;
  codigo: string;
  tipo: "percentual" | "fixo";
  valor: number;
  usos: number;
  limite?: number;
  validade?: string;
  ativo: boolean;
};

// ─── Utilitários de Data ──────────────────────────────────────────────────────

export function dateBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function dateTimeBR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
