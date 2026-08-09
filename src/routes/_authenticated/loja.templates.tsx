import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ExternalLink,
  Paintbrush,
  Palette,
  Sparkles,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loadTheme, saveTheme } from "@/lib/theme-engine/defaults";
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
      { title: "Galeria de Temas — Modaly" },
      {
        name: "description",
        content:
          "Escolha o visual perfeito para sua vitrine. Explore os templates premium do Modaly e aplique com um clique.",
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
  "boutique",
];

function GaleriaTemplatesPage() {
  const activeTheme = loadTheme();
  const activeTemplateId = activeTheme.settings.templateId ?? "template-02";
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("todos");

  const templates = getTemplatesByCategory(activeCategory);

  function applyTemplate(entry: TemplateEntry) {
    const current = loadTheme();
    const updated = {
      ...current,
      settings: {
        ...current.settings,
        templateId: entry.id,
        storeName: current.settings.storeName || entry.defaults.storeName,
        colorBackground: entry.defaults.colorBackground,
        colorForeground: entry.defaults.colorForeground,
        colorPrimary: entry.defaults.colorPrimary,
        colorCanvas: entry.defaults.colorCanvas,
        colorBorder: entry.defaults.colorBorder,
        fontDisplay: entry.defaults.fontDisplay as never,
        fontBody: entry.defaults.fontBody as never,
        borderRadius: entry.defaults.borderRadius,
      },
    };
    saveTheme(updated);
    toast.success(`Tema "${entry.name}" aplicado com sucesso!`, {
      description: "Abra o Preview para ver ao vivo ou personalize as cores.",
    });
    // Force page reload to reflect new theme
    window.dispatchEvent(new Event("theme-changed"));
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
            {totalTemplates} {totalTemplates === 1 ? "template disponível" : "templates disponíveis"} — escolha o visual perfeito para sua vitrine e aplique com 1 clique.
          </p>
        </div>

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
        {templates.map((entry) => (
          <TemplateCard
            key={entry.id}
            entry={entry}
            isActive={entry.id === activeTemplateId}
            onApply={() => applyTemplate(entry)}
          />
        ))}

        {/* Card "Em breve" para futuros templates */}
        <ComingSoonCard />
      </div>
    </div>
  );
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({
  entry,
  isActive,
  onApply,
}: {
  entry: TemplateEntry;
  isActive: boolean;
  onApply: () => void;
}) {
  const { palette, typography } = entry;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-card shadow-soft transition-all duration-300 hover:shadow-lift ${
        isActive
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/30"
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
        {entry.isNew && !isActive && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
            <Sparkles className="h-3 w-3" />
            Novo
          </span>
        )}
        {entry.isPremium && !isActive && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
            <Crown className="h-3 w-3" />
            Premium
          </span>
        )}
      </div>

      {/* ── Preview Mockup ─────────────────────────────────────── */}
      <div
        className="relative select-none overflow-hidden p-4"
        style={{ backgroundColor: palette.canvas }}
      >
        {/* Browser chrome */}
        <div
          className="overflow-hidden rounded-xl border shadow-lift"
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
                minhaloja.modaly.com.br
              </span>
            </div>
          </div>

          {/* Store preview inner */}
          <div style={{ backgroundColor: palette.background }}>
            {/* Announcement bar */}
            <div
              className="px-3 py-1 text-center text-[7px] tracking-widest"
              style={{ backgroundColor: palette.foreground, color: palette.background, fontFamily: typography.display }}
            >
              Frete grátis acima de R$ 500
            </div>

            {/* Nav */}
            <div
              className="flex items-center justify-between border-b px-4 py-2"
              style={{ borderColor: palette.border }}
            >
              <span
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: palette.foreground, fontFamily: typography.display }}
              >
                {entry.defaults.storeName}
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

            {/* Product grid */}
            <div className="grid grid-cols-4 gap-2 p-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="overflow-hidden"
                  style={{ backgroundColor: palette.canvas }}
                >
                  <div
                    className="h-10 w-full"
                    style={{ backgroundColor: palette.border }}
                  />
                  <div className="p-1">
                    <div
                      className="mb-1 h-1 w-8 rounded-full"
                      style={{ backgroundColor: palette.foreground + "50" }}
                    />
                    <div
                      className="h-1 w-5 rounded-full"
                      style={{ backgroundColor: palette.primary + "80" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Card Info ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">
                {entry.name}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {entry.tagline}
              </p>
            </div>
            {/* Paleta */}
            <div className="flex shrink-0 gap-1">
              {Object.values(palette).slice(0, 4).map((color, i) => (
                <div
                  key={i}
                  title={color}
                  className="h-5 w-5 rounded-full border border-border shadow-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {entry.description}
          </p>
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
                className="h-9 flex-1 gap-1.5 rounded-xl text-xs"
                asChild
              >
                <a href="/loja/preview" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver ao vivo
                </a>
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
                className="h-9 flex-1 gap-1.5 rounded-xl text-xs"
                asChild
              >
                <a href="/loja/preview" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview
                </a>
              </Button>
              <Button
                size="sm"
                className="h-9 flex-1 gap-1.5 rounded-xl text-xs font-semibold"
                onClick={onApply}
              >
                <Palette className="h-3.5 w-3.5" />
                Aplicar Tema
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
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
        <p className="font-display text-sm font-semibold text-foreground">
          Mais temas em breve
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Novos templates são adicionados com atualizações do Modaly. Fique de olho!
        </p>
      </div>
    </div>
  );
}
