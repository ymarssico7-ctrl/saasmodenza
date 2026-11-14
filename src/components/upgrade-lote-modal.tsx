import { useState } from "react";
import { Check, Sparkles, Tag, Printer, History, Zap, ShieldCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UpgradeLoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "quota_reached" | "labels_locked" | "general";
}

export function UpgradeLoteModal({
  open,
  onOpenChange,
  reason = "general",
}: UpgradeLoteModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const title =
    reason === "quota_reached"
      ? "Você atingiu o limite gratuito de 3 lotes este mês"
      : reason === "labels_locked"
      ? "Desbloqueie o Gerador de Etiquetas em 1 Clique"
      : "Desbloqueie o Vestui Lote & Etiquetas";

  const description =
    reason === "quota_reached"
      ? "Para cadastrar novos lotes e continuar precificando suas coleções sem limites, ative o Vestui Lote."
      : "Imprima etiquetas com código de barras prontas para folha A4 e controle todos os seus lotes de atacado.";

  const handleCheckout = () => {
    // Redireciona para o checkout do gateway de pagamento ou WhatsApp do suporte
    window.open("https://chk.eduzz.com/vestui-lote?cupom=VIP", "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-6 text-primary animate-pulse" />
          </div>
          <Badge variant="outline" className="mx-auto mb-2 border-primary/30 text-primary font-bold text-xs uppercase">
            ✦ Plano Vestui Lote
          </Badge>
          <DialogTitle className="text-xl font-display font-bold leading-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* BENEFÍCIOS DO PLANO */}
        <div className="space-y-2.5 my-4 bg-muted/40 p-4 rounded-2xl border border-hairline text-left">
          <div className="flex items-start gap-2.5 text-xs text-foreground font-medium">
            <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3 stroke-[3]" />
            </div>
            <span><strong>Lotes e Precificação Ilimitados:</strong> cadastre quantas peças e coleções quiser no mês.</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-foreground font-medium">
            <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3 stroke-[3]" />
            </div>
            <span><strong>Gerador de Etiquetas de Código de Barras:</strong> imprima em folha A4 comum ou impressora térmica em segundos.</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-foreground font-medium">
            <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3 stroke-[3]" />
            </div>
            <span><strong>Histórico Completo na Nuvem:</strong> compare fornecedores e nunca perca o custo das suas coleções.</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-foreground font-medium">
            <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3 stroke-[3]" />
            </div>
            <span><strong>Simulador de Desconto Seguro:</strong> saiba exatamente quanto pode dar de desconto sem ter prejuízo.</span>
          </div>
        </div>

        {/* PREÇO E AÇÃO */}
        <div className="text-center pt-2">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Apenas</span>
            <span className="text-3xl font-display font-extrabold text-foreground">R$ 19,90</span>
            <span className="text-xs font-semibold text-muted-foreground">/ mês</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Menos de R$ 0,66 por dia • Cancele quando quiser sem burocracia
          </p>

          <Button
            onClick={handleCheckout}
            className="w-full mt-4 h-12 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow cursor-pointer gap-2"
          >
            <Zap className="size-4" />
            Desbloquear Vestui Lote Agora
          </Button>

          <p className="text-[10px] text-muted-foreground mt-3 flex items-center justify-center gap-1">
            <ShieldCheck className="size-3 text-emerald-600" />
            Pagamento 100% seguro com ativação instantânea
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
