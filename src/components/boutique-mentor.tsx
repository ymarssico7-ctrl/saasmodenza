import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Lightbulb,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGuideTour } from "@/lib/guide-context";

export function BoutiqueMentor() {
  const { isCoachOpen, closeCoach, toggleCoach, currentEducation } =
    useGuideTour();

  return (
    <>
      {/* ── Botão Flutuante Discreto e Não-Obstrutivo (Padrão Apple) ── */}
      <div className="fixed bottom-22 lg:bottom-6 right-4 lg:right-8 z-40">
        <button
          type="button"
          onClick={toggleCoach}
          className="group inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/95 px-3.5 py-2 text-xs font-semibold text-foreground shadow-lift backdrop-blur-2xl transition-all duration-300 hover:border-primary/60 hover:bg-primary/5 hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/10 dark:ring-white/5"
          title="Abrir Coach Financeiro da Boutique"
          aria-label="Abrir Coach Financeiro da Boutique"
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-200">
            <Sparkles className="size-3 animate-pulse" />
          </span>
          <span className="text-xs font-semibold tracking-tight">
            Coach da Boutique
          </span>
          <span className="flex size-2 rounded-full bg-emerald-500 animate-ping" />
        </button>
      </div>

      {/* ── Painel Lateral de Mentoria (Sheet Deslizante Apple) ── */}
      <Sheet open={isCoachOpen} onOpenChange={(open) => !open && closeCoach()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col bg-card/98 backdrop-blur-2xl border-l border-border/80 shadow-2xl z-50 overflow-hidden"
        >
          {/* Cabeçalho do Coach */}
          <div className="p-6 pb-4 border-b border-border/60 bg-gradient-to-br from-primary/5 via-card to-card">
            <div className="flex items-center justify-between gap-3 mb-2">
              <Badge
                variant="outline"
                className="rounded-full border-primary/30 bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-0.5"
              >
                <GraduationCap className="size-3 mr-1" />
                {currentEducation.badge}
              </Badge>
              <button
                type="button"
                onClick={closeCoach}
                className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                title="Fechar coach"
              >
                <X className="size-4" />
              </button>
            </div>

            <SheetTitle className="text-base sm:text-lg font-bold text-foreground">
              {currentEducation.title}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {currentEducation.headline}
            </SheetDescription>
          </div>

          {/* Corpo com Scroll Suave e Zero Truncamento */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Demonstração Prática da Matemática */}
            {currentEducation.financialBreakdown && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="size-3.5 text-primary" />
                  <span>A Matemática Prática na sua Boutique</span>
                </div>

                <div className="space-y-2 rounded-2xl border border-border/80 bg-surface/80 p-3.5 shadow-2xs">
                  {currentEducation.financialBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold tabular-nums shrink-0 px-2 py-0.5 rounded-lg ${
                          item.tone === "warning"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : item.tone === "success"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : item.tone === "primary"
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-secondary text-foreground"
                        }`}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Lições da Consultoria (Explicação sem jargões) */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <BadgePercent className="size-3.5 text-primary" />
                <span>O Que Você Precisa Dominar</span>
              </div>

              <div className="space-y-2.5">
                {currentEducation.expertLessons.map((lesson, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-border/70 bg-card p-3.5 space-y-1 transition-all hover:border-border"
                  >
                    <p className="text-xs font-bold text-foreground">
                      {lesson.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {lesson.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Dica de Ouro da Especialista */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Lightbulb className="size-3.5" />
                <span>Dica de Especialista</span>
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                {currentEducation.goldenRule}
              </p>
            </div>
          </div>

          {/* Rodapé com Próxima Ação */}
          <div className="p-4 border-t border-border/60 bg-surface-muted/50 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={closeCoach}
              className="rounded-full text-xs"
            >
              Entendi, obrigado
            </Button>

            <Button
              asChild
              size="sm"
              className="rounded-full gradient-primary shadow-glow text-xs font-semibold px-4 cursor-pointer"
            >
              <Link
                to={currentEducation.practicalActionTo}
                onClick={closeCoach}
              >
                {currentEducation.practicalActionText}
                <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
