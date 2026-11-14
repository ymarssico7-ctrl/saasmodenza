import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Sparkles, Zap, Tag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { profileQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { useAccess, PlanTier } from "@/lib/useAccess";
import { UpgradeLoteModal } from "@/components/upgrade-lote-modal";
import { UpgradeStoreModal } from "@/components/upgrade-store-modal";

export function PlanGuard({
  requires = "digital",
  tierRequired = "store",
  children,
  featureName,
  featureDescription,
}: {
  requires?: string;
  tierRequired?: "lote" | "store";
  children: React.ReactNode;
  featureName?: string;
  featureDescription?: string;
}) {
  const [loteModalOpen, setLoteModalOpen] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);

  const { data: profile } = useQuery(profileQuery());
  const { store } = useStore();
  const access = useAccess(profile, store);

  // Verificação de Liberação:
  // Se precisa de 'lote': liberado se tem Lote ou Store (ou trial/legacy ativo)
  // Se precisa de 'store': liberado se tem Store (ou trial/legacy ativo)
  const isAuthorized =
    tierRequired === "lote"
      ? access.isLote || access.isStore || access.isActive
      : access.isStore || access.isActive;

  if (isAuthorized) return <>{children}</>;

  const isLoteTarget = tierRequired === "lote";

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="relative">
        <div className="gradient-primary absolute inset-0 rounded-3xl opacity-15 blur-2xl" />
        <div className="relative grid h-20 w-20 place-items-center rounded-3xl border border-border bg-card text-accent-foreground shadow-soft">
          {isLoteTarget ? (
            <Tag className="size-8 text-primary" />
          ) : (
            <Store className="size-8 text-primary" />
          )}
        </div>
      </div>

      <h2 className="mt-6 text-xl font-display font-semibold">
        {featureName ?? (isLoteTarget ? "Recurso do Vestui Lote" : "Recurso do Vestui Store")}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {featureDescription ??
          (isLoteTarget
            ? "Cadastre lotes ilimitados e imprima etiquetas térmicas ou em folha A4 com código de barras."
            : "Tenha acesso à Loja Online, Estoque Unificado, PDV de Balcão e Gestão de Condicional.")}
      </p>

      <div className="mt-6 flex flex-col items-center gap-2">
        {isLoteTarget ? (
          <>
            <Button
              onClick={() => setLoteModalOpen(true)}
              className="h-11 rounded-full px-6 text-sm font-semibold shadow-glow cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Zap className="size-4" />
              Ativar Vestui Lote por R$ 19,90/mês
            </Button>
            <span className="text-xs text-muted-foreground">Lotes e etiquetas ilimitadas sem complicação</span>
          </>
        ) : (
          <>
            <Button
              onClick={() => setStoreModalOpen(true)}
              className="h-11 rounded-full px-6 text-sm font-semibold shadow-glow cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Sparkles className="size-4" />
              Ativar Vestui Store por R$ 97/mês
            </Button>
            <span className="text-xs text-muted-foreground">Economize 30% no plano anual (R$ 67/mês)</span>
          </>
        )}
      </div>

      <UpgradeLoteModal open={loteModalOpen} onOpenChange={setLoteModalOpen} />
      <UpgradeStoreModal open={storeModalOpen} onOpenChange={setStoreModalOpen} />
    </div>
  );
}
