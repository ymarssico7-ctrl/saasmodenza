import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgePercent,
  Banknote,
  BarChart3,
  Boxes,
  Calculator,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Palette,
  Plug,
  Settings,
  Share2,
  ShoppingBag,
  Store,
  Target,
  Truck,
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

// --- Nav item type ---
type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
};

type Workspace = "gestao" | "loja";

// --- Rotas que pertencem ao workspace Loja ---
const LOJA_ROUTES = [
  "/loja/pedidos",
  "/loja/produtos",
  "/loja/templates",
  "/loja/configuracao",
  "/loja/personalizar",
  "/loja/frete",
  "/loja/cupons",
  "/loja/compartilhar",
  "/loja/integracoes",
  "/loja/recebimentos",
];

// --- Workspace: Gestão do Negócio ---
const NAV_GESTAO: NavItem[] = [
  { to: "/painel", label: "Painel de Gestão", icon: LayoutDashboard, section: "Visão Geral" },
  { to: "/caixa", label: "Caixa & PDV", icon: Wallet, section: "Operação Diária" },
  { to: "/estoque", label: "Estoque & Grade", icon: Boxes },
  { to: "/clientes", label: "Clientes & CRM", icon: Users },
  { to: "/fiado", label: "Fiado & Cobranças", icon: HandCoins },
  { to: "/loja/recebimentos", label: "Recebimentos · Vestui Pay", icon: Banknote, section: "Finanças & Resultado" },
  { to: "/relatorio", label: "Relatórios & DRE", icon: BarChart3 },
  { to: "/metas", label: "Metas & Faturamento", icon: Target },
  { to: "/prolabore", label: "Pró-labore", icon: Package },
  { to: "/precificacao", label: "Precificação & Margens", icon: Calculator },
];

// --- Workspace: Loja Online & Vitrine ---
const NAV_LOJA: NavItem[] = [
  { to: "/loja/pedidos", label: "Pedidos Online", icon: ShoppingBag, section: "Vendas Online" },
  { to: "/loja/produtos", label: "Vitrine · Catálogo", icon: Store },
  { to: "/loja/templates", label: "Galeria de Temas", icon: Palette, section: "Experiência & Marketing" },
  { to: "/loja/configuracao", label: "Aparência da Loja", icon: Settings },
  { to: "/loja/compartilhar", label: "Compartilhar & Link da Bio", icon: Share2 },
  { to: "/loja/cupons", label: "Cupons de Desconto", icon: BadgePercent },
  { to: "/loja/frete", label: "Frete & Entrega", icon: Truck, section: "Logística & Conexões" },
  { to: "/loja/integracoes", label: "Integrações", icon: Plug },
];

// --- Mobile Tab Bar por Workspace ---
const MOBILE_GESTAO_PRIMARY: NavItem[] = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/caixa", label: "Caixa", icon: Wallet },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/clientes", label: "Clientes", icon: Users },
];

const MOBILE_LOJA_PRIMARY: NavItem[] = [
  { to: "/loja/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/loja/produtos", label: "Vitrine", icon: Store },
  { to: "/loja/templates", label: "Temas", icon: Palette },
  { to: "/loja/compartilhar", label: "Divulgar", icon: Share2 },
];

// --- Main AppShell ---
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const { data: profile, isLoading: isProfileLoading } = useQuery(profileQuery());
  const { store, storeId } = useStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isActive, trialStatus, daysLeftInTrial, isTrialUrgent } = useAccess(profile, store);

  const routeWorkspace: Workspace = useMemo(() => {
    return LOJA_ROUTES.some((r) => pathname.startsWith(r)) ? "loja" : "gestao";
  }, [pathname]);

  const [workspace, setWorkspace] = useState<Workspace>(routeWorkspace);

  useEffect(() => {
    setWorkspace(routeWorkspace);
  }, [routeWorkspace]);

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
    const p = pathname;
    if (item.to === "/painel") return p === "/painel";
    if (item.to === "/loja") return p === "/loja";
    return p.startsWith(item.to);
  }

  const activeNav = workspace === "loja" ? NAV_LOJA : NAV_GESTAO;
  const mobilePrimary = workspace === "loja" ? MOBILE_LOJA_PRIMARY : MOBILE_GESTAO_PRIMARY;
  const mobileMoreNav = workspace === "loja"
    ? NAV_LOJA.filter((i) => !MOBILE_LOJA_PRIMARY.find((m) => m.to === i.to))
    : NAV_GESTAO.filter((i) => !MOBILE_GESTAO_PRIMARY.find((m) => m.to === i.to));

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Link to="/painel" className="px-2">
          <Logo />
        </Link>

        {/* Workspace Selector */}
        <div className="mt-5 flex rounded-2xl bg-surface-muted p-1 gap-1">
          <WorkspaceButton
            label="Gestão"
            active={workspace === "gestao"}
            onClick={() => setWorkspace("gestao")}
          />
          <WorkspaceButton
            label="Loja Online"
            active={workspace === "loja"}
            badge={pendingOrderCount}
            onClick={() => setWorkspace("loja")}
          />
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {activeNav.map((item) => (
            <div key={item.to} className="flex flex-col">
              {item.section && (
                <div className="px-4 pt-4 pb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 font-mono">
                    {item.section}
                  </p>
                </div>
              )}
              <NavItemLink item={item} active={isNavActive(item)} />
            </div>
          ))}
          <div className="mt-3 border-t border-sidebar-border/60 pt-2">
            <NavItemLink
              item={{ to: "/configuracoes", label: "Configurações", icon: Settings }}
              active={pathname === "/configuracoes"}
            />
          </div>
        </nav>

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

      {/* Mobile overlay menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-background/95 px-4 py-4 backdrop-blur-xl lg:hidden overflow-y-auto">
          <div className="flex rounded-2xl bg-surface-muted p-1 gap-1 mb-4">
            <WorkspaceButton
              label="Gestão"
              active={workspace === "gestao"}
              onClick={() => setWorkspace("gestao")}
            />
            <WorkspaceButton
              label="Loja Online"
              active={workspace === "loja"}
              badge={pendingOrderCount}
              onClick={() => setWorkspace("loja")}
            />
          </div>
          <nav className="flex flex-col gap-0.5">
            {activeNav.map((item) => (
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
                  onClick={() => setMobileMenuOpen(false)}
                />
              </div>
            ))}
            <div className="mt-2 border-t border-border/60 pt-2">
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
          const isPedidos = item.to === "/loja/pedidos";
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
              {isPedidos && pendingOrderCount > 0 && (
                <span className="absolute top-1.5 right-2.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
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

      {/* Sheet "Mais" Mobile */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-border/60 bg-card/98 backdrop-blur-2xl max-h-[88vh] overflow-y-auto px-0"
        >
          <SheetHeader className="px-6 pb-3 pt-2 border-b border-border/40">
            <SheetTitle className="text-sm font-semibold text-foreground text-left">
              {workspace === "loja" ? "Loja Online & Vitrine" : "Gestão do Negócio"}
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-0.5 px-4 py-3">
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
            <div className="mt-2 border-t border-border/40 pt-2">
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

// --- WorkspaceButton ---
function WorkspaceButton({
  label,
  active,
  badge,
  onClick,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all duration-200 cursor-pointer",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

// --- NavItemLink ---
function NavItemLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={item.to}
      preload="intent"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <item.icon className="size-[18px] shrink-0" />
      {item.label}
    </Link>
  );
}
