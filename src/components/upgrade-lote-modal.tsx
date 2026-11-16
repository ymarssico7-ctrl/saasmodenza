import { useState } from "react";
import { Check, Sparkles, Tag, Printer, History, Zap, ShieldCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UpgradeLoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "quota_reached" | "labels_locked" | "products_limit" | "pos_locked" | "general";
}

export function UpgradeLoteModal({
  open,
  onOpenChange,
  reason = "general",
}: UpgradeLoteModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const title =
    reason === "products_limit"
      ? "🎉 Sua loja está crescendo!"
      : reason === "quota_reached"
      ? "Você atingiu o limite gratuito de 1 lote este mês"
      : reason === "labels_locked"
      ? "Desbloqueie o Gerador de Etiquetas em 1 Clique"
      : reason === "pos_locked"
      ? "Frente de Caixa Ágil (PDV de Balcão)"
      : "Desbloqueie o Vestui Pro (R$ 19,90)";

  const description =
    reason === "products_limit"
      ? "Você atingiu o limite de 10 peças do Plano Gratuito. Ative o Vestui Pro para cadastrar até 60 peças, imprimir etiquetas com código de barras e liberar sacola no WhatsApp."
      : reason === "quota_reached"
      ? "Para cadastrar novos lotes e continuar precificando suas coleções sem limites, ative o Vestui Pro."
      : reason === "pos_locked"
      ? "Registre vendas no balcão em 3 segundos com leitor de código de barras, baixa automática de estoque e comprovante no WhatsApp com o Vestui Pro."
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
            ✦ Plano Vestui Pro
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
            <span><strong>Até 60 Peças no Catálogo:</strong> 6x mais capacidade (de 10 para 60 peças) para cadastrar coleções e vender na vitrine.</span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-foreground font-medium">
            <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3 stroke-[3]" />
            </div>
            <span><strong>Frente de Caixa (PDV Ágil):</strong> vendas rápidas no balcão com leitor de código de barras e baixa de estoque.</span>
          </div>

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
            <span><strong>Vitrine Online com Sacola:</strong> pedidos multi-peças direto no WhatsApp com frete/motoboy.</span>
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
            Desbloquear Vestui Pro Agora
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
