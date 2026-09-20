import { useState } from "react";
import {
  createFileRoute,
  Navigate,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { BoutiqueMentor } from "@/components/boutique-mentor";
import { GuideProvider } from "@/lib/guide-context";
import { TrialOfferModal } from "@/components/trial-offer-modal";
import { profileQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { useAccess } from "@/lib/useAccess";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw redirect({ to: "/auth", replace: true });
      }
      return { user: session.user };
    } catch (err) {
      // Se for um redirect do TanStack Router, deixa propagar normalmente
      if (err && typeof err === "object" && "to" in err) throw err;
      // Qualquer erro inesperado do Supabase → redireciona para login
      // em vez de exibir o ErrorComponent ("Ops, algo inesperado aconteceu")
      throw redirect({ to: "/auth", replace: true });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useQuery(profileQuery());
  const { store } = useStore();
  const { isShouldShowTrialModal } = useAccess(profile, store);
  const [trialModalDismissed, setTrialModalDismissed] = useState(false);

  // Onboarding incompleto → redireciona para /onboarding
  if (profile && profile.onboarding_done === false && pathname !== "/onboarding") {
    return <Navigate to="/onboarding" />;
  }

  // Na tela de onboarding não renderizamos o AppShell
  if (pathname === "/onboarding") return <Outlet />;

  return (
    <GuideProvider>
      <AppShell>
        <Outlet />
      </AppShell>
      <BoutiqueMentor />
      {/* Modal de Trial — dispara globalmente para novos usuários sem plano */}
      {isShouldShowTrialModal && !trialModalDismissed && (
        <TrialOfferModal open={true} onClose={() => setTrialModalDismissed(true)} />
      )}
    </GuideProvider>
  );
}
