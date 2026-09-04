import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Compass,
  Minimize2,
  ShoppingBag,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGuideTour, type MissionId } from "@/lib/guide-context";

const MISSION_ICONS: Record<MissionId, React.ReactNode> = {
  lucro: <Boxes className="size-4 text-indigo-500" />,
  meta: <Target className="size-4 text-amber-500" />,
  venda: <Wallet className="size-4 text-emerald-500" />,
  vitrine: <ShoppingBag className="size-4 text-purple-500" />,
};

const MISSION_BG: Record<MissionId, string> = {
  lucro: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  meta: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  venda: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  vitrine: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
};

export function GuideIsland() {
  const {
    activeMission,
    activeMissionInfo,
    isTourActive,
    isPillDismissed,
    currentTip,
    advanceToNextMission,
    dismissPill,
    reopenPill,
    closeTour,
  } = useGuideTour();

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!isTourActive || !activeMission || !activeMissionInfo) {
    return null;
  }

  // Se minimizado: renderiza micro-cápsula discreta no canto inferior direito
  if (isPillDismissed) {
    return (
      <aside
        aria-label="Assistente do Guia de Início"
        className="fixed bottom-22 lg:bottom-6 right-4 z-50"
      >
        <button
          type="button"
          onClick={reopenPill}
          className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/95 px-3.5 py-2 text-xs font-semibold text-foreground shadow-lift backdrop-blur-2xl transition-all duration-200 hover:border-primary/50 hover:scale-105 active:scale-95 cursor-pointer"
          title="Reabrir copiloto de ativação"
        >
          <span className="flex size-4 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="size-2.5 animate-pulse" />
          </span>
          <span>
            Guia {activeMissionInfo.stepNumber}/4: {activeMissionInfo.title}
          </span>
          <ChevronRight className="size-3 text-muted-foreground" />
        </button>
      </aside>
    );
  }

  // Rota atual já é a rota da missão?
  const isOnTargetRoute =
    pathname === activeMissionInfo.route ||
    (activeMission === "lucro" && pathname === "/precificacao");

  return (
    <aside
      aria-label="Guia Passo a Passo"
      className="fixed bottom-22 lg:bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 lg:left-[calc(50%+134px)] lg:-translate-x-1/2 z-50 sm:max-w-md lg:max-w-lg transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-border/80 bg-card/95 p-3.5 sm:py-2.5 sm:px-4 shadow-lift backdrop-blur-2xl ring-1 ring-white/10 dark:ring-white/5 transition-all">
        {/* Lado Esquerdo: Ícone da Missão + Microcopy */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div
            className={`flex size-9 items-center justify-center rounded-2xl shrink-0 border shadow-2xs ${MISSION_BG[activeMission]}`}
          >
            {MISSION_ICONS[activeMission]}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Passo {activeMissionInfo.stepNumber} de 4
              </span>
              <span className="text-muted-foreground/30 text-xs">·</span>
              <span className="text-xs font-semibold text-foreground truncate">
                {activeMissionInfo.title}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-1">
              {currentTip}
            </p>
          </div>
        </div>

        {/* Lado Direito: Ações */}
        <div className="flex items-center justify-end gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
          {!isOnTargetRoute ? (
            <Button
              asChild
              size="sm"
              className="h-8 rounded-full px-3 text-xs font-semibold gradient-primary shadow-glow hover:opacity-95 transition-all cursor-pointer"
            >
              <Link to={activeMissionInfo.route}>
                Ir agora <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          ) : activeMissionInfo.nextMissionId ? (
            <Button
              size="sm"
              onClick={advanceToNextMission}
              variant="outline"
              className="h-8 rounded-full border-border/80 bg-secondary/40 px-3 text-xs font-medium text-foreground hover:bg-secondary transition-all cursor-pointer"
            >
              Próximo passo <ArrowRight className="ml-1 size-3" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={closeTour}
              className="h-8 rounded-full px-3 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer"
            >
              <CheckCircle2 className="mr-1 size-3" /> Concluir guia
            </Button>
          )}

          {/* Minimizar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={dismissPill}
            className="size-7 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 cursor-pointer"
            title="Minimizar guia"
            aria-label="Minimizar guia"
          >
            <Minimize2 className="size-3.5" />
          </Button>

          {/* Fechar tour */}
          <Button
            variant="ghost"
            size="icon"
            onClick={closeTour}
            className="size-7 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 cursor-pointer"
            title="Encerrar guia de início"
            aria-label="Encerrar guia de início"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
