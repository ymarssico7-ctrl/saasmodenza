import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
      stepTag: "Etapa 01",
      title: "Cadastrar a primeira peça",
      description: "Defina preço de custo, preço de venda e grade (ou Tamanho Único).",
      isDone: hasInventory,
      badgeText: hasInventory ? `${inventoryCount} peça${inventoryCount !== 1 ? "s" : ""} no estoque` : undefined,
      to: "/estoque",
      cta: "Cadastrar peça",
      icon: <Boxes className="size-5" />,
      colorClass: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
      accentBorder: "group-hover:border-indigo-500/40",
    },
    {
      id: "sales",
      stepTag: "Etapa 02",
      title: "Registrar a primeira venda no caixa",
      description: "Experimente a baixa automática de estoque e o cálculo instantâneo de margem.",
      isDone: hasSales,
      badgeText: hasSales ? `${salesCount} venda${salesCount !== 1 ? "s" : ""} registrada${salesCount !== 1 ? "s" : ""}` : undefined,
      to: "/caixa",
      cta: "Ir para o caixa",
      icon: <Wallet className="size-5" />,
      colorClass: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      accentBorder: "group-hover:border-emerald-500/40",
    },
    {
      id: "goal",
      stepTag: "Etapa 03",
      title: "Definir sua meta do mês",
      description: "Acompanhe o faturamento previsto e o ritmo diário necessário para atingir sua meta.",
      isDone: hasGoal,
      badgeText: hasGoal ? "Meta do mês ativa" : undefined,
      to: "/metas",
      cta: "Definir meta",
      icon: <Target className="size-5" />,
      colorClass: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
      accentBorder: "group-hover:border-amber-500/40",
    },
    {
      id: "storefront",
      stepTag: "Etapa 04",
      title: "Conhecer sua vitrine online",
      description: "Sua loja pronta na internet para receber pedidos pelo Instagram e WhatsApp.",
      isDone: hasStorefront,
      badgeText: storeSlug ? `@${storeSlug}` : undefined,
      to: storeSlug ? `/vitrine/${storeSlug}` : "/loja",
      cta: "Acessar vitrine",
      icon: <ShoppingBag className="size-5" />,
      colorClass: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
      accentBorder: "group-hover:border-purple-500/40",
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

  // Se o usuário dispensou temporariamente, exibe uma pílula sutil no topo para reabrir
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
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card to-card p-5 sm:p-6 dark:border-emerald-500/25 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-2xs">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Sua boutique está 100% pronta para faturar! 🎉
                </p>
                <Badge variant="outline" className="rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                  4/4 passos
                </Badge>
              </div>
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
            Dispensar aviso <X className="ml-1.5 size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // ESTADO RECOLHIDO SLEEK APPLE (Resolve com maestria o problema do print 1)
  if (collapsed) {
    return (
      <div className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-gradient-to-b from-card to-secondary/30 px-5 py-3.5 shadow-2xs backdrop-blur-md transition-all hover:border-primary/40">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-foreground">
                Guia de início da boutique
              </p>
              <span className="text-[11px] text-muted-foreground">
                · {completedCount} de {totalSteps} concluídos ({progressPct}%)
              </span>
            </div>
            {/* Pílulas de Progresso Segmentado em miniatura */}
            <div className="mt-1.5 flex w-36 items-center gap-1">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    s.isDone ? "bg-primary" : "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleCollapse}
            className="h-8 rounded-full px-3 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
          >
            Continuar guia <ChevronDown className="ml-1 size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            title="Dispensar guia"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // ESTADO EXPANDIDO COM ACABAMENTO APPLE COMPLETO
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card to-secondary/20 p-5 sm:p-6 shadow-soft backdrop-blur-md transition-all">
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
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Sua boutique pronta para faturar
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Complete os 4 passos essenciais para dominar o estoque, o caixa e as vendas da sua loja.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleCollapse}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            title="Recolher guia"
          >
            <ChevronUp className="size-4" />
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

      {/* Progresso Segmentado em Pílulas (Padrão Apple Setup) */}
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
          <span>{completedCount} de {totalSteps} passos concluídos</span>
          <span>{progressPct}%</span>
        </div>
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                s.isDone ? "bg-primary shadow-2xs" : "bg-border/80"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Grid de Etapas Táteis (Cada card é 100% clicável com squircle temático) */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {steps.map((step) => (
          <Link
            key={step.id}
            to={step.to}
            className={`group relative flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft active:scale-[0.99] cursor-pointer ${
              step.isDone
                ? "border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/15"
                : `border-border/80 bg-card ${step.accentBorder}`
            }`}
          >
            <div>
              {/* Topo do Card de Etapa: Squircle com Ícone Temático + Badge/Tag */}
              <div className="flex items-center justify-between gap-3">
                <div
                  className={`flex size-10 items-center justify-center rounded-2xl shadow-2xs transition-transform duration-200 group-hover:scale-105 ${
                    step.isDone
                      ? "bg-emerald-500 text-white"
                      : step.colorClass
                  }`}
                >
                  {step.isDone ? <CheckCircle2 className="size-5" /> : step.icon}
                </div>

                {step.isDone ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold"
                  >
                    Concluído ✓
                  </Badge>
                ) : (
                  <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    {step.stepTag}
                  </span>
                )}
              </div>

              {/* Textos da Etapa */}
              <div className="mt-3.5 space-y-1">
                <p
                  className={`text-sm font-semibold text-foreground transition-colors group-hover:text-primary ${
                    step.isDone ? "opacity-75 line-through" : ""
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Rodapé da Etapa: CTA Apple com Seta direcional sem '+' */}
            <div className="mt-4 pt-2 flex items-center justify-between border-t border-border/40">
              <span className="text-[11px] font-medium text-muted-foreground">
                {step.badgeText || (step.isDone ? "Etapa finalizada" : "Pendente")}
              </span>

              {step.isDone ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Revisar <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground shadow-2xs">
                  {step.cta}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
