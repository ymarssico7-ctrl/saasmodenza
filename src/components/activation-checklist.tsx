import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(storageKey) === "true";
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(storageKey, "true");
  };

  const steps = [
    {
      id: "inventory",
      stepTag: "Etapa 01",
      title: "Cadastrar a primeira peça",
      description: "Adicione fotos, preços de custo e venda, e defina a grade ou Tamanho Único.",
      isDone: hasInventory,
      badgeText: hasInventory ? `${inventoryCount} peça${inventoryCount !== 1 ? "s" : ""}` : undefined,
      to: "/estoque",
      cta: "Cadastrar peça",
      icon: <Boxes className="size-4.5" />,
      colorClass: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
    },
    {
      id: "sales",
      stepTag: "Etapa 02",
      title: "Registrar a primeira venda no caixa",
      description: "Experimente a baixa automática de estoque e o cálculo de lucro em tempo real.",
      isDone: hasSales,
      badgeText: hasSales ? `${salesCount} venda${salesCount !== 1 ? "s" : ""}` : undefined,
      to: "/caixa",
      cta: "Ir para o caixa",
      icon: <Wallet className="size-4.5" />,
      colorClass: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    },
    {
      id: "goal",
      stepTag: "Etapa 03",
      title: "Definir sua meta do mês",
      description: "Acompanhe o ritmo diário e a projeção de faturamento da sua loja.",
      isDone: hasGoal,
      badgeText: hasGoal ? "Meta ativa" : undefined,
      to: "/metas",
      cta: "Definir meta",
      icon: <Target className="size-4.5" />,
      colorClass: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    },
    {
      id: "storefront",
      stepTag: "Etapa 04",
      title: "Conhecer sua vitrine online",
      description: "Sua vitrine na internet pronta para vender pelo Instagram e WhatsApp.",
      isDone: hasStorefront,
      badgeText: storeSlug ? `@${storeSlug}` : undefined,
      to: storeSlug ? `/vitrine/${storeSlug}` : "/loja",
      cta: "Acessar vitrine",
      icon: <ShoppingBag className="size-4.5" />,
      colorClass: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    },
  ];

  const completedCount = steps.filter((s) => s.isDone).length;
  const totalSteps = steps.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const isAllDone = completedCount === totalSteps;

  // Identifica a próxima ação pendente prioritária
  const nextStep = steps.find((s) => !s.isDone) ?? steps[0]!;
  const nextStepIndex = steps.findIndex((s) => s.id === nextStep.id);

  // 1. ESTADO 100% CONCLUÍDO (Pílula comemorativa discreta)
  if (isAllDone) {
    if (dismissed) return null;
    return (
      <div className="flex items-center justify-between rounded-full border border-emerald-500/30 bg-emerald-50/50 px-4 py-2 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-300 shadow-2xs backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckCircle2 className="size-3.5" />
          </span>
          <span className="font-semibold">
            Sua boutique está 100% configurada e pronta para faturar! 🎉
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
        >
          Dispensar
        </button>
      </div>
    );
  }

  // 2. ESTADO DISPENSADO (Pílula sutil de reabertura)
  if (dismissed) {
    return (
      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => setDismissed(false)}
          className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-2xs backdrop-blur-md transition-all hover:border-primary/40 hover:text-foreground cursor-pointer"
        >
          <Sparkles className="size-3.5 text-primary" />
          <span>
            Guia de início ({completedCount}/{totalSteps})
          </span>
          <ChevronRight className="size-3" />
        </button>
      </div>
    );
  }

  // 3. SMART NEXT-STEP BENTO (64px, equilíbrio perfeito de largura, sem vácuo e sem tela preta)
  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-3xl border border-border/80 bg-gradient-to-r from-card via-surface to-card px-4 py-3 sm:py-2.5 shadow-soft backdrop-blur-xl transition-all duration-300 hover:border-primary/40">
      {/* Bloco Esquerdo: Próxima Ação com Squircle Colorido e Microcopy Rico */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex size-9 sm:size-10 items-center justify-center rounded-2xl shrink-0 shadow-2xs ${nextStep.colorClass}`}>
          {nextStep.icon}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider uppercase text-primary">
              Passo {nextStepIndex + 1} de {totalSteps}
            </span>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <span className="text-xs font-semibold text-foreground truncate">
              {nextStep.title}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate max-w-sm sm:max-w-md">
            {nextStep.description}
          </p>
        </div>
      </div>

      {/* Bloco Central: Pílulas de Progresso Segmentado (visível em telas médias/grandes) */}
      <div className="hidden xl:flex items-center gap-2.5 shrink-0 px-3.5 py-1.5 rounded-full bg-secondary/50 border border-border/40">
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s.isDone
                  ? "w-3.5 bg-emerald-500 shadow-2xs"
                  : i === nextStepIndex
                  ? "w-3.5 bg-primary shadow-2xs"
                  : "w-2 bg-border"
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] font-semibold tabular-nums text-foreground">
          {progressPct}%
        </span>
      </div>

      {/* Bloco Direito: Botão de Ação Imediata + Popover de Todas as Etapas + Fechar */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {/* Botão de Ação Direta na Próxima Etapa */}
        <Button
          asChild
          size="sm"
          className="h-8 rounded-full px-3.5 text-xs font-semibold gradient-primary shadow-glow hover:opacity-95 transition-all"
        >
          <Link to={nextStep.to}>
            {nextStep.cta} <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        </Button>

        {/* Menu Flutuante (Popover) de Consulta de Todas as Etapas - SEM TELA PRETA e com scroll suave */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-border/80 bg-card px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 shadow-2xs transition-all cursor-pointer"
            >
              <span>Ver 4 etapas</span>
              <ChevronDown className="ml-1 size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-80 sm:w-96 rounded-3xl border border-border/80 bg-card/98 p-4 shadow-lift backdrop-blur-xl space-y-3 z-50"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-3" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Guia de Ativação da Loja
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {completedCount} de {totalSteps} passos concluídos
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] rounded-full">
                {progressPct}% pronto
              </Badge>
            </div>

            {/* Lista com scroll suave e altura controlada (NUNCA corta conteúdo) */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {steps.map((s, idx) => (
                <Link
                  key={s.id}
                  to={s.to}
                  className={`flex items-start gap-3 rounded-2xl border p-2.5 transition-all duration-200 hover:border-primary/40 hover:bg-secondary/40 active:scale-[0.99] cursor-pointer ${
                    s.isDone
                      ? "border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/15"
                      : idx === nextStepIndex
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/70 bg-card"
                  }`}
                >
                  <div
                    className={`flex size-8 items-center justify-center rounded-xl shrink-0 shadow-2xs ${
                      s.isDone ? "bg-emerald-500 text-white" : s.colorClass
                    }`}
                  >
                    {s.isDone ? <CheckCircle2 className="size-4" /> : s.icon}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-semibold ${
                          s.isDone ? "line-through opacity-70" : "text-foreground"
                        }`}
                      >
                        {s.title}
                      </p>
                      {s.isDone ? (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                          Pronto ✓
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-primary shrink-0">
                          {s.cta} →
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {s.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <p className="text-[10px] text-center text-muted-foreground/80 pt-1 border-t border-border/40">
              💡 As etapas podem ser feitas em qualquer ordem.
            </p>
          </PopoverContent>
        </Popover>

        {/* Botão de Fechar/Dispensar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="size-7 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          title="Dispensar guia"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
