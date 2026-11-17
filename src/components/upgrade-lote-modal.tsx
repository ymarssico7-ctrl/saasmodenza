import { Link } from "@tanstack/react-router";
import {
  Check,
  Layers,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Zap,
  PackageOpen,
  Tag,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UpgradeLoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "quota_reached" | "labels_locked" | "products_limit" | "pos_locked" | "general";
}

// ── Configuração por contexto ──────────────────────────────────────────────────
type ReasonConfig = {
  badge: string;
  icon: React.ReactNode;
  headline: string;
  subtext: string;
  benefits: { icon: React.ReactNode; title: string; desc: string }[];
};

function getConfig(reason: UpgradeLoteModalProps["reason"]): ReasonConfig {
  const benefitLabels = {
    etiquetas: {
      icon: <Printer className="size-4 text-primary" />,
      title: "Etiquetas A4 e Térmica — Ilimitadas",
      desc: "Código de barras para qualquer variação do lote, em segundos.",
    },
    lotes: {
      icon: <Layers className="size-4 text-primary" />,
      title: "Lotes de Atacado sem Limite Mensal",
      desc: "Precifique quantas coleções quiser, sem teto de cadastro.",
    },
    pdv: {
      icon: <ShoppingBag className="size-4 text-primary" />,
      title: "PDV de Balcão + Sacola no WhatsApp",
      desc: "Venda no físico e online com baixa automática de estoque.",
    },
    catalogo: {
      icon: <PackageOpen className="size-4 text-primary" />,
      title: "Até 60 Peças no Catálogo",
      desc: "6× mais capacidade para cadastrar coleções e vender na vitrine.",
    },
    vitrine: {
      icon: <ShoppingBag className="size-4 text-primary" />,
      title: "Vitrine Online com Sacola no WhatsApp",
      desc: "Pedidos multi-peças direto no WhatsApp com frete ou motoboy.",
    },
    equipe: {
      icon: <Users className="size-4 text-primary" />,
      title: "Gestão de Equipe e Comissões",
      desc: "Adicione vendedoras e acompanhe as comissões de cada uma.",
    },
  };

  switch (reason) {
    case "labels_locked":
      return {
        badge: "✦ Vestui Lote — Etiquetas & Lotes Ilimitados",
        icon: <Printer className="size-8 text-primary" />,
        headline: "Suas Etiquetas com Código de Barras Prontas em Segundos",
        subtext:
          "Imprima em folha A4 comum ou impressora térmica — disponível no Vestui Lote por menos de R$ 0,66 por dia.",
        benefits: [
          benefitLabels.etiquetas,
          benefitLabels.lotes,
          benefitLabels.pdv,
        ],
      };

    case "quota_reached":
      return {
        badge: "✦ Vestui Lote — Lotes Ilimitados",
        icon: <Layers className="size-8 text-primary" />,
        headline: "Você Atingiu o Limite de Lotes Deste Mês",
        subtext:
          "Continue precificando coleções sem parar. Desbloqueie lotes ilimitados e etiquetas com código de barras.",
        benefits: [
          benefitLabels.lotes,
          benefitLabels.etiquetas,
          benefitLabels.pdv,
        ],
      };

    case "products_limit":
      return {
        badge: "✦ Vestui Lote — Catálogo & Vitrine",
        icon: <PackageOpen className="size-8 text-primary" />,
        headline: "🎉 Sua Loja Está Crescendo!",
        subtext:
          "Você atingiu o limite de 10 peças do plano gratuito. Expanda para até 60 peças e abra a vitrine online.",
        benefits: [
          benefitLabels.catalogo,
          benefitLabels.vitrine,
          benefitLabels.etiquetas,
        ],
      };

    case "pos_locked":
      return {
        badge: "✦ Vestui Lote — PDV & Balcão",
        icon: <ShoppingBag className="size-8 text-primary" />,
        headline: "PDV de Balcão — Registre Vendas em 3 Segundos",
        subtext:
          "Leitor de código de barras, baixa automática de estoque e comprovante no WhatsApp. Tudo em um clique.",
        benefits: [
          benefitLabels.pdv,
          benefitLabels.etiquetas,
          benefitLabels.lotes,
        ],
      };

    default:
      return {
        badge: "✦ Vestui Lote — R$ 19,90/mês",
        icon: <Sparkles className="size-8 text-primary" />,
        headline: "Desbloqueie o Vestui Lote e Venda Mais",
        subtext:
          "Etiquetas com código de barras, lotes ilimitados, PDV de balcão e vitrine online. Tudo por menos de R$ 0,66 por dia.",
        benefits: [
          benefitLabels.etiquetas,
          benefitLabels.lotes,
          benefitLabels.pdv,
        ],
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
      <DialogContent className="max-w-md p-0 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* ── HERO ───────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-primary/5 via-card to-background px-6 pt-8 pb-6 text-center">
          {/* Glow decorativo */}
          <div className="gradient-primary absolute -top-12 left-1/2 -translate-x-1/2 size-40 rounded-full opacity-10 blur-3xl pointer-events-none" />

          {/* Ícone hero */}
          <div className="relative mx-auto mb-4 flex size-20 items-center justify-center rounded-3xl border border-border bg-card shadow-soft">
            <div className="gradient-primary absolute inset-0 rounded-3xl opacity-10 blur-sm" />
            <div className="relative">
              {config.icon}
            </div>
          </div>

          {/* Badge contextual */}
          <Badge
            variant="outline"
            className="mb-3 border-primary/30 bg-primary/5 text-primary font-bold text-[11px] uppercase tracking-wider px-3 py-1"
          >
            {config.badge}
          </Badge>

          {/* Headline */}
          <h2 className="text-xl font-display font-extrabold text-foreground leading-tight tracking-tight">
            {config.headline}
          </h2>

          {/* Subtext */}
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[320px] mx-auto">
            {config.subtext}
          </p>
        </div>

        {/* ── BENEFÍCIOS ─────────────────────────────────────────────── */}
        <div className="px-6 pt-1 pb-5 space-y-2">
          {config.benefits.map((benefit, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/60 px-3.5 py-3"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                {benefit.icon}
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-bold text-foreground leading-snug">
                  {benefit.title}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {benefit.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── PREÇO + CTAs ────────────────────────────────────────────── */}
        <div className="px-6 pb-7 pt-1 space-y-3">
          {/* Bloco de preço */}
          <div className="text-center space-y-0.5">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Apenas</span>
              <span className="text-3xl font-display font-extrabold text-foreground">R$ 19,90</span>
              <span className="text-xs font-semibold text-muted-foreground">/mês</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Menos de R$ 0,66 por dia • Cancele quando quiser
            </p>
          </div>

          {/* CTA primário */}
          <Button
            onClick={handleCheckout}
            className="w-full h-12 rounded-2xl font-bold text-sm gradient-primary text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-2"
          >
            <Zap className="size-4" />
            Ativar Vestui Lote Agora →
          </Button>

          {/* CTA secundário */}
          <Button
            asChild
            variant="outline"
            className="w-full h-10 rounded-2xl font-semibold text-sm border-border hover:bg-secondary/60 cursor-pointer"
          >
            <Link to="/configuracoes" search={{ tab: "plano" }} onClick={() => onOpenChange(false)}>
              Comparar Todos os Planos
            </Link>
          </Button>

          {/* Trust footer */}
          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
            Pagamento 100% seguro • Ativação imediata • Sem fidelidade
          </p>
        </div>

      </DialogContent>
    </Dialog>
  );
}
