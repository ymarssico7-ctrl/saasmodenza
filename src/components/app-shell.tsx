import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  Boxes,
  CircleDollarSign,
  HandCoins,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
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
import { isVitrineAtiva, getBusinessModel, type BusinessModel } from "@/lib/vitrine-settings";
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

// ─── Modo Gestão — balcão físico e administração ──────────────────────────────
const GESTAO_NAV: NavItem[] = [
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
];

// ─── Modo Gestão (para negócio 100% Online) — estoque, CRM e financeiro ───────
const GESTAO_ONLINE_NAV: NavItem[] = [
  {
    to: "/painel",
    label: "Início",
    icon: LayoutDashboard,
    isMatch: (p) => p === "/painel",
  },
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
];


// ─── Modo Loja Online — canal digital completo ────────────────────────────────
const LOJA_ONLINE_NAV: NavItem[] = [
  {
    to: "/loja/pedidos",
    label: "Pedidos",
    icon: ShoppingBag,
    badgeKey: "pedidos",
    isMatch: (p) => p.startsWith("/loja/pedidos"),
  },
  {
    to: "/loja/produtos",
    label: "Catálogo da Vitrine",
    icon: Package,
    isMatch: (p) => p.startsWith("/loja/produtos"),
  },
  {
    to: "/loja/recebimentos",
    label: "Vestui Pay",
    icon: BadgeDollarSign,
    isMatch: (p) => p.startsWith("/loja/recebimentos"),
  },
  {
    to: "/loja/configuracao",
    label: "Configurar Vitrine",
    icon: Store,
    isMatch: (p) =>
      p.startsWith("/loja/configuracao") ||
      p.startsWith("/loja/templates") ||
      p.startsWith("/loja/personalizar") ||
      p.startsWith("/loja/compartilhar") ||
      p === "/loja",
  },
  {
    to: "/loja/integracoes",
    label: "Integrações",
    icon: Link2,
    isMatch: (p) => p.startsWith("/loja/integracoes"),
  },
  {
    to: "/loja/cupons",
    label: "Cupons",
    icon: Tag,
    isMatch: (p) => p.startsWith("/loja/cupons"),
  },
  {
    to: "/loja/frete",
    label: "Frete",
    icon: Truck,
    isMatch: (p) => p.startsWith("/loja/frete"),
  },
];

// ─── Navegação sem vitrine (sidebar física) ───────────────────────────────────
function getMainNavFisica(): NavItem[] {
  return GESTAO_NAV;
}

// ─── Mobile (vitrine desativada) ──────────────────────────────────────────────
const MOBILE_PRIMARY_FISICA: NavItem[] = [
  { to: "/painel", label: "Início", icon: LayoutDashboard, isMatch: (p) => p === "/painel" },
  { to: "/caixa", label: "Caixa", icon: Wallet, isMatch: (p) => p === "/caixa" },
  { to: "/estoque", label: "Roupas", icon: Boxes, isMatch: (p) => p.startsWith("/estoque") },
  { to: "/clientes", label: "Clientes", icon: Users, isMatch: (p) => p.startsWith("/clientes") },
];

const MOBILE_MORE_FISICA: NavItem[] = [
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

// ─── Mobile (modo Gestão com vitrine ativa) ───────────────────────────────────
const MOBILE_PRIMARY_GESTAO: NavItem[] = [
  { to: "/painel", label: "Início", icon: LayoutDashboard, isMatch: (p) => p === "/painel" },
  { to: "/caixa", label: "Caixa", icon: Wallet, isMatch: (p) => p === "/caixa" },
  { to: "/estoque", label: "Roupas", icon: Boxes, isMatch: (p) => p.startsWith("/estoque") },
  { to: "/clientes", label: "Clientes", icon: Users, isMatch: (p) => p.startsWith("/clientes") },
];

const MOBILE_MORE_GESTAO: NavItem[] = [
  { to: "/fiado", label: "Fiado & Cobranças", icon: HandCoins, isMatch: (p) => p.startsWith("/fiado") },
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
  { to: "/metas", label: "Metas & Planejamento", icon: Target, isMatch: (p) => p.startsWith("/metas") },
];

// ─── Mobile (modo Loja Online) ────────────────────────────────────────────────
const MOBILE_PRIMARY_LOJA: NavItem[] = [
  {
    to: "/loja/pedidos",
    label: "Pedidos",
    icon: ShoppingBag,
    badgeKey: "pedidos",
    isMatch: (p) => p.startsWith("/loja/pedidos"),
  },
  {
    to: "/loja/produtos",
    label: "Catálogo",
    icon: Package,
    isMatch: (p) => p.startsWith("/loja/produtos"),
  },
  {
    to: "/loja/recebimentos",
    label: "Vestui Pay",
    icon: BadgeDollarSign,
    isMatch: (p) => p.startsWith("/loja/recebimentos"),
  },
  {
    to: "/loja/configuracao",
    label: "Vitrine",
    icon: Store,
    isMatch: (p) =>
      p.startsWith("/loja/configuracao") ||
      p.startsWith("/loja/templates") ||
      p.startsWith("/loja/personalizar") ||
      p.startsWith("/loja/compartilhar") ||
      p === "/loja",
  },
];

const MOBILE_MORE_LOJA: NavItem[] = [
  { to: "/loja/integracoes", label: "Integrações", icon: Link2, isMatch: (p) => p.startsWith("/loja/integracoes") },
  { to: "/loja/cupons", label: "Cupons", icon: Tag, isMatch: (p) => p.startsWith("/loja/cupons") },
  { to: "/loja/frete", label: "Frete", icon: Truck, isMatch: (p) => p.startsWith("/loja/frete") },
];

// ─── Mobile (modo Gestão para negócio 100% Online) ────────────────────────────
const MOBILE_PRIMARY_ONLINE_GESTAO: NavItem[] = [
  { to: "/painel", label: "Início", icon: LayoutDashboard, isMatch: (p) => p === "/painel" },
  { to: "/estoque", label: "Roupas", icon: Boxes, isMatch: (p) => p.startsWith("/estoque") },
  { to: "/clientes", label: "Clientes", icon: Users, isMatch: (p) => p.startsWith("/clientes") },
  {
    to: "/relatorio",
    label: "Lucro Real",
    icon: CircleDollarSign,
    isMatch: (p) =>
      p.startsWith("/relatorio") ||
      p.startsWith("/precificacao") ||
      p.startsWith("/prolabore"),
  },
];

const MOBILE_MORE_ONLINE_GESTAO: NavItem[] = [
  { to: "/metas", label: "Metas & Planejamento", icon: Target, isMatch: (p) => p.startsWith("/metas") },
];

// ─── Componente Alternador de Modo (pílula Apple) ─────────────────────────────
function ModeToggle({
  mode,
  onChange,
  businessModel = "hibrida",
  badgeCount = 0,
}: {
  mode: "gestao" | "loja";
  onChange: (mode: "gestao" | "loja") => void;
  businessModel?: BusinessModel;
  badgeCount?: number;
}) {
  const isOnlineOnly = businessModel === "online";
  // Determina se o primeiro botão (da esquerda) está ativo
  const isFirstActive = isOnlineOnly ? mode === "loja" : mode === "gestao";

  return (
    <div className="relative mx-1 mb-5 mt-1 flex rounded-2xl bg-surface-muted p-1 border border-border/50 select-none">
      {/* Indicador Deslizante com Física Suave Apple (Spring-like easing) */}
      <div
        className={cn(
          "absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-card shadow-xs border border-border/60 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none",
          isFirstActive ? "left-1" : "left-[calc(50%+2px)]",
        )}
      />

      {/* Botão 1: 'Loja Online' (se 100% digital) ou 'Gestão' (se híbrida) */}
      <button
        type="button"
        onClick={() => onChange(isOnlineOnly ? "loja" : "gestao")}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98]",
          (isOnlineOnly ? mode === "loja" : mode === "gestao")
            ? "text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {isOnlineOnly ? (
          <>
            <span>🌐 Loja Online</span>
            {badgeCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-xs animate-pulse">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            )}
          </>
        ) : (
          "🏢 Gestão"
        )}
      </button>

      {/* Botão 2: 'Gestão' (se 100% digital) ou 'Loja Online' (se híbrida) */}
      <button
        type="button"
        onClick={() => onChange(isOnlineOnly ? "gestao" : "loja")}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98]",
          (isOnlineOnly ? mode === "gestao" : mode === "loja")
            ? "text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {isOnlineOnly ? (
          "📊 Gestão"
        ) : (
          <>
            <span>🌐 Loja Online</span>
            {badgeCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-xs animate-pulse">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
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

  // ── Modelo de atuação & ativação da Vitrine Online ─────────────────────────
  const [businessModel, setBusinessModel] = useState<BusinessModel>(() =>
    getBusinessModel(storeId, store?.metadata),
  );
  const [vitrineAtiva, setVitrineAtiva] = useState(() => isVitrineAtiva(storeId, store?.metadata));

  useEffect(() => {
    setBusinessModel(getBusinessModel(storeId, store?.metadata));
    setVitrineAtiva(isVitrineAtiva(storeId, store?.metadata));
    const handleChanged = () => {
      setBusinessModel(getBusinessModel(storeId, store?.metadata));
      setVitrineAtiva(isVitrineAtiva(storeId, store?.metadata));
    };
    window.addEventListener("business-model-changed", handleChanged);
    window.addEventListener("vitrine-settings-changed", handleChanged);
    window.addEventListener("storage", handleChanged);
    return () => {
      window.removeEventListener("business-model-changed", handleChanged);
      window.removeEventListener("vitrine-settings-changed", handleChanged);
      window.removeEventListener("storage", handleChanged);
    };
  }, [storeId, store?.metadata]);

  // ── Modo do alternador: persistido no localStorage ─────────────────────────
  const [sidebarMode, setSidebarMode] = useState<"gestao" | "loja">(() => {
    if (typeof window === "undefined") return "gestao";
    const saved = localStorage.getItem("vestui_sidebar_mode") as "gestao" | "loja" | null;
    if (saved) return saved;
    const model = getBusinessModel(storeId, store?.metadata);
    return model === "online" ? "loja" : "gestao";
  });

  function handleModeChange(mode: "gestao" | "loja") {
    setSidebarMode(mode);
    localStorage.setItem("vestui_sidebar_mode", mode);
  }

  // ── Se o modelo for 'online' e não houver escolha explícita, abre em Loja Online
  useEffect(() => {
    if (businessModel === "online") {
      const explicit = localStorage.getItem("vestui_sidebar_mode");
      if (!explicit) {
        setSidebarMode("loja");
      }
    }
  }, [businessModel]);

  // ── Se vitrine for desativada (ex: modelo física), volta pro modo gestão ───
  useEffect(() => {
    if (!vitrineAtiva && sidebarMode === "loja") {
      setSidebarMode("gestao");
      localStorage.setItem("vestui_sidebar_mode", "gestao");
    }
  }, [vitrineAtiva, sidebarMode]);

  // ── Listas de navegação conforme modo e modelo de negócio ──────────────────
  const mainNav = useMemo<NavItem[]>(() => {
    if (!vitrineAtiva) return getMainNavFisica();
    if (sidebarMode === "loja") return LOJA_ONLINE_NAV;
    return businessModel === "online" ? GESTAO_ONLINE_NAV : GESTAO_NAV;
  }, [vitrineAtiva, sidebarMode, businessModel]);

  const mobilePrimary = useMemo<NavItem[]>(() => {
    if (!vitrineAtiva) return MOBILE_PRIMARY_FISICA;
    if (sidebarMode === "loja") return MOBILE_PRIMARY_LOJA;
    return businessModel === "online" ? MOBILE_PRIMARY_ONLINE_GESTAO : MOBILE_PRIMARY_GESTAO;
  }, [vitrineAtiva, sidebarMode, businessModel]);

  const mobileMoreNav = useMemo<NavItem[]>(() => {
    if (!vitrineAtiva) return MOBILE_MORE_FISICA;
    if (sidebarMode === "loja") return MOBILE_MORE_LOJA;
    return businessModel === "online" ? MOBILE_MORE_ONLINE_GESTAO : MOBILE_MORE_GESTAO;
  }, [vitrineAtiva, sidebarMode, businessModel]);


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

        {/* Alternador de modo (pílula Apple) — visível apenas quando vitrine está ativa */}
        {vitrineAtiva && (
          <div className="mt-5">
            <ModeToggle
              mode={sidebarMode}
              onChange={handleModeChange}
              businessModel={businessModel}
              badgeCount={pendingOrderCount}
            />
          </div>
        )}

        {/* Navegação plana com seções visuais e transição fluida */}
        <nav className={cn("flex flex-1 flex-col gap-1 overflow-y-auto pr-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]", vitrineAtiva ? "mt-0" : "mt-6")}>
          <div
            key={`${sidebarMode}-${businessModel}`}
            className="flex flex-col gap-1 animate-in fade-in-60 slide-in-from-left-1.5 duration-200 ease-out"
          >
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
          </div>

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
                <p className="truncate text-sm font-semibold capitalize">{storeName}</p>
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
          {/* Alternador de modo no overlay mobile */}
          {vitrineAtiva && (
            <div className="mb-4">
              <ModeToggle
                mode={sidebarMode}
                onChange={handleModeChange}
                businessModel={businessModel}
                badgeCount={pendingOrderCount}
              />
            </div>
          )}

          <nav className="flex flex-col gap-1">
            <div
              key={`${sidebarMode}-${businessModel}`}
              className="flex flex-col gap-1 animate-in fade-in-60 slide-in-from-left-1.5 duration-200 ease-out"
            >
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
            </div>
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
      <main className="pb-24 lg:pb-5 lg:pl-[268px]">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-8 sm:py-5 lg:pb-4">{children}</div>
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

          {/* Alternador no sheet "Mais" quando vitrine ativa */}
          {vitrineAtiva && (
            <div className="px-4 pt-4">
              <ModeToggle
                mode={sidebarMode}
                onChange={handleModeChange}
                businessModel={businessModel}
                badgeCount={pendingOrderCount}
              />
            </div>
          )}

          <nav className="flex flex-col gap-1 px-4 py-3">
            <div
              key={`${sidebarMode}-${businessModel}`}
              className="flex flex-col gap-1 animate-in fade-in-60 slide-in-from-left-1.5 duration-200 ease-out"
            >
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
            </div>
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
