import { Link } from "@tanstack/react-router";
import {
  Check,
  Globe,
  Layers,
  Printer,
  ShieldCheck,
  ShoppingBag,
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

type BenefitItem = {
  icon: React.ReactNode;
  title: string;
  stat: string;
  desc: string;
};

type ReasonConfig = {
  badge: string;
  heroHeadline: string;
  heroSub: string;
  benefits: BenefitItem[];
};

function getConfig(reason: UpgradeLoteModalProps["reason"]): ReasonConfig {
  const storeBenefit: BenefitItem = {
    icon: <Globe className="size-3.5 text-primary" />,
    title: "Loja Online & Sacola no WhatsApp",
    stat: "Vitrine 24h",
    desc: "Sua vitrine digital no Instagram: cliente escolhe cor/tamanho, monta a sacola e manda o pedido pronto no seu WhatsApp com cálculo de frete.",
  };

  const labelBenefit: BenefitItem = {
    icon: <Printer className="size-3.5 text-primary" />,
    title: "Etiquetas Térmicas & Folha A4 em 3s",
    stat: "A4 & Térmica",
    desc: "Gere e imprima etiquetas com código de barras em bobina Zebra/Elgin ou folhas Pimaco em qualquer impressora jato/laser.",
  };

  const posBenefit: BenefitItem = {
    icon: <Zap className="size-3.5 text-primary" />,
    title: "Frente de Caixa (PDV de Balcão)",
    stat: "Baixa no estoque",
    desc: "Bipe no leitor de código de barras, conclua a venda em 3 segundos no balcão e dê baixa automática no estoque por tamanho e cor.",
  };

  const batchBenefit: BenefitItem = {
    icon: <Layers className="size-3.5 text-primary" />,
    title: "Lotes Ilimitados & Catálogo de 60 Peças",
    stat: "Sem limites",
    desc: "Precifique quantas coleções e compras de atacado quiser sem teto mensal e expanda seu catálogo de 10 para até 60 modelos ativos.",
  };

  switch (reason) {
    case "labels_locked":
      return {
        badge: "✦ DISPONÍVEL NO VESTUI LOTE",
        heroHeadline: "Sua Loja Física e Online no Padrão Profissional por R$ 0,66/dia",
        heroSub:
          "Pare de rotular peças com caneta e passar vergonha no balcão. Tenha código de barras, vitrine online ativa 24h e atendimento ágil.",
        benefits: [labelBenefit, storeBenefit, posBenefit, batchBenefit],
      };
    case "quota_reached":
      return {
        badge: "✦ VESTUI LOTE · LOTES ILIMITADOS",
        heroHeadline: "Sua Loja Cresceu! Desbloqueie Lotes e Venda Online",
        heroSub:
          "Você atingiu o teto de 1 lote/mês do Free. Precifique coleções sem limites e ative sua loja online no Instagram por menos de R$ 0,66 por dia.",
        benefits: [batchBenefit, storeBenefit, labelBenefit, posBenefit],
      };
    case "products_limit":
      return {
        badge: "✦ VESTUI LOTE · CATÁLOGO EXPANDIDO",
        heroHeadline: "Expanda seu Catálogo para 60 Peças e Venda na Vitrine 24h",
        heroSub:
          "Você atingiu o limite de 10 peças. Desbloqueie até 60 modelos, sacola no WhatsApp, impressão de etiquetas e PDV de balcão integrado.",
        benefits: [
          {
            icon: <PackageOpen className="size-3.5 text-primary" />,
            title: "Catálogo Expandido (Até 60 Peças)",
            stat: "De 10 para 60 peças",
            desc: "Cadastre todas as cores, tamanhos e modelos com fotos em alta resolução para vender no físico e na vitrine digital.",
          },
          storeBenefit,
          labelBenefit,
          posBenefit,
        ],
      };
    case "pos_locked":
      return {
        badge: "✦ VESTUI LOTE · PDV DE BALCÃO & VITRINE",
        heroHeadline: "PDV Ágil com Código de Barras & Loja Online no WhatsApp",
        heroSub:
          "Venda no balcão com leitor em 3 segundos e na internet com sua própria vitrine digital, com estoque unificado em tempo real.",
        benefits: [posBenefit, storeBenefit, labelBenefit, batchBenefit],
      };
    default:
      return {
        badge: "✦ DISPONÍVEL NO VESTUI LOTE",
        heroHeadline: "O Sistema Comercial Completo da Sua Loja por R$ 0,66/dia",
        heroSub:
          "Venda no balcão com leitor de código de barras e na internet com sua própria loja online — tudo conectado ao estoque sem planilhas.",
        benefits: [storeBenefit, labelBenefit, posBenefit, batchBenefit],
      };
  }
}

// ── Gráfico de Código de Barras Realista ──
function BarcodeGraphic({ code }: { code: string }) {
  const bars = [2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 1, 2, 3, 1, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2];
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-end justify-center gap-[1.5px] h-5 w-full overflow-hidden">
        {bars.map((w, i) => (
          <div
            key={i}
            className="bg-foreground rounded-[0.5px]"
            style={{
              width: `${w * 1.3}px`,
              height: i % 6 === 0 ? "100%" : "78%",
            }}
          />
        ))}
      </div>
      <span className="font-mono text-[8px] tracking-widest text-muted-foreground mt-0.5">
        {code}
      </span>
    </div>
  );
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
      <DialogContent className="max-w-[950px] sm:max-w-4xl p-0 gap-0 rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[515px]">
          {/* ════════════════════════════════════════════════════════════
              COLUNA ESQUERDA (5 cols): VITRINE VISUAL (ETIQUETAS + LOJA ONLINE)
          ════════════════════════════════════════════════════════════ */}
          <div className="md:col-span-5 bg-secondary/35 border-r border-border/70 p-4 sm:p-5 flex flex-col justify-between space-y-2.5">
            {/* Header da Janela estilo macOS */}
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-rose-500/80" />
                <div className="size-2.5 rounded-full bg-amber-500/80" />
                <div className="size-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-[10px] font-mono font-medium text-muted-foreground ml-1.5">
                  Vestui Lote · Loja Física & Online
                </span>
              </div>
              <Badge variant="outline" className="text-[8px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 py-0 px-1.5">
                ● Pronto p/ Operar
              </Badge>
            </div>

            {/* Vitrine de 2 Etiquetas Reais de Boutique */}
            <div className="space-y-1.5">
              <div className="rounded-xl border border-border/80 bg-background p-2 shadow-xs space-y-1">
                <div className="flex items-center justify-between border-b border-border/40 pb-0.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary">VESTUI BOUTIQUE</span>
                  <span className="text-[8px] font-mono text-muted-foreground">#001</span>
                </div>
                <BarcodeGraphic code="7891234560012" />
                <div className="flex items-center justify-between pt-0.5 border-t border-border/40">
                  <div>
                    <p className="text-[10px] font-bold text-foreground leading-tight">Vestido Midi Canelado</p>
                    <p className="text-[8px] text-muted-foreground">Tam: M · Cor: Preto</p>
                  </div>
                  <span className="text-[11px] font-black text-foreground numeric">R$ 149,90</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-background p-2 shadow-xs space-y-1">
                <div className="flex items-center justify-between border-b border-border/40 pb-0.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary">VESTUI BOUTIQUE</span>
                  <span className="text-[8px] font-mono text-muted-foreground">#002</span>
                </div>
                <BarcodeGraphic code="7891234560029" />
                <div className="flex items-center justify-between pt-0.5 border-t border-border/40">
                  <div>
                    <p className="text-[10px] font-bold text-foreground leading-tight">Conjunto Alfaiataria</p>
                    <p className="text-[8px] text-muted-foreground">Tam: G · Cor: Nude</p>
                  </div>
                  <span className="text-[11px] font-black text-foreground numeric">R$ 219,90</span>
                </div>
              </div>
            </div>

            {/* Mini Card da Loja Online / Vitrine no WhatsApp */}
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-wide">
                  <Globe className="size-3 text-primary" /> Vitrine Online Ativa
                </span>
                <span className="text-[8px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                  24h no Ar
                </span>
              </div>
              <p className="text-[10px] font-mono text-foreground font-semibold truncate">
                vestui.com.br/suaboutique
              </p>
              <div className="flex items-center gap-1.5 pt-0.5 text-[9px] text-muted-foreground">
                <ShoppingBag className="size-3 text-emerald-500 shrink-0" />
                <span className="truncate">Sacola multi-itens enviada pronta no WhatsApp</span>
              </div>
            </div>

            {/* Formatos Suportados */}
            <div className="rounded-xl border border-border/60 bg-background/70 p-2 space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Printer className="size-3 text-primary" /> Impressão de Etiquetas
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="text-[9px] font-semibold bg-secondary/80 px-1.5 py-0.5 rounded text-foreground/80 border border-border/40">
                  Térmica Zebra/Elgin
                </span>
                <span className="text-[9px] font-semibold bg-secondary/80 px-1.5 py-0.5 rounded text-foreground/80 border border-border/40">
                  Folha A4 Pimaco (Laser/Jato)
                </span>
              </div>
            </div>

            {/* Prova Social & Avaliação */}
            <div className="rounded-xl border border-border/60 bg-background/70 p-2 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="size-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] font-black text-foreground">4,9/5</span>
                <span className="text-[9px] text-muted-foreground">· +2.400 lojistas de moda</span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-snug italic">
                "Economizo horas de etiquetar e passei a receber pedidos no WhatsApp 24 horas por dia."
              </p>
              <p className="text-[8px] font-semibold text-foreground/70">
                — Camila Rocha, Boutique Essência
              </p>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════
              COLUNA DIREITA (7 cols): BENEFÍCIOS DETALHADOS & CONVERSÃO
          ════════════════════════════════════════════════════════════ */}
          <div className="md:col-span-7 p-5 sm:p-6 flex flex-col justify-between space-y-3 bg-card">
            {/* Header com Badge e Headline */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5 uppercase tracking-wider">
                  {config.badge}
                </Badge>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ativação em 10 segundos
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-foreground tracking-tight leading-tight">
                {config.heroHeadline}
              </h2>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {config.heroSub}
              </p>
            </div>

            {/* 4 Benefícios Detalhados */}
            <div className="space-y-1.5">
              {config.benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-secondary/30 p-2">
                  <div className="size-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="size-3 stroke-[3]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-xs font-bold text-foreground truncate">{b.title}</p>
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                        {b.stat}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Card de Preço & Ancoragem */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-2.5 flex items-center justify-between">
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
                <p className="text-[9px] text-muted-foreground mt-0.5">Menos que 1 café por semana</p>
              </div>
            </div>

            {/* Botões de Ação Lado a Lado */}
            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  onClick={handleCheckout}
                  size="lg"
                  className="flex-1 gradient-primary h-11 rounded-2xl px-5 text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-2"
                >
                  <Sparkles className="size-4" />
                  Desbloquear Plano Completo Agora →
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-2xl px-4 text-xs sm:text-sm font-semibold border-border hover:bg-secondary/60 cursor-pointer shrink-0"
                >
                  <Link to="/configuracoes" search={{ tab: "plano" }} onClick={() => onOpenChange(false)}>
                    Comparar Planos
                  </Link>
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground font-medium flex items-center justify-center gap-1.5 pt-0.5">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                <span>Sem fidelidade • Ativação imediata em 10s • Cancele quando quiser</span>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
