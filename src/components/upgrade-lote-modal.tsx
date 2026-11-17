import { Link } from "@tanstack/react-router";
import {
  Check,
  Layers,
  Printer,
  ShieldCheck,
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
      icon: <Printer className="size-3.5 text-primary" />,
      title: "Etiquetas em 3 Segundos",
      stat: "Térmica & A4",
      desc: "Folhas Pimaco ou bobinas térmicas Zebra e Elgin prontas para imprimir.",
    },
    {
      icon: <Layers className="size-3.5 text-primary" />,
      title: "Lotes Ilimitados",
      stat: "Sem limite",
      desc: "Precifique coleções completas sem teto mensal de cadastros.",
    },
    {
      icon: <Zap className="size-3.5 text-primary" />,
      title: "PDV com Leitor de Barras",
      stat: "Baixa no estoque",
      desc: "Bipe a peça no caixa e conclua a venda em 3 segundos no balcão.",
    },
  ];

  switch (reason) {
    case "labels_locked":
      return {
        badge: "✦ DISPONÍVEL NO VESTUI LOTE",
        heroHeadline: "Sua Loja com Padrão de Franquia por R$ 0,66/dia",
        heroSub:
          "Pare de rotular à mão com caneta ou perder peças no estoque. Tenha etiquetas profissionais com código de barras e PDV rápido.",
        benefits: baseBenefits,
      };
    case "quota_reached":
      return {
        badge: "✦ VESTUI LOTE · LOTES ILIMITADOS",
        heroHeadline: "Sua Loja Cresceu! Desbloqueie Lotes Ilimitados",
        heroSub:
          "Você atingiu o teto de lotes do plano gratuito. Continue precificando coleções sem limites com código de barras e PDV ágil.",
        benefits: [
          {
            icon: <Layers className="size-3.5 text-primary" />,
            title: "Lotes de Atacado sem Teto",
            stat: "Ilimitados",
            desc: "Cadastre quantas coleções e fornecedores quiser no ano.",
          },
          baseBenefits[0],
          baseBenefits[2],
        ],
      };
    case "products_limit":
      return {
        badge: "✦ VESTUI LOTE · CATÁLOGO EXPANDIDO",
        heroHeadline: "Expanda seu Catálogo: Cadastre Peças Sem Limites",
        heroSub:
          "Você atingiu o limite de 10 peças do plano gratuito. Expanda seu estoque, imprima etiquetas com código de barras e venda sem travas.",
        benefits: [
          {
            icon: <PackageOpen className="size-3.5 text-primary" />,
            title: "Catálogo Expandido",
            stat: "De 10 para ∞ peças",
            desc: "Cadastre todas as cores, tamanhos e modelos da sua loja.",
          },
          baseBenefits[0],
          baseBenefits[2],
        ],
      };
    case "pos_locked":
      return {
        badge: "✦ VESTUI LOTE · PDV DE BALCÃO",
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
        badge: "✦ DISPONÍVEL NO VESTUI LOTE",
        heroHeadline: "Lojistas de Alta Performance Usam Sistema, Não Caneta",
        heroSub:
          "Etiquetas com código de barras para impressoras térmicas e A4, lotes ilimitados e PDV de balcão pelo preço de dois cafezinhos por semana.",
        benefits: baseBenefits,
      };
  }
}

// ── Gráfico de Código de Barras Realista ──
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
              width: `${w * 1.4}px`,
              height: i % 6 === 0 ? "100%" : "78%",
            }}
          />
        ))}
      </div>
      <span className="font-mono text-[9px] tracking-widest text-muted-foreground mt-0.5">
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
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[510px]">
          {/* ════════════════════════════════════════════════════════════
              COLUNA ESQUERDA (5 cols): SHOWCASE VISUAL DE ETIQUETAS
          ════════════════════════════════════════════════════════════ */}
          <div className="md:col-span-5 bg-secondary/40 border-r border-border/70 p-5 sm:p-6 flex flex-col justify-between space-y-3.5">
            {/* Header da Janela estilo macOS */}
            <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-rose-500/80" />
                <div className="size-2.5 rounded-full bg-amber-500/80" />
                <div className="size-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-mono font-medium text-muted-foreground ml-2">
                  Etiquetas Profissionais
                </span>
              </div>
              <Badge variant="outline" className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 py-0 px-1.5">
                ● Pronto p/ Impressão
              </Badge>
            </div>

            {/* Vitrine de 2 Etiquetas Reais de Boutique */}
            <div className="space-y-2">
              {/* Etiqueta 1 */}
              <div className="rounded-xl border border-border/80 bg-background p-2.5 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between border-b border-border/40 pb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">VESTUI BOUTIQUE</span>
                  <span className="text-[9px] font-mono text-muted-foreground">#001</span>
                </div>
                <BarcodeGraphic code="7891234560012" />
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <div>
                    <p className="text-[11px] font-bold text-foreground leading-tight">Vestido Midi Canelado</p>
                    <p className="text-[9px] text-muted-foreground">Tam: M · Cor: Preto</p>
                  </div>
                  <span className="text-xs font-black text-foreground numeric">R$ 149,90</span>
                </div>
              </div>

              {/* Etiqueta 2 */}
              <div className="rounded-xl border border-border/80 bg-background p-2.5 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between border-b border-border/40 pb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">VESTUI BOUTIQUE</span>
                  <span className="text-[9px] font-mono text-muted-foreground">#002</span>
                </div>
                <BarcodeGraphic code="7891234560029" />
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <div>
                    <p className="text-[11px] font-bold text-foreground leading-tight">Conjunto Alfaiataria</p>
                    <p className="text-[9px] text-muted-foreground">Tam: G · Cor: Nude</p>
                  </div>
                  <span className="text-xs font-black text-foreground numeric">R$ 219,90</span>
                </div>
              </div>
            </div>

            {/* Formatos Suportados */}
            <div className="rounded-xl border border-border/60 bg-background/70 p-2.5 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Printer className="size-3 text-primary" /> Formatos Suportados
              </p>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] font-semibold bg-secondary/80 px-2 py-0.5 rounded-md text-foreground/80 border border-border/40">
                  Térmica Zebra & Elgin
                </span>
                <span className="text-[10px] font-semibold bg-secondary/80 px-2 py-0.5 rounded-md text-foreground/80 border border-border/40">
                  Folha A4 Pimaco (Laser/Jato)
                </span>
              </div>
            </div>

            {/* Prova Social & Avaliação */}
            <div className="rounded-xl border border-border/60 bg-background/70 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="size-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[11px] font-black text-foreground">4,9/5</span>
                <span className="text-[10px] text-muted-foreground">· +2.400 lojistas de moda</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug italic">
                "Reduzi o tempo de rotular 80 peças de 2 horas para 3 minutos. Minha loja virou outra."
              </p>
              <p className="text-[9px] font-semibold text-foreground/70">
                — Camila Rocha, Boutique Essência
              </p>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════
              COLUNA DIREITA (7 cols): PITCH DE CONVERSÃO & CTAS
          ════════════════════════════════════════════════════════════ */}
          <div className="md:col-span-7 p-6 sm:p-7 flex flex-col justify-between space-y-3.5 bg-card">
            {/* Header com Badge e Headline */}
            <div className="space-y-2">
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

            {/* 3 Benefícios Diretos com Checks */}
            <div className="space-y-2">
              {config.benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-secondary/30 p-2.5">
                  <div className="size-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="size-3 stroke-[3]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-foreground">{b.title}</p>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                        {b.stat}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Card de Preço & Ancoragem */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
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
                <p className="text-[10px] text-muted-foreground mt-0.5">Menos que 1 café por semana</p>
              </div>
            </div>

            {/* Botões de Ação Lado a Lado */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <Button
                  onClick={handleCheckout}
                  size="lg"
                  className="flex-1 gradient-primary h-11 rounded-2xl px-5 text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 transition-all cursor-pointer gap-2"
                >
                  <Sparkles className="size-4" />
                  Desbloquear Vestui Lote Agora →
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

              <p className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1.5 pt-0.5">
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
