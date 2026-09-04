import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Sparkles,
  Tag,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGuideTour } from "@/lib/guide-context";

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

  // Bento Tray: controla abertura inline (sem Portal, sem jitter)
  const [trayOpen, setTrayOpen] = useState(false);

  // Modal Consultivo de Precificação
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

  const navigate = useNavigate();
  const { openCoach } = useGuideTour();

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(storageKey, "true");
  };

  // Micro-Missões de Dopamina (Solução C): 1. Lucro em 60s → 2. Alvo de faturamento → 3. Venda no balcão → 4. Link Instagram
  const steps = [
    {
      id: "inventory",
      title: "Descubra seu lucro real em 60s",
      description:
        "Adicione sua primeira peça e veja na hora o cálculo exato do que sobra no seu bolso.",
      isDone: hasInventory,
      badgeText: hasInventory
        ? `${inventoryCount} peça${inventoryCount !== 1 ? "s" : ""}`
        : undefined,
      to: "/estoque",
      cta: "Descobrir meu lucro",
      icon: <Boxes className="size-4.5" />,
      colorClass:
        "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
      usePricingModal: true,
    },
    {
      id: "goal",
      title: "Calibre seu alvo de faturamento",
      description:
        "Defina sua meta mensal para o sistema calcular o faturamento diário necessário.",
      isDone: hasGoal,
      badgeText: hasGoal ? "Meta ativa" : undefined,
      to: "/metas",
      cta: "Definir meu alvo",
      icon: <Target className="size-4.5" />,
      colorClass:
        "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
      usePricingModal: false,
    },
    {
      id: "sales",
      title: "Simule sua primeira venda no balcão",
      description:
        "Passe uma venda teste para ver a baixa de estoque automática e o lucro caindo no caixa.",
      isDone: hasSales,
      badgeText: hasSales
        ? `${salesCount} venda${salesCount !== 1 ? "s" : ""}`
        : undefined,
      to: "/caixa",
      cta: "Simular venda",
      icon: <Wallet className="size-4.5" />,
      colorClass:
        "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      usePricingModal: false,
    },
    {
      id: "storefront",
      title: "Ative seu link de vendas no Instagram",
      description:
        "Sua vitrine online pronta com link direto para receber pedidos no WhatsApp.",
      isDone: hasStorefront,
      badgeText: storeSlug ? `@${storeSlug}` : undefined,
      to: storeSlug ? `/vitrine/${storeSlug}` : "/loja",
      cta: "Ativar vitrine",
      icon: <ShoppingBag className="size-4.5" />,
      colorClass:
        "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
      usePricingModal: false,
    },
  ] as const;

  const completedCount = steps.filter((s) => s.isDone).length;
  const totalSteps = steps.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const isAllDone = completedCount === totalSteps;

  const nextStep = steps.find((s) => !s.isDone) ?? steps[0];
  const nextStepIndex = steps.findIndex((s) => s.id === nextStep.id);

  // Inicia a missão e abre o Coach da Boutique na página de destino
  const handleStepAction = (step: (typeof steps)[number]) => {
    openCoach();
    if (step.usePricingModal && !step.isDone) {
      setPricingModalOpen(true);
    } else {
      void navigate({ to: step.to });
    }
  };

  // ─── 1. ESTADO 100% CONCLUÍDO ────────────────────────────────────────────────
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

  // ─── 2. ESTADO DISPENSADO ────────────────────────────────────────────────────
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
        </button>
      </div>
    );
  }

  // ─── 3. BENTO TRAY INTEGRADA COM MICRO-MISSÕES ──────────────────────────────
  return (
    <>
      {/* Modal Consultivo de Precificação */}
      <AlertDialog open={pricingModalOpen} onOpenChange={setPricingModalOpen}>
        <AlertDialogContent className="rounded-3xl border border-border/80 bg-card/98 shadow-lift backdrop-blur-xl max-w-sm">
          <AlertDialogHeader className="space-y-1.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 mb-1">
              <Boxes className="size-5" />
            </div>
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Você já sabe o preço de venda?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Se ainda não calculou o preço ideal, o Assistente de Precificação
              garante que você não venda no prejuízo.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col mt-2">
            {/* Opção recomendada: calcular primeiro */}
            <button
              type="button"
              onClick={() => {
                setPricingModalOpen(false);
                openCoach();
                void navigate({ to: "/precificacao" });
              }}
              className="flex items-center gap-3 w-full rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-all hover:border-primary/60 hover:bg-primary/10 cursor-pointer group"
            >
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                <Calculator className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  Preciso calcular / Não tenho certeza
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ir para o Assistente de Precificação ✦ Recomendado
                </p>
              </div>
            </button>

            {/* Opção direta: já sabe o preço */}
            <button
              type="button"
              onClick={() => {
                setPricingModalOpen(false);
                openCoach();
                void navigate({ to: "/estoque" });
              }}
              className="flex items-center gap-3 w-full rounded-2xl border border-border/70 bg-card px-4 py-3 text-left transition-all hover:border-border hover:bg-secondary/30 cursor-pointer group"
            >
              <span className="flex size-8 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0 group-hover:bg-secondary/80 transition-colors">
                <Tag className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  Já sei o preço de venda
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ir direto para Cadastrar Peça
                </p>
              </div>
            </button>

            <AlertDialogCancel className="rounded-full text-xs font-medium text-muted-foreground border-border/60 hover:border-border hover:text-foreground transition-all mt-1">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Container principal — inline, sem Portal, sem jitter */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-r from-card via-surface to-card shadow-soft backdrop-blur-xl transition-all duration-300 hover:border-primary/30 overflow-hidden">
        {/* ── Barra de topo: Next Step + Controles ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 px-4 py-3 sm:py-2.5">
          {/* Bloco Esquerdo: Próxima Missão */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex size-9 sm:size-10 items-center justify-center rounded-2xl shrink-0 shadow-2xs ${nextStep.colorClass}`}
            >
              {nextStep.icon}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-primary">
                  Missão {nextStepIndex + 1} de {totalSteps}
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

          {/* Bloco Central: Pílulas de Progresso (xl+) */}
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

          {/* Bloco Direito: CTA + Toggle Tray + Fechar */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* CTA direto na próxima missão */}
            <Button
              size="sm"
              onClick={() => handleStepAction(nextStep)}
              className="h-8 rounded-full px-3.5 text-xs font-semibold gradient-primary shadow-glow hover:opacity-95 transition-all cursor-pointer"
            >
              {nextStep.cta} <ArrowRight className="ml-1.5 size-3.5" />
            </Button>

            {/* Toggle da Bento Tray — inline, zero Portal, zero jitter */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTrayOpen((v) => !v)}
              className="h-8 rounded-full border-border/80 bg-card px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 shadow-2xs transition-all cursor-pointer"
              aria-expanded={trayOpen}
              aria-label="Ver todas as missões"
            >
              <span>Ver {totalSteps} missões</span>
              {trayOpen ? (
                <ChevronUp className="ml-1 size-3" />
              ) : (
                <ChevronDown className="ml-1 size-3" />
              )}
            </Button>

            {/* Fechar / Dispensar */}
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

        {/* ══ BENTO TRAY INLINE ══ */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            trayOpen
              ? "max-h-[420px] opacity-100"
              : "max-h-0 opacity-0 pointer-events-none"
          } overflow-hidden`}
        >
          <div className="border-t border-border/50 px-4 py-3 space-y-2 overflow-y-auto max-h-[360px]">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between pb-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                <p className="text-[11px] font-semibold text-foreground">
                  Guia Rápido de Ativação · ~1 min por missão
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] rounded-full">
                {completedCount}/{totalSteps} concluídos
              </Badge>
            </div>

            {/* Lista de etapas */}
            {steps.map((s, idx) => {
              const isNext = idx === nextStepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setTrayOpen(false);
                    handleStepAction(s);
                  }}
                  disabled={s.isDone}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-2.5 text-left transition-all duration-200 active:scale-[0.99] ${
                    s.isDone
                      ? "border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/15 opacity-70 cursor-default"
                      : isNext
                        ? "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 cursor-pointer"
                        : "border-border/70 bg-card hover:border-border hover:bg-secondary/30 cursor-pointer"
                  }`}
                >
                  <div
                    className={`flex size-8 items-center justify-center rounded-xl shrink-0 shadow-2xs ${
                      s.isDone ? "bg-emerald-500 text-white" : s.colorClass
                    }`}
                  >
                    {s.isDone ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      s.icon
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-semibold ${
                          s.isDone
                            ? "line-through opacity-70"
                            : "text-foreground"
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
                </button>
              );
            })}

            <p className="text-[10px] text-center text-muted-foreground/70 pt-1.5 border-t border-border/40">
              💡 Complete em qualquer ordem. O Modaly salva seu progresso automaticamente.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
