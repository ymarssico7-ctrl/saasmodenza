import { Link } from "@tanstack/react-router";
import {
  Layers,
  PackageOpen,
  Printer,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UpgradeLoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "quota_reached" | "labels_locked" | "products_limit" | "pos_locked" | "general";
}

function getHeaderInfo(reason: UpgradeLoteModalProps["reason"]) {
  switch (reason) {
    case "labels_locked":
      return {
        headline: "Desbloqueie Etiquetas e a Gestão Completa da Loja",
        sub: "Imprima etiquetas com código de barras e leve catálogo de 60 peças, lotes ilimitados e PDV por R$ 0,66/dia.",
      };
    case "quota_reached":
      return {
        headline: "Precifique Lotes Ilimitados e Venda Mais",
        sub: "Acabe com a trava de 1 lote/mês do Free e continue precificando coleções sem limites por R$ 0,66/dia.",
      };
    case "products_limit":
      return {
        headline: "Expanda seu Catálogo de 10 para até 60 Peças",
        sub: "Sua loja cresceu! Desbloqueie 6x mais espaço no catálogo, vitrine online, PDV e etiquetas por R$ 0,66/dia.",
      };
    case "pos_locked":
      return {
        headline: "Ative a Frente de Caixa e Venda em 3 Segundos",
        sub: "Registre vendas com leitor de código de barras no balcão e dê baixa no estoque em tempo real por R$ 0,66/dia.",
      };
    default:
      return {
        headline: "Sua Loja Pronta para Vender Mais no Físico e Online",
        sub: "Mais capacidade no catálogo, precificação ilimitada, frente de caixa rápida e etiquetas por apenas R$ 0,66 ao dia.",
      };
  }
}

export function UpgradeLoteModal({
  open,
  onOpenChange,
  reason = "general",
}: UpgradeLoteModalProps) {
  const { headline, sub } = getHeaderInfo(reason);

  const handleCheckout = () => {
    window.open("https://chk.eduzz.com/vestui-lote?cupom=VIP", "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] p-5 sm:p-6 gap-0 rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden max-h-[calc(100vh-2rem)]">
        <div className="space-y-3.5 text-center">
          {/* ── Topo Nobre com Badge de Plano ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-center">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
                <Tag className="size-3.5 text-primary shrink-0" />
                <span>PLANO VESTUI PRO · R$ 19,90/MÊS</span>
              </Badge>
            </div>

            <h2 className="text-lg sm:text-xl font-display font-extrabold text-foreground tracking-tight leading-snug">
              {headline}
            </h2>

            <p className="text-xs text-muted-foreground leading-snug max-w-sm mx-auto">
              {sub}
            </p>
          </div>

          {/* ── 4 Pilares Comerciais Reais (Checklist Clean & Fluido) ── */}
          <div className="space-y-2.5 py-0.5 text-left">
            {/* 1. Catálogo Expandido */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <PackageOpen className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-tight">
                  Catálogo Expandido para até 60 Peças
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  De 10 para 60 roupas com fotos, cores e tamanhos na sua vitrine online aberta 24h para o Instagram.
                </p>
              </div>
            </div>

            {/* 2. Lotes Ilimitados */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-tight">
                  Lotes de Precificação Ilimitados
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Acabe com a trava de 1 lote/mês. Precifique quantas coleções e compras de atacado quiser sem limites.
                </p>
              </div>
            </div>

            {/* 3. PDV de Balcão */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-tight">
                  Frente de Caixa (PDV de Balcão)
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Conclua vendas no balcão em 3 segundos com leitor e baixa automática no estoque em tempo real.
                </p>
              </div>
            </div>

            {/* 4. Etiquetas */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Printer className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-tight">
                  Etiquetas com Código de Barras
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Gere códigos escaneáveis e imprima em qualquer impressora térmica (Zebra/Elgin) ou folha A4 comum.
                </p>
              </div>
            </div>
          </div>

          {/* ── Card de Preço & Ancoragem ── */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-3.5 py-2 flex items-center justify-between text-left">
            <div>
              <p className="text-[9px] text-muted-foreground line-through">De R$ 49,90/mês</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-foreground">Por apenas</span>
                <span className="text-lg font-display font-black text-foreground">R$ 19,90</span>
                <span className="text-xs text-muted-foreground">/mês</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 inline-block">
                Apenas R$ 0,66 por dia
              </span>
              <p className="text-[9px] text-muted-foreground mt-0.5">Menos de 1 café por semana</p>
            </div>
          </div>

          {/* ── Ações & Garantias ── */}
          <div className="space-y-1.5 pt-0.5">
            <Button
              onClick={handleCheckout}
              size="default"
              className="w-full gradient-primary h-11 rounded-2xl text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-2"
            >
              <Sparkles className="size-4" />
              Desbloquear Plano Completo Agora →
            </Button>

            <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
              <Link
                to="/configuracoes"
                search={{ tab: "plano" }}
                onClick={() => onOpenChange(false)}
                className="hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
              >
                Comparar todos os planos
              </Link>

              <div className="flex items-center gap-1">
                <Star className="size-2.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-foreground">4,9/5</span>
                <span>(+2.400 lojistas)</span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center font-medium pt-0.5">
              Sem fidelidade • Ativação imediata em 10s • Cancele quando quiser
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
