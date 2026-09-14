import { useState } from "react";
import { Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionModal } from "@/components/subscription-modal";
import { cn } from "@/lib/utils";

type Props = {
  daysLeft: number;
  isUrgent: boolean;
};

export function TrialBanner({ daysLeft, isUrgent }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const dayLabel = daysLeft === 1 ? "dia" : "dias";

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl px-3.5 py-2 text-xs font-medium mb-4 border transition-colors",
          isUrgent
            ? "bg-warning-soft/80 border-warning/40 text-warning-foreground"
            : "bg-primary-soft/60 border-primary/20 text-accent-foreground",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock className={cn("size-3.5 shrink-0", isUrgent ? "text-warning" : "text-primary")} />
          <span className="truncate">
            {daysLeft === 0 ? (
              <>
                <strong>Hoje é o último dia</strong> do período gratuito.
              </>
            ) : (
              <>
                Período gratuito termina em{" "}
                <strong>
                  {daysLeft} {dayLabel}
                </strong>
                .{isUrgent ? " Aproveite todas as funcionalidades da sua loja online sem interrupções." : ""}
              </>
            )}
          </span>
        </div>

        <Button
          id="trial-subscribe-btn"
          size="sm"
          className="h-6.5 shrink-0 rounded-full px-3 text-[11px] font-semibold cursor-pointer shadow-none bg-foreground text-background hover:bg-foreground/90 transition-colors"
          onClick={() => setModalOpen(true)}
        >
          <Zap className="size-3 mr-1" />
          Assinar por R$67/mês
        </Button>
      </div>

      <SubscriptionModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

