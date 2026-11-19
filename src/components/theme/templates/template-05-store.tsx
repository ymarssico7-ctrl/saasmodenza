/**
 * Template05Store — "Boutique Chic"
 *
 * Template de alta-costura com paleta marfim/bronze (#faf9f6 bg + #b45309 primary),
 * tipografia majestosa Playfair Display + Jost e bordas retas (none).
 * Ideal para ateliês de luxo, vestidos de festa e alfaiataria fina.
 *
 * ESTRATÉGIA: Wrapper sobre Template02Store com tokens CSS do template-05
 * injetados via ThemeConfig. O ThemeRenderer já aplica o effectiveTheme
 * com as cores/fontes corretas do registry — este wrapper reforça os defaults.
 */
import React from "react";
import type { ThemeConfig } from "@/lib/theme-engine/schema";
import type { ShowcaseProduct } from "@/lib/showcase-store";
import { Template02Store } from "./template-02-store";

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
  storeCategories?: { label: string; slug: string }[];
}

/**
 * Template05Store aplica os tokens aristocráticos do "Boutique Chic" ao Template02.
 */
export function Template05Store(props: Props) {
  const boutiqueTheme: ThemeConfig = {
    ...props.theme,
    settings: {
      ...props.theme.settings,
      colorBackground:
        props.theme.settings.colorBackground || "#faf9f6",
      colorForeground:
        props.theme.settings.colorForeground || "#1c1917",
      colorPrimary:
        props.theme.settings.colorPrimary || "#b45309",
      colorCanvas:
        props.theme.settings.colorCanvas || "#f3ede2",
      colorBorder:
        props.theme.settings.colorBorder || "#e2d7c5",
      fontDisplay:
        props.theme.settings.fontDisplay || "Playfair Display",
      fontBody:
        props.theme.settings.fontBody || "Manrope",
      borderRadius:
        props.theme.settings.borderRadius || "none",
      templateId: "template-05",
    },
  };

  return <Template02Store {...props} theme={boutiqueTheme} />;
}
