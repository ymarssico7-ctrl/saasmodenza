import { useState, useMemo, useEffect, useRef, memo } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgePercent,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Eye,
  Globe,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
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
import { GlobalSearchDialog } from "@/components/global-search-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery, membersQuery, goalsQuery, transactionsQuery } from "@/lib/db";
import { useStore } from "@/lib/store-context";
import { useAccess } from "@/lib/useAccess";
import { isVitrineAtiva } from "@/lib/vitrine-settings";
import { cn } from "@/lib/utils";
import { brlCompact, monthStart } from "@/lib/format";
import { REFUND_CATEGORIES, sumBy, sumByCategories, type Transaction } from "@/lib/finance";

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

// ─── Árvore de Navegação — Padrão Shopify Adaptado com Distribuição Inteligente ───
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

    // ── Macro-grupos Principais (Elegantes e Concisos) ───────────────────────
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
        p.startsWith("/loja/compartilhar"),
      children: [
        {
          to: "/loja/cupons",
          label: "Cupons & Descontos",
          isMatch: (p) => p.startsWith("/loja/cupons"),
        },
        {
          to: "/loja/compartilhar",
          label: "Divulgação & Redes",
          isMatch: (p) => p.startsWith("/loja/compartilhar"),
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
        p.startsWith("/metas") ||
        p.startsWith("/prolabore") ||
        p.startsWith("/loja/recebimentos"),
      children: [
        {
          to: "/metas",
          label: "Metas & Vendas",
          isMatch: (p) => p.startsWith("/metas"),
        },
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

// ─── Widget de Produtividade da Boutique (Preenchimento Inteligente de UX) ───
const SidebarGoalCard = memo(function SidebarGoalCard() {
  const { data: goals = [] } = useQuery(goalsQuery());
  const { data: all = [] } = useQuery(transactionsQuery());
  const txs = all as unknown as Transaction[];
  const month = monthStart(0);
  const mPrefix = month.slice(0, 7);

  const { goalAmount, revenue, progress } = useMemo(() => {
    const currentGoal = goals.find((g) => g.month?.slice(0, 7) === mPrefix);
    const amount = Number(currentGoal?.target_amount ?? 0);

    const monthTransactions = txs.filter((t) => t.occurred_on?.slice(0, 7) === mPrefix);
    const grossSales = sumBy(monthTransactions, "entrada");
    const refunds = sumByCategories(monthTransactions, "saida", REFUND_CATEGORIES);
    const rev = Math.max(grossSales - refunds, 0);

    const prog = amount > 0 ? Math.min((rev / amount) * 100, 100) : 0;
    return { goalAmount: amount, revenue: rev, progress: prog };
  }, [goals, txs, mPrefix]);

  return (
    <Link
      to="/metas"
      className="mx-1 my-2 block rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/25 hover:bg-sidebar-accent/50 p-3 transition-colors duration-100 ease-out group cursor-pointer"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Target className="size-3.5 text-primary shrink-0" />
          <span className="text-[11px] font-bold text-foreground">Meta do Mês</span>
        </div>
        <span className="text-[10px] font-semibold text-primary group-hover:underline">
          {goalAmount > 0 ? `${Math.round(progress)}%` : "Definir →"}
        </span>
      </div>

      {goalAmount > 0 ? (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5 bg-sidebar-border" />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
            <span>{brlCompact(revenue)}</span>
            <span>{brlCompact(goalAmount)}</span>
          </div>
        </div>
      ) : (
        <p className="text-[10.5px] text-muted-foreground line-clamp-2 leading-relaxed">
          Defina sua meta para acompanhar o faturamento deste mês.
        </p>
      )}
    </Link>
  );
});

// ─── Linha de Grupo e Sub-itens (Padrão Shopify — Toggle Interativo Sem Travar) ──
const NavGroupRow = memo(function NavGroupRow({
  item,
  pathname,
  search,
  badgeCount,
  storeSlug,
  isOpen,
  isCollapsed = false,
  onToggle,
  onItemClick,
}: {
  item: NavGroupItem;
  pathname: string;
  search: Record<string, unknown>;
  badgeCount?: number;
  storeSlug?: string | null;
  isOpen: boolean;
  isCollapsed?: boolean;
  onToggle: (item: NavGroupItem, e: React.MouseEvent) => void;
  onItemClick?: () => void;
}) {
  const isCurrentGroupRoute = item.isMatch(pathname, search);
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const rowRef = useRef<HTMLDivElement>(null);

  // Auto-scroll fluido, contínuo e sincronizado quadro a quadro (Padrão Apple/Shopify — 0ms Delay, imune ao clamp)
  useEffect(() => {
    if (!isOpen || isCollapsed || !hasChildren || !rowRef.current) return;

    const scrollContainer =
      (rowRef.current.closest("nav") as HTMLElement | null) ||
      (rowRef.current.closest(".overflow-y-auto") as HTMLElement | null);
    if (!scrollContainer) return;

    const rowEl = rowRef.current;
    const startTime = performance.now();
    const duration = 260; // ms — acompanha perfeitamente os 200ms da animação CSS do accordion
    let animId: number;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const rowRect = rowEl.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetBottomLimit = containerRect.bottom - 12; // 12px de respiro do rodapé

      // Conforme o CSS expande os filhos, ajusta o scroll imediatamente para mantê-los visíveis
      if (rowRect.bottom > targetBottomLimit) {
        const overflow = rowRect.bottom - targetBottomLimit;
        scrollContainer.scrollTop += overflow;
      }

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, isCollapsed, hasChildren]);

  if (isCollapsed) {
    if (hasChildren) {
      return (
        <div className="flex flex-col items-center py-0.5">
          <HoverCard openDelay={80} closeDelay={150}>
            <HoverCardTrigger asChild>
              <Link
                to={item.to as any}
                search={item.search as any}
                preload="intent"
                onClick={onItemClick}
                className={cn(
                  "group relative flex size-9 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer select-none active:scale-95 outline-none",
                  isCurrentGroupRoute
                    ? "bg-white/12 text-white shadow-2xs"
                    : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground/90",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4.5 shrink-0 transition-opacity duration-150",
                    isCurrentGroupRoute ? "opacity-100 text-white" : "opacity-55 group-hover:opacity-100",
                  )}
                />
                {item.badgeKey === "pedidos" && badgeCount !== undefined && badgeCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </Link>
            </HoverCardTrigger>

            <HoverCardContent
              side="right"
              align="start"
              sideOffset={12}
              className="z-50 w-52 p-1.5 bg-[#18181B] border border-white/10 shadow-2xl rounded-xl text-sidebar-foreground select-none"
            >
              {/* Cabeçalho do Grupo (Link direto) */}
              <Link
                to={item.to as any}
                search={item.search as any}
                preload="intent"
                onClick={onItemClick}
                className="flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-white/95 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <span>{item.label}</span>
                {item.badgeKey === "pedidos" && badgeCount !== undefined && badgeCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-2xs">
                    {badgeCount}
                  </span>
                )}
              </Link>

              <div className="my-1 h-px bg-white/8" />

              {/* Lista de Sub-itens Interativos */}
              <div className="flex flex-col gap-0.5">
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
                        "flex items-center justify-between px-2.5 py-1.5 text-[12.5px] rounded-lg transition-colors cursor-pointer select-none",
                        isChildActive
                          ? "bg-white/15 text-white font-medium"
                          : "text-sidebar-foreground/70 hover:text-white hover:bg-white/10 font-normal",
                      )}
                    >
                      <span className="truncate">{child.label}</span>
                    </Link>
                  );
                })}
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      );
    }

    // Se NÃO tiver filhos (como Início, Caixa & PDV, Pedidos, Metas & Vendas):
    return (
      <div className="flex flex-col items-center py-0.5">
        <HoverCard openDelay={80} closeDelay={100}>
          <HoverCardTrigger asChild>
            <Link
              to={item.to as any}
              search={item.search as any}
              preload="intent"
              onClick={onItemClick}
              className={cn(
                "group relative flex size-9 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer select-none active:scale-95 outline-none",
                isCurrentGroupRoute
                  ? "bg-white/12 text-white shadow-2xs"
                  : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground/90",
              )}
            >
              <item.icon
                className={cn(
                  "size-4.5 shrink-0 transition-opacity duration-150",
                  isCurrentGroupRoute ? "opacity-100 text-white" : "opacity-55 group-hover:opacity-100",
                )}
              />
              {item.badgeKey === "pedidos" && badgeCount !== undefined && badgeCount > 0 && (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </Link>
          </HoverCardTrigger>
          <HoverCardContent
            side="right"
            align="center"
            sideOffset={12}
            className="z-50 w-auto px-2.5 py-1 text-xs font-medium bg-[#18181B] border border-white/10 shadow-xl rounded-lg text-white whitespace-nowrap select-none"
          >
            {item.label}
          </HoverCardContent>
        </HoverCard>
      </div>
    );
  }

  return (
    <div ref={rowRef} className="flex flex-col scroll-mb-3">
      {/* Item Principal — Active state ultra-sutil (Padrão Shopify/Apple) */}
      <div
        className={cn(
          "group relative flex items-center justify-between rounded-lg px-2.5 py-2.5 text-[13px] transition-colors duration-150 ease-out select-none active:scale-[0.985]",
          isCurrentGroupRoute
            ? "bg-sidebar-accent text-sidebar-foreground font-medium"
            : "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground/90 font-normal",
        )}
      >
        <Link
          to={item.to as any}
          search={item.search as any}
          preload="intent"
          onClick={(e) => onToggle(item, e)}
          className="flex flex-1 items-center gap-2.5 min-w-0 cursor-pointer"
        >
          <item.icon
            className={cn(
              "size-4 shrink-0 transition-opacity duration-150 text-sidebar-foreground",
              isCurrentGroupRoute
                ? "opacity-100"
                : "opacity-45 group-hover:opacity-70",
            )}
          />
          <span className="truncate">{item.label}</span>

          {item.badgeKey === "pedidos" && badgeCount !== undefined && badgeCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-2xs animate-pulse">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </Link>

        {/* Micro-Chevron giratório (Padrão Apple/Stripe) */}
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => onToggle(item, e)}
            className="p-1 rounded-md text-sidebar-foreground/30 hover:text-sidebar-foreground/70 group-hover:text-sidebar-foreground/50 transition-colors cursor-pointer"
            aria-label={isOpen ? "Recolher opções" : "Expandir opções"}
          >
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] text-sidebar-foreground",
                isOpen ? "rotate-180 opacity-70" : "opacity-30 group-hover:opacity-55",
              )}
            />
          </button>
        )}

        {/* Botão de preview da vitrine */}
        {item.externalPreview && storeSlug && (
          <a
            href={`https://${storeSlug}.vestui.com.br`}
            target="_blank"
            rel="noreferrer"
            title="Abrir Vitrine Online"
            className="p-1 rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-white/8 transition-colors duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="size-3.5" />
          </a>
        )}
      </div>

      {/* Sub-itens com física líquida contínua (CSS Grid 0fr → 1fr) */}
      {hasChildren && (
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
            isOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none",
          )}
        >
          <div className="overflow-hidden">
            <div className="my-0.5 flex flex-col gap-0.5 py-0.5">
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
                      "group relative flex items-center justify-between rounded-md pl-9 pr-2.5 py-2 text-[12.5px] transition-colors duration-100 ease-out active:scale-[0.99] cursor-pointer select-none",
                      isChildActive
                        ? "font-medium text-sidebar-foreground bg-sidebar-accent"
                        : "text-sidebar-foreground/50 hover:text-sidebar-foreground/85 hover:bg-sidebar-accent font-normal",
                    )}
                  >
                    <span className="truncate">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Componente Principal AppShell ───────────────────────────────────────────
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // ── Atalho Global de Pesquisa (⌘K / Ctrl+K — Padrão Shopify / Apple) ─────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
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

  // ── Modelo de Accordion Estrito (Apenas 1 grupo aberto por vez) ───────────
  const currentRouteGroupId = useMemo(() => {
    const match = navItems.find(
      (item) => item.children && item.children.length > 0 && item.isMatch(pathname, search),
    );
    return match ? match.id : null;
  }, [navItems, pathname, search]);

  const [activeGroupId, setActiveGroupId] = useState<string | null>(currentRouteGroupId);

  // Sincroniza abertura/fechamento automático ao navegar entre rotas
  useEffect(() => {
    // Se navegou para uma rota de grupo, abre esse grupo.
    // Se navegou para Início, Caixa, Pedidos ou Metas, fecha qualquer grupo aberto (economiza 100% de espaço)!
    setActiveGroupId(currentRouteGroupId);
  }, [pathname, currentRouteGroupId]);

  const handleToggle = (item: NavGroupItem, e: React.MouseEvent, onItemClick?: () => void) => {
    // Se for item sem filhos (Início, Caixa & PDV, Pedidos, Metas & Vendas):
    if (!item.children || item.children.length === 0) {
      // Fecha qualquer grupo aberto para economizar espaço!
      setActiveGroupId(null);
      onItemClick?.();
      return;
    }

    const isCurrentlyOpen = activeGroupId === item.id;
    const isCurrentRoute = item.isMatch(pathname, search);

    if (isCurrentlyOpen) {
      // Já está aberto -> clica para fechar!
      e.preventDefault();
      setActiveGroupId(null);
    } else {
      // Está fechado -> abre este grupo e FECHA AUTOMATICAMENTE TODOS OS OUTROS!
      setActiveGroupId(item.id);
      if (isCurrentRoute) {
        // Já está na rota do grupo, apenas expande sem recarregar
        e.preventDefault();
      } else {
        // Navega para a página padrão do grupo
        onItemClick?.();
      }
    }
  };

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

  // ── Controle de Sidebar Recolhível (Padrão Shopify Imagens 4 e 5) ───────────
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("vestui_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("vestui_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // ── Renderizador de Lista de Navegação ─────────────────────────────────────
  function renderNavItems(onItemClick?: () => void, collapsed = false) {
    return navItems.map((item) => (
      <div key={item.id} className="flex flex-col">
        {item.section && (
          collapsed ? (
            <div className="my-2 h-px w-6 bg-white/10 mx-auto" />
          ) : (
            <div className="px-2.5 pt-3.5 pb-1 select-none">
              <span className="text-[11px] font-medium text-sidebar-foreground/35 uppercase tracking-wider">
                {item.section}
              </span>
            </div>
          )
        )}
        <NavGroupRow
          item={item}
          pathname={pathname}
          search={search}
          badgeCount={pendingOrderCount}
          storeSlug={store?.slug}
          isOpen={activeGroupId === item.id}
          isCollapsed={collapsed}
          onToggle={(group, e) => {
            handleToggle(group, e, onItemClick);
          }}
          onItemClick={onItemClick}
        />
      </div>
    ));
  }

  return (
    <div className="min-h-screen bg-background lg:bg-sidebar lg:h-screen lg:overflow-hidden flex flex-col">
      {/* ── Sidebar Desktop (Padrão Shopify Oficial) ─────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-sidebar text-sidebar-foreground py-3 transition-[width,padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:flex shrink-0 select-none",
          isCollapsed ? "w-[64px] px-2" : "w-[260px] px-3.5",
        )}
      >
        {isConfiguracoes ? (
          /* ── Modo Configurações (Coluna vertical dedicada) ───────────────── */
          isCollapsed ? (
            <div className="flex flex-1 flex-col items-center overflow-y-auto scrollbar-none min-h-0 py-1">
              <button
                type="button"
                onClick={toggleCollapse}
                title="Expandir navegação"
                className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/10 transition-colors cursor-pointer mb-2"
                aria-label="Expandir navegação"
              >
                <PanelLeftOpen className="size-4" />
              </button>

              <Link
                to="/painel"
                title="Voltar ao Início"
                className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer mb-2"
              >
                <ArrowLeft className="size-4" />
              </Link>

              <div className="my-2 h-px w-6 bg-white/10 mx-auto" />

              <nav className="flex flex-col gap-1.5 items-center">
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
                      title={item.label}
                      className={cn(
                        "relative flex size-9 items-center justify-center rounded-lg transition-colors cursor-pointer",
                        active
                          ? "bg-white/12 text-white"
                          : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-y-auto pr-1 scrollbar-none min-h-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <Link
                  to="/painel"
                  className="group flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-normal text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground/90 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5 opacity-60 group-hover:opacity-90" />
                  <span>Voltar ao Início</span>
                </Link>
                <button
                  type="button"
                  onClick={toggleCollapse}
                  title="Recolher navegação"
                  className="flex size-7 items-center justify-center rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-white/8 transition-colors cursor-pointer"
                  aria-label="Recolher navegação"
                >
                  <PanelLeftClose className="size-3.5" />
                </button>
              </div>

              {/* Card de identidade da loja */}
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 shrink-0">
                <div className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-sidebar-foreground font-bold text-xs shrink-0">
                  {storeName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">{storeName}</p>
                  <p className="text-[11px] text-sidebar-foreground/45 truncate">{ownerName}</p>
                </div>
              </div>

              <div className="px-2.5 pb-1.5 shrink-0">
                <p className="text-[11px] font-medium text-sidebar-foreground/35 uppercase tracking-wider">Configurações</p>
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
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-normal transition-colors duration-150 cursor-pointer",
                        active
                          ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                          : "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground/90",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-4 shrink-0 transition-opacity text-sidebar-foreground",
                          active ? "opacity-100" : "opacity-45 group-hover:opacity-70",
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                            active ? "bg-white/15 text-sidebar-foreground" : "bg-white/8 text-sidebar-foreground/60",
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
          )
        ) : (
          /* ── Modo Painel Principal — Padrão Shopify ──────────────────────── */
          isCollapsed ? (
            <div className="flex flex-col flex-1 min-h-0 items-center">
              {/* Topo em modo recolhido: Botão expandir + Logo compact */}
              <div className="flex flex-col items-center gap-2 pt-1 pb-3 shrink-0">
                <button
                  type="button"
                  onClick={toggleCollapse}
                  title="Expandir navegação"
                  className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/10 transition-colors cursor-pointer group"
                  aria-label="Expandir navegação"
                >
                  <PanelLeftOpen className="size-4.5 transition-transform group-hover:scale-105" />
                </button>
                <Link to="/painel" title="Início — Vestui" className="flex items-center justify-center mt-1">
                  <Logo compact />
                </Link>
              </div>

              {/* Botão de Pesquisa compacto */}
              <div className="flex justify-center pb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  title="Pesquisar (Ctrl+K)"
                  className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-white/8 transition-colors cursor-pointer"
                >
                  <Search className="size-4" />
                </button>
              </div>

              {/* Navegação de ícones compacta */}
              <nav className="flex flex-col gap-1 overflow-y-auto min-h-0 w-full items-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {renderNavItems(undefined, true)}
              </nav>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Header com Logo e Botão de Recolher */}
              <div className="flex items-center justify-between px-1 pt-1 pb-3 shrink-0">
                <Link to="/painel">
                  <Logo textClassName="text-sidebar-foreground" />
                </Link>
                <button
                  type="button"
                  onClick={toggleCollapse}
                  title="Recolher navegação"
                  className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-white/8 transition-colors cursor-pointer"
                  aria-label="Recolher navegação"
                >
                  <PanelLeftClose className="size-4" />
                </button>
              </div>

              {/* Barra de Pesquisa elegante (Padrão Minimalista) */}
              <div className="px-1 pb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="flex w-full items-center gap-2 rounded-lg bg-white/6 px-2.5 py-1.5 text-xs text-sidebar-foreground/45 hover:bg-white/10 hover:text-sidebar-foreground/80 transition-colors cursor-pointer text-left group"
                >
                  <Search className="size-3.5 opacity-60 shrink-0 group-hover:opacity-90 transition-opacity" />
                  <span className="flex-1">Pesquisar...</span>
                </button>
              </div>

              {/* Navegação Limpa e Organizada */}
              <nav className="flex flex-col gap-1 overflow-y-auto min-h-0 pr-1 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {renderNavItems(undefined, false)}
              </nav>
            </div>
          )
        )}

        {/* ── Rodapé Fixo da Sidebar (Configurações + Perfil da Loja) ──────────── */}
        <div className="mt-auto pt-3 border-t border-white/10 flex flex-col gap-1.5 shrink-0">
          {!isConfiguracoes && (
            isCollapsed ? (
              <Link
                to="/configuracoes"
                search={{ tab: "geral" }}
                title="Configurações"
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg mx-auto transition-colors cursor-pointer",
                  isConfiguracoes
                    ? "bg-white/12 text-white"
                    : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Settings className="size-4 shrink-0 transition-transform hover:rotate-45 text-sidebar-foreground" />
              </Link>
            ) : (
              <Link
                to="/configuracoes"
                search={{ tab: "geral" }}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-normal transition-colors duration-150 cursor-pointer",
                  isConfiguracoes
                    ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                    : "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground/90",
                )}
              >
                <Settings className="size-4 shrink-0 opacity-50 group-hover:opacity-80 transition-all duration-150 group-hover:rotate-45 text-sidebar-foreground" />
                <span>Configurações</span>
              </Link>
            )
          )}

          {/* Banner de Trial */}
          {trialStatus === "active" && daysLeftInTrial !== null && (
            isCollapsed ? (
              <div
                title={`${daysLeftInTrial} dias de avaliação`}
                className="size-2 rounded-full bg-amber-400 mx-auto my-1 animate-pulse"
              />
            ) : (
              <div
                className={cn(
                  "my-1 rounded-lg px-3 py-2 text-xs transition-all",
                  isTrialUrgent
                    ? "border border-amber-400/25 bg-amber-400/10 text-amber-200"
                    : "border border-white/10 bg-white/5 text-sidebar-foreground/70",
                )}
              >
                <p className="font-medium text-[11px]">
                  {isTrialUrgent ? "⚠ " : "✨ "}
                  {daysLeftInTrial} {daysLeftInTrial === 1 ? "dia restante" : "dias de avaliação"}
                </p>
                <p className="text-[10px] opacity-70">
                  {isTrialUrgent ? "Assine para manter o acesso" : "Período gratuito ativo"}
                </p>
              </div>
            )
          )}

          {/* Perfil da Boutique com Dropdown (Padrão Shopify) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isCollapsed ? (
                <button
                  type="button"
                  title={storeName}
                  className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-sidebar-foreground font-bold text-xs mx-auto hover:bg-white/20 transition-colors cursor-pointer outline-none"
                >
                  {storeName.slice(0, 2).toUpperCase()}
                </button>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 hover:bg-sidebar-accent transition-colors cursor-pointer group text-left outline-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isProfileLoading ? (
                      <Skeleton className="size-7 rounded-lg" />
                    ) : (
                      <div className="flex size-7 items-center justify-center rounded-lg bg-white/10 text-sidebar-foreground font-bold text-[11px] shrink-0">
                        {storeName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate text-xs font-medium text-sidebar-foreground/80 group-hover:text-sidebar-foreground transition-colors">{storeName}</span>
                  </div>
                  <Bell className="size-3.5 text-sidebar-foreground/35 group-hover:text-sidebar-foreground/70 transition-colors shrink-0" />
                </button>
              )}
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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Pesquisar"
          >
            <Search className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </header>

      {/* ── Mobile Overlay Menu ────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-sidebar px-4 py-4 lg:hidden overflow-y-auto">
          <nav className="flex flex-col gap-1 pb-20">
            {renderNavItems(() => setMobileMenuOpen(false))}

            <div className="mt-4 border-t border-white/10 pt-3">
              <Link
                to="/configuracoes"
                search={{ tab: "geral" }}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-normal text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground/90"
              >
                <Settings className="size-4 shrink-0 opacity-50" />
                <span>Configurações</span>
              </Link>
            </div>

            <button
              onClick={() => void signOut()}
              className="mt-4 flex items-center gap-2 px-2.5 text-xs font-normal text-sidebar-foreground/40 hover:text-sidebar-foreground/75 cursor-pointer"
            >
              <LogOut className="size-3.5" /> Sair da conta
            </button>
          </nav>
        </div>
      )}

      {/* ── Main Content (Floating Panel Effect — Padrão Shopify Imagem 1, 3 e 4) ─ */}
      <main
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-[padding-left] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pb-24 lg:pb-0 lg:h-screen lg:overflow-hidden lg:py-2.5 lg:pr-2.5 lg:pl-0",
          isCollapsed ? "lg:pl-[64px]" : "lg:pl-[260px]",
        )}
      >
        {/* Painel Flutuante Branco com borda sutil e cantos arredondados */}
        <div className="flex-1 h-full bg-background rounded-none lg:rounded-2xl border-none lg:border lg:border-white/10 shadow-none lg:shadow-2xs overflow-y-auto min-w-0 scrollbar-thin">
          <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-8 sm:py-5 lg:pb-8">
            {children}
          </div>
        </div>
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

            <div className="mt-2">
              <SidebarGoalCard />
            </div>

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

      {/* Modal Spotlight / Motor de Busca Global (Padrão Shopify / Apple) */}
      <GlobalSearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  );
}
