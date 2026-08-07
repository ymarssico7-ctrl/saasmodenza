import { useCallback } from "react";
import {
  ArrowLeft,
  Check,
  Monitor,
  Paintbrush,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BuilderProvider, useBuilder } from "@/lib/theme-engine/context";
import { saveTheme } from "@/lib/theme-engine/defaults";
import { ThemeRenderer } from "@/components/theme/theme-renderer";
import { SectionList } from "./section-list";
import { SectionInspector } from "./section-inspector";
import { GlobalSettings } from "./global-settings";

// ── Inner builder (needs access to context) ───────────────────────────────────
function BuilderInner() {
  const {
    theme,
    selectedSection,
    activeTab,
    previewMode,
    isDirty,
    dispatch,
  } = useBuilder();

  const handleSave = useCallback(() => {
    saveTheme(theme);
    dispatch({ type: "SAVE" });
    toast.success("Loja salva!", {
      description: "As alterações foram salvas com sucesso.",
    });
  }, [theme, dispatch]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-xl">
          <Link to="/loja">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            Personalizar Loja
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            {theme.settings.storeName}
          </p>
        </div>

        {/* Preview toggle */}
        <div className="mx-auto flex items-center gap-1 rounded-xl border border-border bg-secondary/40 p-1">
          <button
            onClick={() => dispatch({ type: "SET_PREVIEW", mode: "desktop" })}
            className={`flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all ${
              previewMode === "desktop"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            Desktop
          </button>
          <button
            onClick={() => dispatch({ type: "SET_PREVIEW", mode: "mobile" })}
            className={`flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all ${
              previewMode === "mobile"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Mobile
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              dispatch({ type: "RESET" });
              toast.info("Tema redefinido para o padrão.");
            }}
            className="h-9 gap-1.5 rounded-xl text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Redefinir
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty}
            className="h-9 gap-1.5 rounded-xl px-4 font-semibold shadow-glow"
          >
            <Check className="h-3.5 w-3.5" />
            {isDirty ? "Publicar" : "Publicado"}
          </Button>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => dispatch({ type: "SET_TAB", tab: "sections" })}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "sections"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Seções
            </button>
            <button
              onClick={() => dispatch({ type: "SET_TAB", tab: "global" })}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "global"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Paintbrush className="h-3.5 w-3.5" />
              Estilo Global
            </button>
          </div>

          <ScrollArea className="flex-1 px-3 py-3">
            {activeTab === "sections" && (
              <div className="space-y-4">
                <SectionList />
                {selectedSection && (
                  <div className="rounded-2xl border border-border bg-background p-3">
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Editar Seção
                    </p>
                    <SectionInspector section={selectedSection} />
                  </div>
                )}
              </div>
            )}
            {activeTab === "global" && <GlobalSettings />}
          </ScrollArea>
        </aside>

        {/* Preview Area */}
        <main className="flex flex-1 flex-col items-center overflow-auto bg-secondary/20 p-4">
          <div
            className={`w-full overflow-hidden rounded-2xl border border-border bg-white shadow-lift transition-all duration-300 ${
              previewMode === "mobile" ? "max-w-[390px]" : "max-w-none"
            }`}
            style={{ minHeight: "80vh" }}
          >
            <ThemeRenderer
              theme={theme}
              highlightId={selectedSection?.id}
              onSectionClick={(id) =>
                dispatch({ type: "SELECT_SECTION", id })
              }
            />
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Public Export (wraps in Provider) ────────────────────────────────────────
export function ThemeBuilder() {
  return (
    <BuilderProvider>
      <BuilderInner />
    </BuilderProvider>
  );
}
