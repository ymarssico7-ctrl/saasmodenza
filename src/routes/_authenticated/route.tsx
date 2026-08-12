import { createFileRoute, Navigate, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { profileQuery } from "@/lib/db";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Verificação REAL da sessão Supabase — sem mock
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Sem sessão ativa → redireciona para /auth
      throw redirect({ to: "/auth", replace: true });
    }
    return { user: session.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useQuery(profileQuery());

  // Onboarding incompleto → redireciona forçadamente para /onboarding
  // (exceto se já estiver nessa rota para evitar loop)
  if (profile && profile.onboarding_done === false && pathname !== "/onboarding") {
    return <Navigate to="/onboarding" />;
  }

  // Na tela de onboarding não renderizamos o AppShell (sidebar/header)
  if (pathname === "/onboarding") return <Outlet />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
