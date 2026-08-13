/**
 * templates-registry.ts — Registro Central de Templates do Modaly SaaS
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
  id: "template-01" | "template-02";
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
      storeName: "Atelie",
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
      storeName: "Atelier Nove",
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
