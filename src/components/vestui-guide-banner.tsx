import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  ShoppingBag,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface VestuiGuideBannerProps {
  mode: "gestao" | "loja";
  storeId?: string | null;
  storeSlug?: string | null;
  inventoryCount?: number;
  hasSales?: boolean;
  salesCount?: number;
  hasGoal?: boolean;
  hasStorefront?: boolean;
  onCopyLink?: () => void;
  className?: string;
}

export function VestuiGuideBanner({
  mode,
  storeId,
  storeSlug,
  inventoryCount = 0,
  hasSales = false,
  salesCount = 0,
  hasGoal = false,
  hasStorefront = false,
  onCopyLink,
  className,
}: VestuiGuideBannerProps) {
  const sid = storeId || "default";
  const storageKey = `vestui_guide_${mode}_${sid}`;
  const navigate = useNavigate();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
    return localStorage.getItem(storageKey) === "true";
  });

  const [sheetOpen, setSheetOpen] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, "true");
    }
  };

  const handleRestore = () => {
    setDismissed(false);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(storageKey);
    }
  };

  // ── Etapas baseadas no Modo (Irmãos com papéis complementares) ──────────────
  const steps =
    mode === "gestao"
      ? [
          {
            id: "inventory",
            title: "Cadastre sua primeira peça",
            description: "Adicione uma peça no estoque para calcular seu lucro real e margem segura.",
            isDone: inventoryCount > 0,
            to: "/estoque",
            cta: "Cadastrar peça",
            badgeText: inventoryCount > 0 ? `${inventoryCount} peça(s)` : undefined,
            icon: <Boxes className="size-4" />,
          },
          {
            id: "goal",
            title: "Calibre sua meta mensal",
            description: "Defina seu alvo financeiro para o sistema projetar o ritmo diário de vendas.",
            isDone: hasGoal,
            to: "/metas",
            cta: "Definir meta",
            badgeText: hasGoal ? "Meta ativa" : undefined,
            icon: <Target className="size-4" />,
          },
          {
            id: "sales",
            title: "Registre sua primeira venda",
            description: "Lance uma venda teste no caixa para ver a baixa automática e o lucro líquido.",
            isDone: hasSales,
            to: "/caixa",
            cta: "Lançar no caixa",
            badgeText: salesCount > 0 ? `${salesCount} venda(s)` : undefined,
            icon: <Wallet className="size-4" />,
          },
          {
            id: "storefront",
            title: "Ative sua vitrine online",
            description: "Sua loja pronta para receber pedidos das clientes no WhatsApp e Checkout.",
            isDone: hasStorefront,
            to: storeSlug ? `/vitrine/${storeSlug}` : "/loja",
            cta: "Ver vitrine",
            badgeText: storeSlug ? `@${storeSlug}` : undefined,
            icon: <ShoppingBag className="size-4" />,
          },
        ]
      : [
          {
            id: "catalog",
            title: "Cadastre peças com fotos",
            description: "Coloque fotos atrativas nas roupas para destacá-las na sua vitrine online.",
            isDone: inventoryCount > 0,
            to: "/loja/produtos",
            cta: "Gerenciar vitrine",
            badgeText: inventoryCount > 0 ? `${inventoryCount} peça(s)` : undefined,
            icon: <Boxes className="size-4" />,
          },
          {
            id: "bio",
            title: "Divulgue o link na Bio",
            description: "Copie o link da vitrine e cole no perfil do Instagram ou envie no WhatsApp.",
            isDone: hasStorefront,
            action: onCopyLink,
            to: onCopyLink ? undefined : "/loja/compartilhar",
            cta: "Copiar link",
            badgeText: storeSlug ? `vestui.com.br/vitrine/${storeSlug}` : undefined,
            icon: <ExternalLink className="size-4" />,
          },
          {
            id: "first_order",
            title: "Receba sua primeira venda",
            description: "Acompanhe novos pedidos concluídos na vitrine com baixa instantânea no estoque.",
            isDone: hasSales,
            to: "/loja/pedidos",
            cta: "Ver pedidos",
            badgeText: salesCount > 0 ? `${salesCount} pedido(s)` : undefined,
            icon: <ShoppingBag className="size-4" />,
          },
        ];

  const totalSteps = steps.length;
  const completedCount = steps.filter((s) => s.isDone).length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const isAllDone = completedCount === totalSteps;

  const nextStep = steps.find((s) => !s.isDone) ?? steps[0]!;
  const nextStepIndex = steps.findIndex((s) => s.id === nextStep.id);

  const guideTitle = mode === "gestao" ? "Guia Financeiro" : "Aceleração da Vitrine";

  // ── Se concluído e dispensado ───────────────────────────────────────────────
  if (isAllDone && dismissed) return null;

  // ── Se dispensado pelo usuário: Chip discreto Apple HIG ────────────────────
  if (dismissed) {
    return (
      <div className={cn("flex items-center", className)}>
        <button
          type="button"
          onClick={handleRestore}
          title="Reabrir guia de configuração"
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 text-[11px] font-medium text-muted-foreground shadow-2xs backdrop-blur-md transition-all hover:border-primary/40 hover:text-foreground cursor-pointer"
        >
          <Sparkles className="size-3 text-primary" />
          <span>
            {guideTitle} ({completedCount}/{totalSteps})
          </span>
          <ChevronRight className="size-3 text-muted-foreground/50" />
        </button>
      </div>
    );
  }

  // ── Se 100% concluído e não dispensado ──────────────────────────────────────
  if (isAllDone) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 py-2 text-xs backdrop-blur-md shadow-2xs",
          className,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="size-3.5" />
          </span>
          <span className="font-medium text-foreground truncate">
            {mode === "gestao"
              ? "Sua loja está 100% configurada! Painel financeiro calibrado."
              : "Vitrine 100% pronta! Pronta para faturar no digital."}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
        >
          Dispensar
        </button>
      </div>
    );
  }

  // ── BANNER APPLE HIG ULTRA-COMPACTO (~44px) ────────────────────────────────
  return (
    <>
      {/* Container fluido e pacificado */}
      <div
        className={cn(
          "group relative flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-secondary/30 px-3.5 py-2 text-xs transition-all hover:border-border/80 hover:bg-secondary/40",
          className,
        )}
      >
        {/* Bloco Esquerdo: Progresso + Próximo Passo */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Micro-ícone discreto */}
          <div className="grid size-6 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground shadow-2xs">
            <Sparkles className="size-3" />
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            {/* Label e contador */}
            <span className="text-[11px] font-semibold text-foreground shrink-0">
              {guideTitle}
            </span>

            <span className="text-muted-foreground/40 text-xs hidden sm:inline">·</span>

            {/* Micro barra de progresso Apple (2.5px) */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-1.5 w-14 rounded-full bg-secondary/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground/50 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-medium text-muted-foreground">
                {completedCount}/{totalSteps}
              </span>
            </div>

            <span className="text-muted-foreground/40 text-xs hidden md:inline">·</span>

            {/* Próximo passo direto */}
            <span className="hidden md:inline text-[11px] text-muted-foreground truncate">
              Próximo:{" "}
              <strong className="font-semibold text-foreground">
                {nextStep.title}
              </strong>
            </span>
          </div>
        </div>

        {/* Bloco Direito: Ação Rápida + Sheet Drawer + Fechar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Ação Primária em 1 clique */}
          {nextStep.action ? (
            <Button
              type="button"
              size="sm"
              onClick={nextStep.action}
              className="h-7 rounded-full border border-border/70 bg-card px-3 text-[11px] font-medium text-foreground hover:bg-secondary/70 transition-all shadow-2xs cursor-pointer"
            >
              <span>{nextStep.cta}</span>
              <ArrowUpRight className="ml-1 size-3 text-muted-foreground" />
            </Button>
          ) : nextStep.to ? (
            <Button
              asChild
              size="sm"
              className="h-7 rounded-full border border-border/70 bg-card px-3 text-[11px] font-medium text-foreground hover:bg-secondary/70 transition-all shadow-2xs cursor-pointer"
            >
              <Link to={nextStep.to}>
                <span>{nextStep.cta}</span>
                <ArrowRight className="ml-1 size-3 text-muted-foreground" />
              </Link>
            </Button>
          ) : null}

          {/* Drawer / Sheet Apple Lateral para detalhes sem poluir a tela */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 rounded-full border-border/80 bg-card px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer"
              >
                <span>Ver etapas</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-6 bg-card/95 backdrop-blur-2xl border-border/80">
              <SheetHeader className="space-y-1.5 pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                  <SheetTitle className="text-base font-bold text-foreground">
                    {mode === "gestao" ? "Guia de Gestão & Lucro" : "Aceleração da Loja Online"}
                  </SheetTitle>
                </div>
                <SheetDescription className="text-xs text-muted-foreground leading-relaxed">
                  {mode === "gestao"
                    ? "Passo a passo estratégico para equilibrar seu fluxo de caixa, precificação e metas."
                    : "Etapas fundamentais para atrair visitantes do Instagram e convertê-los em vendas."}
                </SheetDescription>

                {/* Resumo de Progresso */}
                <div className="mt-4 pt-2">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground font-medium">Progresso geral</span>
                    <span className="font-semibold text-foreground">
                      {completedCount} de {totalSteps} concluídos ({progressPct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </SheetHeader>

              {/* Lista dos Passos — Padrão Apple (Cards neutros, zero neon verde) */}
              <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                {steps.map((step, idx) => {
                  const isCurrent = idx === nextStepIndex;
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "rounded-2xl border p-4 transition-all",
                        step.isDone
                          ? "border-border/60 bg-secondary/20 opacity-80"
                          : isCurrent
                            ? "border-primary/40 bg-primary/5 shadow-2xs"
                            : "border-border/70 bg-card hover:border-border",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status Icon */}
                        <div className="mt-0.5 shrink-0">
                          {step.isDone ? (
                            <div className="grid size-5 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-4" />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "grid size-5 place-items-center rounded-full border text-[10px] font-bold",
                                isCurrent
                                  ? "border-primary text-primary bg-primary/10"
                                  : "border-muted-foreground/40 text-muted-foreground",
                              )}
                            >
                              {idx + 1}
                            </div>
                          )}
                        </div>

                        {/* Conteúdo */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                "text-xs font-semibold",
                                step.isDone
                                  ? "text-muted-foreground line-through decoration-muted-foreground/50"
                                  : "text-foreground",
                              )}
                            >
                              {step.title}
                            </p>
                            {step.badgeText && (
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                                {step.badgeText}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>

                          {/* Ação dentro do Sheet */}
                          {!step.isDone && (
                            <div className="pt-2">
                              {step.action ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setSheetOpen(false);
                                    step.action?.();
                                  }}
                                  className="h-7 rounded-xl gradient-primary px-3 text-[11px] font-medium text-primary-foreground shadow-xs cursor-pointer"
                                >
                                  <span>{step.cta}</span>
                                  <ArrowUpRight className="ml-1 size-3" />
                                </Button>
                              ) : step.to ? (
                                <Button
                                  asChild
                                  size="sm"
                                  className="h-7 rounded-xl gradient-primary px-3 text-[11px] font-medium text-primary-foreground shadow-xs cursor-pointer"
                                >
                                  <Link
                                    to={step.to}
                                    onClick={() => setSheetOpen(false)}
                                  >
                                    <span>{step.cta}</span>
                                    <ArrowRight className="ml-1 size-3" />
                                  </Link>
                                </Button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>

          {/* Botão Fechar / Recolher */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            title="Recolher guia"
            className="size-7 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
}
