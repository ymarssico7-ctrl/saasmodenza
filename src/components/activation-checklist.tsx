import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

  const [sheetOpen, setSheetOpen] = useState(false);

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
      icon: <Boxes className="size-5" />,
      colorClass: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
      accentBorder: "hover:border-indigo-500/40",
    },
    {
      id: "sales",
      stepTag: "Etapa 02",
      title: "Registrar a primeira venda no caixa",
      description: "Experimente a baixa automática do estoque e o cálculo instantâneo de margem.",
      isDone: hasSales,
      badgeText: hasSales ? `${salesCount} venda${salesCount !== 1 ? "s" : ""}` : undefined,
      to: "/caixa",
      cta: "Ir para o caixa",
      icon: <Wallet className="size-5" />,
      colorClass: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      accentBorder: "hover:border-emerald-500/40",
    },
    {
      id: "goal",
      stepTag: "Etapa 03",
      title: "Definir sua meta do mês",
      description: "Acompanhe a barra de progresso de vendas e o ritmo diário sugerido para faturar.",
      isDone: hasGoal,
      badgeText: hasGoal ? "Meta ativa" : undefined,
      to: "/metas",
      cta: "Definir meta",
      icon: <Target className="size-5" />,
      colorClass: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
      accentBorder: "hover:border-amber-500/40",
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
      accentBorder: "hover:border-purple-500/40",
    },
  ];

  const completedCount = steps.filter((s) => s.isDone).length;
  const totalSteps = steps.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);
  const isAllDone = completedCount === totalSteps;

  return (
    <>
      {/* ── CÁPSULA DINÂMICA APPLE NO DASHBOARD (44px, ZERO POLUIÇÃO) ────── */}
      {isAllDone ? (
        <div className="flex items-center justify-between rounded-full border border-emerald-500/30 bg-emerald-50/50 px-4 py-2 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-300 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
              <CheckCircle2 className="size-3.5" />
            </span>
            <span className="font-semibold">
              Sua boutique está 100% configurada e pronta para voar! 🎉
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
      ) : dismissed ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-2xs backdrop-blur-md transition-all hover:border-primary/40 hover:text-foreground cursor-pointer"
          >
            <Sparkles className="size-3.5 text-primary" />
            <span>
              Guia de início ({completedCount}/{totalSteps})
            </span>
            <ChevronRight className="size-3" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-border/80 bg-card/85 px-4 py-2 shadow-soft backdrop-blur-xl transition-all duration-300 hover:border-primary/40">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary shadow-2xs">
              <Sparkles className="size-3.5" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-tight text-foreground">
                Primeiros passos da boutique
              </span>
              <span className="hidden sm:inline text-xs text-muted-foreground">
                · {completedCount} de {totalSteps} concluídos ({progressPct}%)
              </span>
            </div>
            {/* 4 Pílulas de Progresso Segmentado */}
            <div className="flex items-center gap-1">
              {steps.map((s, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s.isDone ? "w-4 bg-emerald-500 shadow-2xs" : "w-2 bg-border"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSheetOpen(true)}
              className="h-7 rounded-full border-primary/30 bg-primary/5 px-3 text-xs font-semibold text-primary shadow-2xs hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
            >
              Ver etapas <ArrowRight className="ml-1 size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="size-7 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
              title="Dispensar guia"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── GAVETA LATERAL EDITORIAL (SHEET) ESTILO APPLE / LINEAR ───────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex flex-col justify-between sm:max-w-md p-6 bg-card">
          <div className="space-y-6">
            <SheetHeader className="space-y-2 text-left">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-4" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Guia de Configuração
                </span>
                <Badge variant="secondary" className="rounded-full text-[10px] font-semibold">
                  {progressPct}% pronto
                </Badge>
              </div>
              <SheetTitle className="font-display text-xl font-bold tracking-tight">
                Sua boutique pronta para faturar
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground leading-relaxed">
                Complete as 4 etapas essenciais para dominar o estoque, o caixa e a vitrine online da sua loja.
              </SheetDescription>
            </SheetHeader>

            {/* Barra de Progresso Segmentada */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                <span>{completedCount} de {totalSteps} passos concluídos</span>
                <span>{progressPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                {steps.map((s, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                      s.isDone ? "bg-primary shadow-2xs" : "bg-border"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Lista das 4 Etapas com Squircles Acetinados */}
            <div className="space-y-3 pt-2">
              {steps.map((step) => (
                <Link
                  key={step.id}
                  to={step.to}
                  onClick={() => setSheetOpen(false)}
                  className={`group relative flex items-start gap-3.5 rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft active:scale-[0.99] cursor-pointer ${
                    step.isDone
                      ? "border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/15"
                      : `border-border/80 bg-card ${step.accentBorder}`
                  }`}
                >
                  <div
                    className={`flex size-10 items-center justify-center rounded-2xl shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105 ${
                      step.isDone ? "bg-emerald-500 text-white" : step.colorClass
                    }`}
                  >
                    {step.isDone ? <CheckCircle2 className="size-5" /> : step.icon}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs font-semibold text-foreground transition-colors group-hover:text-primary ${
                          step.isDone ? "opacity-75 line-through" : ""
                        }`}
                      >
                        {step.title}
                      </p>
                      {step.isDone ? (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                          Pronto ✓
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase shrink-0">
                          {step.stepTag}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                      {step.description}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-muted-foreground">
                        {step.badgeText || (step.isDone ? "Concluído" : "Pendente")}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-primary group-hover:underline">
                        {step.cta} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Dica de Boutique no Rodapé */}
          <div className="rounded-2xl border border-primary/20 bg-primary-soft p-3.5 text-xs text-foreground/80 mt-6">
            <p className="font-semibold text-primary flex items-center gap-1.5">
              <span>💡</span> Como funciona o Modaly
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Ao cadastrar peças e registrar vendas, o estoque é atualizado em tempo real na vitrine e o lucro é calculado automaticamente no seu DRE.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
