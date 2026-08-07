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
