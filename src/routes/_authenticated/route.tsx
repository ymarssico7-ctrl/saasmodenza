import { useState } from "react";
import {
  createFileRoute,
  Link,
  Navigate,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { BoutiqueMentor } from "@/components/boutique-mentor";
import { GuideProvider } from "@/lib/guide-context";
import { TrialOfferModal } from "@/components/trial-offer-modal";
import { Button } from "@/components/ui/button";
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
  const access = useAccess(profile, store);
  const [trialModalDismissed, setTrialModalDismissed] = useState(false);

  // Onboarding incompleto → redireciona para /onboarding
  if (profile && profile.onboarding_done === false && pathname !== "/onboarding") {
    return <Navigate to="/onboarding" />;
  }

  // Na tela de onboarding não renderizamos o AppShell
  if (pathname === "/onboarding") return <Outlet />;

  // ── Redirecionamento Inteligente Micro-SaaS (Planos Free & Lote) ────────────
  // Se o usuário não for do plano Store e tentar acessar /painel ou raiz autenticada:
  if (!access.isStore && (pathname === "/painel" || pathname === "/")) {
    return <Navigate to="/precificacao" replace />;
  }

  // ── Proteção das Rotas Exclusivas do Vestui Store (ERP) ────────────────────
  const isStoreOnlyRoute =
    pathname.startsWith("/caixa") ||
    pathname.startsWith("/estoque") ||
    pathname.startsWith("/clientes") ||
    pathname.startsWith("/fiado") ||
    pathname.startsWith("/fornecedores") ||
    pathname.startsWith("/metas") ||
    pathname.startsWith("/relatorio") ||
    pathname.startsWith("/prolabore") ||
    pathname.startsWith("/loja");

  if (!access.isStore && isStoreOnlyRoute) {
    return (
      <GuideProvider>
        <AppShell>
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-12 max-w-lg mx-auto">
            <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-5 shadow-lift">
              <Store className="size-8 text-primary" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary uppercase tracking-wider mb-3">
              ✦ Vestui Store
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3">
              Recurso Exclusivo do Vestui Store
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              O controle de Caixa & PDV, Gestão Unificada de Estoque, Clientes e Vitrine Online no WhatsApp fazem parte do plano completo Vestui Store.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <Button asChild size="lg" className="w-full sm:flex-1 font-bold rounded-2xl shadow-lift">
                <Link to="/configuracoes" search={{ tab: "plano" }}>
                  Ver Planos & Upgrade
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:flex-1 font-medium rounded-2xl">
                <Link to="/precificacao">
                  Voltar para Lotes & Precificação
                </Link>
              </Button>
            </div>
          </div>
        </AppShell>
      </GuideProvider>
    );
  }

  return (
    <GuideProvider>
      <AppShell>
        <Outlet />
      </AppShell>
      <BoutiqueMentor />
      {/* Modal de Trial — dispara globalmente para novos usuários sem plano */}
      {access.isShouldShowTrialModal && !trialModalDismissed && (
        <TrialOfferModal open={true} onClose={() => setTrialModalDismissed(true)} />
      )}
    </GuideProvider>
  );
}
