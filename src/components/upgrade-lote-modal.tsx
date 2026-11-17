import { Link } from "@tanstack/react-router";
import {
  Check,
  Layers,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Zap,
  Star,
  Infinity,
  PackageOpen,
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

type ReasonConfig = {
  badge: string;
  heroHeadline: string;
  heroSub: string;
  kpi1: { icon: string; value: string; label: string };
  kpi2: { icon: string; value: string; label: string };
  kpi3: { icon: string; value: string; label: string };
  benefits: { icon: React.ReactNode; title: string; stat: string; desc: string }[];
};

function getConfig(reason: UpgradeLoteModalProps["reason"]): ReasonConfig {
  const base = {
    kpi1: { icon: "⚡", value: "3 seg", label: "por etiqueta" },
    kpi2: { icon: "∞", value: "Ilimitadas", label: "sem teto mensal" },
    kpi3: { icon: "💰", value: "R$ 0,66", label: "por dia, tudo incluso" },
    benefits: [
      {
        icon: <Printer className="size-4 text-primary" />,
        title: "Etiquetas A4 e Térmica",
        stat: "em 3 segundos",
        desc: "Código de barras para qualquer variação do lote — imprime em qualquer impressora.",
      },
      {
        icon: <Layers className="size-4 text-primary" />,
        title: "Lotes de Atacado Ilimitados",
        stat: "sem teto mensal",
        desc: "Precifique quantas coleções quiser, sem limites de cadastro.",
      },
      {
        icon: <ShoppingBag className="size-4 text-primary" />,
        title: "PDV de Balcão + WhatsApp",
        stat: "2× mais rápido",
        desc: "Venda no físico e online com baixa automática de estoque.",
      },
    ],
  };

  switch (reason) {
    case "labels_locked":
      return {
        ...base,
        badge: "✦ Vestui Lote · Etiquetas & Lotes",
        heroHeadline: "Você ainda rotula suas peças à mão?",
        heroSub:
          "Peças sem código de barras somem do estoque, travam o PDV e custam horas da sua semana. Isso tem solução — e custa R$ 0,66 por dia.",
      };
    case "quota_reached":
      return {
        ...base,
        badge: "✦ Vestui Lote · Lotes Ilimitados",
        heroHeadline: "Você está crescendo rápido!",
        heroSub:
          "O plano gratuito tem um limite de lotes por mês — você chegou lá. Continue precificando coleções sem parar por menos de R$ 0,66 por dia.",
        kpi1: { icon: "📦", value: "Ilimitados", label: "lotes por mês" },
      };
    case "products_limit":
      return {
        ...base,
        badge: "✦ Vestui Lote · Catálogo & Vitrine",
        heroHeadline: "🎉 Sua loja está crescendo!",
        heroSub:
          "Você atingiu o limite de 10 peças do plano gratuito. Expanda para lotes ilimitados, etiquetas com código de barras e vitrine online.",
        benefits: [
          {
            icon: <PackageOpen className="size-4 text-primary" />,
            title: "Catálogo Ilimitado",
            stat: "de 10 para ∞ peças",
            desc: "Cadastre centenas de modelos, cores e tamanhos sem teto.",
          },
          ...base.benefits.slice(0, 2),
        ],
      };
    case "pos_locked":
      return {
        ...base,
        badge: "✦ Vestui Lote · PDV de Balcão",
        heroHeadline: "PDV de balcão: venda em 3 segundos.",
        heroSub:
          "Registre vendas com leitor de código de barras, dê baixa automática no estoque e envie comprovante no WhatsApp — sem digitar nada.",
        kpi1: { icon: "⚡", value: "3 seg", label: "por venda no balcão" },
        benefits: [base.benefits[2], base.benefits[0], base.benefits[1]],
      };
    default:
      return {
        ...base,
        badge: "✦ Vestui Lote · R$ 19,90/mês",
        heroHeadline: "Lojistas que crescem usam sistemas, não canetinha.",
        heroSub:
          "Etiquetas com código de barras, lotes ilimitados e PDV de balcão. Tudo por menos do que você gasta num cafezinho por dia.",
      };
  }
}

// ── Componente: Barra de código de barras decorativa ────────────────────────
function BarcodeStripes({ className }: { className?: string }) {
  const bars = [3,1,2,1,3,2,1,2,1,3,1,2,3,1,2,1,2,3,1,2,1,3,2,1,3,1,2,1,2,3];
  return (
    <div className={cn("flex items-end gap-px", className)}>
      {bars.map((w, i) => (
        <div
          key={i}
          style={{ width: w * 2.5 }}
          className="bg-foreground rounded-sm"
          style={{ width: w * 2, height: i % 7 === 0 ? 32 : 28 }}
        />
      ))}
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
      <DialogContent className="max-w-lg p-0 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto border-0 shadow-lifted">

        {/* ════════════════════════════════════════════════
            SEÇÃO 1 — HERO OBSIDIAN (gradiente sidebar Vestui)
        ════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden px-6 pt-10 pb-6 text-center"
          style={{ background: "linear-gradient(135deg, oklch(0.145 0.010 260) 0%, oklch(0.185 0.018 258) 100%)" }}>

          {/* Glow decorativo */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 size-56 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ background: "oklch(0.54 0.215 258)" }} />
          <div className="absolute bottom-0 right-0 size-32 rounded-full opacity-10 blur-2xl pointer-events-none"
            style={{ background: "oklch(0.68 0.19 258)" }} />

          {/* Ícone hero */}
          <div className="relative mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm shadow-lifted">
            <Printer className="size-8 text-white" />
          </div>

          {/* Badge */}
          <Badge className="mb-3 bg-primary/25 text-primary border border-primary/40 font-bold text-[11px] uppercase tracking-widest px-3 py-1">
            {config.badge}
          </Badge>

          {/* Headline */}
          <h2 className="mt-1 text-2xl font-display font-extrabold text-white leading-tight tracking-tight">
            {config.heroHeadline}
          </h2>

          {/* Sub */}
          <p className="mt-2.5 text-sm text-white/65 leading-relaxed max-w-[360px] mx-auto">
            {config.heroSub}
          </p>

          {/* ── KPI Strip (ainda no fundo escuro) ── */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[config.kpi1, config.kpi2, config.kpi3].map((kpi, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center space-y-0.5">
                <span className="text-base">{kpi.icon}</span>
                <p className="text-sm font-black text-white leading-tight">{kpi.value}</p>
                <p className="text-[10px] text-white/50 font-medium leading-tight">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            SEÇÃO 2 — MOCKUP macOS (tela de etiquetas)
        ════════════════════════════════════════════════ */}
        <div className="px-5 py-4 bg-background">
          <div className="rounded-2xl border border-border/70 bg-card shadow-soft overflow-hidden">
            {/* Barra de título macOS */}
            <div className="flex items-center justify-between border-b border-border/60 bg-secondary/50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-rose-500/80" />
                <div className="size-2.5 rounded-full bg-amber-500/80" />
                <div className="size-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-mono text-muted-foreground ml-2">
                  Impressão de Etiquetas · Vestui Lote
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/30 py-0 px-2">
                ● Impressora Pronta
              </Badge>
            </div>

            {/* Conteúdo: Grid de etiquetas simuladas */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {[
                { name: "Vestido Midi Linho", size: "P", color: "Branco", price: "R$ 89,90" },
                { name: "Vestido Midi Linho", size: "M", color: "Nude", price: "R$ 89,90" },
                { name: "Vestido Midi Linho", size: "G", color: "Azul", price: "R$ 89,90" },
                { name: "Vestido Midi Linho", size: "GG", color: "Verde", price: "R$ 89,90" },
              ].map((tag, i) => (
                <div key={i} className="rounded-xl border border-border/70 bg-white p-2.5 space-y-2 shadow-xs">
                  {/* Cabeçalho da etiqueta */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground/50">VESTUI</span>
                    <span className="text-[9px] font-bold text-foreground/40">#{String(i + 1).padStart(3, "0")}</span>
                  </div>

                  {/* Código de barras decorativo */}
                  <div className="flex items-end justify-center gap-px h-6 overflow-hidden">
                    {[2,1,3,1,2,3,1,2,1,2,3,1,2,1,3,2,1,3,1,2,1,3,2,1,2,3,1,2,1,2,3,1].map((w, j) => (
                      <div
                        key={j}
                        className="bg-foreground rounded-px"
                        style={{
                          width: w,
                          height: j % 5 === 0 ? "100%" : "75%",
                        }}
                      />
                    ))}
                  </div>

                  {/* Dados da peça */}
                  <div className="space-y-0.5 border-t border-border/40 pt-1.5">
                    <p className="text-[9px] font-bold text-foreground leading-tight truncate">{tag.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">{tag.size} · {tag.color}</span>
                      <span className="text-[10px] font-black text-foreground">{tag.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer do mockup */}
            <div className="border-t border-border/50 bg-secondary/30 px-4 py-2 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">4 etiquetas · Lote: Coleção Verão 2025</span>
              <div className="flex items-center gap-2">
                <div className="h-6 px-3 rounded-md bg-secondary border border-border text-[10px] font-semibold text-muted-foreground flex items-center">
                  Pré-visualizar
                </div>
                <div className="h-6 px-3 rounded-md gradient-primary text-[10px] font-bold text-white flex items-center gap-1 shadow-glow">
                  <Printer className="size-2.5" /> Imprimir
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            SEÇÃO 3 — PROVA SOCIAL
        ════════════════════════════════════════════════ */}
        <div className="px-5 pb-4">
          <div className="rounded-2xl border border-border bg-secondary/60 px-4 py-3.5 space-y-2">
            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-black text-foreground">4,9</span>
              <span className="text-xs text-muted-foreground">· 2.400+ lojistas Vestui ativos</span>
            </div>

            {/* Depoimento */}
            <blockquote className="text-xs text-foreground/80 leading-relaxed italic border-l-2 border-primary/40 pl-3">
              "Antes eu perdia quase 3 horas por semana colando etiqueta manual com caneta. Agora imprimo 60 peças em menos de 3 minutos."
            </blockquote>
            <p className="text-[11px] font-semibold text-muted-foreground">
              — Ana Paula, Boutique Levê · São Paulo, SP
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            SEÇÃO 4 — BENEFÍCIOS (3 cards com dado em destaque)
        ════════════════════════════════════════════════ */}
        <div className="px-5 pb-4 space-y-2">
          {config.benefits.map((b, i) => (
            <div key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                {b.icon}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <p className="text-xs font-bold text-foreground">{b.title}</p>
                  <span className="text-[11px] font-black text-primary bg-primary/10 px-1.5 py-px rounded-md border border-primary/20">
                    {b.stat}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════════════
            SEÇÃO 5 — PREÇO + CTAs
        ════════════════════════════════════════════════ */}
        <div className="px-5 pb-7 pt-1 space-y-3">
          {/* Ancoragem de preço */}
          <div className="text-center space-y-1">
            <p className="text-[11px] text-muted-foreground">
              Pelo preço de <span className="font-semibold text-foreground">2 cafezinhos por semana</span>
            </p>
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

          {/* Trust strip */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
              7 dias de garantia
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Zap className="size-3.5 text-amber-500 shrink-0" />
              Ativação imediata
            </span>
            <span>•</span>
            <span>Suporte no WhatsApp</span>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
