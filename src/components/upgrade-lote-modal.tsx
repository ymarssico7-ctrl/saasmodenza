import { Link } from "@tanstack/react-router";
import {
  Check,
  Layers,
  Printer,
  Sparkles,
  Star,
  Zap,
  PackageOpen,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UpgradeLoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "quota_reached" | "labels_locked" | "products_limit" | "pos_locked" | "general";
}

type ReasonConfig = {
  badge: string;
  heroHeadline: string;
  heroSub: string;
  benefits: { icon: React.ReactNode; title: string; stat: string; desc: string }[];
};

function getConfig(reason: UpgradeLoteModalProps["reason"]): ReasonConfig {
  const baseBenefits = [
    {
      icon: <Printer className="size-4 text-primary" />,
      title: "Etiquetas em 3 Segundos",
      stat: "A4 & Térmica",
      desc: "Folhas Pimaco ou bobinas térmicas Zebra e Elgin prontas para imprimir.",
    },
    {
      icon: <Layers className="size-4 text-primary" />,
      title: "Lotes Ilimitados",
      stat: "Sem teto mensal",
      desc: "Precifique coleções completas sem limite de cadastros.",
    },
    {
      icon: <Zap className="size-4 text-primary" />,
      title: "PDV com Leitor de Barras",
      stat: "Baixa no estoque",
      desc: "Passe o código no caixa e finalize a venda em 3 segundos no balcão.",
    },
  ];

  switch (reason) {
    case "labels_locked":
      return {
        badge: "✦ Disponível no Vestui Lote",
        heroHeadline: "Automatize suas Etiquetas e Venda com Código de Barras",
        heroSub:
          "Pare de rotular peças com caneta ou perder tempo no balcão. Gere etiquetas térmicas ou A4 profissionais em 3 segundos e elimine furos de estoque.",
        benefits: baseBenefits,
      };
    case "quota_reached":
      return {
        badge: "✦ Vestui Lote · Lotes Ilimitados",
        heroHeadline: "Sua Loja Cresceu! Desbloqueie Lotes Ilimitados",
        heroSub:
          "Você atingiu o limite de lotes do plano gratuito. Continue precificando coleções sem travas por menos de R$ 0,66 por dia.",
        benefits: [
          {
            icon: <Layers className="size-4 text-primary" />,
            title: "Lotes sem Restrições",
            stat: "Ilimitados",
            desc: "Precifique centenas de peças e fornecedores no atacado.",
          },
          baseBenefits[0],
          baseBenefits[2],
        ],
      };
    case "products_limit":
      return {
        badge: "✦ Vestui Lote · Catálogo Expandido",
        heroHeadline: "Expanda seu Catálogo: Cadastre Peças Sem Limites",
        heroSub:
          "Você atingiu o limite de 10 peças do plano gratuito. Expanda seu estoque, imprima etiquetas com código de barras e venda no balcão e online.",
        benefits: [
          {
            icon: <PackageOpen className="size-4 text-primary" />,
            title: "Catálogo sem Teto",
            stat: "De 10 para ∞ peças",
            desc: "Cadastre todas as cores, tamanhos e modelos da sua loja.",
          },
          baseBenefits[0],
          baseBenefits[2],
        ],
      };
    case "pos_locked":
      return {
        badge: "✦ Vestui Lote · PDV de Balcão",
        heroHeadline: "PDV de Balcão Ágil: Venda em 3 Segundos com Leitor",
        heroSub:
          "Conecte seu leitor de código de barras, dê baixa instantânea no estoque e envie comprovante no WhatsApp sem digitar nada.",
        benefits: [
          baseBenefits[2],
          baseBenefits[0],
          baseBenefits[1],
        ],
      };
    default:
      return {
        badge: "✦ Disponível no Vestui Lote",
        heroHeadline: "Lojistas de Alta Performance Usam Sistema, Não Caneta",
        heroSub:
          "Etiquetas com código de barras para impressoras térmicas e A4, lotes ilimitados e PDV de balcão pelo preço de dois cafezinhos por semana.",
        benefits: baseBenefits,
      };
  }
}

export function UpgradeLoteModal({
  open,
  onOpenChange,
  reason = "general",
}: UpgradeLoteModalProps) {
  const config = getConfig(reason);

  const handleCheckout = () => {
    window.open("https://chk.eduzz.com/vestui-lote?cupom=VIP", "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-6 sm:p-8 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-lift overflow-hidden">
        <div className="space-y-5">
          {/* ── Topo Hero (Padrão Metas de Vendas / Pró-labore) ── */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 uppercase tracking-wider">
                {config.badge}
              </Badge>
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Liberação Imediata
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-foreground tracking-tight leading-tight">
              {config.heroHeadline}
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
              {config.heroSub}
            </p>
          </div>

          {/* ── Grid Compacto de 3 Benefícios de Alto Impacto (1x3) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {config.benefits.map((b, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-xs p-3 space-y-1.5 shadow-xs hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    {b.icon}
                  </div>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                    {b.stat}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground leading-snug">{b.title}</h3>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Faixa de Ancoragem de Preço & Prova Social ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-2xl border border-border/60 bg-secondary/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="size-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-black text-foreground">4,9</span>
              <span className="text-xs text-muted-foreground">· Escolha de +2.400 lojistas de moda</span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-muted-foreground">Apenas</span>
              <span className="text-xl font-display font-black text-foreground">R$ 19,90</span>
              <span className="text-xs text-muted-foreground">/mês</span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 ml-1">
                R$ 0,66/dia
              </span>
            </div>
          </div>

          {/* ── Ações CTAs Lado a Lado + Risco Zero ── */}
          <div className="space-y-2 pt-1">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                onClick={handleCheckout}
                size="lg"
                className="flex-1 gradient-primary h-11 rounded-2xl px-6 text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-2"
              >
                <Sparkles className="size-4" />
                Desbloquear Vestui Lote Agora →
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 rounded-2xl px-5 text-sm font-semibold border-border/80 hover:bg-secondary/60 cursor-pointer"
              >
                <Link to="/configuracoes" search={{ tab: "plano" }} onClick={() => onOpenChange(false)}>
                  Comparar Planos
                </Link>
              </Button>
            </div>

            <p className="text-xs text-foreground/70 font-semibold flex items-center justify-center gap-1.5 pt-1">
              <Check className="size-3.5 text-emerald-500" />
              <span>Sem fidelidade • Liberação imediata • Apenas R$ 0,66 por dia</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
