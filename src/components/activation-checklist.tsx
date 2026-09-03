import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  ShoppingBag,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ActivationChecklistProps {
  storeId?: string | null;
  storeName?: string | null;
  storeSlug?: string | null;
  hasInventory: boolean;
  inventoryCount: number;
  hasSales: boolean;
  salesCount: number;
  hasGoal: boolean;
  hasStorefront: boolean;
}

export function ActivationChecklist({
  storeId,
  storeName,
  storeSlug,
  hasInventory,
  inventoryCount,
  hasSales,
  salesCount,
  hasGoal,
  hasStorefront,
}: ActivationChecklistProps) {
  const sid = storeId || "default";
  const storageKey = `modaly_activation_dismissed_${sid}`;
  const collapseKey = `modaly_activation_collapsed_${sid}`;

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "true";
  });

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(collapseKey) === "true";
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(storageKey, "true");
  };

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(collapseKey, String(next));
      return next;
    });
  };

  const steps = [
    {
      id: "inventory",
      title: "Cadastrar a primeira peça",
      description: "Defina preço de custo, preço de venda e grade (ou Tamanho Único).",
      isDone: hasInventory,
      badgeText: hasInventory ? `${inventoryCount} peça${inventoryCount !== 1 ? "s" : ""}` : undefined,
      to: "/estoque",
      cta: "Adicionar peça",
      icon: <Boxes className="size-4" />,
    },
    {
      id: "sales",
      title: "Registrar a primeira venda no caixa",
      description: "Experimente a baixa automática de estoque e o cálculo instantâneo de margem.",
      isDone: hasSales,
      badgeText: hasSales ? `${salesCount} venda${salesCount !== 1 ? "s" : ""}` : undefined,
      to: "/caixa",
      cta: "Ir para o caixa",
      icon: <Wallet className="size-4" />,
    },
    {
      id: "goal",
      title: "Definir sua meta do mês",
      description: "Acompanhe o faturamento previsto e o ritmo diário necessário para atingir sua meta.",
      isDone: hasGoal,
      badgeText: hasGoal ? "Meta ativa" : undefined,
      to: "/metas",
      cta: "Definir meta",
      icon: <Target className="size-4" />,
    },
    {
      id: "storefront",
      title: "Conhecer sua vitrine online",
      description: "Sua loja pronta na internet para receber pedidos pelo Instagram e WhatsApp.",
      isDone: hasStorefront,
      badgeText: storeSlug ? `@${storeSlug}` : undefined,
      to: storeSlug ? `/vitrine/${storeSlug}` : "/loja",
      cta: "Ver vitrine",
      icon: <ShoppingBag className="size-4" />,
    },
  ];

  const completedCount = steps.filter((s) => s.isDone).length;
  const totalSteps = steps.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const isAllDone = completedCount === totalSteps;

  // Se o usuário dispensou e todos os passos foram concluídos, não exibe nada
  if (dismissed && isAllDone) {
    return null;
  }

  // Se o usuário dispensou temporariamente, exibe uma barra/pílula sutil no topo para reabrir
  if (dismissed) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-card/60 px-4 py-2 text-xs text-muted-foreground shadow-2xs transition-all hover:bg-card">
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-3" />
          </span>
          <span>
            Guia de início da boutique:{" "}
            <strong className="text-foreground">
              {completedCount} de {totalSteps} passos concluídos
            </strong>{" "}
            ({progressPct}%)
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(false);
            localStorage.removeItem(storageKey);
          }}
          className="flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
        >
          Reabrir guia <ChevronDown className="size-3.5" />
        </button>
      </div>
    );
  }

  // Se todos os 4 passos foram concluídos (100%), exibe card comemorativo discreto
  if (isAllDone) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-emerald-50/40 p-5 dark:border-emerald-500/20 dark:bg-emerald-950/20 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Sua boutique está 100% pronta para faturar! 🎉
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Você cadastrou peças, registrou vendas, definiu metas e tem sua vitrine ativa. Parabéns!
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="rounded-full text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Dispensar guia <X className="ml-1.5 size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel relative overflow-hidden rounded-3xl border border-border bg-card/80 p-5 sm:p-6 shadow-sm backdrop-blur-md">
      {/* Cabeçalho do Card */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-3.5" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Guia de Boas-Vindas
            </span>
            <Badge variant="secondary" className="rounded-full text-[10px] font-semibold">
              {progressPct}% concluído
            </Badge>
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Sua boutique pronta para faturar
          </h2>
          <p className="text-xs text-muted-foreground">
            Complete os 4 passos essenciais para dominar o estoque, o caixa e as vendas da sua loja.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleCollapse}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            title={collapsed ? "Expandir guia" : "Recolher guia"}
          >
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            title="Dispensar guia de início"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Barra de Progresso Suave */}
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
          <span>{completedCount} de {totalSteps} passos concluídos</span>
          <span>{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2 rounded-full" />
      </div>

      {/* Grid de Passos (oculta quando recolhido) */}
      {!collapsed && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`group flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                step.isDone
                  ? "border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/10"
                  : "border-border bg-surface-muted/50 hover:border-primary/30 hover:bg-surface-muted"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {step.isDone ? (
                    <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs">
                      <CheckCircle2 className="size-3.5" />
                    </div>
                  ) : (
                    <div className="flex size-5 items-center justify-center rounded-full border border-muted-foreground/40 text-[10px] font-bold text-muted-foreground">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`text-xs font-semibold ${
                        step.isDone ? "text-foreground line-through opacity-80" : "text-foreground"
                      }`}
                    >
                      {step.title}
                    </p>
                    {step.badgeText && (
                      <Badge
                        variant="outline"
                        className={`rounded-full text-[10px] font-medium px-1.5 py-0 ${
                          step.isDone
                            ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                            : ""
                        }`}
                      >
                        {step.badgeText}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 flex justify-end">
                {step.isDone ? (
                  <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Concluído ✓
                  </span>
                ) : (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full text-xs font-medium border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground shadow-2xs"
                  >
                    <Link to={step.to}>
                      {step.cta} <Plus className="ml-1 size-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
