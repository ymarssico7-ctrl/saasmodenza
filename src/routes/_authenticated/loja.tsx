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

  // Se trial ainda não foi oferecido: mostrar modal de oferta SOBRE tela bloqueada.
  // O <Outlet /> (painel da loja) NUNCA é renderizado sem acesso confirmado.
  if (isShouldShowTrialModal && !modalDismissed) {
    return (
      <>
        <LojaBloqueadaScreen reason="no_plan" />
        <TrialOfferModal
          open={true}
          onClose={() => setModalDismissed(true)}
        />
      </>
    );
  }

  // Bloqueio total para quem não tem acesso e já tomou decisão
  if (!hasLoja) {
    if (trialStatus === "declined") {
      return <LojaBloqueadaScreen reason="declined" />;
    }
    if (trialStatus === "expired") {
      return <LojaBloqueadaScreen reason="expired" />;
    }
    return <LojaBloqueadaScreen reason="no_plan" />;
  }

  // Acesso confirmado (trial ativo ou assinante) → renderiza o painel completo
  return (
    <div>
      {/* Banner de countdown — aparece apenas durante o trial ativo */}
      {trialStatus === "active" && daysLeftInTrial !== null && (
        <TrialBanner daysLeft={daysLeftInTrial} isUrgent={isTrialUrgent} />
      )}
      <Outlet />
    </div>
  );
}
