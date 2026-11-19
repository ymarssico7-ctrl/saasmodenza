/**
 * templates-registry.ts — Registro Central de Templates do Vestui SaaS
 *
 * REGRA: Cada novo template criado DEVE ser registrado aqui.
 * O ID deve ser idêntico ao `templateId` do ThemeConfig.
 *
 * Estrutura extensível: adicione um novo objeto ao array TEMPLATES_REGISTRY
 * para que o template apareça automaticamente na Galeria de Temas.
 */

export type TemplateCategory =
  "todos" | "minimalista" | "luxo" | "editorial" | "streetwear" | "boutique";

export interface TemplateEntry {
  /** Deve ser idêntico ao `settings.templateId` no ThemeConfig */
  id:
    | "template-01"
    | "template-02"
    | "template-03"
    | "template-04"
    | "template-05"
    | "catalogo-express";
  /** Nome de marketing do template */
  name: string;
  /** Tagline curta (até 5 palavras) */
  tagline: string;
  /** Descrição longa para o card de detalhes */
  description: string;
  /** Categorias para filtro */
  categories: TemplateCategory[];
  /** Tags de estilo (até 3) */
  tags: string[];
  /** Paleta de cores para exibição — valores CSS válidos */
  palette: {
    background: string;
    foreground: string;
    primary: string;
    canvas: string;
    border: string;
  };
  /** Tipografia do template */
  typography: {
    display: string;
    body: string;
  };
  /** Configurações padrão do template (preset completo) */
  defaults: {
    storeName: string;
    freeShippingBanner: string;
    colorBackground: string;
    colorForeground: string;
    colorPrimary: string;
    colorCanvas: string;
    colorBorder: string;
    fontDisplay: string;
    fontBody: string;
    borderRadius: "none" | "sm" | "md" | "lg" | "full";
  };
  /** Texto da seção hero para o miniature preview */
  previewHeroText: string;
  /** Subtítulo da seção hero */
  previewHeroSub: string;
  /** Se o template é novo (exibe badge "Novo") */
  isNew?: boolean;
  /** Se o template é premium (exibe badge "Premium") */
  isPremium?: boolean;
  /** Ordem de exibição na galeria */
  order: number;
}

// ── Registro Oficial de Templates ─────────────────────────────────────────────

export const TEMPLATES_REGISTRY: TemplateEntry[] = [
  {
    id: "catalogo-express",
    name: "Catálogo Express",
    tagline: "Vendas Rápidas & WhatsApp",
    description:
      "Layout enxuto em formato de catálogo direto, com busca ágil, filtros por categoria e foco em fechamento de pedidos no balcão e WhatsApp.",
    categories: ["minimalista", "boutique"],
    tags: ["Direto", "WhatsApp", "Ágil"],
    palette: {
      background: "#FAFAF8",
      foreground: "#18181b",
      primary: "#2563eb",
      canvas: "#f4f4f5",
      border: "#e4e4e7",
    },
    typography: {
      display: "Inter",
      body: "Inter",
    },
    defaults: {
      storeName: "",
      freeShippingBanner: "Compre pelo site ou peça direto no WhatsApp",
      colorBackground: "#FAFAF8",
      colorForeground: "#18181b",
      colorPrimary: "#2563eb",
      colorCanvas: "#f4f4f5",
      colorBorder: "#e4e4e7",
      fontDisplay: "Inter",
      fontBody: "Inter",
      borderRadius: "md",
    },
    previewHeroText: "Catálogo\nCompleto\nOnline",
    previewHeroSub: "Peças Disponíveis",
    order: 1,
  },
  {
    id: "template-01",
    name: "Atelier Nove",
    tagline: "Moda Autoral & Luxo",
    description:
      "Estética sofisticada com tipografia serifada Cormorant Garamond e paleta bege-creme luxuosa. Perfeito para marcas de moda autoral, costura exclusiva e peças de alto valor percebido.",
    categories: ["luxo", "boutique", "editorial"],
    tags: ["Luxo", "Serifado", "Premium"],
    palette: {
      background: "oklch(0.975 0.008 75)",
      foreground: "oklch(0.2 0.005 285)",
      primary: "oklch(0.2 0.005 285)",
      canvas: "oklch(0.945 0.012 80)",
      border: "oklch(0.88 0.01 80)",
    },
    typography: {
      display: "Cormorant Garamond",
      body: "Jost",
    },
    defaults: {
      storeName: "",
      freeShippingBanner: "Envio grátis acima de R$ 500 · Trocas em 30 dias",
      colorBackground: "oklch(0.975 0.008 75)",
      colorForeground: "oklch(0.2 0.005 285)",
      colorPrimary: "oklch(0.2 0.005 285)",
      colorCanvas: "oklch(0.945 0.012 80)",
      colorBorder: "oklch(0.88 0.01 80)",
      fontDisplay: "Cormorant Garamond",
      fontBody: "Jost",
      borderRadius: "none",
    },
    previewHeroText: "Arte,\nfio,\nidentidade.",
    previewHeroSub: "Nova Coleção",
    isPremium: true,
    order: 2,
  },
  {
    id: "template-02",
    name: "Atelie Minimalist",
    tagline: "Editorial & Atemporal",
    description:
      "Visual limpo, tipografia editorial e paleta neutra off-white + grafite. Ideal para marcas de alfaiataria, moda contemporânea e ateliês que valorizam a leveza e o silêncio como estética.",
    categories: ["minimalista", "editorial", "boutique"],
    tags: ["Minimalista", "Editorial", "Neutro"],
    palette: {
      background: "oklch(0.962 0.006 85)",
      foreground: "oklch(0.155 0 0)",
      primary: "oklch(0.155 0 0)",
      canvas: "oklch(0.914 0.009 85)",
      border: "oklch(0.874 0.009 85)",
    },
    typography: {
      display: "Outfit",
      body: "Figtree",
    },
    defaults: {
      storeName: "",
      freeShippingBanner: "Frete grátis acima de R$ 500 · Trocas em 30 dias",
      colorBackground: "oklch(0.962 0.006 85)",
      colorForeground: "oklch(0.155 0 0)",
      colorPrimary: "oklch(0.155 0 0)",
      colorCanvas: "oklch(0.914 0.009 85)",
      colorBorder: "oklch(0.874 0.009 85)",
      fontDisplay: "Outfit",
      fontBody: "Figtree",
      borderRadius: "none",
    },
    previewHeroText: "Silêncio,\nestrutura,\ntempo.",
    previewHeroSub: "Coleção Inverno 26",
    isNew: true,
    order: 3,
  },
  {
    id: "template-03",
    name: "Bold Streetwear",
    tagline: "Dark Mode & Urbana",
    description:
      "Design imersivo com fundo escuro profundo, alto contraste e tipografia bold. Ideal para marcas urbanas, streetwear autoral, drops exclusivos e estética contemporânea.",
    categories: ["streetwear", "editorial"],
    tags: ["Dark Mode", "Streetwear", "Drops"],
    palette: {
      background: "#09090b",
      foreground: "#fafafa",
      primary: "#f43f5e",
      canvas: "#18181b",
      border: "#27272a",
    },
    typography: {
      display: "Sora",
      body: "Inter",
    },
    defaults: {
      storeName: "",
      freeShippingBanner: "DROP LIMITADO · Envios express para todo o Brasil",
      colorBackground: "#09090b",
      colorForeground: "#fafafa",
      colorPrimary: "#f43f5e",
      colorCanvas: "#18181b",
      colorBorder: "#27272a",
      fontDisplay: "Sora",
      fontBody: "Inter",
      borderRadius: "sm",
    },
    previewHeroText: "Drop 04\nSem limites,\nsem regras.",
    previewHeroSub: "Edição Urbana",
    isNew: true,
    isPremium: true,
    order: 4,
  },
  {
    id: "template-04",
    name: "Praia & Resort",
    tagline: "Solar, Leve & Tropical",
    description:
      "Atmosfera quente e iluminada, inspirada em balneários e dias de sol. Paleta terracota/areia com tipografia arejada, perfeita para moda praia, linho e resortwear.",
    categories: ["boutique", "minimalista"],
    tags: ["Tropical", "Moda Praia", "Solar"],
    palette: {
      background: "#fdfbf7",
      foreground: "#292524",
      primary: "#c2410c",
      canvas: "#f7f2ea",
      border: "#e7decb",
    },
    typography: {
      display: "Outfit",
      body: "Figtree",
    },
    defaults: {
      storeName: "",
      freeShippingBanner: "Frete grátis em compras acima de R$ 399 · Parcelamento em até 6x",
      colorBackground: "#fdfbf7",
      colorForeground: "#292524",
      colorPrimary: "#c2410c",
      colorCanvas: "#f7f2ea",
      colorBorder: "#e7decb",
      fontDisplay: "Outfit",
      fontBody: "Figtree",
      borderRadius: "lg",
    },
    previewHeroText: "O sol como\nessência e\ndestino.",
    previewHeroSub: "Coleção Resort",
    isNew: true,
    isPremium: true,
    order: 5,
  },
  {
    id: "template-05",
    name: "Boutique Chic",
    tagline: "Alta-Costura & Joias",
    description:
      "Acabamento aristocrático com serifa majestosa Playfair Display e toques de bronze acetinado. Desenhado para ateliês de luxo, vestidos de festa e alfaiataria fina.",
    categories: ["luxo", "boutique", "editorial"],
    tags: ["Alta-Costura", "Ouro Nobre", "Sofisticado"],
    palette: {
      background: "#faf9f6",
      foreground: "#1c1917",
      primary: "#b45309",
      canvas: "#f3ede2",
      border: "#e2d7c5",
    },
    typography: {
      display: "Playfair Display",
      body: "Jost",
    },
    defaults: {
      storeName: "",
      freeShippingBanner: "Atendimento exclusivo sob medida · Envio cortesia acima de R$ 600",
      colorBackground: "#faf9f6",
      colorForeground: "#1c1917",
      colorPrimary: "#b45309",
      colorCanvas: "#f3ede2",
      colorBorder: "#e2d7c5",
      fontDisplay: "Playfair Display",
      fontBody: "Jost",
      borderRadius: "none",
    },
    previewHeroText: "Preciosidade\nem cada\nponto.",
    previewHeroSub: "Ateliê Exclusivo",
    isNew: true,
    isPremium: true,
    order: 6,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  todos: "Todos os estilos",
  minimalista: "Minimalista",
  luxo: "Luxo",
  editorial: "Editorial",
  streetwear: "Streetwear",
  boutique: "Boutique",
};

export function getTemplateById(id: string): TemplateEntry | undefined {
  return TEMPLATES_REGISTRY.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: TemplateCategory): TemplateEntry[] {
  if (category === "todos") return [...TEMPLATES_REGISTRY].sort((a, b) => a.order - b.order);
  return TEMPLATES_REGISTRY.filter((t) => t.categories.includes(category)).sort(
    (a, b) => a.order - b.order,
  );
}
