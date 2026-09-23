import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Eye,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
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
import { profileQuery, membersQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { useAccess } from "@/lib/useAccess";
import { isVitrineAtiva, getBusinessModel, type BusinessModel } from "@/lib/vitrine-settings";
import { cn } from "@/lib/utils";

// ─── Tipos da Navegação Hierárquica (Padrão Shopify) ──────────────────────────
type NavChildItem = {
  to: string;
  label: string;
  search?: Record<string, string>;
  badgeKey?: "pedidos";
  isMatch?: (pathname: string, search: Record<string, unknown>) => boolean;
};

type NavGroupItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  search?: Record<string, string>;
  badgeKey?: "pedidos";
  section?: string;
  children?: NavChildItem[];
  isMatch?: (pathname: string, search: Record<string, unknown>) => boolean;
  externalPreview?: boolean;
};

// ─── Construtor da Árvore de Navegação Unificada ─────────────────────────────
function getNavGroups(vitrineAtiva: boolean): NavGroupItem[] {
  const groups: NavGroupItem[] = [
    {
      id: "painel",
      label: "Início",
      icon: LayoutDashboard,
      to: "/painel",
      isMatch: (p) => p === "/painel",
    },
    {
      id: "pedidos",
      label: "Pedidos",
      icon: ShoppingBag,
      to: "/loja/pedidos",
      badgeKey: "pedidos",
      isMatch: (p) => p.startsWith("/loja/pedidos"),
      children: [
        {
          to: "/loja/pedidos",
          label: "Todos os Pedidos",
          badgeKey: "pedidos",
          isMatch: (p) => p.startsWith("/loja/pedidos"),
        },
      ],
    },
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
          label: "Categorias do Catálogo",
          isMatch: (p, s) => p.startsWith("/estoque") && s?.tab === "categorias",
        },
        {
          to: "/precificacao",
          label: "Precificação & Margem",
          isMatch: (p) => p.startsWith("/precificacao"),
        },
        {
          to: "/fornecedores",
          label: "Fornecedores de Mercadoria",
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
          label: "Clientes & VIPs",
          isMatch: (p, s) => p.startsWith("/clientes") && s?.tab !== "fiado",
        },
        {
          to: "/clientes",
          search: { tab: "fiado" },
          label: "Caderninho de Fiado",
          isMatch: (p, s) =>
            (p.startsWith("/clientes") && s?.tab === "fiado") || p.startsWith("/fiado"),
        },
      ],
    },
    {
      id: "financas",
      label: "Finanças & PDV",
      icon: Wallet,
      to: "/caixa",
      isMatch: (p) =>
        p === "/caixa" ||
        p.startsWith("/relatorio") ||
        p.startsWith("/metas") ||
        p.startsWith("/prolabore") ||
        p.startsWith("/loja/recebimentos"),
      children: [
        {
          to: "/caixa",
          label: "Caixa & Balcão (PDV)",
          isMatch: (p) => p === "/caixa",
        },
        {
          to: "/relatorio",
          label: "DRE & Lucro Real",
          isMatch: (p) => p.startsWith("/relatorio"),
        },
        {
          to: "/metas",
          label: "Metas do Mês",
          isMatch: (p) => p.startsWith("/metas"),
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

  if (vitrineAtiva) {
    groups.push({
      id: "vitrine",
      label: "Vitrine Online",
      icon: Store,
      to: "/loja/produtos",
      section: "Canais de vendas",
      externalPreview: true,
      isMatch: (p) =>
        p.startsWith("/loja") &&
        !p.startsWith("/loja/pedidos") &&
        !p.startsWith("/loja/recebimentos"),
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
            p.startsWith("/loja/compartilhar") ||
            p === "/loja",
        },
        {
          to: "/loja/cupons",
          label: "Cupons & Descontos",
          isMatch: (p) => p.startsWith("/loja/cupons"),
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
    groups.push({
      id: "ativar_vitrine",
      label: "Ativar Vitrine Online",
      icon: Globe,
      to: "/configuracoes",
      search: { tab: "canais" },
      section: "Canais de vendas",
      isMatch: (p, s) => p.startsWith("/configuracoes") && s?.tab === "canais",
    });
  }

  return groups;
}

// ─── Auxiliares de Correspondência de Rota ──────────────────────────────────
function isChildActive(
  child: NavChildItem,
  pathname: string,
  search: Record<string, unknown>,
): boolean {
  if (child.isMatch) return child.isMatch(pathname, search);
  return pathname === child.to;
}

function isGroupActive(
  group: NavGroupItem,
  pathname: string,
  search: Record<string, unknown>,
): boolean {
  if (group.isMatch && group.isMatch(pathname, search)) return true;
  if (group.children?.some((c) => isChildActive(c, pathname, search))) return true;
  if (group.to && pathname === group.to) return true;
  return false;
}

// ─── Linha de Item Filho com Recuo ──────────────────────────────────────────
function NavChildRow({
  child,
  pathname,
  search,
  badgeCount,
  onClick,
}: {
  child: NavChildItem;
  pathname: string;
  search: Record<string, unknown>;
  badgeCount?: number;
  onClick?: () => void;
}) {
  const active = isChildActive(child, pathname, search);
  return (
    <Link
      to={child.to as any}
      search={child.search as any}
      preload="intent"
      onClick={onClick}
      className={cn(
        "group relative flex items-center justify-between rounded-xl px-2.5 py-1.5 text-[12px] transition-all duration-150 cursor-pointer",
        active
          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground font-medium",
      )}
    >
      <span className="truncate">{child.label}</span>
      {child.badgeKey === "pedidos" && badgeCount !== undefined && badgeCount > 0 && (
        <span
          className={cn(
            "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
            active ? "bg-white text-primary" : "bg-red-500 text-white animate-pulse",
          )}
        >
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      )}
    </Link>
  );
}

// ─── Linha do Grupo Mestre (com Accordion e Preview de Canal) ────────────────
function NavGroupRow({
  group,
  pathname,
  search,
  isExpanded,
  onToggle,
  onNavigate,
  badgeCount,
  storeSlug,
  onItemClick,
}: {
  group: NavGroupItem;
  pathname: string;
  search: Record<string, unknown>;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  badgeCount?: number;
  storeSlug?: string | null;
  onItemClick?: () => void;
}) {
  const groupActive = isGroupActive(group, pathname, search);
  const hasChildren = Boolean(group.children && group.children.length > 0);

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-all duration-150 select-none",
          groupActive
            ? "bg-sidebar-accent/80 text-foreground font-semibold"
            : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground font-medium",
        )}
      >
        <Link
          to={group.to as any}
          search={group.search as any}
          preload="intent"
          onClick={() => {
            onNavigate();
            onItemClick?.();
          }}
          className="flex flex-1 items-center gap-2.5 min-w-0 cursor-pointer"
        >
          <group.icon
            className={cn(
              "size-4 shrink-0 transition-colors",
              groupActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          <span className="truncate">{group.label}</span>
          {group.badgeKey === "pedidos" && badgeCount !== undefined && badgeCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-2xs animate-pulse">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-0.5">
          {group.externalPreview && storeSlug && (
            <a
              href={`https://${storeSlug}.vestui.com.br`}
              target="_blank"
              rel="noreferrer"
              title="Abrir Vitrine Online em nova aba"
              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Eye className="size-3.5" />
            </a>
          )}

          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggle();
              }}
              className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label={isExpanded ? "Recolher sub-menu" : "Expandir sub-menu"}
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  isExpanded ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-3 pl-2.5 my-0.5 flex flex-col gap-0.5 border-l border-sidebar-border/70 animate-in fade-in-50 slide-in-from-top-1 duration-150">
          {group.children!.map((child) => (
            <NavChildRow
              key={child.label}
              child={child}
              pathname={pathname}
              search={search}
              badgeCount={badgeCount}
              onClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Componente Principal AppShell ──────────────────────────────────────────
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

  // ── Modelo de negócio & ativação da Vitrine Online ─────────────────────────
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

  // ── Árvore de Navegação Unificada ─────────────────────────────────────────
  const navGroups = useMemo(() => getNavGroups(vitrineAtiva), [vitrineAtiva]);

  // ── Estado de Expansão dos Acordeons (Auto-expand ativo) ───────────────────
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    navGroups.forEach((g) => {
      if (g.children && isGroupActive(g, pathname, search)) {
        setExpandedGroups((prev) => (prev[g.id] ? prev : { ...prev, [g.id]: true }));
      }
    });
  }, [pathname, search, navGroups]);

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

  // ── Abas Principais da Barra Inferior Mobile ──────────────────────────────
  const mobilePrimary = [
    { to: "/painel", label: "Início", icon: LayoutDashboard, isMatch: (p: string) => p === "/painel" },
    { to: "/caixa", label: "Caixa", icon: Wallet, isMatch: (p: string) => p === "/caixa" },
    {
      to: "/estoque",
      label: "Estoque",
      icon: Boxes,
      isMatch: (p: string) =>
        p.startsWith("/estoque") || p.startsWith("/precificacao") || p.startsWith("/fornecedores"),
    },
    {
      to: "/clientes",
      label: "Clientes",
      icon: Users,
      isMatch: (p: string) => p.startsWith("/clientes") || p.startsWith("/fiado"),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sidebar Desktop (Shopify-Level) ─────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        {isConfiguracoes ? (
          <div className="flex flex-1 flex-col overflow-y-auto pr-1 scrollbar-none">
            {/* Botão de retorno ao Admin (Shopify style) */}
            <Link
              to="/painel"
              className="group flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-all cursor-pointer mb-2"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Voltar ao Início</span>
            </Link>

            {/* Card de Identificação da Loja (Shopify Style) */}
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-sidebar-border/80 bg-card p-3 shadow-2xs">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs shrink-0">
                {storeName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{storeName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{ownerName}</p>
              </div>
            </div>

            <div className="px-2.5 pb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 font-mono">
                Configurações
              </p>
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
                        active
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                          active
                            ? "bg-white/20 text-white"
                            : "bg-surface-muted text-muted-foreground",
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
          <>
            <Link to="/painel" className="px-2">
              <Logo />
            </Link>

            {/* Navegação Hierárquica Multinível (Padrão Shopify Oficial) */}
            <nav className="mt-5 flex flex-1 flex-col gap-1 overflow-y-auto pr-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {navGroups.map((group) => (
                <div key={group.id} className="flex flex-col">
                  {group.section && (
                    <div className="px-2.5 pt-4 pb-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 font-mono">
                        {group.section}
                      </p>
                    </div>
                  )}
                  <NavGroupRow
                    group={group}
                    pathname={pathname}
                    search={search}
                    isExpanded={Boolean(expandedGroups[group.id])}
                    onToggle={() =>
                      setExpandedGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                    }
                    onNavigate={() =>
                      setExpandedGroups((prev) => ({ ...prev, [group.id]: true }))
                    }
                    badgeCount={pendingOrderCount}
                    storeSlug={store?.slug}
                  />
                </div>
              ))}
            </nav>
          </>
        )}

        {/* ── Rodapé Fixo da Sidebar (Configurações & Perfil da Boutique) ──── */}
        <div className="mt-auto pt-3 border-t border-sidebar-border/70 flex flex-col gap-2">
          {!isConfiguracoes && (
            <Link
              to="/configuracoes"
              search={{ tab: "geral" }}
              className={cn(
                "group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all duration-150 cursor-pointer",
                isConfiguracoes
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="size-4 shrink-0 transition-transform group-hover:rotate-45" />
                <span>Configurações</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/60 uppercase group-hover:text-foreground/80">
                Ajustes
              </span>
            </Link>
          )}

          {/* Banner de Trial */}
          {trialStatus === "active" && daysLeftInTrial !== null && (
            <div
              className={cn(
                "rounded-2xl px-3.5 py-2.5 text-xs transition-all",
                isTrialUrgent
                  ? "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border border-primary/20 bg-primary/5 text-primary",
              )}
            >
              <p className="font-semibold text-[11.5px]">
                {isTrialUrgent ? "⚠ " : "✨ "}
                {daysLeftInTrial} {daysLeftInTrial === 1 ? "dia restante" : "dias de avaliação"}
              </p>
              <p className="mt-0.5 text-[10.5px] opacity-80">
                {isTrialUrgent
                  ? "Assine agora para não perder o acesso"
                  : "Período gratuito ativo — explore à vontade"}
              </p>
            </div>
          )}

          {/* Card de Identificação da Loja (Base da Sidebar) */}
          <div className="rounded-2xl border border-sidebar-border/80 bg-card p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              {isProfileLoading ? (
                <div className="flex-1 space-y-1.5 min-w-0 pr-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ) : (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs shrink-0">
                    {storeName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{storeName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{ownerName}</p>
                  </div>
                </div>
              )}
              {isProfileLoading ? (
                <Skeleton className="h-4 w-12 rounded-full" />
              ) : (
                <span className="ml-2 shrink-0 rounded-full border border-primary/20 bg-primary-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-foreground">
                  {planLabel}
                </span>
              )}
            </div>
            <button
              onClick={() => void signOut()}
              className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            >
              <LogOut className="size-3" /> Sair da conta
            </button>
          </div>
        </div>
      </aside>

      {/* ── Topbar Mobile ─────────────────────────────────────────────────── */}
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

      {/* ── Mobile Overlay Menu Completo ──────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-background/95 px-4 py-4 backdrop-blur-xl lg:hidden overflow-y-auto">
          <nav className="flex flex-col gap-1 pb-20">
            {navGroups.map((group) => (
              <div key={group.id} className="flex flex-col">
                {group.section && (
                  <div className="px-2.5 pt-4 pb-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 font-mono">
                      {group.section}
                    </p>
                  </div>
                )}
                <NavGroupRow
                  group={group}
                  pathname={pathname}
                  search={search}
                  isExpanded={Boolean(expandedGroups[group.id])}
                  onToggle={() =>
                    setExpandedGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                  }
                  onNavigate={() =>
                    setExpandedGroups((prev) => ({ ...prev, [group.id]: true }))
                  }
                  badgeCount={pendingOrderCount}
                  storeSlug={store?.slug}
                  onItemClick={() => setMobileMenuOpen(false)}
                />
              </div>
            ))}

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

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="pb-24 lg:pb-5 lg:pl-[268px]">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-8 sm:py-5 lg:pb-4">{children}</div>
      </main>

      {/* ── Bottom Tab Bar (Mobile) ────────────────────────────────────────── */}
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

      {/* ── Sheet "Mais" (Mobile Completo) ─────────────────────────────────── */}
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
            {navGroups.map((group) => (
              <div key={group.id} className="flex flex-col">
                {group.section && (
                  <div className="px-2.5 pt-4 pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 font-mono">
                      {group.section}
                    </p>
                  </div>
                )}
                <NavGroupRow
                  group={group}
                  pathname={pathname}
                  search={search}
                  isExpanded={Boolean(expandedGroups[group.id])}
                  onToggle={() =>
                    setExpandedGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                  }
                  onNavigate={() =>
                    setExpandedGroups((prev) => ({ ...prev, [group.id]: true }))
                  }
                  badgeCount={pendingOrderCount}
                  storeSlug={store?.slug}
                  onItemClick={() => setMoreSheetOpen(false)}
                />
              </div>
            ))}

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
