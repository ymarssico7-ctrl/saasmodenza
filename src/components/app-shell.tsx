import { useState, useMemo } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Settings,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { useAccess } from "@/lib/useAccess";
import { cn } from "@/lib/utils";

// ─── Nav item type ─────────────────────────────────────────────────────────────
type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
  badgeKey?: "pedidos";
  isMatch?: (pathname: string) => boolean;
};

// ─── Os 5 Pilares da Vida Real (Padrão Apple — Zero Alternador) ─────────────────
// Simplicidade extrema para a dona de loja:
// 1. Início
// 2. Vendas (Balcão + Pedidos do Insta juntos)
// 3. Roupas & Estoque (Peças físicas e vitrine integradas)
// 4. Clientes & Fiado (Quem compra e quem deve)
// 5. Meu Financeiro (Vestui Pay, Lucro Real e Metas)
// + Minha Vitrine (Simulador visual do link da bio)
const MAIN_NAV: NavItem[] = [
  // ── Rotina da Loja ──────────────────────────────────────────────────────────
  {
    to: "/painel",
    label: "Início",
    icon: LayoutDashboard,
    section: "Rotina da Loja",
    isMatch: (p) => p === "/painel",
  },
  {
    to: "/caixa",
    label: "Vendas",
    icon: Wallet,
    badgeKey: "pedidos",
    isMatch: (p) => p === "/caixa" || p.startsWith("/loja/pedidos"),
  },
  {
    to: "/estoque",
    label: "Roupas & Estoque",
    icon: Boxes,
    isMatch: (p) => p.startsWith("/estoque"),
  },
  {
    to: "/clientes",
    label: "Clientes & Fiado",
    icon: Users,
    isMatch: (p) => p.startsWith("/clientes") || p.startsWith("/fiado"),
  },
  {
    to: "/loja/recebimentos",
    label: "Meu Financeiro",
    icon: CircleDollarSign,
    isMatch: (p) =>
      p.startsWith("/loja/recebimentos") ||
      p.startsWith("/relatorio") ||
      p.startsWith("/metas") ||
      p.startsWith("/prolabore") ||
      p.startsWith("/precificacao"),
  },

  // ── Canal Digital ───────────────────────────────────────────────────────────
  {
    to: "/loja/configuracao",
    label: "Minha Vitrine (Link da Bio)",
    icon: Sparkles,
    section: "Canal Digital",
    isMatch: (p) =>
      p.startsWith("/loja/configuracao") ||
      p.startsWith("/loja/templates") ||
      p.startsWith("/loja/compartilhar") ||
      p.startsWith("/loja/frete") ||
      p.startsWith("/loja/cupons") ||
      p.startsWith("/loja/integracoes") ||
      p.startsWith("/loja/produtos"),
  },
];

// ─── Mobile Tab Bar — 4 âncoras da rotina + Mais ──────────────────────────────
const MOBILE_PRIMARY: NavItem[] = [
  { to: "/painel", label: "Início", icon: LayoutDashboard, isMatch: (p) => p === "/painel" },
  { to: "/caixa", label: "Vendas", icon: Wallet, badgeKey: "pedidos", isMatch: (p) => p === "/caixa" || p.startsWith("/loja/pedidos") },
  { to: "/estoque", label: "Roupas", icon: Boxes, isMatch: (p) => p.startsWith("/estoque") },
  { to: "/clientes", label: "Clientes", icon: Users, isMatch: (p) => p.startsWith("/clientes") || p.startsWith("/fiado") },
];

// ─── Itens exibidos no menu "Mais" do celular ─────────────────────────────────
const MOBILE_MORE_NAV: NavItem[] = [
  {
    to: "/loja/recebimentos",
    label: "Meu Financeiro",
    icon: CircleDollarSign,
    section: "Finanças & Lucro",
    isMatch: (p) =>
      p.startsWith("/loja/recebimentos") ||
      p.startsWith("/relatorio") ||
      p.startsWith("/metas") ||
      p.startsWith("/prolabore") ||
      p.startsWith("/precificacao"),
  },
  {
    to: "/loja/configuracao",
    label: "Minha Vitrine (Link da Bio)",
    icon: Sparkles,
    section: "Canal Digital",
    isMatch: (p) =>
      p.startsWith("/loja/configuracao") ||
      p.startsWith("/loja/templates") ||
      p.startsWith("/loja/compartilhar") ||
      p.startsWith("/loja/frete") ||
      p.startsWith("/loja/cupons") ||
      p.startsWith("/loja/integracoes") ||
      p.startsWith("/loja/produtos"),
  },
];

// ─── Main AppShell ────────────────────────────────────────────────────────────
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const { data: profile, isLoading: isProfileLoading } = useQuery(profileQuery());
  const { store, storeId } = useStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isActive, trialStatus, daysLeftInTrial, isTrialUrgent } = useAccess(profile, store);

  // ── Badge de pedidos pendentes da vitrine online ────────────────────────────
  const pendingOrderCount = useMemo(() => {
    if (!storeId) return 0;
    try {
      const raw = localStorage.getItem(`vestui_orders_${storeId}`);
      if (!raw) return 0;
      const orders: { status?: string }[] = JSON.parse(raw);
      return orders.filter((o) => o.status === "novo").length;
    } catch {
      return 0;
    }
  }, [storeId]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const storeName = profile?.store_name?.trim() || "Sua loja";
  const ownerName = profile?.owner_name?.trim() || "Bem-vinda";

  const planLabel = (() => {
    if (!isActive) return "Sem plano";
    const p = profile?.plan;
    if (p === "gestao_anual" || p === "anual") return "Anual ✦";
    return "Vestui";
  })();

  function isNavActive(item: NavItem): boolean {
    if (item.isMatch) return item.isMatch(pathname);
    return pathname.startsWith(item.to);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Sidebar desktop (Padrão Apple: 5 Pilares da Vida Real) ──────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Link to="/painel" className="px-2">
          <Logo />
        </Link>

        {/* ── Navegação Contínua e Limpa ──────────────────────────────────── */}
        <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto pr-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {MAIN_NAV.map((item) => (
            <div key={item.to} className="flex flex-col">
              {item.section && (
                <div className="px-4 pt-4 pb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 font-mono">
                    {item.section}
                  </p>
                </div>
              )}
              <NavItemLink
                item={item}
                active={isNavActive(item)}
                badgeCount={item.badgeKey === "pedidos" ? pendingOrderCount : undefined}
              />
            </div>
          ))}

          <div className="mt-4 border-t border-sidebar-border/60 pt-2">
            <NavItemLink
              item={{ to: "/configuracoes", label: "Configurações Gerais", icon: Settings }}
              active={pathname === "/configuracoes"}
            />
          </div>
        </nav>

        {/* ── Banner de Trial Ativo ────────────────────────────────────────── */}
        {trialStatus === "active" && daysLeftInTrial !== null && (
          <div
            className={cn(
              "mt-3 rounded-2xl px-4 py-3 text-xs transition-all",
              isTrialUrgent
                ? "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border border-primary/20 bg-primary/5 text-primary",
            )}
          >
            <p className="font-semibold">
              {isTrialUrgent ? "⚠ " : "✨ "}
              {daysLeftInTrial} {daysLeftInTrial === 1 ? "dia restante" : "dias de avaliação"}
            </p>
            <p className="mt-0.5 text-[11px] opacity-80">
              {isTrialUrgent
                ? "Assine agora para não perder o acesso"
                : "Período gratuito ativo — explore à vontade"}
            </p>
          </div>
        )}

        {/* ── Profile card ────────────────────────────────────────────────── */}
        <div className="mt-3 rounded-2xl bg-surface-muted p-4">
          <div className="flex items-center justify-between">
            {isProfileLoading ? (
              <div className="flex-1 space-y-1.5 min-w-0 pr-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            ) : (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{storeName}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{ownerName}</p>
              </div>
            )}
            {isProfileLoading ? (
              <Skeleton className="h-4 w-14 rounded-full" />
            ) : (
              <span className="ml-2 shrink-0 rounded-full border border-primary/20 bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                {planLabel}
              </span>
            )}
          </div>
          <button
            onClick={() => void signOut()}
            className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <LogOut className="size-3.5" /> Sair da conta
          </button>
        </div>
      </aside>

      {/* ─── Topbar mobile ────────────────────────────────────────────────── */}
      <header className="glass sticky top-0 z-40 flex h-16 items-center justify-between px-4 lg:hidden">
        <Link to="/painel">
          <Logo />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      {/* ─── Mobile overlay menu completo ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-background/95 px-4 py-4 backdrop-blur-xl lg:hidden overflow-y-auto">
          <nav className="flex flex-col gap-1">
            {MAIN_NAV.map((item) => (
              <div key={item.to} className="flex flex-col">
                {item.section && (
                  <div className="px-4 pt-4 pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 font-mono">
                      {item.section}
                    </p>
                  </div>
                )}
                <NavItemLink
                  item={item}
                  active={isNavActive(item)}
                  badgeCount={item.badgeKey === "pedidos" ? pendingOrderCount : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                />
              </div>
            ))}
            <div className="mt-3 border-t border-border/60 pt-2">
              <NavItemLink
                item={{ to: "/configuracoes", label: "Configurações Gerais", icon: Settings }}
                active={pathname === "/configuracoes"}
                onClick={() => setMobileMenuOpen(false)}
              />
            </div>
          </nav>
          <button
            onClick={() => void signOut()}
            className="mt-6 flex items-center gap-2 px-4 text-sm font-medium text-muted-foreground cursor-pointer"
          >
            <LogOut className="size-4" /> Sair da conta
          </button>
        </div>
      )}

      {/* ─── Main content ─────────────────────────────────────────────────── */}
      <main className="pb-28 lg:pb-16 lg:pl-[268px]">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-8 sm:py-6">{children}</div>
      </main>

      {/* ─── Tab bar mobile — 4 âncoras da rotina + Mais ─────────────────── */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-center justify-around px-2 lg:hidden">
        {MOBILE_PRIMARY.map((item) => {
          const active = isNavActive(item);
          const isVendas = item.badgeKey === "pedidos";
          return (
            <Link
              key={item.to}
              to={item.to}
              preload="intent"
              className={cn(
                "relative flex w-16 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {isVendas && pendingOrderCount > 0 && (
                <span className="absolute top-1.5 right-2.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm animate-pulse">
                  {pendingOrderCount > 9 ? "9+" : pendingOrderCount}
                </span>
              )}
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreSheetOpen(true)}
          className="flex w-16 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-medium text-muted-foreground transition-colors cursor-pointer hover:text-foreground"
          aria-label="Abrir menu completo"
        >
          <MoreHorizontal className="size-5" />
          Mais
        </button>
      </nav>

      {/* ─── Sheet "Mais" (Mobile) ────────────────────────────────────────── */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-border/60 bg-card/98 backdrop-blur-2xl max-h-[88vh] overflow-y-auto px-0"
        >
          <SheetHeader className="px-6 pb-3 pt-2 border-b border-border/40">
            <SheetTitle className="text-sm font-semibold text-foreground text-left">
              Menu Completo
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4 py-3">
            {MOBILE_MORE_NAV.map((item) => (
              <div key={item.to} className="flex flex-col">
                {item.section && (
                  <div className="px-4 pt-4 pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 font-mono">
                      {item.section}
                    </p>
                  </div>
                )}
                <NavItemLink
                  item={item}
                  active={isNavActive(item)}
                  onClick={() => setMoreSheetOpen(false)}
                />
              </div>
            ))}
            <div className="mt-3 border-t border-border/40 pt-2">
              <NavItemLink
                item={{ to: "/configuracoes", label: "Configurações Gerais", icon: Settings }}
                active={pathname === "/configuracoes"}
                onClick={() => setMoreSheetOpen(false)}
              />
            </div>
          </nav>
          <div className="px-8 py-4 border-t border-border/40">
            <button
              onClick={() => {
                setMoreSheetOpen(false);
                void signOut();
              }}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <LogOut className="size-4" /> Sair da conta
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── NavItemLink ──────────────────────────────────────────────────────────────
function NavItemLink({
  item,
  active,
  badgeCount,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  badgeCount?: number | undefined;
  onClick?: (() => void) | undefined;
}) {
  return (
    <Link
      to={item.to}
      preload="intent"
      onClick={onClick}
      className={cn(
        "group relative flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <item.icon className="size-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
      </div>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      )}
    </Link>
  );
}
