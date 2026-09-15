import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { profileQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { useAccess } from "@/lib/useAccess";
import { SubscriptionModal } from "@/components/subscription-modal";

export function PlanGuard({
  requires = "digital",
  children,
  featureName,
  featureDescription,
}: {
  requires?: string;
  children: React.ReactNode;
  featureName?: string;
  featureDescription?: string;
}) {
  const [subModalOpen, setSubModalOpen] = useState(false);
  const { data: profile } = useQuery(profileQuery());
  const { store } = useStore();
  const { isActive } = useAccess(profile, store);

  // No modelo unificado, se a assinatura ou trial está ativo, tudo está liberado!
  if (isActive) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="relative">
        <div className="gradient-primary absolute inset-0 rounded-3xl opacity-15 blur-2xl" />
        <div className="relative grid h-20 w-20 place-items-center rounded-3xl border border-border bg-card text-accent-foreground shadow-soft">
          <Lock className="size-8 text-primary" />
        </div>
      </div>

      <h2 className="mt-6 text-xl font-semibold">{featureName ?? "Recurso exclusivo Vestui"}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {featureDescription ??
          "Tenha acesso a esse e todos os outros recursos do sistema com o plano Vestui Completo."}
      </p>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Button
          onClick={() => setSubModalOpen(true)}
          className="h-11 rounded-full px-6 text-sm font-semibold shadow-glow cursor-pointer"
        >
          <Zap className="size-4 mr-2" />
          Ativar assinatura por R$ 57/mês
        </Button>
        <span className="text-xs text-muted-foreground">ou R$ 497 no plano anual (28% de economia)</span>
      </div>

      <SubscriptionModal open={subModalOpen} onOpenChange={setSubModalOpen} />
    </div>
  );
}
