import { useMemo } from "react";
import type { ThemeConfig } from "@/lib/theme-engine/schema";
import type { ShowcaseProduct } from "@/lib/showcase-store";
import { TEMPLATES_REGISTRY } from "@/lib/theme-engine/templates-registry";
import { Template01Store } from "./templates/template-01-store";
import { Template02Store } from "./templates/template-02-store";
import { Template03Store } from "./templates/template-03-store";
import { Template04Store } from "./templates/template-04-store";
import { Template05Store } from "./templates/template-05-store";

interface Props {
  theme: ThemeConfig;
  highlightId?: string | null;
  interactionMode?: "edit" | "interactive";
  onSectionClick?: (id: string) => void;
  onToggleSection?: (id: string) => void;
  onDeleteSection?: (id: string) => void;
  showcaseProducts?: ShowcaseProduct[];
  storeName?: string;
  storePhone?: string;
  onOpenCart?: () => void;
  onSelectProduct?: (product: ShowcaseProduct) => void;
  cartCount?: number;
  storeCategories?: { label: string; slug: string }[];
}

/**
 * ThemeRenderer — seleciona e renderiza o template correto com base em
 * theme.settings.templateId. Padrão: "template-02" (Atelie Minimalist).
 *
 * Templates disponíveis:
 *   - "template-01"      → Atelier Nove   (Cormorant Garamond + Jost, paleta off-white)
 *   - "template-02"      → Atelie Minimalist (Outfit + Figtree, editorial autoral)
 *   - "template-03"      → Bold Streetwear (Sora + Inter, Dark Mode urbano)
 *   - "template-04"      → Praia & Resort (Outfit + Figtree, solar e terracota)
 *   - "template-05"      → Boutique Chic  (Playfair Display + Jost, luxo clássico)
 *   - "catalogo-express" → Catálogo Express (Layout modular ágil)
 */
export function ThemeRenderer({
  theme,
  highlightId,
  interactionMode,
  onSectionClick,
  onToggleSection,
  onDeleteSection,
  showcaseProducts,
  storeName,
  storePhone,
  onOpenCart,
  onSelectProduct,
  cartCount,
  storeCategories,
}: Props) {
  const templateId = theme.settings.templateId ?? "template-02";

  // Aplica os presets oficiais de paleta, tipografia e bordas de cada template
  const effectiveTheme: ThemeConfig = useMemo(() => {
    const entry = TEMPLATES_REGISTRY.find((t) => t.id === templateId);
    if (!entry) return theme;
    return {
      ...theme,
      settings: {
        ...theme.settings,
        templateId,
        colorBackground: theme.settings.colorBackground || entry.defaults.colorBackground,
        colorForeground: theme.settings.colorForeground || entry.defaults.colorForeground,
        colorPrimary: theme.settings.colorPrimary || entry.defaults.colorPrimary,
        colorCanvas: theme.settings.colorCanvas || entry.defaults.colorCanvas,
        colorBorder: theme.settings.colorBorder || entry.defaults.colorBorder,
        fontDisplay: theme.settings.fontDisplay || (entry.defaults.fontDisplay as never),
        fontBody: theme.settings.fontBody || (entry.defaults.fontBody as never),
        borderRadius: theme.settings.borderRadius || entry.defaults.borderRadius,
      },
    };
  }, [theme, templateId]);

  const forwardedProps = {
    ...(interactionMode ? { interactionMode } : {}),
    ...(onSectionClick ? { onSectionClick } : {}),
    ...(onToggleSection ? { onToggleSection } : {}),
    ...(onDeleteSection ? { onDeleteSection } : {}),
    ...(showcaseProducts ? { showcaseProducts } : {}),
    ...(storeName !== undefined ? { storeName } : {}),
    ...(storePhone !== undefined ? { storePhone } : {}),
    ...(onOpenCart ? { onOpenCart } : {}),
    ...(onSelectProduct ? { onSelectProduct } : {}),
    ...(cartCount !== undefined ? { cartCount } : {}),
    ...(storeCategories !== undefined ? { storeCategories } : {}),
  };

  if (templateId === "template-01") {
    return (
      <Template01Store theme={effectiveTheme} highlightId={highlightId ?? null} {...forwardedProps} />
    );
  }

  if (templateId === "template-03") {
    return (
      <Template03Store theme={effectiveTheme} highlightId={highlightId ?? null} {...forwardedProps} />
    );
  }

  if (templateId === "template-04") {
    return (
      <Template04Store theme={effectiveTheme} highlightId={highlightId ?? null} {...forwardedProps} />
    );
  }

  if (templateId === "template-05") {
    return (
      <Template05Store theme={effectiveTheme} highlightId={highlightId ?? null} {...forwardedProps} />
    );
  }

  // template-02, catalogo-express e qualquer fallback → Template02Store
  return <Template02Store theme={effectiveTheme} highlightId={highlightId ?? null} {...forwardedProps} />;
}
