import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/db";
import { cn } from "@/lib/utils";

type Props = {
  daysLeft: number;
  isUrgent: boolean;
};

export function TrialBanner({ daysLeft, isUrgent }: Props) {
  const queryClient = useQueryClient();

  const subscribe = useMutation({
    mutationFn: async () => {
      // Aqui no futuro: redirecionar para checkout de pagamento
      // Por enquanto: simulação de assinatura
      const uid = await currentUserId();
      const subExpires = new Date();
      subExpires.setMonth(subExpires.getMonth() + 1);

      const { error } = await supabase.from("profiles").update({
        store_subscription_active: true,
        store_subscription_expires_at: subExpires.toISOString(),
      }).eq("id", uid);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Assinatura ativada! Obrigada. 🎉");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dayLabel = daysLeft === 1 ? "dia" : "dias";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5 text-sm font-medium mb-6 border transition-colors",
        isUrgent
          ? "bg-warning-soft border-warning/40 text-warning-foreground"
          : "bg-primary-soft border-primary/20 text-accent-foreground"
      )}
    >
      <div className="flex items-center gap-2.5">
        <Clock className={cn("size-4 shrink-0", isUrgent ? "text-warning" : "text-primary")} />
        <span>
          {daysLeft === 0 ? (
            <><strong>Hoje é o último dia</strong> do seu período gratuito da Loja Online.</>
          ) : (
            <>Seu período gratuito termina em{" "}
              <strong>{daysLeft} {dayLabel}</strong>.{" "}
              {isUrgent ? "Não perca seus dados!" : ""}
            </>
          )}
        </span>
      </div>

      <Button
        id="trial-subscribe-btn"
        size="sm"
        variant={isUrgent ? "default" : "outline"}
        className="h-8 shrink-0 rounded-full px-4 text-xs font-semibold"
        onClick={() => subscribe.mutate()}
        disabled={subscribe.isPending}
      >
        <Zap className="size-3.5 mr-1.5" />
        {subscribe.isPending ? "Ativando..." : "Assinar por R$67/mês"}
      </Button>
    </div>
  );
}
