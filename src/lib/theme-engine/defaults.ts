import type { ThemeConfig } from "./schema";

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "modaly_theme_config";

export function loadTheme(): ThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ThemeConfig;
  } catch {
    // ignore parse errors
  }
  return ATELIER_MOD_THEME;
}

export function saveTheme(theme: ThemeConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
}

// ── Font Google URLs ───────────────────────────────────────────────────────────
export const FONT_URLS: Record<string, string> = {
  "Playfair Display":
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap",
  "Cormorant Garamond":
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&display=swap",
  Sora: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap",
  "DM Serif Display":
    "https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap",
  "Libre Baskerville":
    "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap",
  Manrope:
    "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap",
  Inter:
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  "DM Sans":
    "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap",
  "Plus Jakarta Sans":
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap",
};

// ── Default Theme (Atelier Mod) ───────────────────────────────────────────────
export const ATELIER_MOD_THEME: ThemeConfig = {
  settings: {
    storeName: "Minha Loja",
    tagline: "Moda com personalidade",
    freeShippingBanner: "Frete grátis acima de R$ 299",
    freeShippingBannerEnabled: true,
    colorBackground: "#FAFAF8",
    colorForeground: "#1C1C1A",
    colorPrimary: "#1C1C1A",
    colorCanvas: "#F0EDE8",
    colorBorder: "#E5E2DC",
    fontDisplay: "Playfair Display",
    fontBody: "Manrope",
    borderRadius: "none",
  },
  order: ["hero", "cat-bar", "grid-new", "split-1", "grid-ess", "features"],
  sections: [
    {
      id: "hero",
      type: "hero",
      visible: true,
      settings: {
        heading: "O essencial,\nrefeito à mão",
        subheading: "Coleção Nova",
        buttonText: "Ver a coleção",
        imageUrl:
          "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80",
        imageAlt: "Modelo com roupa editorial",
        imagePosition: "center",
        overlayOpacity: 40,
      },
    },
    {
      id: "cat-bar",
      type: "category_bar",
      visible: true,
      settings: { enabled: true },
    },
    {
      id: "grid-new",
      type: "product_grid",
      visible: true,
      settings: {
        kicker: "Chegou agora",
        title: "Novidades",
        source: "newest",
        count: 6,
        columns: 3,
        showViewAll: true,
      },
    },
    {
      id: "split-1",
      type: "image_text_split",
      visible: true,
      settings: {
        kicker: "Nossa história",
        heading: "Feito com cuidado e intenção",
        body: "Cada peça passa por um processo criterioso de escolha de materiais e produção responsável. Nossa coleção é pensada para durar mais de uma estação.",
        buttonText: "Saiba mais",
        imageUrl:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80",
        imageAlt: "Editorial de moda",
        imagePosition: "right",
        backgroundColor: "canvas",
      },
    },
    {
      id: "grid-ess",
      type: "product_grid",
      visible: true,
      settings: {
        kicker: "Seleção",
        title: "Essenciais da casa",
        source: "featured",
        count: 4,
        columns: 4,
        showViewAll: true,
      },
    },
    {
      id: "features",
      type: "features",
      visible: true,
      settings: {
        items: [
          {
            title: "Frete grátis",
            description: "Em pedidos acima de R$ 299 para todo o Brasil.",
          },
          {
            title: "Troca em 30 dias",
            description: "Primeira troca sem custo, com etiqueta pronta.",
          },
          {
            title: "Suporte por WhatsApp",
            description: "Atendimento humano e ágil todos os dias.",
          },
        ],
      },
    },
  ],
};

// ── Border Radius Map ─────────────────────────────────────────────────────────
export const RADIUS_MAP: Record<string, string> = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "16px",
  full: "9999px",
};

// ── Boutique Chic ─────────────────────────────────────────────────────────────
export const BOUTIQUE_CHIC_THEME: ThemeConfig = {
  settings: {
    storeName: "Minha Loja",
    tagline: "Elegância para o dia a dia",
    freeShippingBanner: "Frete grátis acima de R$ 299",
    freeShippingBannerEnabled: true,
    colorBackground: "#FFFFFF",
    colorForeground: "#1A1A2E",
    colorPrimary: "#C8A96E",
    colorCanvas: "#FBF8F4",
    colorBorder: "#E8E0D5",
    fontDisplay: "Cormorant Garamond",
    fontBody: "Plus Jakarta Sans",
    borderRadius: "sm",
  },
  order: ["hero", "cat-bar", "grid-new", "split-1", "features"],
  sections: [
    {
      id: "hero",
      type: "hero",
      visible: true,
      settings: {
        heading: "Elegância que\nfala por você",
        subheading: "Coleção Exclusiva",
        buttonText: "Explorar coleção",
        imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&q=80",
        imageAlt: "Moda elegante",
        imagePosition: "center",
        overlayOpacity: 35,
      },
    },
    { id: "cat-bar", type: "category_bar", visible: true, settings: { enabled: true } },
    {
      id: "grid-new",
      type: "product_grid",
      visible: true,
      settings: { kicker: "Novidades", title: "Peças da Temporada", source: "newest", count: 6, columns: 3, showViewAll: true },
    },
    {
      id: "split-1",
      type: "image_text_split",
      visible: true,
      settings: {
        kicker: "Nossa proposta",
        heading: "Sofisticação em cada detalhe",
        body: "Peças selecionadas a dedo para mulheres que valorizam estilo e qualidade. Da escolha do tecido ao acabamento, cada detalhe importa.",
        buttonText: "Conheça a marca",
        imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&q=80",
        imageAlt: "Editorial boutique",
        imagePosition: "left",
        backgroundColor: "canvas",
      },
    },
    {
      id: "features",
      type: "features",
      visible: true,
      settings: {
        items: [
          { title: "Curadoria exclusiva", description: "Peças selecionadas por estilistas especializadas." },
          { title: "Embalagem premium", description: "Cada pedido chega em embalagem especial, pronta para presentear." },
          { title: "Atendimento VIP", description: "Consultoria de moda pelo WhatsApp, sem custo adicional." },
        ],
      },
    },
  ],
};

// ── Streetwear Bold ───────────────────────────────────────────────────────────
export const STREETWEAR_BOLD_THEME: ThemeConfig = {
  settings: {
    storeName: "Minha Loja",
    tagline: "Autenticidade acima de tudo",
    freeShippingBanner: "🔥 FRETE GRÁTIS EM COMPRAS ACIMA DE R$299",
    freeShippingBannerEnabled: true,
    colorBackground: "#0D0D0D",
    colorForeground: "#F5F5F5",
    colorPrimary: "#FF3B3B",
    colorCanvas: "#1A1A1A",
    colorBorder: "#2A2A2A",
    fontDisplay: "Sora",
    fontBody: "Inter",
    borderRadius: "none",
  },
  order: ["hero", "cat-bar", "grid-new", "split-1", "features"],
  sections: [
    {
      id: "hero",
      type: "hero",
      visible: true,
      settings: {
        heading: "VISTA SUA\nIDENTIDADE",
        subheading: "Drop Exclusivo",
        buttonText: "SHOP NOW",
        imageUrl: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=1600&q=80",
        imageAlt: "Streetwear editorial",
        imagePosition: "center",
        overlayOpacity: 55,
      },
    },
    { id: "cat-bar", type: "category_bar", visible: true, settings: { enabled: true } },
    {
      id: "grid-new",
      type: "product_grid",
      visible: true,
      settings: { kicker: "DROP NOVO", title: "Chegou Agora", source: "newest", count: 6, columns: 3, showViewAll: true },
    },
    {
      id: "split-1",
      type: "image_text_split",
      visible: true,
      settings: {
        kicker: "Manifesto",
        heading: "Moda que não pede licença",
        body: "Para quem não segue tendências, cria as próprias. Nossa coleção é pra quem tem algo a dizer — sem filtro.",
        buttonText: "Nossa história",
        imageUrl: "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=1200&q=80",
        imageAlt: "Streetwear",
        imagePosition: "right",
        backgroundColor: "canvas",
      },
    },
    {
      id: "features",
      type: "features",
      visible: true,
      settings: {
        items: [
          { title: "Drops limitados", description: "Peças em quantidade limitada. Chegou, pegou." },
          { title: "Qualidade premium", description: "Tecidos e acabamentos que duram tanto quanto seu estilo." },
          { title: "Troca sem burocracia", description: "Processo simples, rápido e sem chatice." },
        ],
      },
    },
  ],
};

// ── Minimalist Studio ─────────────────────────────────────────────────────────
export const MINIMALIST_STUDIO_THEME: ThemeConfig = {
  settings: {
    storeName: "Minha Loja",
    tagline: "Menos é mais",
    freeShippingBanner: "Frete grátis acima de R$ 299",
    freeShippingBannerEnabled: false,
    colorBackground: "#F7F7F5",
    colorForeground: "#2C2C2C",
    colorPrimary: "#2C2C2C",
    colorCanvas: "#EFEFED",
    colorBorder: "#DEDEDC",
    fontDisplay: "DM Serif Display",
    fontBody: "DM Sans",
    borderRadius: "md",
  },
  order: ["hero", "grid-new", "split-1", "features"],
  sections: [
    {
      id: "hero",
      type: "hero",
      visible: true,
      settings: {
        heading: "O suficiente.\nO certo.",
        subheading: "Coleção Cápsula",
        buttonText: "Ver peças",
        imageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1600&q=80",
        imageAlt: "Moda minimalista",
        imagePosition: "center",
        overlayOpacity: 30,
      },
    },
    {
      id: "grid-new",
      type: "product_grid",
      visible: true,
      settings: { kicker: "Coleção", title: "Essenciais", source: "all", count: 8, columns: 4, showViewAll: false },
    },
    {
      id: "split-1",
      type: "image_text_split",
      visible: true,
      settings: {
        kicker: "Filosofia",
        heading: "Compre menos, use mais",
        body: "Peças atemporais pensadas para durar. Sem excessos, sem desperdício. Cada item é escolhido para combinar com tudo que você já tem.",
        buttonText: "Saiba mais",
        imageUrl: "https://images.unsplash.com/photo-1485518882345-15568b007407?w=1200&q=80",
        imageAlt: "Minimalismo",
        imagePosition: "left",
        backgroundColor: "canvas",
      },
    },
    {
      id: "features",
      type: "features",
      visible: true,
      settings: {
        items: [
          { title: "Peças atemporais", description: "Design limpo que transcende estações." },
          { title: "Materiais naturais", description: "Tecidos sustentáveis e confortáveis." },
          { title: "Compre com calma", description: "Sem urgência artificial, sem estoque falso." },
        ],
      },
    },
  ],
};

// ── Template Registry ─────────────────────────────────────────────────────────
export type TemplateId = "atelier_mod" | "boutique_chic" | "streetwear_bold" | "minimalist_studio";

export interface TemplateEntry {
  id: TemplateId;
  name: string;
  description: string;
  tags: string[];
  accentColor: string;
  bgColor: string;
  fontStyle: string;
  theme: ThemeConfig;
}

export const ALL_TEMPLATES: TemplateEntry[] = [
  {
    id: "atelier_mod",
    name: "Atelier Mod",
    description: "Editorial e atemporal. Tipografia serif elegante em fundo off-white quente.",
    tags: ["Editorial", "Moda Feminina", "Elegante"],
    accentColor: "#1C1C1A",
    bgColor: "#F0EDE8",
    fontStyle: "Playfair Display",
    theme: ATELIER_MOD_THEME,
  },
  {
    id: "boutique_chic",
    name: "Boutique Chic",
    description: "Sofisticado e feminino. Dourado e serif para uma experiência premium.",
    tags: ["Luxo", "Boutique", "Premium"],
    accentColor: "#C8A96E",
    bgColor: "#FBF8F4",
    fontStyle: "Cormorant Garamond",
    theme: BOUTIQUE_CHIC_THEME,
  },
  {
    id: "streetwear_bold",
    name: "Streetwear Bold",
    description: "Escuro, intenso e ousado. Para marcas que não têm medo de se impor.",
    tags: ["Urbano", "Streetwear", "Ousado"],
    accentColor: "#FF3B3B",
    bgColor: "#0D0D0D",
    fontStyle: "Sora",
    theme: STREETWEAR_BOLD_THEME,
  },
  {
    id: "minimalist_studio",
    name: "Minimalist Studio",
    description: "Limpo e intencional. Para marcas que acreditam que menos é mais.",
    tags: ["Minimalista", "Atemporal", "Sustentável"],
    accentColor: "#2C2C2C",
    bgColor: "#F7F7F5",
    fontStyle: "DM Serif Display",
    theme: MINIMALIST_STUDIO_THEME,
  },
];
