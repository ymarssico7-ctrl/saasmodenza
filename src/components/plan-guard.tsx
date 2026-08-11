import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { profileQuery } from "@/lib/db";

type Plan = "lojista" | "digital" | "crescimento" | "gestao_anual";

const planRank: Record<Plan, number> = {
  lojista: 0,
  digital: 1,
  crescimento: 2,
  gestao_anual: 2, // Equivalente ao plano de maior acesso
};

const planNames: Record<Plan, string> = {
  lojista: "Plano Lojista",
  digital: "Plano Digital",
  crescimento: "Plano Crescimento",
  gestao_anual: "Plano Gestão Anual",
};

const planPrices: Record<Plan, string> = {
  lojista: "R$ 127/ano",
  digital: "R$ 97/mês",
  crescimento: "R$ 147/mês",
  gestao_anual: "R$ 127/ano",
};

export function PlanGuard({
  requires,
  children,
  featureName,
  featureDescription,
}: {
  requires: Plan;
  children: React.ReactNode;
  featureName?: string;
  featureDescription?: string;
}) {
  const { data: profile } = useQuery(profileQuery());
  const currentPlan = (profile?.plan ?? "lojista") as Plan;
  const hasAccess = planRank[currentPlan] >= planRank[requires];

  if (hasAccess) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="relative">
        <div className="gradient-primary absolute inset-0 rounded-3xl opacity-15 blur-2xl" />
        <div className="relative grid h-20 w-20 place-items-center rounded-3xl border border-border bg-card text-accent-foreground shadow-soft">
          <Lock className="size-8 text-primary" />
        </div>
      </div>

      <h2 className="mt-6 text-xl font-semibold">
        {featureName ?? "Recurso exclusivo"}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {featureDescription ??
          `Este recurso está disponível no ${planNames[requires]}. Faça o upgrade para desbloquear.`}
      </p>

      <div className="mt-8 rounded-2xl border border-primary/20 bg-primary-soft px-6 py-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">
          {planNames[requires]}
        </p>
        <p className="num-display mt-1 text-2xl font-semibold text-primary">
          {planPrices[requires]}
        </p>
      </div>

      <Button asChild className="mt-6 h-11 rounded-full px-8 font-semibold shadow-glow">
        <Link to="/configuracoes">
          <Sparkles className="mr-2 size-4" />
          Fazer upgrade agora
        </Link>
      </Button>
    </div>
  );
}
