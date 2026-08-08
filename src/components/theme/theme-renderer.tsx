import type { ThemeConfig } from "@/lib/theme-engine/schema";
import { Sparkles } from "lucide-react";

interface Props {
  theme: ThemeConfig;
  highlightId?: string | null;
  onSectionClick?: (id: string) => void;
}

export function ThemeRenderer({ theme }: Props) {
  return (
    <div className="flex min-h-[600px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Ambiente Pronto para Novos Templates</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        O ambiente foi resetado com sucesso. Cole o código dos novos templates gerados no Lovable para iniciarmos a integração 1:1.
      </p>
    </div>
  );
}

