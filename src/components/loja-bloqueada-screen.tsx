import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, isAuthenticated } from "@/lib/db";

type Props = {
  reason: "expired" | "declined" | "no_plan";
};

export function LojaBloqueadaScreen({ reason }: Props) {
  const queryClient = useQueryClient();

  const subscribe = useMutation({
    mutationFn: async () => {
      const uid = await currentUserId();
      const realUser = await isAuthenticated();
      const subExpires = new Date();
      subExpires.setMonth(subExpires.getMonth() + 1);

      if (realUser) {
        const { error } = await supabase.from("profiles").update({
          store_subscription_active: true,
          store_subscription_expires_at: subExpires.toISOString(),
          store_trial_accepted: true,
        }).eq("id", uid);
        if (error) throw new Error(error.message);
      }

      // Atualiza cache local independente de auth
      queryClient.setQueryData(["profile"], (old: any) => ({
        ...old,
        store_subscription_active: true,
        store_subscription_expires_at: subExpires.toISOString(),
        store_trial_accepted: true,
      }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Loja reativada com sucesso! 🎉");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const messages = {
    expired: {
      title: "Seu período gratuito encerrou",
      description:
        "Seus produtos, pedidos e configurações estão salvos e seguros. Para voltar a vender online, assine o plano mensal.",
    },
    declined: {
      title: "Sua loja online está pausada",
      description:
        "Você optou por não ativar a loja online. Se mudou de ideia, é só assinar — seus dados de gestão já estão aqui.",
    },
    no_plan: {
      title: "Recurso não disponível",
      description:
        "A Loja Online é um módulo separado do plano de Gestão. Assine para começar a vender online.",
    },
  };

  const { title, description } = messages[reason];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-surface-muted border border-border mb-6">
        <Lock className="size-9 text-muted-foreground" />
      </div>

      <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      <div className="mt-5 flex items-center gap-2 text-xs text-success font-medium">
        <ShieldCheck className="size-4" />
        Seus dados estão salvos e protegidos
      </div>

      <div className="mt-8 w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-left">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-bold text-foreground">R$67</span>
          <span className="text-sm text-muted-foreground">/mês</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Cancele quando quiser</p>

        <ul className="mt-4 space-y-2">
          {[
            "Vitrine online com link próprio",
            "Gestão de pedidos e clientes",
            "Cupons de desconto",
            "Frete e rastreio integrado",
            "Relatórios de vendas online",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success-soft text-success text-[10px] font-bold">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <Button
          id="loja-subscribe-btn"
          className="mt-6 h-12 w-full rounded-full text-base font-semibold"
          onClick={() => subscribe.mutate()}
          disabled={subscribe.isPending}
        >
          <Zap className="size-4 mr-2" />
          {subscribe.isPending ? "Ativando..." : "Reativar minha loja"}
        </Button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Quer continuar só com a Gestão?{" "}
        <a href="/painel" className="underline hover:text-foreground transition-colors">
          Voltar ao painel
        </a>
      </p>
    </div>
  );
}
