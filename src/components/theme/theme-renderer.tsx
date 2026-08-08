/**
 * ThemeRenderer — delega para AtelierModStore.
 *
 * A partir desta versão, o preview tanto no builder (/loja/personalizar)
 * quanto na tela cheia (/loja/preview) usa o AtelierModStore, que é uma
 * cópia 100% fiel do template original do Lovable (HTML/Tailwind exatos).
 *
 * O ThemeRenderer mantém a mesma interface (theme, highlightId, onSectionClick)
 * para não quebrar o BuilderInner que o usa.
 */
import type { ThemeConfig } from "@/lib/theme-engine/schema";
import { AtelierModStore } from "./atelier-mod-store";

interface Props {
  theme: ThemeConfig;
  /** Seção selecionada no builder (contorno azul). */
  highlightId?: string | null;
  /** Callback chamado ao clicar em uma seção no builder. */
  onSectionClick?: (id: string) => void;
}

export function ThemeRenderer({ theme, highlightId, onSectionClick }: Props) {
  return (
    <AtelierModStore
      theme={theme}
      highlightId={highlightId}
      onSectionClick={onSectionClick}
    />
  );
}
