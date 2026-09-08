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
          "flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5 text-sm font-medium mb-6 border transition-colors",
          isUrgent
            ? "bg-warning-soft border-warning/40 text-warning-foreground"
            : "bg-primary-soft border-primary/20 text-accent-foreground",
        )}
      >
        <div className="flex items-center gap-2.5">
          <Clock className={cn("size-4 shrink-0", isUrgent ? "text-warning" : "text-primary")} />
          <span>
            {daysLeft === 0 ? (
              <>
                <strong>Hoje é o último dia</strong> do seu período gratuito da Loja Online.
              </>
            ) : (
              <>
                Seu período gratuito termina em{" "}
                <strong>
                  {daysLeft} {dayLabel}
                </strong>
                . {isUrgent ? "Não perca seus dados!" : ""}
              </>
            )}
          </span>
        </div>

        <Button
          id="trial-subscribe-btn"
          size="sm"
          variant={isUrgent ? "default" : "outline"}
          className="h-8 shrink-0 rounded-full px-4 text-xs font-semibold cursor-pointer"
          onClick={() => setModalOpen(true)}
        >
          <Zap className="size-3.5 mr-1.5" />
          Assinar por R$67/mês
        </Button>
      </div>

      <SubscriptionModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}

