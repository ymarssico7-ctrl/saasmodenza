import { useCallback, useState, useEffect } from "react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
  Maximize2,
  Minus,
  Monitor,
  Paintbrush,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Redo2,
  RotateCcw,
  Smartphone,
  Undo2,
  Wand2,
  History,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  Play,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BuilderProvider, useBuilder } from "@/lib/theme-engine/context";
import { saveTheme, loadTheme } from "@/lib/theme-engine/defaults";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";
import type { ThemeConfig } from "@/lib/theme-engine/schema";
import { ThemeRenderer } from "@/components/theme/theme-renderer";
import { QuickStoreWizard } from "@/components/loja/quick-store-wizard";
import { cn } from "@/lib/utils";
import { MobilePreviewFrame } from "./mobile-preview-frame";
import { SectionList, SECTION_LABELS, SECTION_ICONS } from "./section-list";
import { SectionInspector } from "./section-inspector";
import { GlobalSettings } from "./global-settings";

// ── Inner builder ─────────────────────────────────────────────────────────────
function BuilderInner() {
  const {
    theme,
    selectedSection,
    activeTab,
    previewMode,
    interactionMode,
    isDirty,
    canUndo,
    canRedo,
    isSidebarOpen,
    dispatch,
  } = useBuilder();

  const { store } = useStore();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Detecção física de viewport mobile (< 768px) para adaptação real em smartphones
  const [isPhysicalMobile, setIsPhysicalMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [physicalView, setPhysicalView] = useState<"editor" | "preview">("editor");

  useEffect(() => {
    const handleResize = () => setIsPhysicalMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sincroniza o ThemeBuilder caso o wizard ou outra aba altere o tema
  useEffect(() => {
    const handleSync = () => {
      dispatch({ type: "LOAD_THEME", theme: loadTheme() });
      void queryClient.invalidateQueries({ queryKey: ["active_store"] });
    };
    window.addEventListener("wizard-completed", handleSync);
    window.addEventListener("theme-changed", handleSync);
    return () => {
      window.removeEventListener("wizard-completed", handleSync);
      window.removeEventListener("theme-changed", handleSync);
    };
  }, [dispatch, queryClient]);

  // Auto-save com debounce: salva localmente 500ms após qualquer alteração
  // Evita perda de dados ao clicar em "Voltar" sem publicar
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      // Salva sempre no localStorage (instantâneo, sem latência de rede)
      saveTheme(theme);
      // Background draft para o Supabase (sem bloquear UI)
      if (store?.id) {
        const currentMeta = (store.metadata as Record<string, unknown> | null) || {};
        void supabase
          .from("stores")
          .update({
            metadata: {
              ...currentMeta,
              theme,
              templateId: theme.settings.templateId,
            } as never,
          })
          .eq("id", store.id);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [theme, isDirty, store?.id, store?.metadata]);

  // ── Zoom state (lifted from MobilePreviewFrame) ───────────────────────────
  // "auto" = ajusta automaticamente ao espaço disponível
  // number  = escala manual entre 0.3 e 1.0
  const [zoomMode, setZoomMode] = useState<"auto" | number>("auto");
  const [autoScale, setAutoScale] = useState(1);

  const effectiveScale = zoomMode === "auto" ? autoScale : zoomMode;
  const scalePercent = Math.round(effectiveScale * 100);

  const zoomIn = useCallback(() => {
    const base = zoomMode === "auto" ? autoScale : (zoomMode as number);
    setZoomMode(Math.min(1, parseFloat((base + 0.05).toFixed(2))));
  }, [zoomMode, autoScale]);

  const zoomOut = useCallback(() => {
    const base = zoomMode === "auto" ? autoScale : (zoomMode as number);
    setZoomMode(Math.max(0.3, parseFloat((base - 0.05).toFixed(2))));
  }, [zoomMode, autoScale]);

  const resetZoom = useCallback(() => setZoomMode("auto"), []);

  const handleSectionSelect = useCallback(
    (id: string | null) => {
      dispatch({ type: "SELECT_SECTION", id });
      if (id) {
        if (activeTab !== "sections") {
          dispatch({ type: "SET_TAB", tab: "sections" });
        }
        if (!isSidebarOpen) {
          dispatch({ type: "TOGGLE_SIDEBAR" });
        }
      }
    },
    [dispatch, activeTab, isSidebarOpen],
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      saveTheme(theme);
      if (store?.id) {
        const currentMeta = (store.metadata as Record<string, unknown> | null) || {};
        const previousHistory = Array.isArray(currentMeta["themeHistory"])
          ? (currentMeta["themeHistory"] as Array<{ savedAt: string; theme: ThemeConfig }>)
          : [];
        const updatedHistory = [
          { savedAt: new Date().toISOString(), theme },
          ...previousHistory.filter(Boolean).slice(0, 4),
        ];

        await supabase
          .from("stores")
          .update({
            metadata: {
              ...currentMeta,
              theme,
              templateId: theme.settings.templateId,
              themeHistory: updatedHistory,
            } as never,
          })
          .eq("id", store.id);
        void queryClient.invalidateQueries({ queryKey: ["active_store"] });
      }
      dispatch({ type: "SAVE" });
      toast.success("Loja publicada com sucesso!", {
        description: "As alterações já estão ao vivo na sua vitrine.",
      });
    } catch (err) {
      console.error("Erro ao salvar tema:", err);
      toast.error("Erro ao publicar tema na nuvem. Alterações salvas localmente.");
    } finally {
      setIsSaving(false);
    }
  }, [theme, dispatch, store, queryClient]);

  const storeMetadata = store?.metadata as Record<string, unknown> | null;
  const themeHistory = (Array.isArray(storeMetadata?.["themeHistory"])
    ? (storeMetadata?.["themeHistory"] as Array<{ savedAt: string; theme: ThemeConfig }>)
    : []
  ).filter((item) => item?.savedAt && item?.theme);

  const isMobile = previewMode === "mobile";

  return (
    <div className="fixed inset-0 z-[9999] flex overflow-hidden bg-background">
      {/* ════════════════════════════════════════════════════════════════════
          COLLAPSED STRIP — strip de 40px quando o sidebar está fechado
          Faz parte do layout (não absolute) → nunca sobrepõe o preview.
          ════════════════════════════════════════════════════════════════════ */}
      {!isSidebarOpen && !isPhysicalMobile && (
        <div
          className="flex shrink-0 flex-col items-center border-r border-border bg-card pt-3 gap-2"
          style={{ width: 40 }}
        >
          <button
            onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
            title="Mostrar painel de edição"
            className="grid h-8 w-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          FULL SIDEBAR — colapsa para 0 via CSS width transition
          Mobile físico: 100vw na aba editor | Desktop Mobile: 50% | Desktop: 320px | Fechado: 0px
          ════════════════════════════════════════════════════════════════════ */}
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-border bg-card overflow-hidden",
          isPhysicalMobile && physicalView === "preview" && "hidden"
        )}
        style={{
          width: isPhysicalMobile
            ? (physicalView === "editor" ? "100vw" : 0)
            : isSidebarOpen ? (isMobile ? "50%" : 320) : 0,
          transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          minHeight: 0,
        }}
      >
        <div
          className="shrink-0 border-b border-border bg-card"
          style={{ minWidth: isPhysicalMobile ? 0 : (isMobile ? 0 : 320) }}
        >
          {/* ── Linha 1: Voltar + Título + Ver ao vivo (ícone) + Publicar ─────── */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0 rounded-xl">
              <Link to="/loja/configuracao">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">Personalizar Loja</p>
              <p className="truncate text-[11px] text-muted-foreground leading-tight">
                {theme.settings.storeName}
              </p>
            </div>

            {/* Assistente em 3 Cliques */}
            <button
              onClick={() => setWizardOpen(true)}
              title="Criar Loja em 3 Cliques (Modo Expresso)"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-primary bg-primary/10 transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Wand2 className="h-4 w-4" />
            </button>

            {/* Histórico de Versões */}
            <button
              onClick={() => setHistoryOpen(true)}
              title="Histórico de Publicações"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <History className="h-4 w-4" />
            </button>

            {/* Ver ao vivo — ícone compacto */}
            <a
              href="/loja/preview"
              target="_blank"
              rel="noopener noreferrer"
              title="Ver ao vivo"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="h-8 shrink-0 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-glow"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {isDirty ? "Publicar" : "Publicado"}
                </>
              )}
            </Button>
          </div>

          {/* ════ Linha 2: Premium Modular Toolbar ══════════════════════════════════
              Layout: [Grupo A: Histórico] | [Grupo B: Viewport] | [Grupo C: Zoom*] ··· [Grupo D: Ações]
              * Grupo C só aparece no modo Mobile.
              Switch de viewport = ícone apenas (68px) → sem texto que encavala.
              ════════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-1.5 px-3 pb-3">
            {/* ── Grupo A: Histórico ───────────────────────────────────────────── */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => dispatch({ type: "UNDO" })}
                disabled={!canUndo}
                title="Desfazer (Ctrl+Z)"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-25 hover:enabled:bg-muted hover:enabled:text-foreground"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => dispatch({ type: "REDO" })}
                disabled={!canRedo}
                title="Refazer (Ctrl+Y)"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-25 hover:enabled:bg-muted hover:enabled:text-foreground"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Divisor A|B */}
            <div className="h-4 w-px shrink-0 bg-border" />

            {/* ── Grupo B: Viewport Switch (ícone apenas, 68px) ────────────────── */}
            <div
              className="flex shrink-0 items-center gap-0.5 rounded-xl p-[3px]"
              style={{ background: "var(--color-muted)", width: 68 }}
            >
              {/* Desktop */}
              <button
                onClick={() => dispatch({ type: "SET_PREVIEW", mode: "desktop" })}
                title="Visualização Desktop"
                className={`grid h-[22px] w-[28px] flex-1 place-items-center rounded-lg transition-all duration-150 ${
                  !isMobile
                    ? "bg-background text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              {/* Mobile */}
              <button
                onClick={() => dispatch({ type: "SET_PREVIEW", mode: "mobile" })}
                title="Visualização Mobile"
                className={`grid h-[22px] w-[28px] flex-1 place-items-center rounded-lg transition-all duration-150 ${
                  isMobile
                    ? "bg-background text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* ── Grupo C: Zoom (só aparece no modo Mobile) ────────────────────── */}
            {isMobile && (
              <>
                {/* Divisor B|C */}
                <div className="h-4 w-px shrink-0 bg-border" />

                <div className="flex items-center gap-0.5">
                  {/* Diminuir */}
                  <button
                    onClick={zoomOut}
                    title="Diminuir zoom"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
                  >
                    <Minus className="h-3 w-3" />
                  </button>

                  {/* Indicador — clica para Auto */}
                  <button
                    onClick={resetZoom}
                    title={zoomMode === "auto" ? "Auto-fit ativo" : "Voltar para Auto-fit"}
                    className="h-7 shrink-0 rounded-lg px-1.5 font-mono text-[10px] font-semibold transition-all duration-150 hover:bg-muted"
                    style={{
                      minWidth: 40,
                      color:
                        zoomMode === "auto"
                          ? "var(--color-primary)"
                          : "var(--color-muted-foreground)",
                    }}
                  >
                    {zoomMode === "auto" ? `A ${scalePercent}%` : `${scalePercent}%`}
                  </button>

                  {/* Aumentar */}
                  <button
                    onClick={zoomIn}
                    title="Aumentar zoom"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                  </button>

                  {/* 100% real */}
                  <button
                    onClick={() => (zoomMode === 1 ? resetZoom() : setZoomMode(1))}
                    title={zoomMode === 1 ? "Voltar para Auto" : "Tamanho real (100%)"}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-all duration-150 hover:bg-muted"
                    style={{
                      color:
                        zoomMode === 1 ? "var(--color-primary)" : "var(--color-muted-foreground)",
                    }}
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                </div>
              </>
            )}

            {/* Espaçador — empurra Grupo D para a extrema direita */}
            <div className="flex-1" />

            {/* ── Grupo D: Ações Globais ────────────────────────────────────────── */}
            <div className="flex items-center gap-0.5">
              {/* Redefinir — hover vermelho sutil, com confirmação */}
              <button
                onClick={() => {
                  const ok = window.confirm(
                    "Tem certeza que deseja redefinir o tema?\nTodas as personalizações serão perdidas.",
                  );
                  if (ok) {
                    dispatch({ type: "RESET" });
                    toast.info("Tema redefinido para o padrão.");
                  }
                }}
                title="Redefinir tema"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              {/* Ocultar painel */}
              <button
                onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
                title="Ocultar painel"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs: Seções | Estilo Global ──────────────────────────────────── */}
        <div
          className="flex shrink-0 border-b border-border"
          style={{ minWidth: isPhysicalMobile ? 0 : (isMobile ? 0 : 320) }}
        >
          <button
            onClick={() => dispatch({ type: "SET_TAB", tab: "sections" })}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "sections"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Seções
          </button>
          <button
            onClick={() => dispatch({ type: "SET_TAB", tab: "global" })}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "global"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Paintbrush className="h-3.5 w-3.5" />
            Estilo Global
          </button>
        </div>

        {/* ── Conteúdo scrollável com navegação Drill-Down em 2 níveis ─────────────────────── */}
        <div className={cn("flex-1 overflow-y-auto custom-scrollbar p-3", isPhysicalMobile && "pb-24")}>
          {activeTab === "sections" && (
            selectedSection ? (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* ── Drill-Down Header ─────────────────────────────────────── */}
                <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dispatch({ type: "SELECT_SECTION", id: null })}
                      className="h-8 gap-1 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer shrink-0"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Voltar
                    </Button>
                    <div className="h-4 w-px bg-border shrink-0" />
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="text-primary shrink-0">
                        {SECTION_ICONS[selectedSection.type]}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground leading-tight truncate">
                          {SECTION_LABELS[selectedSection.type] ?? selectedSection.type}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          {selectedSection.visible ? "Seção Visível" : "Seção Oculta"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "TOGGLE_VISIBLE", id: selectedSection.id })}
                      className="grid h-8 w-8 place-items-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                      title={selectedSection.visible ? "Ocultar seção na loja" : "Mostrar seção na loja"}
                    >
                      {selectedSection.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-amber-500" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Deseja realmente excluir esta seção da sua loja?")) {
                          dispatch({ type: "DELETE_SECTION", id: selectedSection.id });
                        }
                      }}
                      className="grid h-8 w-8 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors"
                      title="Excluir seção"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* ── Inspetor Focado (100% no topo) ─────────────────────────── */}
                <div className="rounded-2xl border border-border bg-background p-3.5 shadow-2xs">
                  <SectionInspector section={selectedSection} />
                </div>
              </div>
            ) : (
              <SectionList />
            )
          )}
          {activeTab === "global" && <GlobalSettings />}
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          CANVAS DE PREVIEW — 100% altura livre, zero barras sobrepostas
          No smartphone físico, exibe quando physicalView === "preview"
          ════════════════════════════════════════════════════════════════════ */}
      {(!isPhysicalMobile || physicalView === "preview") && (
        <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* ── Seletor Flutuante de Modo: Personalizar vs Testar Loja ───────── */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-2xl border border-border/80 bg-card/90 px-1.5 py-1 shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_INTERACTION_MODE", mode: "edit" })}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                interactionMode === "edit"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Personalizar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "SET_INTERACTION_MODE", mode: "interactive" });
                toast.info("Modo de Teste Interativo Ativado", {
                  description: "Todos os cliques, banners, categorias e botões funcionam como na loja real.",
                });
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                interactionMode === "interactive"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Play className="h-3.5 w-3.5" />
              <span>Testar Loja</span>
            </button>
          </div>

          {isMobile ? (
            <MobilePreviewFrame
              theme={theme}
              highlightId={selectedSection?.id ?? null}
              interactionMode={interactionMode}
              isSidebarOpen={isSidebarOpen}
              zoomMode={zoomMode}
              autoScale={autoScale}
              onAutoScaleChange={setAutoScale}
              onSectionClick={handleSectionSelect}
              onToggleSection={(id) => dispatch({ type: "TOGGLE_VISIBLE", id })}
              onDeleteSection={(id) => dispatch({ type: "DELETE_SECTION", id })}
              onOpenSidebar={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
            />
          ) : (
            <main className="relative flex-1 overflow-auto bg-white pt-10">
              <ThemeRenderer
                theme={theme}
                highlightId={selectedSection?.id ?? null}
                interactionMode={interactionMode}
                onSectionClick={handleSectionSelect}
                onToggleSection={(id) => dispatch({ type: "TOGGLE_VISIBLE", id })}
                onDeleteSection={(id) => dispatch({ type: "DELETE_SECTION", id })}
              />
            </main>
          )}
        </div>
      )}

      <QuickStoreWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={() => {
          dispatch({ type: "LOAD_THEME", theme: loadTheme() });
        }}
      />

      {/* ── Modal de Histórico de Versões ──────────────────────────────────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico de Publicações
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Restaure qualquer versão publicada anteriormente da sua loja com 1 clique.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2.5">
            {themeHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                Nenhuma publicação anterior registrada ainda.
                <br />
                As versões salvas aparecerão aqui automaticamente.
              </div>
            ) : (
              themeHistory.map((item, idx) => {
                const date = new Date(item.savedAt);
                const formattedDate = date.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
                const formattedTime = date.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={item.savedAt}
                    className="flex items-center justify-between rounded-2xl border border-border bg-background p-3.5 transition-colors hover:border-primary/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          {idx === 0 ? "Versão Recente" : `Versão ${themeHistory.length - idx}`}
                        </span>
                        <span className="text-[10px] rounded-full bg-secondary px-2 py-0.5 text-muted-foreground font-mono">
                          {item.theme?.settings?.templateId || "template"}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formattedDate} às {formattedTime}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 rounded-xl text-xs font-semibold hover:border-primary hover:text-primary cursor-pointer"
                      onClick={() => {
                        dispatch({ type: "LOAD_THEME", theme: item.theme });
                        saveTheme(item.theme);
                        setHistoryOpen(false);
                        toast.success("Versão da loja restaurada com sucesso!", {
                          description: "Clique em 'Publicar' para salvar como a versão oficial ativa.",
                        });
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurar
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Barra Flutuante de Controle Mobile (Apenas Telas Físicas < 768px) ── */}
      {isPhysicalMobile && (
        <div className="fixed bottom-3 left-3 right-3 z-50 flex items-center justify-between rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-2xl backdrop-blur-md">
          {/* Alternador Editor / Ver Loja */}
          <div className="flex items-center rounded-xl bg-secondary/80 p-0.5">
            <button
              type="button"
              onClick={() => setPhysicalView("editor")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                physicalView === "editor"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => setPhysicalView("preview")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                physicalView === "preview"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Ver Loja
            </button>
          </div>

          {/* Atalho Modo Expresso + Publicar */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              title="Criador em 3 Cliques (Modo Expresso)"
              className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer"
            >
              <Wand2 className="h-4 w-4" />
            </button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="h-8 gap-1 rounded-xl px-3 text-xs font-semibold shadow-glow cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isDirty ? "Publicar" : "Publicado"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Public Export ─────────────────────────────────────────────────────────────
export function ThemeBuilder() {
  const { store } = useStore();
  const remoteTheme = (store?.metadata as Record<string, unknown> | null)?.["theme"] as ThemeConfig | undefined;

  return (
    <BuilderProvider {...(remoteTheme ? { initialTheme: remoteTheme } : {})}>
      <BuilderInner />
    </BuilderProvider>
  );
}
