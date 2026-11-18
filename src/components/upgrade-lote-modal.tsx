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
    icon: <Globe className="size-4 text-primary" />,
    title: "Loja Online & Sacola no WhatsApp",
    desc: "Sua vitrine aberta 24h para vender pelo Instagram. A cliente monta a sacola e o pedido chega pronto no seu WhatsApp com cálculo de frete.",
  };

  const labelBenefit: BenefitItem = {
    icon: <Printer className="size-4 text-primary" />,
    title: "Etiquetas Térmicas & Folha A4 em 3s",
    desc: "Imprima em bobinas térmicas (Zebra, Elgin) ou folhas A4 comuns (Pimaco). Diga adeus à canetinha e erros de preço no caixa.",
  };

  const posBenefit: BenefitItem = {
    icon: <Zap className="size-4 text-primary" />,
    title: "Frente de Caixa (PDV de Balcão)",
    desc: "Bipe a peça no leitor de código de barras, conclua a venda em 3 segundos e dê baixa automática no estoque por tamanho e cor.",
  };

  const batchBenefit: BenefitItem = {
    icon: <Layers className="size-4 text-primary" />,
    title: "Lotes Ilimitados & 60 Peças no Catálogo",
    desc: "Precifique coleções no atacado sem teto mensal e expanda seu catálogo de 10 para até 60 modelos ativos com fotos.",
  };

  switch (reason) {
    case "labels_locked":
      return {
        badge: "✦ DISPONÍVEL NO VESTUI LOTE",
        heroHeadline: "Sua Loja Física e Online Conectadas por R$ 0,66/dia",
        heroSub:
          "Venda no balcão com leitor de código de barras e na internet com sua vitrine digital — estoque e pedidos 100% integrados sem planilhas.",
        benefits: [storeBenefit, labelBenefit, posBenefit, batchBenefit],
      };
    case "quota_reached":
      return {
        badge: "✦ VESTUI LOTE · LOTES ILIMITADOS",
        heroHeadline: "Sua Loja Cresceu! Desbloqueie Lotes e Venda Online",
        heroSub:
          "Você atingiu o teto de 1 lote/mês do plano gratuito. Continue precificando coleções sem limites e ative sua loja online por R$ 0,66 por dia.",
        benefits: [batchBenefit, storeBenefit, labelBenefit, posBenefit],
      };
    case "products_limit":
      return {
        badge: "✦ VESTUI LOTE · CATÁLOGO EXPANDIDO",
        heroHeadline: "Expanda seu Catálogo para 60 Peças e Venda na Vitrine 24h",
        heroSub:
          "Você atingiu o limite de 10 peças. Desbloqueie até 60 modelos ativos, sacola no WhatsApp, impressão de etiquetas e PDV de balcão integrado.",
        benefits: [
          {
            icon: <PackageOpen className="size-4 text-primary" />,
            title: "Catálogo Expandido (Até 60 Peças)",
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
        heroHeadline: "Sua Loja Física e Online Conectadas por R$ 0,66/dia",
        heroSub:
          "Venda no balcão com leitor de código de barras e na internet com sua própria vitrine digital — estoque e pedidos 100% integrados sem planilhas.",
        benefits: [storeBenefit, labelBenefit, posBenefit, batchBenefit],
      };
  }
}

// ── Gráfico de Código de Barras Elegante ──
function BarcodeGraphic({ code }: { code: string }) {
  const bars = [2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 1, 2, 3, 1, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2];
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-end justify-center gap-[1.5px] h-6 w-full overflow-hidden">
        {bars.map((w, i) => (
          <div
            key={i}
            className="bg-foreground rounded-[0.5px]"
            style={{
              width: `${w * 1.5}px`,
              height: i % 6 === 0 ? "100%" : "80%",
            }}
          />
        ))}
      </div>
      <span className="font-mono text-[9px] tracking-widest text-muted-foreground mt-1">
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
      <DialogContent className="max-w-[940px] sm:max-w-4xl p-0 gap-0 rounded-3xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
          {/* ════════════════════════════════════════════════════════════
              COLUNA ESQUERDA (5 cols): SHOWCASE VISUAL UNIFICADO & ELEGANTE
          ════════════════════════════════════════════════════════════ */}
          <div className="md:col-span-5 bg-secondary/35 border-r border-border/70 p-6 flex flex-col justify-between space-y-4">
            {/* Header da Janela estilo macOS */}
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-rose-500/80" />
                <div className="size-2.5 rounded-full bg-amber-500/80" />
                <div className="size-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-mono font-medium text-muted-foreground ml-2">
                  Ecossistema Vestui Lote
                </span>
              </div>
              <Badge variant="outline" className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 py-0 px-1.5">
                ● Sistema Ativo
              </Badge>
            </div>

            {/* Showcase Visual Integrado: 1 Etiqueta Premium + 1 Card de Vitrine */}
            <div className="space-y-3">
              {/* Etiqueta Boutique de Alta Fidelidade */}
              <div className="rounded-2xl border border-border/80 bg-background p-3.5 shadow-xs space-y-2">
                <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">VESTUI BOUTIQUE</span>
                  <span className="text-[10px] font-mono text-muted-foreground">#001</span>
                </div>
                <BarcodeGraphic code="7891234560012" />
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <div>
                    <p className="text-xs font-bold text-foreground leading-tight">Vestido Midi Canelado</p>
                    <p className="text-[10px] text-muted-foreground">Tam: M · Cor: Preto</p>
                  </div>
                  <span className="text-sm font-black text-foreground numeric">R$ 149,90</span>
                </div>
              </div>

              {/* Card de Vitrine Online & Sacola WhatsApp */}
              <div className="rounded-2xl border border-primary/20 bg-background p-3 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
                    <Globe className="size-3.5 text-primary" /> Vitrine Online no Ar
                  </span>
                  <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Aberta 24h
                  </span>
                </div>
                <p className="text-xs font-mono text-foreground font-bold truncate">
                  vestui.com.br/suaboutique
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                  <ShoppingBag className="size-3 text-emerald-500 shrink-0" />
                  <span>Pedidos com sacola montada direto no WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Base: Compatibilidade & Prova Social */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                <Printer className="size-3.5 text-primary shrink-0" />
                <span>Compatível com bobinas térmicas e folhas A4 comuns</span>
              </p>

              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="size-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-black text-foreground">4,9/5</span>
                <span className="text-[11px] text-muted-foreground">· Escolha de +2.400 lojistas de moda</span>
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════
              COLUNA DIREITA (7 cols): PITCH PREMIUM & BENEFÍCIOS LIMPOS
          ════════════════════════════════════════════════════════════ */}
          <div className="md:col-span-7 p-6 sm:p-7 flex flex-col justify-between space-y-4 bg-card">
            {/* Header com Badge e Headline */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 uppercase tracking-wider">
                  {config.badge}
                </Badge>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ativação em 10 segundos
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-foreground tracking-tight leading-tight">
                {config.heroHeadline}
              </h2>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {config.heroSub}
              </p>
            </div>

            {/* 4 Pilares Essenciais sem Caixas Sufocantes (Lista Clean & Fluida) */}
            <div className="space-y-3">
              {config.benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    {b.icon}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug">{b.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Barra de Preço com Ancoragem Refinada */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground line-through">De R$ 49,90/mês</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-foreground">Por apenas</span>
                  <span className="text-2xl font-display font-black text-foreground">R$ 19,90</span>
                  <span className="text-xs text-muted-foreground">/mês</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 inline-block">
                  R$ 0,66 por dia
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Menos de 1 café por semana</p>
              </div>
            </div>

            {/* Botões de Ação Lado a Lado + Risco Zero */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <Button
                  onClick={handleCheckout}
                  size="lg"
                  className="flex-1 gradient-primary h-12 rounded-2xl px-6 text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-2"
                >
                  <Sparkles className="size-4" />
                  Desbloquear Plano Completo Agora →
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-2xl px-5 text-sm font-semibold border-border hover:bg-secondary/60 cursor-pointer shrink-0"
                >
                  <Link to="/configuracoes" search={{ tab: "plano" }} onClick={() => onOpenChange(false)}>
                    Comparar Planos
                  </Link>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1.5 pt-0.5">
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
