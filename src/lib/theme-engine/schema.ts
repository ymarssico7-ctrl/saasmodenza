// ─── Theme Engine Schema ──────────────────────────────────────────────────────
// Defines the full TypeScript type system for the Modaly Theme Engine.
// All store customizations are described by a `ThemeConfig` object,
// which is persisted to localStorage (demo) or Supabase (production).

export type BorderRadius = "none" | "sm" | "md" | "lg" | "full";
export type FontDisplay =
  | "Outfit"
  | "Playfair Display"
  | "Cormorant Garamond"
  | "Jost"
  | "Sora"
  | "DM Serif Display"
  | "Libre Baskerville";
export type FontBody = "Figtree" | "Manrope" | "Inter" | "DM Sans" | "Plus Jakarta Sans";
export type ImagePosition = "left" | "right";
export type BackgroundVariant = "background" | "canvas" | "foreground";

// ── Global Settings ───────────────────────────────────────────────────────────
export interface ThemeSettings {
  /** Qual template de loja renderizar. Padrão: "template-02" */
  templateId?: "template-01" | "template-02";
  storeName: string;
  tagline: string;
  /** URL do logotipo da loja. Se vazio, exibe storeName como texto. */
  logoUrl?: string;
  freeShippingBanner: string;
  freeShippingBannerEnabled: boolean;
  /**
   * Como o botão "Finalizar compra" se comporta na vitrine.
   * "whatsapp" → abre link wa.me com pedido formatado (padrão).
   * "site"     → checkout direto no site (Pix, Cartão, etc.).
   */
  checkoutMode?: "whatsapp" | "site";
  /**
   * Número de WhatsApp da loja (usado quando checkoutMode = "whatsapp").
   * Aceita "(31) 99812-4477" ou "5531998124477" — normalizado automaticamente.
   */
  storeWhatsApp?: string;
  /**
   * Descrição curta exibida no rodapé e página Sobre.
   * Ex: "Moda feminina autoral, peças selecionadas à mão em BH."
   */
  storeDescription?: string;
  /**
   * Política de troca exibida na página de produto.
   * Ex: "Trocas em até 7 dias corridos após o recebimento."
   */
  politicaTroca?: string;
  /**
   * Quando true exibe a quantidade em estoque nos cards/produto.
   * Quando false exibe apenas "Disponível / Esgotado".
   */
  mostrarEstoque?: boolean;
  // Colors
  colorBackground: string;
  colorForeground: string;
  colorPrimary: string;
  colorCanvas: string;
  colorBorder: string;
  // Typography
  fontDisplay: FontDisplay;
  fontBody: FontBody;
  // Shape
  borderRadius: BorderRadius;
}

// ── Section Settings ──────────────────────────────────────────────────────────

export interface HeroSettings {
  heading: string;
  subheading: string;
  buttonText: string;
  imageUrl: string;
  imageAlt: string;
  imagePosition: string; // CSS object-position value, e.g. "center"
  overlayOpacity: number; // 0–100
}

export interface CategoryBarSettings {
  enabled: boolean;
}

export interface ProductGridSettings {
  kicker: string;
  title: string;
  source: "newest" | "featured" | "all";
  count: number;
  columns: 2 | 3 | 4 | 6;
  showViewAll: boolean;
}

export interface ImageTextSplitSettings {
  kicker: string;
  heading: string;
  body: string;
  buttonText: string;
  imageUrl: string;
  imageAlt: string;
  imagePosition: ImagePosition;
  backgroundColor: BackgroundVariant;
}

export interface FeaturesSettings {
  items: Array<{ title: string; description: string }>;
}

export interface AnnouncementSettings {
  text: string;
  backgroundColor: string;
}

// ── Section Union ─────────────────────────────────────────────────────────────

export interface SectionBase {
  id: string;
  visible: boolean;
}

export type HeroSection = SectionBase & {
  type: "hero";
  settings: HeroSettings;
};
export type CategoryBarSection = SectionBase & {
  type: "category_bar";
  settings: CategoryBarSettings;
};
export type ProductGridSection = SectionBase & {
  type: "product_grid";
  settings: ProductGridSettings;
};
export type ImageTextSplitSection = SectionBase & {
  type: "image_text_split";
  settings: ImageTextSplitSettings;
};
export type FeaturesSection = SectionBase & {
  type: "features";
  settings: FeaturesSettings;
};
export type AnnouncementSection = SectionBase & {
  type: "announcement";
  settings: AnnouncementSettings;
};

export type Section =
  | HeroSection
  | CategoryBarSection
  | ProductGridSection
  | ImageTextSplitSection
  | FeaturesSection
  | AnnouncementSection;

export type SectionType = Section["type"];

// ── Root Config ───────────────────────────────────────────────────────────────

export interface ThemeConfig {
  settings: ThemeSettings;
  /** All section definitions (keyed by `id`). */
  sections: Section[];
  /** Display order: array of section IDs. */
  order: string[];
}

// ── Metadata (for builder UI) ─────────────────────────────────────────────────

export interface SectionMeta {
  type: SectionType;
  label: string;
  icon: string;
  description: string;
}

export const SECTION_META: SectionMeta[] = [
  {
    type: "hero",
    label: "Banner Principal",
    icon: "ImageIcon",
    description: "Imagem de fundo com título e botão de chamada.",
  },
  {
    type: "category_bar",
    label: "Barra de Categorias",
    icon: "Tag",
    description: "Filtros rápidos de categoria para navegar pelos produtos.",
  },
  {
    type: "product_grid",
    label: "Grade de Produtos",
    icon: "ShoppingBag",
    description: "Exibe uma grade de produtos da sua loja.",
  },
  {
    type: "image_text_split",
    label: "Imagem & Texto",
    icon: "LayoutTemplate",
    description: "Seção dividida com imagem de um lado e texto do outro.",
  },
  {
    type: "features",
    label: "Diferenciais",
    icon: "Star",
    description: "Destaque os benefícios da sua loja (frete, troca, etc).",
  },
  {
    type: "announcement",
    label: "Faixa de Anúncio",
    icon: "Megaphone",
    description: "Barra superior com uma mensagem de destaque.",
  },
];
