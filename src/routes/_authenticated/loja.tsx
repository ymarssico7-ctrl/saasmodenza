import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { profileQuery } from "@/lib/db";
import { useAccess } from "@/lib/useAccess";
import { LojaBloqueadaScreen } from "@/components/loja-bloqueada-screen";
import { TrialBanner } from "@/components/trial-banner";

// Rota pai de todas as sub-rotas /loja/*.
// Controla acesso por plano antes de renderizar qualquer coisa.
export const Route = createFileRoute("/_authenticated/loja")({
  component: LojaLayout,
});

function LojaLayout() {
  const { data: profile } = useQuery(profileQuery());
  const { hasLoja, trialStatus, daysLeftInTrial, isTrialUrgent } = useAccess(profile);

  // Bloqueia acesso se não tiver permissão
  if (!hasLoja) {
    if (trialStatus === "declined") {
      return <LojaBloqueadaScreen reason="declined" />;
    }
    if (trialStatus === "expired") {
      return <LojaBloqueadaScreen reason="expired" />;
    }
    // Qualquer outro estado sem acesso
    return <LojaBloqueadaScreen reason="no_plan" />;
  }

  return (
    <div>
      {/* Banner de countdown — aparece apenas durante o trial */}
      {trialStatus === "active" && daysLeftInTrial !== null && (
        <TrialBanner daysLeft={daysLeftInTrial} isUrgent={isTrialUrgent} />
      )}
      <Outlet />
    </div>
  );
}
