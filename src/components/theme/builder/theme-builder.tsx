import { useCallback, useState } from "react";
import {
  ChevronRight,
  ExternalLink,
  Monitor,
  Smartphone,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BuilderProvider, useBuilder } from "@/lib/theme-engine/context";
import { saveTheme } from "@/lib/theme-engine/defaults";
import { ThemeRenderer } from "@/components/theme/theme-renderer";
import { SectionInspector } from "./section-inspector";
import { GlobalSettings } from "./global-settings";
import { SectionList } from "./section-list";
import type { ThemeSection } from "@/lib/theme-engine/schema";

// ── Accordion item ────────────────────────────────────────────────────────────
function AccordionItem({
  icon,
  label,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/40"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border/50 bg-secondary/20 px-4 py-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Section icon helpers ──────────────────────────────────────────────────────
function SectionIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    hero: "🖼️",
    category_bar: "🏷️",
    product_grid: "🛍️",
    image_text_split: "📖",
    features: "✨",
  };
  return <span className="text-base">{icons[type] ?? "📦"}</span>;
}

// ── Inner builder (needs access to context) ───────────────────────────────────
function BuilderInner() {
  const {
    theme,
    selectedSection,
    previewMode,
    isDirty,
    dispatch,
  } = useBuilder();

  const [openAccordion, setOpenAccordion] = useState<string | null>("pagina-inicial");

  const handleSave = useCallback(() => {
    saveTheme(theme);
    dispatch({ type: "SAVE" });
    toast.success("Alterações publicadas!", {
      description: "Sua loja está atualizada.",
    });
  }, [theme, dispatch]);

  const isMobile = previewMode === "mobile";

  function toggleAccordion(key: string) {
    setOpenAccordion((prev) => (prev === key ? null : key));
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        {/* Left: X + title */}
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
            <Link to="/loja/configuracao">
              <X className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm font-semibold text-foreground truncate">
            Editar layout
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            ● Layout atual
          </span>
        </div>

        {/* Center: Device toggle pills */}
        <div className="mx-auto flex items-center rounded-full border border-border bg-secondary/50 p-0.5">
          <button
            onClick={() => dispatch({ type: "SET_PREVIEW", mode: "mobile" })}
            className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all duration-200 ${
              isMobile
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Celulares
          </button>
          <button
            onClick={() => dispatch({ type: "SET_PREVIEW", mode: "desktop" })}
            className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all duration-200 ${
              !isMobile
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            Computadores
          </button>
        </div>

        {/* Right: Ver loja */}
        <a
          href="/loja/preview"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver loja
        </a>
      </header>

      {/* ── Main Layout ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar ───────────────────────────────────────────────────── */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
          <ScrollArea className="flex-1">
            {/* Section inspector — shown when a section is selected */}
            {selectedSection ? (
              <div>
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <button
                    onClick={() => dispatch({ type: "SELECT_SECTION", id: null })}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ← Voltar
                  </button>
                  <span className="text-sm font-semibold">Editar seção</span>
                </div>
                <div className="px-4 py-4">
                  <SectionInspector section={selectedSection} />
                </div>
              </div>
            ) : (
              <div>
                {/* Group: Brand identity & style */}
                <div className="border-b border-border px-4 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Imagem da sua marca
                  </p>
                </div>

                <AccordionItem
                  icon={<span>🎨</span>}
                  label="Cores da sua marca"
                  open={openAccordion === "cores"}
                  onToggle={() => toggleAccordion("cores")}
                >
                  <ColorsPanel />
                </AccordionItem>

                <AccordionItem
                  icon={<span>🔤</span>}
                  label="Tipo de Letra"
                  open={openAccordion === "tipografia"}
                  onToggle={() => toggleAccordion("tipografia")}
                >
                  <TypographyPanel />
                </AccordionItem>

                <AccordionItem
                  icon={<span>⚙️</span>}
                  label="Opções de design"
                  open={openAccordion === "design"}
                  onToggle={() => toggleAccordion("design")}
                >
                  <DesignOptionsPanel />
                </AccordionItem>

                {/* Group: Advanced sections */}
                <div className="border-b border-t border-border bg-secondary/30 px-4 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Configurações avançadas
                  </p>
                </div>

                <AccordionItem
                  icon={<span>⬆️</span>}
                  label="Cabeçalho"
                  open={openAccordion === "cabecalho"}
                  onToggle={() => toggleAccordion("cabecalho")}
                >
                  <HeaderPanel />
                </AccordionItem>

                <AccordionItem
                  icon={<span>🏠</span>}
                  label="Página inicial"
                  open={openAccordion === "pagina-inicial"}
                  onToggle={() => toggleAccordion("pagina-inicial")}
                >
                  <SectionListPanel onSelectSection={(s) => dispatch({ type: "SELECT_SECTION", id: s.id })} />
                </AccordionItem>

                <AccordionItem
                  icon={<span>🩳</span>}
                  label="Lista de produtos"
                  open={openAccordion === "produtos"}
                  onToggle={() => toggleAccordion("produtos")}
                >
                  <p className="text-xs text-muted-foreground">Configurações da grade de produtos em breve.</p>
                </AccordionItem>

                <AccordionItem
                  icon={<span>🛒</span>}
                  label="Carrinho de compras"
                  open={openAccordion === "carrinho"}
                  onToggle={() => toggleAccordion("carrinho")}
                >
                  <p className="text-xs text-muted-foreground">Configurações do carrinho em breve.</p>
                </AccordionItem>

                <AccordionItem
                  icon={<span>⬇️</span>}
                  label="Rodapé da página"
                  open={openAccordion === "rodape"}
                  onToggle={() => toggleAccordion("rodape")}
                >
                  <FooterPanel />
                </AccordionItem>
              </div>
            )}
          </ScrollArea>

          {/* ── Fixed Publish Button ───────────────────────────────────────── */}
          <div className="shrink-0 border-t border-border p-4">
            <Button
              onClick={handleSave}
              disabled={!isDirty}
              className={`w-full rounded-xl font-semibold transition-all ${
                isDirty
                  ? "gradient-primary shadow-glow"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              }`}
            >
              {isDirty ? "Publicar alterações" : "Sem alterações"}
            </Button>
          </div>
        </aside>

        {/* ── Preview Area ─────────────────────────────────────────────────── */}
        {isMobile ? (
          <main className="flex flex-1 flex-col items-center justify-start overflow-auto bg-[#1c1c1e] py-8">
            <div
              className="relative overflow-hidden rounded-[2.5rem] shadow-2xl ring-4 ring-white/10 transition-all duration-300"
              style={{ width: 390, minHeight: 700 }}
            >
              {/* Phone status bar */}
              <div className="absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-center bg-black">
                <div className="h-3.5 w-24 rounded-full bg-zinc-800" />
              </div>
              <div className="mt-8 overflow-y-auto bg-white" style={{ minHeight: 660 }}>
                <ThemeRenderer
                  theme={theme}
                  highlightId={selectedSection?.id}
                  onSectionClick={(id) => dispatch({ type: "SELECT_SECTION", id })}
                />
              </div>
            </div>
          </main>
        ) : (
          <main className="relative flex-1 overflow-auto bg-white">
            <ThemeRenderer
              theme={theme}
              highlightId={selectedSection?.id}
              onSectionClick={(id) => dispatch({ type: "SELECT_SECTION", id })}
            />
          </main>
        )}
      </div>
    </div>
  );
}

// ── Panel sub-components ──────────────────────────────────────────────────────

function ColorsPanel() {
  const { theme, dispatch } = useBuilder();
  const s = theme.settings;
  const patch = (p: Partial<typeof s>) => dispatch({ type: "UPDATE_SETTINGS", patch: p });

  return (
    <div className="space-y-3">
      {[
        { label: "Cor de destaque", key: "colorPrimary" as const },
        { label: "Fundo principal", key: "colorBackground" as const },
        { label: "Texto principal", key: "colorForeground" as const },
        { label: "Fundo secundário", key: "colorCanvas" as const },
      ].map(({ label, key }) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={s[key] as string}
              onChange={(e) => patch({ [key]: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
            />
            <span className="w-16 text-right font-mono text-[11px] text-muted-foreground">
              {(s[key] as string).toUpperCase()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TypographyPanel() {
  const { theme, dispatch } = useBuilder();
  const s = theme.settings;
  const patch = (p: Partial<typeof s>) => dispatch({ type: "UPDATE_SETTINGS", patch: p });

  const displayFonts = [
    "Playfair Display",
    "Cormorant Garamond",
    "DM Serif Display",
    "Libre Baskerville",
    "Sora",
  ];
  const bodyFonts = ["Manrope", "Inter", "DM Sans", "Plus Jakarta Sans"];

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground">Fonte de títulos</p>
        <select
          value={s.fontDisplay}
          onChange={(e) => patch({ fontDisplay: e.target.value as typeof s.fontDisplay })}
          className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
        >
          {displayFonts.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground">Fonte de texto</p>
        <select
          value={s.fontBody}
          onChange={(e) => patch({ fontBody: e.target.value as typeof s.fontBody })}
          className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
        >
          {bodyFonts.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function DesignOptionsPanel() {
  const { theme, dispatch } = useBuilder();
  const s = theme.settings;
  const patch = (p: Partial<typeof s>) => dispatch({ type: "UPDATE_SETTINGS", patch: p });

  const radii = [
    { value: "none", label: "Reto", px: "0px" },
    { value: "sm", label: "Leve", px: "4px" },
    { value: "md", label: "Médio", px: "8px" },
    { value: "lg", label: "Arredondado", px: "16px" },
  ] as const;

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">Arredondamento dos botões</p>
      <div className="flex gap-2">
        {radii.map((r) => (
          <button
            key={r.value}
            title={r.label}
            onClick={() => patch({ borderRadius: r.value })}
            className={`flex h-9 w-9 items-center justify-center border-2 transition-all ${
              s.borderRadius === r.value ? "border-primary" : "border-border"
            }`}
            style={{
              borderRadius: r.px,
              backgroundColor: s.colorPrimary,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function HeaderPanel() {
  const { theme, dispatch } = useBuilder();
  const s = theme.settings;
  const patch = (p: Partial<typeof s>) => dispatch({ type: "UPDATE_SETTINGS", patch: p });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Faixa de frete grátis</span>
        <button
          onClick={() => patch({ freeShippingBannerEnabled: !s.freeShippingBannerEnabled })}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            s.freeShippingBannerEnabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              s.freeShippingBannerEnabled ? "left-4" : "left-0.5"
            }`}
          />
        </button>
      </div>
      {s.freeShippingBannerEnabled && (
        <input
          value={s.freeShippingBanner}
          onChange={(e) => patch({ freeShippingBanner: e.target.value })}
          className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
      )}
    </div>
  );
}

function SectionListPanel({ onSelectSection }: { onSelectSection: (s: ThemeSection) => void }) {
  const { theme, dispatch } = useBuilder();

  return (
    <div className="space-y-1.5">
      {theme.order.map((id) => {
        const sec = theme.sections.find((s) => s.id === id);
        if (!sec) return null;
        return (
          <button
            key={id}
            onClick={() => onSelectSection(sec)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
          >
            <SectionIcon type={sec.type} />
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium capitalize">
                {sec.type.replace(/_/g, " ")}
              </p>
              <p className={`text-[10px] ${sec.visible ? "text-emerald-600" : "text-muted-foreground"}`}>
                {sec.visible ? "Visível" : "Oculta"}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}

function FooterPanel() {
  const { theme, dispatch } = useBuilder();
  const s = theme.settings;
  const patch = (p: Partial<typeof s>) => dispatch({ type: "UPDATE_SETTINGS", patch: p });

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground">Nome da loja (rodapé)</p>
        <input
          value={s.storeName}
          onChange={(e) => patch({ storeName: e.target.value })}
          className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground">Tagline / slogan</p>
        <input
          value={s.tagline}
          onChange={(e) => patch({ tagline: e.target.value })}
          className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}

// ── Public Export (wraps in Provider) ─────────────────────────────────────────
export function ThemeBuilder() {
  return (
    <BuilderProvider>
      <BuilderInner />
    </BuilderProvider>
  );
}
