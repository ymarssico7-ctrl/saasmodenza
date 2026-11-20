import { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  Paintbrush,
  Palette,
  Sparkles,
  Crown,
  Eye,
  Monitor,
  Smartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VitrineConfigNav } from "@/components/loja/vitrine-config-nav";
import { loadTheme, saveTheme, getPresetThemeForTemplate } from "@/lib/theme-engine/defaults";
import { useStore } from "@/lib/store-context";
import { profileQuery, inventoryQuery } from "@/lib/db";
import { useAccess, isTemplateAllowed } from "@/lib/useAccess";
import { UpgradeLoteModal } from "@/components/upgrade-lote-modal";
import { UpgradeStoreModal } from "@/components/upgrade-store-modal";
import { supabase } from "@/integrations/supabase/client";
import { QuickStoreWizard } from "@/components/loja/quick-store-wizard";
import { ThemeRenderer } from "@/components/theme/theme-renderer";
import { mergeInventoryWithShowcase, type ShowcaseProduct } from "@/lib/showcase-store";
import type { ThemeConfig } from "@/lib/theme-engine/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  TEMPLATES_REGISTRY,
  CATEGORY_LABELS,
  getTemplatesByCategory,
  type TemplateCategory,
  type TemplateEntry,
} from "@/lib/theme-engine/templates-registry";

export const Route = createFileRoute("/_authenticated/loja/templates")({
  head: () => ({
    meta: [
      { title: "Galeria de Temas — Vestui" },
      {
        name: "description",
        content:
          "Escolha o visual perfeito para sua vitrine. Explore os templates premium do Vestui e aplique com um clique.",
      },
    ],
  }),
  component: GaleriaTemplatesPage,
});

const CATEGORIES: TemplateCategory[] = [
  "todos",
  "minimalista",
  "editorial",
  "luxo",
  "streetwear",
  "boutique",
];

function GaleriaTemplatesPage() {
  const { store } = useStore();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery(profileQuery());
  const access = useAccess(profile, store);
  const [upgradeProModalOpen, setUpgradeProModalOpen] = useState(false);
  const [upgradeStoreModalOpen, setUpgradeStoreModalOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<TemplateEntry | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Produtos reais da loja para Live Preview e Thumbnails
  const { data: rawInventory = [] } = useQuery(inventoryQuery());
  const allShowcaseProducts = useMemo(() => {
    return mergeInventoryWithShowcase(
      rawInventory as Parameters<typeof mergeInventoryWithShowcase>[0],
    );
  }, [rawInventory]);

  // Sanitizador reativo: retorna o templateId solicitado ou o padrão
  const resolveTemplateId = useCallback(
    (requestedId?: string | null): string => {
      return requestedId || "catalogo-express";
    },
    []
  );

  const storeMetadataTemplateId = (store?.metadata as Record<string, unknown> | null)?.["templateId"] as string | undefined;

  // Estado reativo do tema ativo com sincronização de eventos e limites de plano
  const [activeTemplateId, setActiveTemplateId] = useState<string>(() =>
    resolveTemplateId(storeMetadataTemplateId ?? loadTheme().settings.templateId)
  );
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("todos");

  useEffect(() => {
    setActiveTemplateId(resolveTemplateId(storeMetadataTemplateId ?? loadTheme().settings.templateId));
  }, [resolveTemplateId, storeMetadataTemplateId]);

  useEffect(() => {
    const onThemeChange = () => {
      setActiveTemplateId(resolveTemplateId(loadTheme().settings.templateId));
    };
    window.addEventListener("theme-changed", onThemeChange);
    return () => window.removeEventListener("theme-changed", onThemeChange);
  }, [resolveTemplateId]);

  const templates = useMemo(() => getTemplatesByCategory(activeCategory), [activeCategory]);

  async function applyTemplate(entry: TemplateEntry) {
    if (isApplying) return;
    if (!isTemplateAllowed(entry.id, access.limits)) {
      if (access.isFree && entry.id === "template-01") {
        setUpgradeProModalOpen(true);
      } else {
        setUpgradeStoreModalOpen(true);
      }
      return;
    }

    setIsApplying(true);
    try {
    const current = loadTheme();
    // Prioridade do nome: 1) nome já personalizado no tema, 2) nome real da loja no banco
    const resolvedName =
      (current.settings.storeName && current.settings.storeName.trim())
        ? current.settings.storeName
        : store.name || "";

    // Usa o preset completo do template, preservando nome e WhatsApp da loja
    const updated = getPresetThemeForTemplate(entry.id, {
      storeName: resolvedName,
      storeWhatsApp: store?.phone || current.settings.storeWhatsApp || "",
    });

    saveTheme(updated);
    setActiveTemplateId(entry.id);

    // Persiste no Supabase e aguarda para evitar race condition com React Query
    if (store?.id) {
      const currentMeta = (store.metadata as Record<string, unknown> | null) || {};
      const { error } = await supabase
        .from("stores")
        .update({
          metadata: {
            ...currentMeta,
            theme: updated,
            templateId: entry.id,
          } as never,
        })
        .eq("id", store.id);

      if (error) {
        toast.error("Erro ao salvar template no servidor.");
        console.error("[applyTemplate] Supabase error:", error);
      } else {
        // Invalida cache para forçar re-fetch com o novo templateId
        await queryClient.invalidateQueries({ queryKey: ["active_store"] });
        await queryClient.invalidateQueries({ queryKey: ["vitrine-store"] });
      }
    }

    // Fallback para demo store (localStorage)
    if (typeof window !== "undefined") {
      try {
        const rawDemo = localStorage.getItem("demo_active_store");
        if (rawDemo) {
          const parsed = JSON.parse(rawDemo) as Record<string, unknown>;
          const parsedMeta = (parsed["metadata"] as Record<string, unknown>) || {};
          parsed["metadata"] = {
            ...parsedMeta,
            theme: updated,
            templateId: entry.id,
          };
          localStorage.setItem("demo_active_store", JSON.stringify(parsed));
        }
      } catch {
        // Ignora erros de parse
      }
    }

    toast.success(`Tema "${entry.name}" aplicado com sucesso!`, {
      description: "Abra o Preview para ver ao vivo ou personalize as cores.",
    });
    // Notifica outros componentes e abas
    window.dispatchEvent(new CustomEvent("theme-changed", { detail: updated }));
    } finally {
      setIsApplying(false);
    }
  }

  const totalTemplates = TEMPLATES_REGISTRY.length;

  return (
    <div className="space-y-8">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Loja Online
            </p>
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Galeria de Temas
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {totalTemplates}{" "}
            {totalTemplates === 1 ? "template disponível" : "templates disponíveis"} — escolha o
            visual perfeito para sua vitrine e aplique com 1 clique.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setWizardOpen(true)}
            className="h-9 shrink-0 gap-1.5 rounded-xl text-xs font-semibold shadow-glow bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Criar em 3 Cliques
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 rounded-xl text-xs"
            asChild
          >
            <a href="/loja/preview" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Ver loja ao vivo
            </a>
          </Button>
        </div>
      </div>

      <VitrineConfigNav />

      {/* ── Banner Modo Expresso (Zero Skill) ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Diferencial Modaly · Zero Habilidade
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Construa sua Loja Online em 3 Cliques
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Sem precisar mexer em códigos ou configurações complexas. Escolha o seu nicho, confirme suas cores e o nosso assistente inteligente monta toda a estrutura de alta conversão para você na hora.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setWizardOpen(true)}
            className="h-10 shrink-0 gap-2 rounded-2xl px-5 text-xs font-bold shadow-glow bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" />
            Criar Loja em 3 Cliques
          </Button>
        </div>
      </div>

      {/* ── Tema Ativo Banner ─────────────────────────────────────────────── */}
      {(() => {
        const active = TEMPLATES_REGISTRY.find((t) => t.id === activeTemplateId);
        if (!active) return null;
        return (
          <div className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary-soft px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Tema ativo: <span className="text-primary">{active.name}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {active.tagline} · {active.tags.join(" · ")}
              </p>
            </div>
            <Button
              className="gradient-primary h-9 shrink-0 gap-1.5 rounded-xl text-xs font-semibold shadow-glow"
              size="sm"
              asChild
            >
              <Link to="/loja/personalizar">
                <Paintbrush className="h-3.5 w-3.5" />
                Personalizar
              </Link>
            </Button>
          </div>
        );
      })()}

      {/* ── Filtro de Categorias ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
              activeCategory === cat
                ? "border-primary bg-primary text-primary-foreground shadow-glow"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* ── Grid de Templates ─────────────────────────────────────────────── */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {templates.map((entry) => {
          const isAllowed = isTemplateAllowed(entry.id, access.limits);
          return (
            <TemplateCard
              key={entry.id}
              entry={entry}
              isActive={entry.id === activeTemplateId}
              isAllowed={isAllowed}
              isApplying={isApplying}
              inventory={rawInventory as any[]}
              onApply={() => applyTemplate(entry)}
              onPreview={() => setPreviewEntry(entry)}
              onUnlock={() => {
                if (access.isFree && entry.id === "template-01") {
                  setUpgradeProModalOpen(true);
                } else {
                  setUpgradeStoreModalOpen(true);
                }
              }}
            />
          );
        })}

        {/* Card "Em breve" para futuros templates */}
        <ComingSoonCard />
      </div>

      <UpgradeLoteModal
        open={upgradeProModalOpen}
        onOpenChange={setUpgradeProModalOpen}
        reason="general"
      />
      <UpgradeStoreModal
        open={upgradeStoreModalOpen}
        onOpenChange={setUpgradeStoreModalOpen}
      />
      <QuickStoreWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={() => {
          setActiveTemplateId("template-02");
          window.dispatchEvent(new CustomEvent("wizard-completed"));
          window.dispatchEvent(new Event("theme-changed"));
        }}
      />

      {/* ── Modal de Live Preview Real ───────────────────────────────────────── */}
      <TemplatePreviewModal
        entry={previewEntry}
        onClose={() => setPreviewEntry(null)}
        onApply={applyTemplate}
        isAllowed={previewEntry ? isTemplateAllowed(previewEntry.id, access.limits) : false}
        onUnlock={() => {
          if (previewEntry) {
            if (access.isFree && previewEntry.id === "template-01") {
              setUpgradeProModalOpen(true);
            } else {
              setUpgradeStoreModalOpen(true);
            }
          }
        }}
        showcaseProducts={allShowcaseProducts}
        storeName={store?.name || "Sua Loja"}
        storePhone={store?.phone || ""}
      />
    </div>
  );
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({
  entry,
  isActive,
  isAllowed,
  isApplying = false,
  inventory = [],
  onApply,
  onPreview,
  onUnlock,
}: {
  entry: TemplateEntry;
  isActive: boolean;
  isAllowed: boolean;
  isApplying?: boolean;
  inventory?: any[];
  onApply: () => void;
  onPreview: () => void;
  onUnlock: () => void;
}) {
  const { store } = useStore();
  const { palette, typography } = entry;

  // Extrai até 4 produtos reais com fotos para humanizar a miniatura
  const sampleProducts = useMemo(() => {
    return inventory
      .filter((p: any) => p.photo_url || p.photos?.[0] || p.image_url)
      .slice(0, 4)
      .map((p: any, idx: number) => ({
        name: p.name || `Peça ${idx + 1}`,
        photo: p.photo_url || p.photos?.[0] || p.image_url,
        price: p.sale_price ?? p.price ?? 89,
      }));
  }, [inventory]);

  const displayStoreName = store?.name || entry.defaults.storeName || "Sua Loja";

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-card shadow-soft transition-all duration-300 hover:shadow-lift ${
        isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"
      }`}
    >
      {/* Badges */}
      <div className="absolute left-3 top-3 z-10 flex gap-1.5">
        {isActive && (
          <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm">
            <CheckCircle2 className="h-3 w-3" />
            Ativo
          </span>
        )}
        {!isAllowed ? (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/95 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
            <Crown className="h-3 w-3" />
            {entry.id === "template-01" ? "Vestui Pro" : "Vestui Store"}
          </span>
        ) : (
          entry.id === "catalogo-express" && !isActive && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
              Incluso no Plano
            </span>
          )
        )}
        {entry.isNew && !isActive && isAllowed && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
            <Sparkles className="h-3 w-3" />
            Novo
          </span>
        )}
      </div>

      {/* ── Preview Mockup Personalizado ───────────────────────── */}
      <div
        className="relative select-none overflow-hidden p-4 cursor-pointer"
        style={{ backgroundColor: palette.canvas }}
        onClick={onPreview}
        title="Clique para ver o preview interativo"
      >
        {/* Browser chrome */}
        <div
          className="overflow-hidden rounded-xl border shadow-lift transition-transform duration-300 group-hover:scale-[1.01]"
          style={{ borderColor: palette.border, backgroundColor: palette.background }}
        >
          {/* Browser bar */}
          <div
            className="flex h-7 items-center gap-2 border-b px-3"
            style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
          >
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-red-400/70" />
              <div className="h-2 w-2 rounded-full bg-yellow-400/70" />
              <div className="h-2 w-2 rounded-full bg-green-400/70" />
            </div>
            <div
              className="mx-auto flex h-3.5 w-40 items-center rounded-full border px-2"
              style={{ borderColor: palette.border, backgroundColor: palette.background }}
            >
              <span className="truncate text-[8px]" style={{ color: palette.foreground + "60" }}>
                {store?.slug ? `vestui.app/vitrine/${store.slug}` : "vestui.app/vitrine/sua-loja"}
              </span>
            </div>
          </div>

          {/* Store preview inner */}
          <div style={{ backgroundColor: palette.background }}>
            {/* Announcement bar */}
            <div
              className="px-3 py-1 text-center text-[7px] tracking-widest truncate"
              style={{
                backgroundColor: palette.foreground,
                color: palette.background,
                fontFamily: typography.display,
              }}
            >
              {entry.defaults.freeShippingBanner || "Frete grátis acima de R$ 500"}
            </div>

            {/* Nav */}
            <div
              className="flex items-center justify-between border-b px-4 py-2"
              style={{ borderColor: palette.border }}
            >
              <span
                className="text-[11px] font-semibold uppercase tracking-widest truncate max-w-[140px]"
                style={{ color: palette.foreground, fontFamily: typography.display }}
              >
                {displayStoreName}
              </span>
              <div className="flex gap-3">
                {["Loja", "Sobre"].map((l) => (
                  <span
                    key={l}
                    className="text-[7px] uppercase tracking-wider"
                    style={{ color: palette.foreground + "80", fontFamily: typography.display }}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero */}
            <div
              className="relative flex h-28 items-end px-4 pb-4"
              style={{ backgroundColor: palette.canvas }}
            >
              <div>
                <p
                  className="mb-1 text-[7px] uppercase tracking-[0.22em]"
                  style={{ color: palette.foreground + "90", fontFamily: typography.display }}
                >
                  {entry.previewHeroSub}
                </p>
                <p
                  className="text-base font-medium leading-tight"
                  style={{
                    color: palette.foreground,
                    fontFamily: typography.display,
                    whiteSpace: "pre-line",
                  }}
                >
                  {entry.previewHeroText}
                </p>
              </div>
            </div>

            {/* Product grid com fotos reais da loja quando disponíveis */}
            <div className="grid grid-cols-4 gap-2 p-3">
              {[0, 1, 2, 3].map((i) => {
                const prod = sampleProducts[i];
                return (
                  <div
                    key={i}
                    className="overflow-hidden rounded border"
                    style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
                  >
                    {prod?.photo ? (
                      <img
                        src={prod.photo}
                        alt={prod.name}
                        className="h-12 w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-12 w-full items-center justify-center text-[7px] font-semibold uppercase"
                        style={{ backgroundColor: palette.border, color: palette.foreground + "70" }}
                      >
                        Peça {i + 1}
                      </div>
                    )}
                    <div className="p-1">
                      <p
                        className="truncate text-[7px] font-medium"
                        style={{ color: palette.foreground }}
                      >
                        {prod?.name || `Produto ${i + 1}`}
                      </p>
                      <p
                        className="text-[6.5px] font-bold"
                        style={{ color: palette.primary }}
                      >
                        {prod ? `R$ ${prod.price}` : "R$ 89"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Card Info ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">{entry.name}</h3>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">{entry.tagline}</p>
            </div>
            {/* Paleta */}
            <div className="flex shrink-0 gap-1">
              {Object.values(palette)
                .slice(0, 4)
                .map((color, i) => (
                  <div
                    key={i}
                    title={color}
                    className="h-5 w-5 rounded-full border border-border shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
            </div>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{entry.description}</p>
        </div>

        {/* Typography & Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-surface-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            {typography.display}
          </span>
          <span className="rounded-lg bg-surface-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            {typography.body}
          </span>
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-primary-soft px-2.5 py-1 text-[10px] font-medium text-accent-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2">
          {isActive ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 flex-1 gap-1.5 rounded-xl text-xs cursor-pointer"
                onClick={onPreview}
              >
                <Eye className="h-3.5 w-3.5" />
                Visualizar
              </Button>
              <Button
                size="sm"
                className="gradient-primary h-9 flex-1 gap-1.5 rounded-xl text-xs font-semibold shadow-glow"
                asChild
              >
                <Link to="/loja/personalizar">
                  <Paintbrush className="h-3.5 w-3.5" />
                  Personalizar
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 flex-1 gap-1.5 rounded-xl text-xs cursor-pointer"
                onClick={onPreview}
              >
                <Eye className="h-3.5 w-3.5" />
                Visualizar
              </Button>
              {isAllowed ? (
                <Button
                  size="sm"
                  className="h-9 flex-1 gap-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                  onClick={onApply}
                  disabled={isApplying}
                >
                  <Palette className="h-3.5 w-3.5" />
                  {isApplying ? "Aplicando..." : "Aplicar Tema"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onUnlock}
                  className="h-9 flex-1 gap-1.5 rounded-xl text-xs font-semibold border-amber-500/30 text-amber-600 hover:bg-amber-500/10 cursor-pointer"
                >
                  <Crown className="size-3.5 text-amber-500" />
                  Desbloquear
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Live Preview Modal (Shopify / Nuvemshop Style) ───────────────────────────

function TemplatePreviewModal({
  entry,
  onClose,
  onApply,
  isAllowed,
  onUnlock,
  showcaseProducts,
  storeName,
  storePhone,
}: {
  entry: TemplateEntry | null;
  onClose: () => void;
  onApply: (entry: TemplateEntry) => void;
  isAllowed: boolean;
  onUnlock: () => void;
  showcaseProducts: ShowcaseProduct[];
  storeName: string;
  storePhone?: string;
}) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");

  if (!entry) return null;

  // Monta o tema dinâmico aplicando as cores, fontes e seções padrão do template
  const previewTheme: ThemeConfig = {
    settings: {
      templateId: entry.id,
      storeName: storeName || entry.defaults.storeName,
      tagline: entry.tagline,
      freeShippingBanner: entry.defaults.freeShippingBanner,
      freeShippingBannerEnabled: true,
      checkoutMode: "whatsapp",
      storeWhatsApp: storePhone || "",
      storeDescription: entry.description,
      politicaTroca: "Trocas em até 7 dias corridos após o recebimento, com etiqueta e nota fiscal.",
      mostrarEstoque: true,
      colorBackground: entry.defaults.colorBackground,
      colorForeground: entry.defaults.colorForeground,
      colorPrimary: entry.defaults.colorPrimary,
      colorCanvas: entry.defaults.colorCanvas,
      colorBorder: entry.defaults.colorBorder,
      fontDisplay: entry.defaults.fontDisplay as never,
      fontBody: entry.defaults.fontBody as never,
      borderRadius: entry.defaults.borderRadius,
    },
    sections: [
      {
        id: "hero",
        type: "hero",
        visible: true,
        settings: {
          subheading: entry.previewHeroSub,
          heading: entry.previewHeroText,
          buttonText: "Ver Coleção",
          imageUrl: "",
          imageAlt: entry.name,
          imagePosition: "center",
          overlayOpacity: 25,
        },
      },
      {
        id: "features",
        type: "features",
        visible: true,
        settings: {
          items: [
            { title: "Envio Rápido", description: "Entrega express para todo o Brasil" },
            { title: "Qualidade Garantida", description: "Peças selecionadas com acabamento premium" },
            { title: "Troca Fácil", description: "Primeira troca sem custo em até 7 dias" },
            { title: "Atendimento Humanizado", description: "Suporte dedicado pelo WhatsApp" },
          ],
        },
      },
      {
        id: "product_grid",
        type: "product_grid",
        visible: true,
        settings: {
          title: "Novidades da Coleção",
          kicker: "Lançamento",
          source: "newest",
          count: 8,
          columns: 4,
          showViewAll: true,
        },
      },
      {
        id: "testimonials",
        type: "testimonials",
        visible: true,
        settings: {
          title: "O que nossas clientes dizem",
          kicker: "Depoimentos Reais",
          items: [
            {
              name: "Camila Rocha",
              city: "São Paulo, SP",
              comment: "O caimento das peças é impecável! Tecido nobre e atendimento maravilhoso pelo WhatsApp.",
              rating: 5,
            },
            {
              name: "Mariana Alencar",
              city: "Belo Horizonte, MG",
              comment: "Minha loja favorita! As roupas chegam com um carinho ímpar e a entrega foi super rápida.",
              rating: 5,
            },
            {
              name: "Juliana Mendes",
              city: "Curitiba, PR",
              comment: "Acabamento de alta-costura. Dá para sentir o cuidado em cada costura.",
              rating: 5,
            },
          ],
        },
      },
    ],
    order: ["hero", "features", "product_grid", "testimonials"],
  };

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[92vh] p-0 overflow-hidden flex flex-col rounded-3xl border-border bg-card shadow-2xl">
        {/* Header do Preview Modal */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="font-display text-base font-semibold text-foreground">
                  {entry.name}
                </DialogTitle>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                  {entry.tagline}
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Visualização ao vivo com as peças e identidade da sua loja
              </DialogDescription>
            </div>
          </div>

          {/* Alternador Desktop / Mobile */}
          <div className="flex items-center rounded-xl border border-border bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setDeviceMode("desktop")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                deviceMode === "desktop"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode("mobile")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                deviceMode === "mobile"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            {isAllowed ? (
              <Button
                size="sm"
                className="gradient-primary h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold shadow-glow cursor-pointer"
                onClick={() => {
                  onApply(entry);
                  onClose();
                }}
              >
                <Palette className="h-3.5 w-3.5" />
                Aplicar Este Tema
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold border-amber-500/40 text-amber-600 hover:bg-amber-500/10 cursor-pointer"
                onClick={() => {
                  onUnlock();
                  onClose();
                }}
              >
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                Desbloquear com Vestui Store
              </Button>
            )}
          </div>
        </div>

        {/* Viewport de Renderização */}
        <div className="flex-1 overflow-auto bg-muted/30">
          {deviceMode === "desktop" ? (
            <div className="min-h-full w-full bg-background shadow-inner">
              <ThemeRenderer
                theme={previewTheme}
                showcaseProducts={showcaseProducts}
                storeName={storeName}
                {...(storePhone ? { storePhone } : {})}
              />
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <div
                className="relative w-[390px] min-h-[844px] overflow-hidden rounded-[44px] border-[10px] border-neutral-900 bg-background shadow-2xl ring-1 ring-black/10"
                style={{
                  boxShadow:
                    "0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.08)",
                }}
              >
                {/* Notch / Dynamic Island */}
                <div className="sticky top-0 z-50 flex h-7 w-full items-center justify-center bg-transparent">
                  <div className="h-4 w-28 rounded-full bg-neutral-900" />
                </div>
                <div className="overflow-y-auto max-h-[800px] custom-scrollbar">
                  <ThemeRenderer
                    theme={previewTheme}
                    showcaseProducts={showcaseProducts}
                    storeName={storeName}
                    {...(storePhone ? { storePhone } : {})}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Coming Soon Card ──────────────────────────────────────────────────────────

function ComingSoonCard() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted">
        <Sparkles className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-display text-sm font-semibold text-foreground">Mais temas em breve</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Novos templates são adicionados com atualizações do Vestui. Fique de olho!
        </p>
      </div>
    </div>
  );
}
