import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  CheckCircle2,
  CircleDashed,
  ArrowRight,
  ExternalLink,
  Store,
  Phone,
  Image as ImageIcon,
  Shirt,
  QrCode,
  Globe,
  PartyPopper,
  Zap,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Store as StoreType } from "@/lib/store-context";
import { getVitrineSettings, isVitrineAtiva } from "@/lib/vitrine-settings";
import type { ThemeConfig } from "@/lib/theme-engine/schema";

interface StoreReadinessCardProps {
  store: StoreType | null;
  inventoryCount: number;
  payAccountStatus?: string | null | undefined;
  onOpenWizard: () => void;
  onOpenChoiceModal?: (() => void) | undefined;
  className?: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  isDone: boolean;
  to?: string;
  actionLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function StoreReadinessCard({
  store,
  inventoryCount,
  payAccountStatus,
  onOpenWizard,
  onOpenChoiceModal,
  className,
}: StoreReadinessCardProps) {
  const storeId = store?.id || "";
  const storeMetadata = store?.metadata as Record<string, unknown> | null;
  const vitrineSettings = useMemo(() => getVitrineSettings(storeId), [storeId]);

  // Checagem se há foto de capa no tema ou nas configurações
  const hasVisual = useMemo(() => {
    if (store?.logo_url) return true;
    if (vitrineSettings.logoUrl || vitrineSettings.capaUrl) return true;
    const theme = storeMetadata?.["theme"] as ThemeConfig | undefined;
    if (theme?.sections) {
      return theme.sections.some(
        (s) => s.type === "hero" && typeof s.settings?.imageUrl === "string" && s.settings.imageUrl.trim() !== "",
      );
    }
    return false;
  }, [store?.logo_url, vitrineSettings, storeMetadata]);

  // Checagem de Pix / Meio de Recebimento
  const hasPix = useMemo(() => {
    if (payAccountStatus === "ativa") return true;
    if (vitrineSettings.chavePix && vitrineSettings.chavePix.trim() !== "") return true;
    if (storeMetadata?.["pixKey"] || storeMetadata?.["chavePix"]) return true;
    const metaSettings = storeMetadata?.["vitrineSettings"] as Record<string, unknown> | undefined;
    if (metaSettings?.["chavePix"] && String(metaSettings["chavePix"]).trim() !== "") return true;
    return false;
  }, [payAccountStatus, vitrineSettings.chavePix, storeMetadata]);

  // Checagem de Vitrine Ativa
  const vitrinePublica = useMemo(() => {
    return Boolean(store?.slug && isVitrineAtiva(storeId, storeMetadata));
  }, [store?.slug, storeId, storeMetadata]);

  // 6 Pilares do Setup Score
  const items: ChecklistItem[] = useMemo(() => {
    const isNameDone = Boolean(store?.name && store.name.trim() !== "" && store.name !== "Loja Demo");
    const isPhoneDone = Boolean(store?.phone && store.phone.replace(/\D/g, "").length >= 10);
    const isInventoryDone = inventoryCount >= 3;

    return [
      {
        id: "name",
        title: "Nome e Identidade",
        description: isNameDone ? `${store?.name}` : "Defina o nome da sua marca",
        isDone: isNameDone,
        to: "/loja/configuracao",
        actionLabel: isNameDone ? "Editar" : "Definir",
        icon: Store,
      },
      {
        id: "phone",
        title: "WhatsApp Comercial",
        description: isPhoneDone ? `${store?.phone}` : "Receba pedidos e contatos com 1 clique",
        isDone: isPhoneDone,
        to: "/loja/configuracao",
        actionLabel: isPhoneDone ? "Alterar" : "Configurar",
        icon: Phone,
      },
      {
        id: "visual",
        title: "Foto de Capa / Logotipo",
        description: hasVisual ? "Fachada visual configurada" : "Destaque a fachada digital da sua loja",
        isDone: hasVisual,
        to: "/loja/configuracao",
        actionLabel: hasVisual ? "Alterar" : "Adicionar",
        icon: ImageIcon,
      },
      {
        id: "catalog",
        title: "Catálogo de Peças",
        description:
          inventoryCount >= 3
            ? `${inventoryCount} peças ativas na vitrine`
            : `${inventoryCount} de 3 peças mínimas para faturar`,
        isDone: isInventoryDone,
        to: "/loja/produtos",
        actionLabel: isInventoryDone ? "Ver peças" : "Cadastrar",
        icon: Shirt,
      },
      {
        id: "payment",
        title: "Chave Pix / Vestui Pay",
        description: hasPix ? "Recebimento pronto e verificado" : "Configure sua chave Pix para receber",
        isDone: hasPix,
        to: "/loja/recebimentos",
        actionLabel: hasPix ? "Ver taxas" : "Ativar Pix",
        icon: QrCode,
      },
      {
        id: "publish",
        title: "Loja Aberta Publicamente",
        description: vitrinePublica ? "Vitrine ativa recebendo clientes" : "Ative a chave pública da sua vitrine",
        isDone: vitrinePublica,
        to: "/loja/configuracao",
        actionLabel: vitrinePublica ? "Ver status" : "Ativar agora",
        icon: Globe,
      },
    ];
  }, [store?.name, store?.phone, inventoryCount, hasVisual, hasPix, vitrinePublica]);

  const completedCount = items.filter((i) => i.isDone).length;
  const percentage = Math.round((completedCount / items.length) * 100);
  const isAllComplete = completedCount === items.length;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card/95 to-card/90 p-5 shadow-sm transition-all sm:p-6",
        className,
      )}
    >
      {/* Background Glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />

      {/* Header do Score */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              <Zap className="h-3 w-3" />
              Setup Score da Loja
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold font-mono",
                isAllComplete
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
              )}
            >
              {completedCount} de {items.length} passos ({percentage}%)
            </span>
          </div>

          <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {isAllComplete
              ? "✨ Sua loja está 100% pronta para faturar!"
              : "Prontidão para Vendas Online"}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            {isAllComplete
              ? "Todos os pilares essenciais de confiança, identidade e checkout foram validados. Divulgue seu link na Bio para acelerar seus pedidos."
              : "Complete estes passos recomendados para transformar visitantes do Instagram e WhatsApp em clientes que compram na hora."}
          </p>
        </div>

        {/* Botões de Ação: Modo Expresso (3 Cliques) e Modo Construtor Pro */}
        <div className="flex shrink-0 items-center gap-2">
          {onOpenChoiceModal ? (
            <Button
              type="button"
              onClick={onOpenChoiceModal}
              size="sm"
              className="gradient-primary h-9 gap-1.5 rounded-full px-4 text-xs font-semibold text-primary-foreground shadow-glow transition-all hover:opacity-95 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Personalizar Loja</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onOpenWizard}
              size="sm"
              className="gradient-primary h-9 gap-1.5 rounded-full px-4 text-xs font-semibold text-primary-foreground shadow-glow transition-all hover:opacity-95 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Criador em 3 Cliques</span>
            </Button>
          )}

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-full px-3.5 text-xs font-semibold border-border/80 hover:bg-secondary/70 cursor-pointer hidden sm:inline-flex"
          >
            <Link to="/loja/personalizar">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Modo Pro</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Barra de Progresso Apple Style */}
      <div className="mt-4 space-y-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/70">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              isAllComplete
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-primary/80 to-primary",
            )}
            style={{ width: `${Math.max(percentage, 5)}%` }}
          />
        </div>
      </div>

      {/* Grid de 6 Passos */}
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={cn(
                "group relative flex items-start gap-3 rounded-2xl border p-3 transition-all",
                item.isDone
                  ? "border-border/60 bg-secondary/30 hover:bg-secondary/40"
                  : "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/35 hover:bg-amber-500/10",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl transition-all",
                  item.isDone
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                )}
              >
                {item.isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <CircleDashed className="h-4 w-4 animate-spin-slow" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {item.title}
                  </p>
                  {item.to && (
                    <Link
                      to={item.to}
                      className="shrink-0 text-[11px] font-medium text-primary hover:underline hover:opacity-90 cursor-pointer"
                    >
                      {item.actionLabel}
                    </Link>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
