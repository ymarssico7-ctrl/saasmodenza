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
  Store,
  Tag,
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
  initialTier?: "free" | "lote" | "store";
};

export function SubscriptionModal({
  open,
  onOpenChange,
  defaultPlan = "mensal",
  initialTier = "store",
}: Props) {
  const [tier, setTier] = useState<"free" | "lote" | "store">(initialTier);
  const [cycle, setCycle] = useState<"mensal" | "anual">(defaultPlan);
  const [copiedPix, setCopiedPix] = useState(false);
  const queryClient = useQueryClient();

  const isAnual = cycle === "anual";

  // Valores dinâmicos por plano e ciclo
  const valorTexto =
    tier === "free"
      ? "Gratuito (R$ 0)"
      : tier === "lote"
      ? "R$ 19,90 / mês"
      : isAnual
      ? "R$ 797 / ano (R$ 67/mês)"
      : "R$ 97 / mês";

  const activateSub = useMutation({
    mutationFn: async () => {
      const uid = await currentUserId();
      const isAuth = await isAuthenticated();
      const expires = new Date();
      if (isAnual && tier === "store") {
        expires.setFullYear(expires.getFullYear() + 1);
      } else {
        expires.setMonth(expires.getMonth() + 1);
      }

      const isStoreActive = tier === "store";
      const planSelected =
        tier === "free"
          ? "free"
          : tier === "lote"
          ? "lote"
          : isAnual
          ? "gestao_anual"
          : "store";

      const expiresIso = expires.toISOString();
      const renewalDate = expiresIso.slice(0, 10);

      if (isAuth) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            plan: planSelected,
            plan_tier: tier,
            plan_renewal_date: tier === "free" ? null : renewalDate,
          })
          .eq("id", uid);
        if (profileError) throw new Error(profileError.message);

        const { error: storeError } = await supabase
          .from("stores")
          .update({
            plan: planSelected,
            store_subscription_active: isStoreActive,
            store_subscription_expires_at: isStoreActive ? expiresIso : null,
            plan_expires_at: tier === "free" ? null : renewalDate,
            plan_renewal_date: tier === "free" ? null : renewalDate,
          })
          .eq("owner_id", uid);
        if (storeError) throw new Error(storeError.message);
      } else {
        updateDemoProfile({
          plan: planSelected,
          plan_tier: tier,
          store_subscription_active: isStoreActive,
          store_subscription_expires_at: isStoreActive ? expiresIso : null,
        });
      }

      queryClient.setQueryData(["profile"], (old: Record<string, unknown> | undefined) => ({
        ...(old ?? {}),
        plan: planSelected,
        plan_tier: tier,
        plan_renewal_date: tier === "free" ? null : renewalDate,
        store_subscription_active: isStoreActive,
        store_subscription_expires_at: isStoreActive ? expiresIso : null,
      }));

      queryClient.setQueryData(["active_store"], (old: Record<string, unknown> | undefined) => ({
        ...(old ?? {}),
        plan: planSelected,
        store_subscription_active: isStoreActive,
        store_subscription_expires_at: isStoreActive ? expiresIso : null,
      }));

      return planSelected;
    },
    onSuccess: (planSelected) => {
      const planName =
        planSelected === "free"
          ? "Plano Gratuito"
          : planSelected === "lote"
          ? "Vestui Lote"
          : "Vestui Store";
      toast.success(`Plano atualizado para ${planName}!`, {
        description:
          planSelected === "free"
            ? "Você agora tem acesso à precificação básica com cota de até 3 lotes/mês."
            : `Seu plano ${planName} já está liberado.`,
      });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Erro ao ativar", { description: err.message });
    },
  });

  const copyPix = () => {
    navigator.clipboard.writeText(CHAVE_PIX_VESTUI);
    setCopiedPix(true);
    toast.success("Chave Pix copiada!");
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const openWhatsApp = () => {
    const planoEscolhido =
      tier === "free"
        ? "Plano Gratuito"
        : tier === "lote"
        ? "Vestui Lote (R$ 19,90/mês)"
        : isAnual
        ? "Vestui Store Anual (R$ 797/ano)"
        : "Vestui Store Mensal (R$ 97/mês)";

    const msg = encodeURIComponent(
      `Olá! Gostaria de falar sobre o plano *${planoEscolhido}* no Vestui.`
    );
    window.open(`https://wa.me/${WHATSAPP_SUPORTE}?text=${msg}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-3xl border-border/80">
        {/* Cabeçalho */}
        <div className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background p-6 pb-4 sm:p-8 sm:pb-4 text-center border-b border-border/60">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="size-3.5" />
            Planos Oficiais Vestui
          </span>

          <DialogTitle className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl font-display">
            Escolha o Plano Ideal para Sua Loja
          </DialogTitle>

          <DialogDescription className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Desde a calculadora inteligente gratuita até a gestão completa de vendas físicas e online.
          </DialogDescription>

          {/* Seletor dos 3 Planos (Gratuito vs Lote vs Store) */}
          <div className="mt-5 grid grid-cols-3 gap-1.5 sm:gap-2 max-w-lg mx-auto p-1 bg-secondary/80 rounded-2xl border border-border/80">
            <button
              type="button"
              onClick={() => setTier("free")}
              className={cn(
                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                tier === "free"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="size-3.5 text-amber-500 shrink-0" />
              <span>Gratuito</span>
              <span className="text-[10px] bg-background/80 px-1 py-0.2 rounded-md font-semibold">
                R$ 0
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTier("lote")}
              className={cn(
                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                tier === "lote"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Tag className="size-3.5 text-emerald-600 shrink-0" />
              <span>Vestui Lote</span>
              <span className="text-[10px] bg-background/80 px-1 py-0.2 rounded-md font-semibold">
                R$ 19,90
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTier("store")}
              className={cn(
                "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                tier === "store"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Store className="size-3.5 shrink-0" />
              <span>Vestui Store</span>
              <span className="text-[10px] bg-background text-foreground px-1 py-0.2 rounded-md font-semibold">
                Completo
              </span>
            </button>
          </div>

          {/* Toggle Mensal vs Anual (Apenas no plano Store) */}
          {tier === "store" && (
            <div className="mt-3 inline-flex items-center rounded-full bg-background/80 p-1 border border-border/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setCycle("mensal")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  !isAnual
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Mensal (R$ 97)
              </button>
              <button
                type="button"
                onClick={() => setCycle("anual")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  isAnual
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Anual (R$ 67/mês)</span>
                <span className="rounded-full bg-emerald-500 text-white px-1.5 py-0.2 text-[9px] font-extrabold uppercase">
                  30% OFF
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-7 space-y-5">
          {/* Card do Preço Selecionado */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Plano selecionado
              </p>
              <h3 className="text-lg font-bold text-foreground">
                {tier === "free"
                  ? "Plano Gratuito • Precificação Inteligente"
                  : tier === "lote"
                  ? "Vestui Lote & Etiquetas • R$ 19,90"
                  : isAnual
                  ? "Vestui Store Anual ✦"
                  : "Vestui Store Mensal"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tier === "free"
                  ? "Cálculo de margem real, markup e desconto seguro para até 3 lotes por mês"
                  : tier === "lote"
                  ? "Precificação ilimitada, etiquetas com código de barras e simulador de margens"
                  : isAnual
                  ? "Faturado anualmente em parcela única (economize mais de R$ 360 no ano)"
                  : "Loja física e online integradas, PDV e estoque unificado"}
              </p>
            </div>
            <div className="text-center sm:text-right">
              <span className="text-3xl font-extrabold text-foreground font-display">
                {tier === "free" ? "R$ 0" : tier === "lote" ? "R$ 19,90" : isAnual ? "R$ 67" : "R$ 97"}
              </span>
              <span className="text-xs text-muted-foreground">/mês</span>
              {tier === "store" && isAnual && (
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                  (R$ 797 faturado ao ano)
                </p>
              )}
            </div>
          </div>

          {/* Benefícios Dinâmicos */}
          <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
            {(tier === "free"
              ? [
                  "Calculadora com margem real e markup seguro",
                  "Simulador de desconto comercial máximo",
                  "Até 3 lotes de precificação por mês",
                  "100% gratuito, sem cartão de crédito",
                  "Impressão de etiquetas: requer Vestui Lote",
                  "Loja online e PDV: requer Vestui Store",
                ]
              : tier === "lote"
              ? [
                  "Lotes e precificações ilimitadas todo mês",
                  "Gerador de etiquetas em folha A4 comum (Pimaco 6180)",
                  "Impressão em bobina térmica (50x30mm) com código de barras",
                  "Histórico completo das coleções salvo na nuvem",
                  "Simulador de desconto comercial máximo seguro",
                  "Cancele quando quiser sem fidelidade",
                ]
              : [
                  "Vitrine Online com sacola de pedidos no WhatsApp",
                  "PDV de Balcão ágil com baixa automática no estoque",
                  "Estoque 100% unificado (físico + online sem furo)",
                  "Gestão de Condicional / Malinha com comprovante",
                  "DRE em tempo real, fluxo de caixa e pró-labore",
                  "Tudo do Vestui Lote incluso (etiquetas e precificação)",
                ]
            ).map((beneficio, i) => (
              <div key={i} className="flex items-center gap-2 text-foreground/90 font-medium">
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    beneficio.includes("requer")
                      ? "bg-muted text-muted-foreground"
                      : "bg-emerald-500/15 text-emerald-600"
                  )}
                >
                  <Check className="size-3 stroke-[2.5]" />
                </div>
                <span className={beneficio.includes("requer") ? "text-muted-foreground" : ""}>
                  {beneficio}
                </span>
              </div>
            ))}
          </div>

          {/* Ação / Pagamento */}
          {tier === "free" ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 space-y-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="size-4 text-amber-500" />
                <p className="text-sm font-bold text-foreground">Plano Gratuito Disponível</p>
              </div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Deseja usar ou testar o Plano Gratuito? Você poderá precificar até 3 lotes por mês sem nenhum custo.
              </p>
              <Button
                type="button"
                onClick={() => activateSub.mutate()}
                disabled={activateSub.isPending}
                className="w-full sm:w-auto h-10 px-6 rounded-full font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer gap-2"
              >
                <Check className="size-3.5 stroke-[3]" />
                {activateSub.isPending ? "Ativando..." : "Confirmar e Ativar o Plano Gratuito"}
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="size-4 text-primary" />
                  <p className="text-xs sm:text-sm font-bold">Pagar via Pix (Liberação rápida)</p>
                </div>
                <span className="text-xs font-bold text-primary">{valorTexto}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 rounded-xl bg-card border border-border/80 px-3 py-2 text-xs font-mono text-muted-foreground truncate select-all">
                  {CHAVE_PIX_VESTUI}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyPix}
                  className="shrink-0 rounded-xl text-xs font-semibold cursor-pointer h-9"
                >
                  <Copy className="size-3.5 mr-1.5" />
                  {copiedPix ? "Copiado!" : "Copiar Chave"}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openWhatsApp}
                  className="w-full sm:w-auto rounded-xl text-xs font-semibold cursor-pointer text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 h-9"
                >
                  <MessageCircle className="size-3.5 mr-1.5" />
                  Enviar Comprovante no WhatsApp
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => activateSub.mutate()}
                  disabled={activateSub.isPending}
                  className="w-full sm:w-auto rounded-xl text-xs font-bold gradient-primary shadow-glow cursor-pointer h-9 px-5"
                >
                  <Zap className="size-3.5 mr-1.5" />
                  {activateSub.isPending ? "Ativando..." : "Confirmar Pagamento"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              Garantia de 7 dias
            </span>
            <span>•</span>
            <span>Suporte humanizado no WhatsApp</span>
            <span>•</span>
            <span>Cancele a qualquer momento</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
