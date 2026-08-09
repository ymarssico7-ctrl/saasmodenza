import type { ThemeConfig } from "@/lib/theme-engine/schema";
import { Template01Store } from "./templates/template-01-store";
import { Template02Store } from "./templates/template-02-store";

interface Props {
  theme: ThemeConfig;
  highlightId?: string | null;
  onSectionClick?: (id: string) => void;
}

/**
 * ThemeRenderer — seleciona e renderiza o template correto com base em
 * theme.settings.templateId. Padrão: "template-02" (Atelie Minimalist).
 *
 * Templates disponíveis:
 *   - "template-01" → Atelier Nove   (Cormorant Garamond + Jost, paleta off-white)
 *   - "template-02" → Atelie Minimalist (Outfit + Figtree, editorial ultralimpo)
 */
export function ThemeRenderer({ theme, highlightId, onSectionClick }: Props) {
  const templateId = theme.settings.templateId ?? "template-02";

  if (templateId === "template-01") {
    return (
      <Template01Store
        theme={theme}
        highlightId={highlightId ?? null}
        {...(onSectionClick ? { onSectionClick } : {})}
      />
    );
  }

  return (
    <Template02Store
      theme={theme}
      highlightId={highlightId ?? null}
      {...(onSectionClick ? { onSectionClick } : {})}
    />
  );
}

