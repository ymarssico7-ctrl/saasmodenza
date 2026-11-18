import { Link } from "@tanstack/react-router";
import {
  Globe,
  Layers,
  Printer,
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

function getHeadline(reason: UpgradeLoteModalProps["reason"]) {
  switch (reason) {
    case "labels_locked":
      return "Automatize suas Etiquetas e Venda na Loja Online";
    case "quota_reached":
      return "Sua Loja Cresceu! Desbloqueie Lotes e Venda Online";
    case "products_limit":
      return "Expanda seu Catálogo para 60 Peças e Venda na Vitrine 24h";
    case "pos_locked":
      return "PDV Ágil com Código de Barras & Loja Online no WhatsApp";
    default:
      return "Desbloqueie o Sistema Comercial da Sua Loja";
  }
}

export function UpgradeLoteModal({
  open,
  onOpenChange,
  reason = "general",
}: UpgradeLoteModalProps) {
  const headline = getHeadline(reason);

  const handleCheckout = () => {
    window.open("https://chk.eduzz.com/vestui-lote?cupom=VIP", "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] p-5 sm:p-6 gap-0 rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden max-h-[calc(100vh-2rem)]">
        <div className="space-y-3 text-center">
          {/* ── Topo Compacto com Badge e Título ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-center">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="size-3.5 text-primary shrink-0" />
                <span>VESTUI LOTE · R$ 19,90/MÊS</span>
              </Badge>
            </div>

            <h2 className="text-lg sm:text-xl font-display font-extrabold text-foreground tracking-tight leading-snug">
              {headline}
            </h2>

            <p className="text-xs text-muted-foreground leading-snug max-w-sm mx-auto">
              Venda no balcão com leitor de código de barras e na internet com sua vitrine digital — estoque e pedidos 100% integrados por R$ 0,66 ao dia.
            </p>
          </div>

          {/* ── 4 Benefícios Reais e Detalhados (Checklist Clean) ── */}
          <div className="space-y-2 py-0.5 text-left">
            {/* 1. Loja Online */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Globe className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-tight">
                  Loja Online & Sacola no WhatsApp
                  <span className="text-[10px] text-primary font-bold bg-primary/10 px-1 py-0.2 rounded border border-primary/20 ml-1.5">
                    Vitrine 24h
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Venda pelo Instagram com sacola pronta e frete calculado no WhatsApp.
                </p>
              </div>
            </div>

            {/* 2. Etiquetas */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Printer className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-tight">
                  Etiquetas Térmicas & Folha A4 em 3s
                  <span className="text-[10px] text-primary font-bold bg-primary/10 px-1 py-0.2 rounded border border-primary/20 ml-1.5">
                    Zebra & Pimaco
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Código de barras automático para impressoras térmicas e folhas A4.
                </p>
              </div>
            </div>

            {/* 3. PDV */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-tight">
                  Frente de Caixa (PDV de Balcão)
                  <span className="text-[10px] text-primary font-bold bg-primary/10 px-1 py-0.2 rounded border border-primary/20 ml-1.5">
                    Baixa no Estoque
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Bipe com leitor de código de barras e conclua a venda em 3 segundos.
                </p>
              </div>
            </div>

            {/* 4. Lotes */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-tight">
                  Lotes Ilimitados & 60 Peças no Catálogo
                  <span className="text-[10px] text-primary font-bold bg-primary/10 px-1 py-0.2 rounded border border-primary/20 ml-1.5">
                    Sem Limites
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Precifique coleções completas no atacado sem travas mensais.
                </p>
              </div>
            </div>
          </div>

          {/* ── Card de Preço & Ancoragem ── */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-3.5 py-1.5 flex items-center justify-between text-left">
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
                R$ 0,66 por dia
              </span>
              <p className="text-[9px] text-muted-foreground mt-0.5">Menos de 1 café por semana</p>
            </div>
          </div>

          {/* ── Ações & Garantias ── */}
          <div className="space-y-1.5 pt-0.5">
            <Button
              onClick={handleCheckout}
              size="default"
              className="w-full gradient-primary h-10.5 rounded-2xl text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-2"
            >
              <Sparkles className="size-4" />
              Desbloquear Vestui Lote Agora →
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
