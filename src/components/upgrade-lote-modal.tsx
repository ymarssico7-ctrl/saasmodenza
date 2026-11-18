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
      <DialogContent className="max-w-[480px] p-6 sm:p-7 gap-0 rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        <div className="space-y-4 text-center">
          {/* ── Ícone com Glow e Badge Oficial ── */}
          <div className="space-y-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Tag className="size-6 text-primary" />
            </div>

            <div className="flex items-center justify-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-0.5 uppercase tracking-wider">
                ✦ VESTUI LOTE · R$ 19,90/MÊS
              </Badge>
            </div>

            <h2 className="text-xl sm:text-[22px] font-display font-extrabold text-foreground tracking-tight leading-tight">
              {headline}
            </h2>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Venda no balcão com leitor de código de barras e na internet com sua vitrine digital — estoque e pedidos 100% integrados por R$ 0,66 ao dia.
            </p>
          </div>

          {/* ── 4 Benefícios Reais e Detalhados (Checklist Clean) ── */}
          <div className="space-y-2.5 py-1 text-left">
            {/* 1. Loja Online */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Globe className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-snug">
                  Loja Online & Sacola no WhatsApp
                  <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20 ml-1.5">
                    Vitrine 24h
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Venda pelo Instagram com sacola pronta enviada direto no seu WhatsApp e frete calculado.
                </p>
              </div>
            </div>

            {/* 2. Etiquetas */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Printer className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-snug">
                  Etiquetas Térmicas & Folha A4 em 3s
                  <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20 ml-1.5">
                    Zebra & Pimaco
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Gere código de barras automático e imprima em qualquer impressora térmica ou jato/laser.
                </p>
              </div>
            </div>

            {/* 3. PDV */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-snug">
                  Frente de Caixa (PDV de Balcão)
                  <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20 ml-1.5">
                    Baixa no Estoque
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Passe as peças no leitor de código de barras e conclua a venda em 3 segundos no caixa.
                </p>
              </div>
            </div>

            {/* 4. Lotes */}
            <div className="flex items-start gap-2.5">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground leading-snug">
                  Lotes Ilimitados & 60 Peças no Catálogo
                  <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20 ml-1.5">
                    Sem Limites
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Precifique coleções completas sem teto mensal e expanda seu catálogo de 10 para até 60 peças.
                </p>
              </div>
            </div>
          </div>

          {/* ── Card de Preço & Ancoragem ── */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2 flex items-center justify-between text-left">
            <div>
              <p className="text-[9px] text-muted-foreground line-through">De R$ 49,90/mês</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-bold text-foreground">Por apenas</span>
                <span className="text-xl font-display font-black text-foreground">R$ 19,90</span>
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
          <div className="space-y-2 pt-0.5">
            <Button
              onClick={handleCheckout}
              size="lg"
              className="w-full gradient-primary h-11 rounded-2xl text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-2"
            >
              <Sparkles className="size-4" />
              Desbloquear Vestui Lote Agora →
            </Button>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Link to="/configuracoes" search={{ tab: "plano" }} onClick={() => onOpenChange(false)}>
                Comparar todos os planos
              </Link>
            </Button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/40">
              <div className="flex items-center gap-1">
                <Star className="size-2.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-foreground">4,9/5</span>
                <span>(+2.400 lojistas)</span>
              </div>
              <span>•</span>
              <span>Sem fidelidade</span>
              <span>•</span>
              <span>Liberação imediata em 10s</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
