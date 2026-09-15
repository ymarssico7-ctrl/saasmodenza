import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  CreditCard,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, isAuthenticated, updateDemoProfile } from "@/lib/db";
import { cn } from "@/lib/utils";

import { CHAVE_PIX_VESTUI, WHATSAPP_SUPORTE } from "@/lib/constants";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlan?: "mensal" | "anual";
};

export function SubscriptionModal({ open, onOpenChange, defaultPlan = "anual" }: Props) {
  const [cycle, setCycle] = useState<"mensal" | "anual">(defaultPlan);
  const [copiedPix, setCopiedPix] = useState(false);
  const queryClient = useQueryClient();

  const isAnual = cycle === "anual";
  // Pricing: R$57/mês ou R$497/ano (R$41.41/mês)
  const valorTexto = isAnual ? "R$ 497 / ano (R$ 41/mês)" : "R$ 57 / mês";

  const activateSub = useMutation({
    mutationFn: async () => {
      const uid = await currentUserId();
      const isAuth = await isAuthenticated();
      const expires = new Date();
      if (isAnual) {
        expires.setFullYear(expires.getFullYear() + 1);
      } else {
        expires.setMonth(expires.getMonth() + 1);
      }

      const planSelected = isAnual ? "gestao_anual" : "digital";
      const expiresIso = expires.toISOString();
      const renewalDate = expiresIso.slice(0, 10);

      if (isAuth) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            plan: planSelected,
            plan_renewal_date: renewalDate,
          })
          .eq("id", uid);
        if (profileError) throw new Error(profileError.message);

        const { error: storeError } = await supabase
          .from("stores")
          .update({
            plan: planSelected,
            store_subscription_active: true,
            store_subscription_expires_at: expiresIso,
            plan_expires_at: renewalDate,
            plan_renewal_date: renewalDate,
          })
          .eq("owner_id", uid);
        if (storeError) throw new Error(storeError.message);
      } else {
        updateDemoProfile({
          plan: planSelected,
          store_subscription_active: true,
          store_subscription_expires_at: expiresIso,
        });
      }

      queryClient.setQueryData(["profile"], (old: Record<string, unknown> | undefined) => ({
        ...(old ?? {}),
        plan: planSelected,
        plan_renewal_date: renewalDate,
        store_subscription_active: true,
        store_subscription_expires_at: expiresIso,
      }));

      queryClient.setQueryData(["active_store"], (old: Record<string, unknown> | undefined) => ({
        ...(old ?? {}),
        plan: planSelected,
        store_subscription_active: true,
        store_subscription_expires_at: expiresIso,
        plan_expires_at: renewalDate,
        plan_renewal_date: renewalDate,
      }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["active_store"] });
      toast.success("Assinatura Vestui ativada! Bem-vinda ao sistema completo. 🎉");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCopyPix = () => {
    void navigator.clipboard.writeText(CHAVE_PIX_VESTUI);
    setCopiedPix(true);
    toast.success("Chave Pix copiada!", {
      description: `${CHAVE_PIX_VESTUI}`,
    });
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleOpenWhatsApp = () => {
    const planoNome = isAnual ? "Anual (R$ 497/ano)" : "Mensal (R$ 57/mês)";
    const text = encodeURIComponent(
      `Olá! Quero assinar o Vestui no Plano ${planoNome} para a minha loja. Como faço para pagar e ativar agora?`,
    );
    window.open(`https://wa.me/${WHATSAPP_SUPORTE}?text=${text}`, "_blank");
  };

  const handleSendComprovante = () => {
    const planoNome = isAnual ? "Anual (R$ 497)" : "Mensal (R$ 57)";
    const text = encodeURIComponent(
      `Olá! Acabei de fazer o Pix de ${planoNome} para assinar o Vestui. Segue meu comprovante para ativação!`,
    );
    window.open(`https://wa.me/${WHATSAPP_SUPORTE}?text=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border bg-card rounded-3xl shadow-lift sm:max-w-2xl">
        {/* Banner Superior */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 pt-8 pb-6 border-b border-border/60 text-center sm:px-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow mb-4">
            <Sparkles className="size-6" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Zap className="size-3.5 fill-primary" /> Vestui Completo
          </span>

          <DialogTitle className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Tudo o que sua loja precisa para crescer
          </DialogTitle>

          <DialogDescription className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Gestão financeira, controle de estoque, vitrine online no Instagram e pedidos no WhatsApp — em um único sistema.
          </DialogDescription>

          {/* Toggle Mensal vs Anual */}
          <div className="mt-6 inline-flex items-center rounded-full bg-secondary/80 p-1 border border-border/80">
            <button
              type="button"
              onClick={() => setCycle("mensal")}
              className={cn(
                "rounded-full px-5 py-2 text-xs font-semibold transition-all cursor-pointer",
                !isAnual
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setCycle("anual")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold transition-all cursor-pointer",
                isAnual
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Anual
              <span className="rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-bold text-warning-foreground">
                28% OFF
              </span>
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Card do Preço */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary-soft/50 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Plano selecionado
              </p>
              <h3 className="text-lg font-bold text-foreground">
                Vestui {isAnual ? "Anual ✦" : "Mensal"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAnual
                  ? "Faturado anualmente em parcela única (economize R$ 187)"
                  : "Assinatura mensal recorrente, cancele quando desejar"}
              </p>
            </div>
            <div className="text-center sm:text-right">
              <span className="text-3xl font-extrabold text-primary font-display">
                {isAnual ? "R$ 41" : "R$ 57"}
              </span>
              <span className="text-xs text-muted-foreground">/mês</span>
              {isAnual && (
                <p className="text-[11px] font-medium text-muted-foreground">
                  (R$ 497 faturado ao ano)
                </p>
              )}
            </div>
          </div>

          {/* Benefícios */}
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            {[
              "Vitrine Online com seu subdomínio e link de bio",
              "Pedidos direto no WhatsApp com checkout integrado",
              "Gestão de estoque por grade (tamanhos, cores e fotos)",
              "DRE em tempo real e controle de pró-labore",
              "Precificador com cálculo de margem e markup real",
              "Suporte individual e onboarding no WhatsApp",
            ].map((beneficio, i) => (
              <div key={i} className="flex items-center gap-2 text-foreground/90">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check className="size-3 stroke-[2.5]" />
                </div>
                <span>{beneficio}</span>
              </div>
            ))}
          </div>

          {/* Pagamento */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="size-5 text-primary" />
                <p className="text-sm font-semibold">Pagar via Pix (Liberação rápida)</p>
              </div>
              <span className="text-xs font-semibold text-primary">{valorTexto}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 truncate rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs font-mono text-muted-foreground">
                {CHAVE_PIX_VESTUI}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl text-xs font-semibold gap-1.5 shrink-0"
                onClick={handleCopyPix}
              >
                <Copy className="size-3.5" />
                {copiedPix ? "Copiado!" : "Copiar chave"}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                type="button"
                variant="default"
                className="flex-1 h-11 rounded-full text-xs font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
                onClick={handleSendComprovante}
              >
                <MessageCircle className="size-4" />
                Enviar comprovante no WhatsApp
              </Button>

              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 rounded-full text-xs font-semibold gap-2 cursor-pointer"
                onClick={handleOpenWhatsApp}
              >
                <CreditCard className="size-4" />
                Pagar com Cartão (Até 12x)
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span>Garantia de 7 dias ou seu dinheiro de volta.</span>
            </div>

            <button
              type="button"
              disabled={activateSub.isPending}
              onClick={() => activateSub.mutate()}
              className="text-primary hover:underline font-medium cursor-pointer"
            >
              {activateSub.isPending ? "Ativando..." : "Já pagou? Ativar agora"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
