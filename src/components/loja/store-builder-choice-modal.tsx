import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Sparkles,
  Smartphone,
  Monitor,
  Check,
  ArrowRight,
  Layers,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreBuilderChoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectExpress: () => void;
  onSelectPro: () => void;
}

export function StoreBuilderChoiceModal({
  open,
  onOpenChange,
  onSelectExpress,
  onSelectPro,
}: StoreBuilderChoiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Como você deseja criar sua loja?
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            O Vestui oferece duas experiências de criação. Escolha a que melhor se adapta ao seu momento e dispositivo:
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Card 1: Modo Expresso (Zero PC / 3 Cliques) */}
          <div
            onClick={() => {
              onOpenChange(false);
              onSelectExpress();
            }}
            className="group relative flex flex-col justify-between rounded-3xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 via-background to-background p-5 text-left transition-all hover:border-primary hover:shadow-glow cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                  <Smartphone className="h-3.5 w-3.5" />
                  Zero PC · No Celular
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  1 Minuto
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Modo Expresso (3 Cliques)
                </h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Ideal para quem está no celular e não tem tempo a perder. O sistema conecta seu estoque e precificação automaticamente.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Reaproveita fotos e preços já cadastrados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>8 paletas prontas da moda brasileira</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Link da vitrine pronto para a Bio do Instagram</span>
                </li>
              </ul>
            </div>

            <Button
              type="button"
              className="gradient-primary mt-5 h-10 w-full rounded-2xl text-xs font-semibold text-primary-foreground shadow-glow transition-all group-hover:opacity-95"
            >
              <span>Criar em 3 Cliques</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Card 2: Modo Construtor Pro (Shopify & Nuvemshop Style) */}
          <div
            onClick={() => {
              onOpenChange(false);
              onSelectPro();
            }}
            className="group relative flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 text-left transition-all hover:border-foreground/30 hover:shadow-md cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-foreground">
                  <Monitor className="h-3.5 w-3.5" />
                  Estilo Nuvemshop & Shopify
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  Avançado
                </span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                  <Layers className="h-4 w-4 text-foreground" />
                  Construtor Completo
                </h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Para quem deseja controle cirúrgico de cada seção, tipografia, banners de campanha e histórico de versões.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-foreground shrink-0" />
                  <span>Drag-and-drop de seções modulares</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-foreground shrink-0" />
                  <span>Inspetor detalhado de blocos e padding</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-foreground shrink-0" />
                  <span>Histórico de versões com restauração em 1 toque</span>
                </li>
              </ul>
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-5 h-10 w-full rounded-2xl text-xs font-semibold border-border/80 transition-all hover:bg-secondary/70"
            >
              <span>Abrir Construtor Pro</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
