import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgePercent,
  BarChart3,
  Bell,
  Boxes,
  CircleDollarSign,
  CreditCard,
  Eye,
  Globe,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Settings,
  Share2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery, membersQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { useAccess } from "@/lib/useAccess";
import { isVitrineAtiva } from "@/lib/vitrine-settings";
import { cn } from "@/lib/utils";

// ─── Tipos da Navegação (Padrão Shopify — Macro-grupos + Progressive Disclosure) ──
type NavSubItem = {
  to: string;
  label: string;
  search?: Record<string, string>;
  isMatch: (pathname: string, search: Record<string, unknown>) => boolean;
};

type NavGroupItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  search?: Record<string, string>;
  section?: string;
  badgeKey?: "pedidos";
  externalPreview?: boolean;
  children?: NavSubItem[];
  isMatch: (pathname: string, search: Record<string, unknown>) => boolean;
};

// ─── Árvore de Navegação — Padrão Shopify Adaptado à Rotina de Boutique ──────
function getShopifyNav(vitrineAtiva: boolean): NavGroupItem[] {
  const items: NavGroupItem[] = [
    // ── Acesso Operacional Rápido (Alta Frequência Diária) ───────────────────
    {
      id: "painel",
      label: "Início",
      icon: LayoutDashboard,
      to: "/painel",
      isMatch: (p) => p === "/painel",
    },
    {
      id: "caixa",
      label: "Caixa & PDV",
      icon: Wallet,
      to: "/caixa",
      isMatch: (p) => p === "/caixa",
    },
    {
      id: "pedidos",
      label: "Pedidos",
      icon: ShoppingBag,
      to: "/loja/pedidos",
      badgeKey: "pedidos",
      isMatch: (p) => p.startsWith("/loja/pedidos"),
    },

    // ── Macro-grupos Principais (Elegantes e Concisos estilo Shopify) ────────
    {
      id: "produtos",
      label: "Produtos",
      icon: Boxes,
      to: "/estoque",
      search: { tab: "pecas" },
      isMatch: (p) =>
        p.startsWith("/estoque") ||
        p.startsWith("/precificacao") ||
        p.startsWith("/fornecedores"),
      children: [
        {
          to: "/estoque",
          search: { tab: "pecas" },
          label: "Peças em Estoque",
          isMatch: (p, s) => p.startsWith("/estoque") && s?.tab !== "categorias",
        },
        {
          to: "/estoque",
          search: { tab: "categorias" },
          label: "Coleções & Categorias",
          isMatch: (p, s) => p.startsWith("/estoque") && s?.tab === "categorias",
        },
        {
          to: "/precificacao",
          label: "Precificação & Markup",
          isMatch: (p) => p.startsWith("/precificacao"),
        },
        {
          to: "/fornecedores",
          label: "Fornecedores",
          isMatch: (p) => p.startsWith("/fornecedores"),
        },
      ],
    },
    {
      id: "clientes",
      label: "Clientes",
      icon: Users,
      to: "/clientes",
      search: { tab: "clientes" },
      isMatch: (p) => p.startsWith("/clientes") || p.startsWith("/fiado"),
      children: [
        {
          to: "/clientes",
          search: { tab: "clientes" },
          label: "Carteira de Clientes",
          isMatch: (p, s) => p.startsWith("/clientes") && s?.tab !== "fiado",
        },
        {
          to: "/clientes",
          search: { tab: "fiado" },
          label: "Caderninho de Fiado",
          isMatch: (p, s) =>
            (p.startsWith("/clientes") && s?.tab === "fiado") ||
            p.startsWith("/fiado"),
        },
      ],
    },
    {
      id: "marketing",
      label: "Marketing",
      icon: BadgePercent,
      to: "/loja/cupons",
      isMatch: (p) =>
        p.startsWith("/loja/cupons") ||
        p.startsWith("/loja/compartilhar") ||
        p.startsWith("/metas"),
      children: [
        {
          to: "/loja/cupons",
          label: "Cupons & Descontos",
          isMatch: (p) => p.startsWith("/loja/cupons"),
        },
        {
          to: "/loja/compartilhar",
          label: "Divulgação & Link da Bio",
          isMatch: (p) => p.startsWith("/loja/compartilhar"),
        },
        {
          to: "/metas",
          label: "Metas de Venda",
          isMatch: (p) => p.startsWith("/metas"),
        },
      ],
    },
    {
      id: "financas",
      label: "Finanças",
      icon: BarChart3,
      to: "/relatorio",
      isMatch: (p) =>
        p.startsWith("/relatorio") ||
        p.startsWith("/prolabore") ||
        p.startsWith("/loja/recebimentos"),
      children: [
        {
          to: "/relatorio",
          label: "Lucro Real & DRE",
          isMatch: (p) => p.startsWith("/relatorio"),
        },
        {
          to: "/prolabore",
          label: "Pró-Labore da Lojista",
          isMatch: (p) => p.startsWith("/prolabore"),
        },
        {
          to: "/loja/recebimentos",
          label: "Vestui Pay (Recebimentos)",
          isMatch: (p) => p.startsWith("/loja/recebimentos"),
        },
      ],
    },
  ];

  // ── Canais de Venda (Loja Digital) ─────────────────────────────────────────
  if (vitrineAtiva) {
    items.push({
      id: "vitrine",
      label: "Vitrine Online",
      icon: Store,
      to: "/loja/produtos",
      section: "Canais de vendas",
      externalPreview: true,
      isMatch: (p) =>
        p.startsWith("/loja") &&
        !p.startsWith("/loja/pedidos") &&
        !p.startsWith("/loja/cupons") &&
        !p.startsWith("/loja/recebimentos") &&
        !p.startsWith("/loja/compartilhar"),
      children: [
        {
          to: "/loja/produtos",
          label: "Produtos na Vitrine",
          isMatch: (p) => p.startsWith("/loja/produtos"),
        },
        {
          to: "/loja/templates",
          label: "Personalizar Loja & Temas",
          isMatch: (p) => p.startsWith("/loja/templates"),
        },
        {
          to: "/loja/configuracao",
          label: "Configurações da Vitrine",
          isMatch: (p) =>
            p.startsWith("/loja/configuracao") ||
            p.startsWith("/loja/personalizar") ||
            p === "/loja",
        },
        {
          to: "/loja/frete",
          label: "Frete & Entregas",
          isMatch: (p) => p.startsWith("/loja/frete"),
        },
        {
          to: "/loja/integracoes",
          label: "Integrações",
          isMatch: (p) => p.startsWith("/loja/integracoes"),
        },
      ],
    });
  } else {
    items.push({
      id: "ativar_vitrine",
      label: "Ativar Vitrine Online",
      icon: Globe,
      to: "/configuracoes",
      search: { tab: "canais" },
      section: "Canais de vendas",
      isMatch: (p, s) => p.startsWith("/configuracoes") && s?.tab === "canais",
    });
  }

  return items;
}

// ─── Linha de Grupo e Sub-itens (Padrão Shopify — Zero Setas) ────────────────
function NavGroupRow({
  item,
  pathname,
  search,
  badgeCount,
  storeSlug,
  onItemClick,
}: {
  item: NavGroupItem;
  pathname: string;
  search: Record<string, unknown>;
  badgeCount?: number;
  storeSlug?: string | null;
  onItemClick?: () => void;
}) {
  const isGroupActive = item.isMatch(pathname, search);
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isExpanded = hasChildren && isGroupActive;

  return (
    <div className="flex flex-col">
      {/* Item Principal (1ª linha) */}
      <div
        className={cn(
          "group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-[13px] transition-all duration-150 select-none",
          isGroupActive
            ? "bg-sidebar-accent text-foreground font-semibold shadow-2xs"
            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground font-medium",
        )}
      >
        <Link
          to={item.to as any}
          search={item.search as any}
          preload="intent"
          onClick={onItemClick}
          className="flex flex-1 items-center gap-2.5 min-w-0 cursor-pointer"
        >
          <item.icon
            className={cn(
              "size-4 shrink-0 transition-colors",
              isGroupActive
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          <span className="truncate">{item.label}</span>

          {item.badgeKey === "pedidos" && badgeCount !== undefined && badgeCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-2xs animate-pulse">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </Link>

        {/* Botão de preview da vitrine (Shopify Style) */}
        {item.externalPreview && storeSlug && (
          <a
            href={`https://${storeSlug}.vestui.com.br`}
            target="_blank"
            rel="noreferrer"
            title="Abrir Vitrine Online"
            className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="size-3.5" />
          </a>
        )}
      </div>

      {/* Sub-itens desdobrados (Elegantes com indentação pura — Estilo Imagens 3 e 4 da Shopify) */}
      {hasChildren && isExpanded && (
        <div className="my-0.5 flex flex-col gap-0.5 animate-in fade-in-50 slide-in-from-top-1 duration-150">
          {item.children!.map((child) => {
            const isChildActive = child.isMatch(pathname, search);
            return (
              <Link
                key={child.label}
                to={child.to as any}
                search={child.search as any}
                preload="intent"
                onClick={onItemClick}
                className={cn(
                  "group relative flex items-center justify-between rounded-lg pl-9 pr-2.5 py-1.5 text-[12.5px] transition-all duration-150 cursor-pointer select-none",
                  isChildActive
                    ? "font-semibold text-foreground bg-sidebar-accent/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/30 font-normal",
                )}
              >
                <span className="truncate">{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Componente Principal AppShell ───────────────────────────────────────────
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const { data: profile, isLoading: isProfileLoading } = useQuery(profileQuery());
  const { store, storeId } = useStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = (useRouterState({ select: (s) => s.location.search }) || {}) as Record<string, unknown>;
  const isConfiguracoes = pathname.startsWith("/configuracoes");
  const currentSettingsTab = (typeof search?.tab === "string" ? search.tab : "geral") || "geral";
  const { data: members = [] } = useQuery(membersQuery());
  const { isActive, trialStatus, daysLeftInTrial, isTrialUrgent } = useAccess(profile, store);

  // ── Ativação da Vitrine Online ────────────────────────────────────────────
  const [vitrineAtiva, setVitrineAtiva] = useState(() => isVitrineAtiva(storeId, store?.metadata));

  useEffect(() => {
    setVitrineAtiva(isVitrineAtiva(storeId, store?.metadata));
    const handleChanged = () => {
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

  const navItems = useMemo(() => getShopifyNav(vitrineAtiva), [vitrineAtiva]);

  // Badge de pedidos pendentes
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

  // ── Abas Principais Mobile ────────────────────────────────────────────────
  const mobilePrimary = [
    { to: "/painel", label: "Início", icon: LayoutDashboard, isMatch: (p: string) => p === "/painel" },
    { to: "/caixa", label: "Caixa", icon: Wallet, isMatch: (p: string) => p === "/caixa" },
    {
      to: "/estoque",
      label: "Estoque",
      icon: Boxes,
      isMatch: (p: string) => p.startsWith("/estoque") || p.startsWith("/precificacao") || p.startsWith("/fornecedores"),
    },
    {
      to: "/clientes",
      label: "Clientes",
      icon: Users,
      isMatch: (p: string) => p.startsWith("/clientes") || p.startsWith("/fiado"),
    },
  ];

  // ── Renderizador de Lista de Navegação ─────────────────────────────────────
  function renderNavItems(onItemClick?: () => void) {
    return navItems.map((item) => (
      <div key={item.id} className="flex flex-col">
        {item.section && (
          <div className="px-2.5 pt-3.5 pb-1 select-none">
            <span className="text-[11px] font-semibold text-muted-foreground/60">
              {item.section}
            </span>
          </div>
        )}
        <NavGroupRow
          item={item}
          pathname={pathname}
          search={search}
          badgeCount={pendingOrderCount}
          storeSlug={store?.slug}
          onItemClick={onItemClick}
        />
      </div>
    ));
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sidebar Desktop (Padrão Shopify Oficial) ─────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col border-r border-sidebar-border bg-sidebar px-3.5 py-4 lg:flex">
        {isConfiguracoes ? (
          /* ── Modo Configurações (Coluna vertical dedicada) ───────────────── */
          <div className="flex flex-1 flex-col overflow-y-auto pr-1 scrollbar-none min-h-0">
            <Link
              to="/painel"
              className="group flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-all cursor-pointer mb-2 shrink-0"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Voltar ao Início</span>
            </Link>

            {/* Card de identidade da loja */}
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-sidebar-border/80 bg-card p-3 shadow-2xs shrink-0">
              <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 font-bold text-xs shrink-0">
                {storeName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{storeName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{ownerName}</p>
              </div>
            </div>

            <div className="px-2.5 pb-1.5 shrink-0">
              <p className="text-xs font-semibold text-muted-foreground">Configurações</p>
            </div>

            <nav className="flex flex-col gap-1">
              {[
                { tab: "geral", label: "Geral", icon: Store },
                { tab: "canais", label: "Canais de Venda", icon: Globe },
                { tab: "caixa", label: "Caixa & Pagamentos", icon: CreditCard },
                { tab: "equipe", label: "Usuários & Equipe", icon: Users, badge: members.length },
                { tab: "plano", label: "Plano & Assinatura", icon: Sparkles },
              ].map((item) => {
                const active = currentSettingsTab === item.tab;
                return (
                  <Link
                    key={item.tab}
                    to="/configuracoes"
                    search={{ tab: item.tab }}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150 cursor-pointer",
                      active
                        ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                          active ? "bg-white/20 text-white" : "bg-surface-muted text-muted-foreground",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : (
          /* ── Modo Painel Principal — Padrão Shopify ──────────────────────── */
          <div className="flex flex-col flex-1 min-h-0">
            {/* Logo */}
            <div className="px-2 pt-1 pb-3 flex items-center shrink-0">
              <Link to="/painel">
                <Logo />
              </Link>
            </div>

            {/* Navegação Limpa e Organizada */}
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto min-h-0 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {renderNavItems()}
            </nav>
          </div>
        )}

        {/* ── Rodapé Fixo da Sidebar (Configurações + Perfil da Loja) ──────────── */}
        <div className="mt-auto pt-3 border-t border-sidebar-border/70 flex flex-col gap-1 shrink-0">
          {!isConfiguracoes && (
            <Link
              to="/configuracoes"
              search={{ tab: "geral" }}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-150 cursor-pointer",
                isConfiguracoes
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              <Settings className="size-4 shrink-0 transition-transform group-hover:rotate-45" />
              <span>Configurações</span>
            </Link>
          )}

          {/* Banner de Trial */}
          {trialStatus === "active" && daysLeftInTrial !== null && (
            <div
              className={cn(
                "my-1 rounded-xl px-3 py-2 text-xs transition-all",
                isTrialUrgent
                  ? "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border border-primary/20 bg-primary/5 text-primary",
              )}
            >
              <p className="font-semibold text-[11px]">
                {isTrialUrgent ? "⚠ " : "✨ "}
                {daysLeftInTrial} {daysLeftInTrial === 1 ? "dia restante" : "dias de avaliação"}
              </p>
              <p className="text-[10px] opacity-80">
                {isTrialUrgent ? "Assine para manter o acesso" : "Período gratuito ativo"}
              </p>
            </div>
          )}

          {/* Perfil da Boutique com Dropdown (Estilo [ML] Minha Loja 🔔 da Shopify) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 hover:bg-sidebar-accent/80 transition-colors cursor-pointer group text-left outline-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isProfileLoading ? (
                    <Skeleton className="size-7 rounded-lg" />
                  ) : (
                    <div className="flex size-7 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 font-bold text-[11px] shrink-0">
                      {storeName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate text-xs font-semibold text-foreground">{storeName}</span>
                </div>
                <Bell className="size-3.5 text-muted-foreground/70 group-hover:text-foreground transition-colors shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 mb-1 rounded-2xl p-1.5 shadow-lift">
              <div className="px-2.5 py-2">
                <p className="text-xs font-bold text-foreground truncate">{storeName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{ownerName}</p>
                <span className="mt-1.5 inline-block rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">
                  {planLabel}
                </span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  to="/configuracoes"
                  search={{ tab: "geral" }}
                  className="cursor-pointer text-xs flex items-center gap-2 rounded-xl py-2 px-2.5"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  <span>Configurações da Loja</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to="/configuracoes"
                  search={{ tab: "plano" }}
                  className="cursor-pointer text-xs flex items-center gap-2 rounded-xl py-2 px-2.5"
                >
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Plano & Assinatura</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void signOut()}
                className="text-xs text-destructive focus:text-destructive cursor-pointer flex items-center gap-2 rounded-xl py-2 px-2.5"
              >
                <LogOut className="size-3.5" />
                <span>Sair da conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Topbar Mobile ─────────────────────────────────────────────────────── */}
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

      {/* ── Mobile Overlay Menu ────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-background/95 px-4 py-4 backdrop-blur-xl lg:hidden overflow-y-auto">
          <nav className="flex flex-col gap-1 pb-20">
            {renderNavItems(() => setMobileMenuOpen(false))}

            <div className="mt-4 border-t border-border/60 pt-3">
              <Link
                to="/configuracoes"
                search={{ tab: "geral" }}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <Settings className="size-4 shrink-0" />
                <span>Configurações</span>
              </Link>
            </div>

            <button
              onClick={() => void signOut()}
              className="mt-4 flex items-center gap-2 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <LogOut className="size-3.5" /> Sair da conta
            </button>
          </nav>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────────────────── */}
      <main className="pb-24 lg:pb-5 lg:pl-[268px]">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-8 sm:py-5 lg:pb-4">{children}</div>
      </main>

      {/* ── Bottom Tab Bar (Mobile) ────────────────────────────────────────────── */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-center justify-around px-2 lg:hidden">
        {mobilePrimary.map((item) => {
          const active = item.isMatch(pathname);
          return (
            <Link
              key={item.to}
              to={item.to as any}
              preload="intent"
              className={cn(
                "relative flex w-16 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
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

      {/* ── Sheet "Mais" (Mobile Completo) ────────────────────────────────────── */}
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
            {renderNavItems(() => setMoreSheetOpen(false))}

            <div className="mt-4 border-t border-border/40 pt-3">
              <Link
                to="/configuracoes"
                search={{ tab: "geral" }}
                onClick={() => setMoreSheetOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <Settings className="size-4 shrink-0" />
                <span>Configurações</span>
              </Link>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setMoreSheetOpen(false);
                  void signOut();
                }}
                className="flex items-center gap-2 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <LogOut className="size-3.5" /> Sair da conta
              </button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
