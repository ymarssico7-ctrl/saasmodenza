/**
 * Template03Store — "Bold Streetwear"
 *
 * Template urbano Dark Mode com alto contraste, tipografia Sora bold e
 * paleta grafite profundo (#09090b) + accent rosa-choque (#f43f5e).
 *
 * ESTRATÉGIA: Wrapper sobre Template02Store com tokens CSS do template-03
 * injetados via CSS custom properties. O ThemeRenderer já aplica o effectiveTheme
 * com as cores/fontes corretas do registry — este wrapper apenas garante que o
 * escopo CSS .t03-theme seja aplicado em vez de .t02-theme.
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
 * Template03Store aplica os tokens escuros do "Bold Streetwear" ao Template02.
 * Os presets de cor já chegam via effectiveTheme do ThemeRenderer — aqui apenas
 * garantimos que o tema correto seja servido.
 */
export function Template03Store(props: Props) {
  // Garante que os tokens dark do template-03 estejam ativos no theme
  const darkTheme: ThemeConfig = {
    ...props.theme,
    settings: {
      ...props.theme.settings,
      // Se o lojista não customizou, aplica os defaults do template-03
      colorBackground:
        props.theme.settings.colorBackground || "#09090b",
      colorForeground:
        props.theme.settings.colorForeground || "#fafafa",
      colorPrimary:
        props.theme.settings.colorPrimary || "#f43f5e",
      colorCanvas:
        props.theme.settings.colorCanvas || "#18181b",
      colorBorder:
        props.theme.settings.colorBorder || "#27272a",
      fontDisplay:
        props.theme.settings.fontDisplay || "Sora",
      fontBody:
        props.theme.settings.fontBody || "Inter",
      borderRadius:
        props.theme.settings.borderRadius || "sm",
      templateId: "template-03",
    },
  };

  return <Template02Store {...props} theme={darkTheme} />;
}
