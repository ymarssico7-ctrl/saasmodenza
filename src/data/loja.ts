// Imagens de produtos — Unsplash CDN (substituir por assets reais em produção)
const IMG = {
  blusa1:    "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600&q=80",
  calca:     "https://images.unsplash.com/photo-1594938298603-c8148e4e3b58?w=600&q=80",
  vestido1:  "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80",
  saia:      "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&q=80",
  bolsa:     "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80",
  cardiga:   "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&q=80",
  vestido2:  "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80",
  blusa2:    "https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=600&q=80",
};

export const loja = {
  nome: "Ateliê Manon",
  descricao: "Moda feminina autoral, peças selecionadas à mão em Belo Horizonte.",
  subdominio: "atelie-manon.Modenza.com.br",
  dominioProprio: "",
  whatsapp: "(31) 99812-4477",
  instagram: "@ateliemanon",
  cidade: "Belo Horizonte",
  estado: "MG",
  corPrincipal: "#3A3AF0",
  boasVindas: "Oi! Que bom te ver por aqui. Qualquer dúvida, me chama no WhatsApp 💜",
  politicaTroca:
    "Trocas em até 7 dias corridos após o recebimento, com etiqueta e nota fiscal. Peças em promoção têm troca somente por outro tamanho.",
  publicarAutomaticamente: true,
  mostrarEstoque: false,
};

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

export const produtos: Produto[] = [
  {
    id: "p1",
    nome: "Blusa de seda Manon",
    categoria: "Blusas",
    imagem: IMG.blusa1,
    preco: 189.9,
    estoque: 12,
    tamanhos: ["P", "M", "G"],
    cores: ["Off-white", "Preto"],
    ativo: true,
    destaque: true,
    precoOculto: false,
    criadoEm: "2026-08-01",
    vendas: 34,
  },
  {
    id: "p2",
    nome: "Calça pantalona alfaiataria",
    categoria: "Calças",
    imagem: IMG.calca,
    preco: 259.9,
    precoPromocional: 219.9,
    promocaoInicio: "2026-08-01",
    promocaoFim: "2026-08-15",
    estoque: 7,
    tamanhos: ["36", "38", "40", "42"],
    cores: ["Grafite", "Caramelo"],
    ativo: true,
    destaque: true,
    precoOculto: false,
    criadoEm: "2026-07-18",
    vendas: 28,
  },
  {
    id: "p3",
    nome: "Vestido longo Índigo",
    categoria: "Vestidos",
    imagem: IMG.vestido1,
    preco: 349.9,
    estoque: 2,
    tamanhos: ["P", "M"],
    cores: ["Índigo"],
    ativo: true,
    destaque: false,
    precoOculto: false,
    criadoEm: "2026-07-29",
    vendas: 19,
  },
  {
    id: "p4",
    nome: "Saia midi plissada linho",
    categoria: "Saias",
    imagem: IMG.saia,
    preco: 199.9,
    estoque: 0,
    tamanhos: ["P", "M", "G", "GG"],
    cores: ["Areia"],
    ativo: true,
    destaque: false,
    precoOculto: false,
    criadoEm: "2026-06-30",
    vendas: 41,
  },
  {
    id: "p5",
    nome: "Bolsa couro Estrutura",
    categoria: "Acessórios",
    imagem: IMG.bolsa,
    preco: 429.9,
    estoque: 5,
    tamanhos: ["Único"],
    cores: ["Terracota"],
    ativo: true,
    destaque: false,
    precoOculto: true,
    criadoEm: "2026-07-22",
    vendas: 11,
  },
  {
    id: "p6",
    nome: "Cardigã tricot Ecru",
    categoria: "Blusas",
    imagem: IMG.cardiga,
    preco: 279.9,
    estoque: 9,
    tamanhos: ["M", "G", "GG"],
    cores: ["Ecru"],
    ativo: false,
    destaque: false,
    precoOculto: false,
    criadoEm: "2026-07-10",
    vendas: 7,
  },
  {
    id: "p7",
    nome: "Vestido curto Sol",
    categoria: "Vestidos",
    imagem: IMG.vestido2,
    preco: 229.9,
    estoque: 1,
    tamanhos: ["P", "M", "G"],
    cores: ["Índigo", "Preto"],
    ativo: true,
    destaque: false,
    precoOculto: false,
    criadoEm: "2026-08-03",
    vendas: 5,
  },
  {
    id: "p8",
    nome: "Blusa cropped canelada",
    categoria: "Blusas",
    imagem: IMG.blusa2,
    preco: 129.9,
    estoque: 18,
    tamanhos: ["P", "M", "G"],
    cores: ["Off-white", "Verde"],
    ativo: true,
    destaque: false,
    precoOculto: false,
    criadoEm: "2026-05-12",
    vendas: 52,
  },
];

export type StatusPedido =
  | "novo"
  | "confirmado"
  | "em_separacao"
  | "enviado"
  | "entregue"
  | "cancelado";

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
  itens: { produtoId: string; nome: string; tamanho: string; cor: string; qtd: number; preco: number }[];
};

export function totalPedido(p: Pedido): number {
  const subtotal = p.itens.reduce((acc, i) => acc + i.preco * i.qtd, 0);
  return subtotal + p.frete - p.desconto;
}

export const pedidos: Pedido[] = [
  {
    id: "o1",
    numero: "#1042",
    cliente: "Marina Alvarenga",
    telefone: "(31) 99145-2210",
    cidade: "Belo Horizonte",
    criadoEm: "2026-08-04T14:20:00",
    status: "novo",
    origem: "Checkout",
    pagamento: "Pix",
    entrega: "Entrega local",
    endereco: "Rua Fernandes Tourinho, 480 — Savassi, Belo Horizonte/MG",
    frete: 8,
    desconto: 0,
    itens: [
      { produtoId: "p1", nome: "Blusa de seda Manon", tamanho: "M", cor: "Off-white", qtd: 1, preco: 189.9 },
      { produtoId: "p2", nome: "Calça pantalona alfaiataria", tamanho: "38", cor: "Grafite", qtd: 1, preco: 219.9 },
    ],
  },
  {
    id: "o2",
    numero: "#1041",
    cliente: "Juliana Prado",
    telefone: "(31) 98822-7701",
    cidade: "Contagem",
    criadoEm: "2026-08-04T10:05:00",
    status: "confirmado",
    origem: "WhatsApp",
    pagamento: "Cartão de crédito",
    entrega: "Correios SEDEX",
    endereco: "Av. João César de Oliveira, 1200 — Eldorado, Contagem/MG",
    rastreio: "BR849201773BR",
    frete: 24.7,
    desconto: 20,
    cupom: "PRIMEIRACOMPRA",
    itens: [
      { produtoId: "p3", nome: "Vestido longo Índigo", tamanho: "P", cor: "Índigo", qtd: 1, preco: 349.9 },
    ],
  },
  {
    id: "o3",
    numero: "#1040",
    cliente: "Camila Rezende",
    telefone: "(31) 99677-4432",
    cidade: "Nova Lima",
    criadoEm: "2026-08-03T18:42:00",
    status: "em_separacao",
    origem: "Checkout",
    pagamento: "Pix",
    entrega: "Retirada na loja",
    endereco: "Retirada na loja — Rua Antônio de Albuquerque, 156",
    frete: 0,
    desconto: 0,
    itens: [
      { produtoId: "p5", nome: "Bolsa couro Estrutura", tamanho: "Único", cor: "Terracota", qtd: 1, preco: 429.9 },
    ],
  },
  {
    id: "o4",
    numero: "#1039",
    cliente: "Beatriz Nogueira",
    telefone: "(31) 98301-9922",
    cidade: "Belo Horizonte",
    criadoEm: "2026-08-02T09:15:00",
    status: "enviado",
    origem: "Checkout",
    pagamento: "Cartão de débito",
    entrega: "Correios PAC",
    endereco: "Rua Grão Mogol, 77 — Sion, Belo Horizonte/MG",
    rastreio: "BR112094881BR",
    frete: 18.4,
    desconto: 0,
    itens: [
      { produtoId: "p8", nome: "Blusa cropped canelada", tamanho: "P", cor: "Verde", qtd: 2, preco: 129.9 },
    ],
  },
  {
    id: "o5",
    numero: "#1038",
    cliente: "Larissa Coutinho",
    telefone: "(31) 99510-1188",
    cidade: "Betim",
    criadoEm: "2026-07-31T16:00:00",
    status: "entregue",
    origem: "WhatsApp",
    pagamento: "Pix",
    entrega: "Correios PAC",
    endereco: "Rua das Acácias, 310 — Centro, Betim/MG",
    rastreio: "BR441092100BR",
    frete: 18.4,
    desconto: 0,
    itens: [
      { produtoId: "p4", nome: "Saia midi plissada linho", tamanho: "M", cor: "Areia", qtd: 1, preco: 199.9 },
      { produtoId: "p6", nome: "Cardigã tricot Ecru", tamanho: "G", cor: "Ecru", qtd: 1, preco: 279.9 },
    ],
  },
];

export const kpisLoja = {
  vendasMes: 4287.5,
  vendasMesAnterior: 3120.0,
  pedidos: 18,
  pedidosMesAnterior: 14,
  ticketMedio: 238.2,
  ticketMedioAnterior: 222.9,
  produtoTop: "Blusa cropped canelada",
  produtoTopVendas: 52,
  origem: [
    { nome: "Instagram / Bio", valor: 9 },
    { nome: "WhatsApp direto", valor: 6 },
    { nome: "Checkout", valor: 3 },
  ],
};

export const vendasPorDia = [
  { dia: "28/07", vendas: 0 },
  { dia: "29/07", vendas: 349.9 },
  { dia: "30/07", vendas: 199.9 },
  { dia: "31/07", vendas: 479.8 },
  { dia: "01/08", vendas: 189.9 },
  { dia: "02/08", vendas: 259.8 },
  { dia: "03/08", vendas: 429.9 },
  { dia: "04/08", vendas: 417.7 },
];

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

export const cupons: Cupom[] = [
  {
    id: "c1",
    codigo: "PRIMEIRACOMPRA",
    tipo: "fixo",
    valor: 20,
    usos: 8,
    limite: 50,
    validade: "2026-12-31",
    ativo: true,
  },
  {
    id: "c2",
    codigo: "AGOSTO10",
    tipo: "percentual",
    valor: 10,
    usos: 3,
    validade: "2026-08-31",
    ativo: true,
  },
  {
    id: "c3",
    codigo: "VERÃO2026",
    tipo: "percentual",
    valor: 15,
    usos: 22,
    limite: 30,
    validade: "2026-03-31",
    ativo: false,
  },
];

export function dateBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function dateTimeBR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

