/**
 * Template04Store — "Praia & Resort"
 *
 * Template solar com paleta terracota/areia (#fdfbf7 bg + #c2410c primary),
 * bordas arredondadas (lg) e tipografia arejada Outfit + Figtree.
 * Ideal para moda praia, linho e resortwear tropical.
 *
 * ESTRATÉGIA: Wrapper sobre Template02Store com tokens CSS do template-04
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
 * Template04Store aplica os tokens solares do "Praia & Resort" ao Template02.
 */
export function Template04Store(props: Props) {
  const resortTheme: ThemeConfig = {
    ...props.theme,
    settings: {
      ...props.theme.settings,
      colorBackground:
        props.theme.settings.colorBackground || "#fdfbf7",
      colorForeground:
        props.theme.settings.colorForeground || "#292524",
      colorPrimary:
        props.theme.settings.colorPrimary || "#c2410c",
      colorCanvas:
        props.theme.settings.colorCanvas || "#f7f2ea",
      colorBorder:
        props.theme.settings.colorBorder || "#e7decb",
      fontDisplay:
        props.theme.settings.fontDisplay || "Outfit",
      fontBody:
        props.theme.settings.fontBody || "Figtree",
      borderRadius:
        props.theme.settings.borderRadius || "lg",
      templateId: "template-04",
    },
  };

  return <Template02Store {...props} theme={resortTheme} />;
}
