import type { ThemeConfig } from "@/lib/theme-engine/schema";
import type { ShowcaseProduct } from "@/lib/showcase-store";
import { Template01Store } from "./templates/template-01-store";
import { Template02Store } from "./templates/template-02-store";

interface Props {
  theme: ThemeConfig;
  highlightId?: string | null;
  onSectionClick?: (id: string) => void;
  onToggleSection?: (id: string) => void;
  onDeleteSection?: (id: string) => void;
  showcaseProducts?: ShowcaseProduct[];
  storeName?: string;
  storePhone?: string;
  onOpenCart?: () => void;
  onSelectProduct?: (product: ShowcaseProduct) => void;
  cartCount?: number;
}

/**
 * ThemeRenderer — seleciona e renderiza o template correto com base em
 * theme.settings.templateId. Padrão: "template-02" (Atelie Minimalist).
 *
 * Templates disponíveis:
 *   - "template-01" → Atelier Nove   (Cormorant Garamond + Jost, paleta off-white)
 *   - "template-02" → Atelie Minimalist (Outfit + Figtree, editorial ultralimpo)
 */
export function ThemeRenderer({
  theme,
  highlightId,
  onSectionClick,
  onToggleSection,
  onDeleteSection,
  showcaseProducts,
  storeName,
  storePhone,
  onOpenCart,
  onSelectProduct,
  cartCount,
}: Props) {
  const templateId = theme.settings.templateId ?? "template-02";

  const forwardedProps = {
    ...(onSectionClick ? { onSectionClick } : {}),
    ...(onToggleSection ? { onToggleSection } : {}),
    ...(onDeleteSection ? { onDeleteSection } : {}),
    ...(showcaseProducts ? { showcaseProducts } : {}),
    ...(storeName !== undefined ? { storeName } : {}),
    ...(storePhone !== undefined ? { storePhone } : {}),
    ...(onOpenCart ? { onOpenCart } : {}),
    ...(onSelectProduct ? { onSelectProduct } : {}),
    ...(cartCount !== undefined ? { cartCount } : {}),
  };

  if (templateId === "template-01") {
    return (
      <Template01Store theme={theme} highlightId={highlightId ?? null} {...forwardedProps} />
    );
  }

  return <Template02Store theme={theme} highlightId={highlightId ?? null} {...forwardedProps} />;
}
