import { useState } from "react";
import { Lock, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionModal } from "@/components/subscription-modal";

type Props = {
  reason?: "expired" | "declined" | "no_plan";
};

export function LojaBloqueadaScreen({ reason = "no_plan" }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const messages = {
    expired: {
      title: "Seu período gratuito encerrou",
      description:
        "Seus produtos, pedidos e dados financeiros estão salvos e protegidos. Assine para voltar a usar o sistema completo.",
    },
    declined: {
      title: "Você ainda não tem uma assinatura ativa",
      description:
        "Seus dados de gestão estão seguros. Quando estiver pronta, ative o Vestui Completo por menos de R$ 2 por dia.",
    },
    no_plan: {
      title: "Ative sua assinatura para continuar",
      description:
        "Para usar o Vestui, escolha um plano. Gestão financeira, vitrine online e pedidos — tudo em um só lugar.",
    },
  };

  const { title, description } = messages[reason];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-surface-muted border border-border mb-6">
        <Lock className="size-9 text-muted-foreground" />
      </div>

      <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground leading-relaxed">{description}</p>

      <div className="mt-5 flex items-center gap-2 text-xs text-success font-medium">
        <ShieldCheck className="size-4" />
        Seus dados estão salvos e protegidos
      </div>

      <div className="mt-8 w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-left">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-3xl font-bold text-foreground">R$57</span>
          <span className="text-sm text-muted-foreground">/mês</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">ou R$ 497/ano com 28% de desconto — Cancele quando quiser</p>

        <ul className="mt-4 space-y-2">
          {[
            "Gestão financeira completa (DRE, caixa, metas)",
            "Vitrine online com link próprio",
            "Gestão de pedidos e clientes",
            "Estoque por grade com fotos",
            "Precificação com margem real",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-success-soft text-success text-[10px] font-bold">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>

        <Button
          id="loja-subscribe-btn"
          className="mt-6 h-12 w-full rounded-full text-base font-semibold cursor-pointer shadow-glow"
          onClick={() => setModalOpen(true)}
        >
          <Zap className="size-4 mr-2" />
          Ativar Vestui Completo
        </Button>
      </div>

      <SubscriptionModal open={modalOpen} onOpenChange={setModalOpen} />

      <p className="mt-4 text-xs text-muted-foreground">
        Precisa de ajuda?{" "}
        <a
          href="https://wa.me/5511999999999"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          Fale conosco no WhatsApp
        </a>
      </p>
    </div>
  );
}
