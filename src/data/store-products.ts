// ── Atelier Mod — dados demo de produtos ─────────────────────────────────────
// Imagens locais do template original
import vestidoLinho from "@/assets/store/p-vestido-linho.jpg";
import blazerPreto from "@/assets/store/p-blazer-preto.jpg";
import camisaSeda from "@/assets/store/p-camisa-seda.jpg";
import tricoEcru from "@/assets/store/p-trico-ecru.jpg";
import calcaAlfaiataria from "@/assets/store/p-calca-alfaiataria.jpg";
import trench from "@/assets/store/p-trench.jpg";
import bolsaCouro from "@/assets/store/p-bolsa-couro.jpg";
import botas from "@/assets/store/p-botas.jpg";
import saiaMidi from "@/assets/store/p-saia-midi.jpg";
import camiseta from "@/assets/store/p-camiseta.jpg";
import lookbook1 from "@/assets/store/lookbook-1.jpg";
import lookbook2 from "@/assets/store/lookbook-2.jpg";

export type ColorOption = { name: string; token: string };

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAt?: number;
  category: string;
  badge?: string;
  images: string[];
  colors: ColorOption[];
  sizes: string[];
  composition: string;
  description: string;
  care: string[];
};

export const STORE_CATEGORIES = [
  { slug: "vestidos", label: "Vestidos" },
  { slug: "alfaiataria", label: "Alfaiataria" },
  { slug: "camisas", label: "Camisas" },
  { slug: "trico", label: "Tricô" },
  { slug: "saias", label: "Saias" },
  { slug: "casacos", label: "Casacos" },
  { slug: "acessorios", label: "Acessórios" },
  { slug: "calcados", label: "Calçados" },
] as const;

const OFFWHITE: ColorOption = { name: "Off-white", token: "oklch(0.955 0.008 85)" };
const PRETO: ColorOption = { name: "Preto", token: "oklch(0.18 0.002 60)" };
const AREIA: ColorOption = { name: "Areia", token: "oklch(0.83 0.03 80)" };
const PEDRA: ColorOption = { name: "Pedra", token: "oklch(0.66 0.008 75)" };
const CARAMELO: ColorOption = { name: "Caramelo", token: "oklch(0.62 0.08 60)" };

const CLOTHING_SIZES = ["PP", "P", "M", "G", "GG"];
const SHOE_SIZES = ["34", "35", "36", "37", "38", "39", "40"];
const ONE_SIZE = ["Único"];

const care = [
  "Lavagem a seco recomendada",
  "Não usar alvejante",
  "Passar em temperatura baixa",
  "Guardar pendurado em local seco",
];

type Seed = Omit<StoreProduct, "id" | "care">;

const seeds: Seed[] = [
  {
    slug: "vestido-linho-lavado",
    name: "Vestido Linho Lavado",
    price: 1290,
    category: "vestidos",
    badge: "Novo",
    images: [vestidoLinho, lookbook1],
    colors: [OFFWHITE, AREIA],
    sizes: CLOTHING_SIZES,
    composition: "100% linho europeu",
    description:
      "Um vestido longo de caimento fluido, cortado em linho lavado que amacia a cada uso. Alças finas ajustáveis e cintura marcada por um franzido discreto.",
  },
  {
    slug: "vestido-slip-cetim",
    name: "Vestido Slip Cetim",
    price: 1490,
    category: "vestidos",
    images: [saiaMidi, lookbook2],
    colors: [PEDRA, PRETO],
    sizes: CLOTHING_SIZES,
    composition: "92% viscose, 8% seda",
    description:
      "Corte enviesado que acompanha o corpo sem apertar. O cetim de toque frio cria um brilho contido, ideal para o dia e para a noite.",
  },
  {
    slug: "vestido-camisa-algodao",
    name: "Vestido Camisa Algodão",
    price: 1090,
    compareAt: 1390,
    category: "vestidos",
    badge: "Últimas peças",
    images: [camisaSeda, vestidoLinho],
    colors: [OFFWHITE, AREIA],
    sizes: CLOTHING_SIZES,
    composition: "100% algodão pima",
    description:
      "A alfaiataria de uma camisa em formato de vestido: colarinho estruturado, botões forrados e fenda lateral para movimento.",
  },
  {
    slug: "blazer-oversized-la",
    name: "Blazer Oversized Lã",
    price: 1890,
    category: "alfaiataria",
    badge: "Ícone",
    images: [blazerPreto, lookbook1],
    colors: [PRETO, PEDRA],
    sizes: CLOTHING_SIZES,
    composition: "78% lã virgem, 22% viscose",
    description:
      "Ombro largo, lapela fina e um único botão. Feito em lã virgem de gramatura média, mantém a forma sem enrijecer o caimento.",
  },
  {
    slug: "calca-wide-alfaiataria",
    name: "Calça Wide Alfaiataria",
    price: 1190,
    category: "alfaiataria",
    images: [calcaAlfaiataria, lookbook1],
    colors: [PRETO, PEDRA],
    sizes: CLOTHING_SIZES,
    composition: "80% lã fria, 20% poliamida",
    description:
      "Cintura alta, pregas frontais e perna reta ampla que cai limpa até o chão. Bolsos embutidos e forro parcial.",
  },
  {
    slug: "colete-alfaiataria",
    name: "Colete Alfaiataria",
    price: 890,
    category: "alfaiataria",
    images: [lookbook1, blazerPreto],
    colors: [PRETO, OFFWHITE],
    sizes: CLOTHING_SIZES,
    composition: "80% lã fria, 20% poliamida",
    description:
      "Decote em V profundo e cinco botões. Pensado para ser usado sozinho ou como camada sob o blazer.",
  },
  {
    slug: "camisa-seda-classica",
    name: "Camisa Seda Clássica",
    price: 990,
    category: "camisas",
    images: [camisaSeda, lookbook2],
    colors: [OFFWHITE, AREIA],
    sizes: CLOTHING_SIZES,
    composition: "100% seda",
    description:
      "Seda de gramatura densa, fosca no toque e discreta na luz. Punhos duplos e bolso aplicado no peito.",
  },
  {
    slug: "camiseta-algodao-pesado",
    name: "Camiseta Algodão Pesado",
    price: 320,
    category: "camisas",
    badge: "Essencial",
    images: [camiseta, lookbook2],
    colors: [OFFWHITE, PRETO, PEDRA],
    sizes: CLOTHING_SIZES,
    composition: "100% algodão orgânico 240g",
    description:
      "A base do guarda-roupa: malha pesada que não transparece, gola canelada reforçada e barra reta.",
  },
  {
    slug: "trico-cashmere-canelado",
    name: "Tricô Cashmere Canelado",
    price: 1690,
    category: "trico",
    badge: "Novo",
    images: [tricoEcru, lookbook2],
    colors: [OFFWHITE, AREIA],
    sizes: CLOTHING_SIZES,
    composition: "100% cashmere",
    description:
      "Canelado largo em cashmere de fio duplo. Gola alta macia e mangas longas com punho generoso.",
  },
  {
    slug: "saia-midi-enviesada",
    name: "Saia Midi Enviesada",
    price: 890,
    category: "saias",
    images: [saiaMidi, lookbook2],
    colors: [PEDRA, PRETO],
    sizes: CLOTHING_SIZES,
    composition: "100% viscose acetinada",
    description:
      "Corte enviesado com transpasse frontal e barra assimétrica. Cai em coluna, sem volume.",
  },
  {
    slug: "trench-algodao",
    name: "Trench Algodão",
    price: 2290,
    category: "casacos",
    badge: "Ícone",
    images: [trench, lookbook1],
    colors: [AREIA, PRETO],
    sizes: CLOTHING_SIZES,
    composition: "100% algodão gabardine",
    description:
      "Trench longo de gabardine encerada, gola conversível, martingale nas costas e punhos com fivela.",
  },
  {
    slug: "bolsa-couro-estruturada",
    name: "Bolsa Couro Estruturada",
    price: 1790,
    category: "acessorios",
    badge: "Novo",
    images: [bolsaCouro, lookbook2],
    colors: [PRETO, CARAMELO],
    sizes: ONE_SIZE,
    composition: "Couro bovino curtido a vegetal",
    description:
      "Silhueta arquitetônica com aba magnética e alça regulável. Interior em suede com bolso para cartões.",
  },
  {
    slug: "bota-couro-chelsea",
    name: "Bota Couro Chelsea",
    price: 1590,
    category: "calcados",
    images: [botas, lookbook1],
    colors: [PRETO, CARAMELO],
    sizes: SHOE_SIZES,
    composition: "Couro bovino, solado de borracha",
    description:
      "Chelsea de cano curto com elástico lateral e salto bloco de 4 cm. Construção costurada.",
  },
];

export const STORE_PRODUCTS: StoreProduct[] = seeds.map((seed, i) => ({
  ...seed,
  id: `atm-${String(i + 1).padStart(3, "0")}`,
  care,
}));

export const categoryLabel = (slug: string) =>
  STORE_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export { lookbook1, lookbook2 };
