import { useState } from "react";
import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { TrialOfferModal } from "@/components/trial-offer-modal";
import { profileQuery } from "@/lib/db";
import { useAccess } from "@/lib/useAccess";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    return { user: { id: "mock-user-id" } };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useQuery(profileQuery());
  const { isShouldShowTrialModal } = useAccess(profile);
  const [modalDismissed, setModalDismissed] = useState(false);

  // Mostra modal se o cliente ainda não decidiu sobre o trial
  const showModal = isShouldShowTrialModal && !modalDismissed;

  if (pathname === "/onboarding") return <Outlet />;

  return (
    <AppShell>
      {showModal && (
        <TrialOfferModal
          open={showModal}
          onClose={() => setModalDismissed(true)}
        />
      )}
      <Outlet />
    </AppShell>
  );
}
