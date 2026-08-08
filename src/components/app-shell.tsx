import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Boxes,
  Calculator,
  BadgePercent,
  HandCoins,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Package,
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
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/db";
import { useAccess } from "@/lib/useAccess";
import { cn } from "@/lib/utils";

// ─── Navigation config ─────────────────────────────────────────────────────────

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const GESTAO_NAV: NavItem[] = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/caixa", label: "Caixa", icon: Wallet },
  { to: "/precificacao", label: "Precificação", icon: Calculator },
  { to: "/prolabore", label: "Pró-labore", icon: HandCoins },
  { to: "/fiado", label: "Fiado", icon: Users },
  { to: "/relatorio", label: "Relatório", icon: BarChart3 },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

const LOJA_NAV: NavItem[] = [
  { to: "/loja", label: "Visão geral", icon: LayoutDashboard },
  { to: "/loja/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/loja/produtos", label: "Vitrine", icon: Package },
  { to: "/loja/clientes", label: "Clientes", icon: Users },
  { to: "/loja/cupons", label: "Cupons", icon: BadgePercent },
  { to: "/loja/frete", label: "Frete & Entrega", icon: Truck },
  { to: "/loja/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/loja/configuracao", label: "Aparência", icon: Settings },
  { to: "/loja/compartilhar", label: "Compartilhar", icon: Share2 },
  { to: "/loja/integracoes", label: "Integrações", icon: Plug },
];

const GESTAO_MOBILE: NavItem[] = [GESTAO_NAV[0]!, GESTAO_NAV[1]!, GESTAO_NAV[4]!, GESTAO_NAV[5]!, GESTAO_NAV[9]!];
const LOJA_MOBILE: NavItem[] = [LOJA_NAV[0]!, LOJA_NAV[1]!, LOJA_NAV[2]!, LOJA_NAV[6]!, LOJA_NAV[7]!];

// ─── Mode Switcher ────────────────────────────────────────────────────────────

function ModeSwitcher({
  mode,
  onChange,
  lojaLocked,
}: {
  mode: "gestao" | "loja";
  onChange: (m: "gestao" | "loja") => void;
  lojaLocked?: boolean;
}) {
  return (
    <div className="relative mx-1 flex items-center rounded-2xl bg-surface-muted p-1">
      {/* Sliding indicator */}
      <div
        className={cn(
          "absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-xl bg-primary shadow-soft transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          mode === "gestao" ? "left-1" : "left-[calc(50%+3px)]",
        )}
      />
      <button
        onClick={() => onChange("gestao")}
        className={cn(
          "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-colors duration-200",
          mode === "gestao" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutDashboard className="size-3.5" />
        <span className="hidden sm:inline">Gestão</span>
        <span className="sm:hidden">Gestão</span>
      </button>
      <button
        onClick={() => onChange("loja")}
        className={cn(
          "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-colors duration-200",
          mode === "loja" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {lojaLocked ? <Lock className="size-3.5" /> : <Store className="size-3.5" />}
        <span className="hidden sm:inline">Loja Online</span>
        <span className="sm:hidden">Loja</span>
      </button>
    </div>
  );
}

// ─── Main AppShell ────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: profile } = useQuery(profileQuery());
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasLoja, trialStatus } = useAccess(profile);

  // Derive active mode from pathname
  const isLojaRoute = pathname.startsWith("/loja");
  const [mode, setMode] = useState<"gestao" | "loja">(isLojaRoute ? "loja" : "gestao");

  // Loja bloqueada se não tiver acesso e não for o caso de "não oferecido ainda"
  const lojaLocked = !hasLoja && trialStatus !== "not_offered";

  const activeNav = mode === "gestao" ? GESTAO_NAV : LOJA_NAV;
  const activeMobileNav = mode === "gestao" ? GESTAO_MOBILE : LOJA_MOBILE;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function handleModeChange(m: "gestao" | "loja") {
    setMode(m);
    if (m === "gestao") {
      void navigate({ to: "/painel" });
    } else {
      // Navega para /loja — o guard da rota exibirá a tela correta
      void navigate({ to: "/loja" });
    }
    setOpen(false);
  }

  const storeName = profile?.store_name?.trim() || "Sua loja";
  const ownerName = profile?.owner_name?.trim() || "Bem-vinda";
  const planLabel =
    profile?.plan === "gestao_anual"
      ? "Gestão Anual"
      : profile?.plan === "crescimento"
        ? "Crescimento"
        : profile?.plan === "digital"
          ? "Digital"
          : "Lojista";

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Sidebar desktop ─────────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        {/* Logo */}
        <Link to="/painel" className="px-2">
          <Logo />
        </Link>

        {/* Mode Switcher */}
        <div className="mt-7">
          <ModeSwitcher mode={mode} onChange={handleModeChange} lojaLocked={lojaLocked} />
        </div>

        {/* Nav links */}
        <nav className="mt-5 flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {activeNav.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              active={
                item.to === "/loja"
                  ? pathname === "/loja"
                  : pathname.startsWith(item.to) && item.to !== "/painel"
                    ? true
                    : pathname === item.to
              }
            />
          ))}
        </nav>

        {/* Profile card */}
        <div className="mt-6 rounded-2xl bg-surface-muted p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{storeName}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{ownerName}</p>
            </div>
            <span className="ml-2 shrink-0 rounded-full border border-primary/20 bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
              {planLabel}
            </span>
          </div>
          <button
            onClick={() => void signOut()}
            className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Sair da conta
          </button>
        </div>
      </aside>

      {/* ─── Topbar mobile ───────────────────────────────────────────────────── */}
      <header className="glass sticky top-0 z-40 flex h-16 items-center justify-between px-4 lg:hidden">
        <Link to="/painel">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <ModeSwitcher mode={mode} onChange={handleModeChange} lojaLocked={lojaLocked} />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile overlay menu */}
      {open ? (
        <div className="fixed inset-0 top-16 z-30 bg-background/95 px-4 py-6 backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col gap-0.5">
            {activeNav.map((item) => (
              <NavItem
                key={item.to}
                {...item}
                active={pathname === item.to}
                onClick={() => setOpen(false)}
              />
            ))}
          </nav>
          <button
            onClick={() => void signOut()}
            className="mt-6 flex items-center gap-2 px-4 text-sm font-medium text-muted-foreground"
          >
            <LogOut className="size-4" /> Sair da conta
          </button>
        </div>
      ) : null}

      {/* ─── Main content ────────────────────────────────────────────────────── */}
      <main className="pb-28 lg:pb-16 lg:pl-[268px]">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">{children}</div>
      </main>

      {/* ─── Tab bar mobile ──────────────────────────────────────────────────── */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-center justify-around px-2 lg:hidden">
        {activeMobileNav.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex w-16 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {label}
    </Link>
  );
}
