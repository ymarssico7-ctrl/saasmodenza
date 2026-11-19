import { useState } from "react";
import {
  Check,
  Sparkles,
  ShoppingBag,
  Store,
  Layers,
  ShoppingBag as BagIcon,
  Zap,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WHATSAPP_SUPORTE } from "@/lib/constants";

interface UpgradeStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "storefront" | "pos" | "inventory" | "fiado" | "prolabore" | "products_limit" | "conditional" | "general";
}

export function UpgradeStoreModal({
  open,
  onOpenChange,
  reason = "general",
}: UpgradeStoreModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");

  const titles: Record<string, string> = {
    fiado: "Acabe com o Calote: Caderninho de Fiado no WhatsApp",
    prolabore: "Separe o Dinheiro da Loja do seu Bolso Pessoal",
    products_limit: "🎉 Sua Loja Cresceu! Desbloqueie Produtos Ilimitados",
    storefront: "Transforme sua Loja em uma Máquina de Vendas Online",
    pos: "Desbloqueie o PDV de Balcão e Feche Vendas em Segundos",
    inventory: "Controle seu Estoque Físico e Online sem Furo de Peças",
    conditional: "Acabe com o Calote: Caderninho de Fiado no WhatsApp",
    general: "Evolua para o Vestui Store Completo",
  };

  const descriptions: Record<string, string> = {
    fiado:
      "Monitore títulos a prazo, vencimentos e envie cobranças amigáveis no WhatsApp com chave Pix em 1 clique para não levar calote.",
    prolabore:
      "Calcule suas retiradas mensais sem descapitalizar a loja, com metas de faturamento e controle de retiradas da sócia.",
    products_limit:
      "Você atingiu o limite de 60 peças do Vestui Pro. Assine o Vestui Store para ter catálogo e estoque 100% ilimitados.",
    storefront:
      "Crie sua vitrine online personalizada, envie sacola pelo WhatsApp e venda 24 horas por dia.",
    pos:
      "Registre vendas no balcão rapidamente, lance descontos e dê baixa automática no estoque.",
    inventory:
      "Saiba exatamente quantas peças tem em estoque, grade por tamanho e cor, com alertas de reposição.",
    conditional:
      "Monitore títulos a prazo, vencimentos e envie cobranças amigáveis no WhatsApp com chave Pix em 1 clique.",
    general:
      "Tudo o que sua loja física e online precisa para faturar alto e operar sem planilhas confusas.",
  };

  const handleCheckout = () => {
    const planText = billingCycle === "yearly" ? "Vestui Store Anual" : "Vestui Store Mensal";
    const msg = encodeURIComponent(
      `Olá! Quero ativar o plano *${planText}* na minha loja. Como posso finalizar a assinatura?`
    );
    window.open(`https://wa.me/${WHATSAPP_SUPORTE}?text=${msg}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-primary">
            <Store className="size-6 text-primary animate-pulse" />
          </div>
          <Badge
            variant="outline"
            className="mx-auto mb-2 border-primary/30 text-primary font-bold text-xs uppercase tracking-wider"
          >
            ✦ Vestui Store • O Sistema Completo da Loja de Moda
          </Badge>
          <DialogTitle className="text-xl sm:text-2xl font-display font-bold leading-tight">
            {titles[reason] || titles["general"]}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {descriptions[reason] || descriptions["general"]}
          </DialogDescription>
        </DialogHeader>

        {/* SELETOR DE CICLO */}
        <div className="flex items-center justify-center gap-2 my-2">
          <div className="flex p-1 bg-muted/60 rounded-full border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === "yearly"
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Anual</span>
              <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                Economize 30%
              </span>
            </button>
          </div>
        </div>

        {/* BENEFÍCIOS DO PLANO */}
        <div className="space-y-2.5 my-3 bg-muted/30 p-4 rounded-2xl border border-border text-left">
          <div className="flex items-start gap-2.5 text-xs text-foreground font-medium">
            <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3 stroke-[3]" />
            </div>
            <span>
              <strong>Produtos e Lotes Ilimitados:</strong> Sem teto de 60 peças. Cadastre centenas ou milhares de roupas no estoque.
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-foreground font-medium">
            <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3 stroke-[3]" />
            </div>
            <span>
              <strong>Caderninho de Fiado Digital com WhatsApp:</strong> Acompanhe títulos em aberto, vencimentos e envie cobranças carinhosas com Pix em 1 clique.
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-foreground font-medium">
            <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3 stroke-[3]" />
            </div>
            <span>
              <strong>Pró-labore da Dona & Metas Financeiras:</strong> Saiba quanto pode transferir para seu bolso no mês e separe as finanças da loja.
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-foreground font-medium">
            <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3 stroke-[3]" />
            </div>
            <span>
              <strong>DRE Financeiro Completo & CMV:</strong> Acompanhe faturamento, margem real, custos das peças vendidas e saiba o lucro líquido da loja.
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-foreground font-medium">
            <div className="size-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="size-3 stroke-[3]" />
            </div>
            <span>
              <strong>Tudo do Vestui Pro Incluso:</strong> Frente de caixa (PDV), etiquetas com código de barras, vitrine online e precificação ilimitada.
            </span>
          </div>
        </div>

        {/* PREÇO E AÇÃO */}
        <div className="text-center pt-2">
          {billingCycle === "yearly" ? (
            <div>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">12x de</span>
                <span className="text-3xl font-display font-black text-foreground">R$ 67,00</span>
                <span className="text-xs font-semibold text-muted-foreground">/ mês</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Ou R$ 797 à vista no PIX (economia de mais de R$ 360 no ano)
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Apenas</span>
                <span className="text-3xl font-display font-black text-foreground">R$ 97,00</span>
                <span className="text-xs font-semibold text-muted-foreground">/ mês</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Sem fidelidade • Cancele quando quiser com 1 clique
              </p>
            </div>
          )}

          <Button
            onClick={handleCheckout}
            className="w-full mt-4 h-12 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow cursor-pointer gap-2"
          >
            <Sparkles className="size-4" />
            Ativar o Vestui Store Agora
            <ArrowRight className="size-4 ml-1" />
          </Button>

          <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              Garantia de 7 dias
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Zap className="size-3.5 text-amber-500" />
              Liberação Imediata
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
