import type { ThemeConfig } from "@/lib/theme-engine/schema";
import { Template01Store } from "./templates/template-01-store";

interface Props {
  theme: ThemeConfig;
  highlightId?: string | null;
  onSectionClick?: (id: string) => void;
}

/**
 * ThemeRenderer — seleciona e renderiza o template correto.
 * Atualmente suporta: Template 01 ("Atelier Nove").
 * Novos templates serão adicionados aqui conforme forem integrados.
 */
export function ThemeRenderer({ theme, highlightId, onSectionClick }: Props) {
  // Futuramente: switch(theme.settings.templateId) para múltiplos templates
  return (
    <Template01Store
      theme={theme}
      highlightId={highlightId}
      onSectionClick={onSectionClick}
    />
  );
}

