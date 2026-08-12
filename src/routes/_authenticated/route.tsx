import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { profileQuery } from "@/lib/db";

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
