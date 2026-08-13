import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Gift, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, isAuthenticated, updateDemoProfile } from "@/lib/db";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Calcula data de expiração do trial (30 dias a partir de agora)
function getTrialExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

export function TrialOfferModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [decided, setDecided] = useState(false);

  const acceptTrial = useMutation({
    mutationFn: async () => {
      const trialExpires = getTrialExpiry();
      const uid = await currentUserId();
      const realUser = await isAuthenticated();

      if (realUser) {
        // Usuário real → grava no Supabase
        const { error } = await supabase
          .from("profiles")
          .update({
            store_trial_accepted: true,
            store_trial_offered_at: new Date().toISOString(),
            store_trial_expires_at: trialExpires,
          } as any)
          .eq("id", uid);
        if (error) throw new Error(error.message);
      } else {
        // Modo demo → persiste no localStorage para sobreviver ao invalidateQueries
        updateDemoProfile({
          store_trial_accepted: true,
          store_trial_offered_at: new Date().toISOString(),
          store_trial_expires_at: trialExpires,
        });
      }

      // Atualiza cache React Query imediatamente (sem esperar refetch)
      queryClient.setQueryData(["profile"], (old: any) => ({
        ...old,
        store_trial_accepted: true,
        store_trial_offered_at: new Date().toISOString(),
        store_trial_expires_at: trialExpires,
      }));
    },
    onSuccess: () => {
      setDecided(true);
      toast.success("Sua loja online está ativa! Você tem 30 dias grátis. 🎉");
      setTimeout(onClose, 1800);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const declineTrial = useMutation({
    mutationFn: async () => {
      const uid = await currentUserId();
      const realUser = await isAuthenticated();

      if (realUser) {
        // Usuário real → grava no Supabase
        const { error } = await supabase
          .from("profiles")
          .update({
            store_trial_accepted: false,
            store_trial_offered_at: new Date().toISOString(),
          } as any)
          .eq("id", uid);
        if (error) throw new Error(error.message);
      } else {
        // Modo demo → persiste no localStorage
        updateDemoProfile({
          store_trial_accepted: false,
          store_trial_offered_at: new Date().toISOString(),
        });
      }

      // Atualiza cache React Query imediatamente
      queryClient.setQueryData(["profile"], (old: any) => ({
        ...old,
        store_trial_accepted: false,
        store_trial_offered_at: new Date().toISOString(),
      }));
    },
    onSuccess: () => {
      onClose();
      toast.info("Tudo bem! Você pode ativar a Loja Online quando quiser nas Configurações.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) return null;

  const isPending = acceptTrial.isPending || declineTrial.isPending;

  return (
    // Backdrop — sem X para fechar (decisão obrigatória)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border shadow-lift p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Ícone */}
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft mb-6">
          <Gift className="size-8 text-primary" />
        </div>

        {/* Cabeçalho */}
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Presente especial para você
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
          Como assinante do plano{" "}
          <span className="font-semibold text-foreground">Gestão Anual</span>, você ganhou{" "}
          <span className="font-semibold text-primary">30 dias grátis</span> da Loja Online
          integrada. <strong>Sem cartão de crédito.</strong>
        </p>

        {/* O que está incluso */}
        <ul className="mt-5 w-full space-y-2 text-left text-sm">
          {[
            "Vitrine online com seus produtos",
            "Gestão de pedidos e clientes",
            "Cupons, fretes e relatórios",
            "Integrado ao seu painel de gestão",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-muted-foreground">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success text-xs font-bold">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>

        {/* Botões */}
        <div className="mt-8 flex flex-col gap-3 w-full">
          {decided ? (
            <div className="flex items-center justify-center gap-2 py-3 text-success font-semibold">
              <Store className="size-5" />
              Loja ativada! Redirecionando...
            </div>
          ) : (
            <>
              <Button
                id="trial-accept-btn"
                className="h-12 rounded-full text-base font-semibold w-full"
                onClick={() => acceptTrial.mutate()}
                disabled={isPending}
              >
                {acceptTrial.isPending ? "Ativando..." : "Quero minha loja grátis 🎉"}
              </Button>
              <button
                id="trial-decline-btn"
                onClick={() => declineTrial.mutate()}
                disabled={isPending}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2 disabled:opacity-50"
              >
                Não, obrigada — continuar só com Gestão
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
