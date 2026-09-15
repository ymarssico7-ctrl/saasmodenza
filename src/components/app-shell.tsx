import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  Boxes,
  CircleDollarSign,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
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
import { isVitrineAtiva } from "@/lib/vitrine-settings";
import { cn } from "@/lib/utils";

// Nav item type
type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
  badgeKey?: "pedidos";
  isMatch?: (pathname: string) => boolean;
};

// ─── Navegação Dinâmica & Progressiva (Padrão Apple) ─────────────────────────
// Se a vitrine estiver desativada: o sistema é 100% focado no balcão da loja física.
// Se a vitrine estiver ativada: o Canal Digital surge de forma limpa e organizada.
function getMainNav(vitrineAtiva: boolean): NavItem[] {
  const items: NavItem[] = [
    {
      to: "/painel",
      label: "Início",
      icon: LayoutDashboard,
      isMatch: (p) => p === "/painel",
    },
    {
      to: "/caixa",
      label: "Caixa & PDV",
      icon: Wallet,
      isMatch: (p) => p === "/caixa",
    },
  ];

  if (vitrineAtiva) {
    items.push({
      to: "/loja/pedidos",
      label: "Pedidos da Vitrine",
      icon: ShoppingBag,
      badgeKey: "pedidos",
      isMatch: (p) =>
        p.startsWith("/loja/pedidos") ||
        p.startsWith("/loja/produtos") ||
        p.startsWith("/loja/configuracao") ||
        p.startsWith("/loja/templates") ||
        p.startsWith("/loja/personalizar") ||
        p.startsWith("/loja/compartilhar") ||
        p.startsWith("/loja/frete") ||
        p.startsWith("/loja/cupons") ||
        p.startsWith("/loja/integracoes") ||
        p === "/loja",
    });
  }

  items.push(
    {
      to: "/estoque",
      label: "Roupas & Estoque",
      icon: Boxes,
      isMatch: (p) => p.startsWith("/estoque"),
    },
    {
      to: "/clientes",
      label: "Clientes & CRM",
      icon: Users,
      isMatch: (p) => p.startsWith("/clientes"),
    },
    {
      to: "/fiado",
      label: "Fiado & Cobranças",
      icon: HandCoins,
      isMatch: (p) => p.startsWith("/fiado"),
    },
    {
      to: "/relatorio",
      label: "Lucro Real & DRE",
      icon: CircleDollarSign,
      section: "Financeiro",
      isMatch: (p) =>
        p.startsWith("/relatorio") ||
        p.startsWith("/precificacao") ||
        p.startsWith("/prolabore") ||
        p.startsWith("/loja/recebimentos"),
    },
    {
      to: "/metas",
      label: "Metas & Planejamento",
      icon: Target,
      isMatch: (p) => p.startsWith("/metas"),
    },
  );

  return items;
}

function getMobilePrimary(vitrineAtiva: boolean): NavItem[] {
  if (vitrineAtiva) {
    return [
      { to: "/painel", label: "Início", icon: LayoutDashboard, isMatch: (p) => p === "/painel" },
      { to: "/caixa", label: "Caixa", icon: Wallet, isMatch: (p) => p === "/caixa" },
      {
        to: "/loja/pedidos",
        label: "Pedidos",
        icon: ShoppingBag,
        badgeKey: "pedidos",
        isMatch: (p) => p.startsWith("/loja/pedidos"),
      },
      { to: "/estoque", label: "Roupas", icon: Boxes, isMatch: (p) => p.startsWith("/estoque") },
    ];
  }
  return [
    { to: "/painel", label: "Início", icon: LayoutDashboard, isMatch: (p) => p === "/painel" },
    { to: "/caixa", label: "Caixa", icon: Wallet, isMatch: (p) => p === "/caixa" },
    { to: "/estoque", label: "Roupas", icon: Boxes, isMatch: (p) => p.startsWith("/estoque") },
    { to: "/clientes", label: "Clientes", icon: Users, isMatch: (p) => p.startsWith("/clientes") },
  ];
}

function getMobileMoreNav(vitrineAtiva: boolean): NavItem[] {
  if (vitrineAtiva) {
    return [
      { to: "/clientes", label: "Clientes & CRM", icon: Users, isMatch: (p) => p.startsWith("/clientes") },
      { to: "/fiado", label: "Fiado & Cobranças", icon: HandCoins, isMatch: (p) => p.startsWith("/fiado") },
      {
        to: "/relatorio",
        label: "Lucro Real & DRE",
        icon: CircleDollarSign,
        isMatch: (p) =>
          p.startsWith("/relatorio") ||
          p.startsWith("/precificacao") ||
          p.startsWith("/prolabore"),
      },
      { to: "/metas", label: "Metas & Planejamento", icon: Target, isMatch: (p) => p.startsWith("/metas") },
    ];
  }
  return [
    { to: "/fiado", label: "Fiado & Cobranças", icon: HandCoins, isMatch: (p) => p.startsWith("/fiado") },
    {
      to: "/relatorio",
      label: "Lucro Real & DRE",
      icon: CircleDollarSign,
      section: "Financeiro",
      isMatch: (p) =>
        p.startsWith("/relatorio") ||
        p.startsWith("/precificacao") ||
        p.startsWith("/prolabore"),
    },
    { to: "/metas", label: "Metas & Planejamento", icon: Target, isMatch: (p) => p.startsWith("/metas") },
  ];
}

// Main AppShell
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const { data: profile, isLoading: isProfileLoading } = useQuery(profileQuery());
  const { store, storeId } = useStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isActive, trialStatus, daysLeftInTrial, isTrialUrgent } = useAccess(profile, store);

  // ── Estado reativo de ativação da Vitrine Online ───────────────────────────
  const [vitrineAtiva, setVitrineAtiva] = useState(() => isVitrineAtiva(storeId, store?.metadata));

  useEffect(() => {
    setVitrineAtiva(isVitrineAtiva(storeId, store?.metadata));
    const handleChanged = () => {
      setVitrineAtiva(isVitrineAtiva(storeId, store?.metadata));
    };
    window.addEventListener("vitrine-settings-changed", handleChanged);
    window.addEventListener("storage", handleChanged);
    return () => {
      window.removeEventListener("vitrine-settings-changed", handleChanged);
      window.removeEventListener("storage", handleChanged);
    };
  }, [storeId, store?.metadata]);

  const mainNav = useMemo(() => getMainNav(vitrineAtiva), [vitrineAtiva]);
  const mobilePrimary = useMemo(() => getMobilePrimary(vitrineAtiva), [vitrineAtiva]);
  const mobileMoreNav = useMemo(() => getMobileMoreNav(vitrineAtiva), [vitrineAtiva]);

  // Badge de pedidos pendentes — calculado uma vez, usado na sidebar e no tab bar
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
    if (p === "gestao_anual" || p === "anual") return "Anual";
    return "Vestui";
  })();

  function isNavActive(item: NavItem): boolean {
    if (item.isMatch) return item.isMatch(pathname);
    return pathname.startsWith(item.to);
  }

  function getBadge(item: NavItem): number | undefined {
    if (item.badgeKey === "pedidos") return pendingOrderCount;
    return undefined;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Link to="/painel" className="px-2">
          <Logo />
        </Link>

        {/* Navegação plana com seções visuais */}
        <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto pr-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {mainNav.map((item) => (
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
                badgeCount={getBadge(item)}
              />
            </div>
          ))}

          <div className="mt-4 border-t border-sidebar-border/60 pt-2">
            <NavItemLink
              item={{ to: "/configuracoes", label: "Configurações", icon: Settings }}
              active={pathname === "/configuracoes"}
            />
          </div>
        </nav>

        {/* Banner de Trial */}
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

        {/* Profile card */}
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

      {/* Topbar mobile */}
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

      {/* Mobile overlay menu completo */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-background/95 px-4 py-4 backdrop-blur-xl lg:hidden overflow-y-auto">
          <nav className="flex flex-col gap-1">
            {mainNav.map((item) => (
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
                  badgeCount={getBadge(item)}
                  onClick={() => setMobileMenuOpen(false)}
                />
              </div>
            ))}
            <div className="mt-3 border-t border-border/60 pt-2">
              <NavItemLink
                item={{ to: "/configuracoes", label: "Configurações", icon: Settings }}
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

      {/* Main content */}
      <main className="pb-28 lg:pb-16 lg:pl-[268px]">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-8 sm:py-6">{children}</div>
      </main>

      {/* Tab bar mobile */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-center justify-around px-2 lg:hidden">
        {mobilePrimary.map((item) => {
          const active = isNavActive(item);
          const badge = getBadge(item);
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
              {badge !== undefined && badge > 0 && (
                <span className="absolute top-1.5 right-2.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm animate-pulse">
                  {badge > 9 ? "9+" : badge}
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

      {/* Sheet "Mais" (Mobile) */}
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
            {mobileMoreNav.map((item) => (
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
                item={{ to: "/configuracoes", label: "Configurações", icon: Settings }}
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

// NavItemLink
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
