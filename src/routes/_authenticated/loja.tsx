import { useState } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { profileQuery } from "@/lib/db";
import { useAccess } from "@/lib/useAccess";
import { LojaBloqueadaScreen } from "@/components/loja-bloqueada-screen";
import { TrialBanner } from "@/components/trial-banner";
import { TrialOfferModal } from "@/components/trial-offer-modal";

// Rota pai de todas as sub-rotas /loja/*.
// Controla acesso por plano antes de renderizar qualquer coisa.
export const Route = createFileRoute("/_authenticated/loja")({
  component: LojaLayout,
});

function LojaLayout() {
  const { data: profile } = useQuery(profileQuery());
  const { hasLoja, trialStatus, daysLeftInTrial, isTrialUrgent, isShouldShowTrialModal } = useAccess(profile);
  const [modalDismissed, setModalDismissed] = useState(false);

  // Exibe o modal de trial de 30 dias quando o usuário acessa a Loja pela primeira vez
  // sem ter decidido ainda — de forma contextual e não intrusiva no login
  const showTrialModal = isShouldShowTrialModal && !modalDismissed;

  // Bloqueia acesso se não tiver permissão E o trial já foi decidido (declined/expired)
  if (!hasLoja && !showTrialModal) {
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
      {/* Modal de ativação do Trial — aparece apenas quando usuário ainda não decidiu */}
      {showTrialModal && (
        <TrialOfferModal
          open={showTrialModal}
          onClose={() => setModalDismissed(true)}
        />
      )}

      {/* Banner de countdown — aparece apenas durante o trial ativo */}
      {trialStatus === "active" && daysLeftInTrial !== null && (
        <TrialBanner daysLeft={daysLeftInTrial} isUrgent={isTrialUrgent} />
      )}
      <Outlet />
    </div>
  );
}
