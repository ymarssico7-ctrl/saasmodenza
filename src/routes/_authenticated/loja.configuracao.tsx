import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  ExternalLink,
  ImagePlus,
  Instagram,
  MessageCircle,
  Paintbrush,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard } from "@/components/loja/section-card";
import { PlanoBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { loja } from "@/data/loja";
import {
  ALL_TEMPLATES,
  loadTheme,
  saveTheme,
  type TemplateEntry,
} from "@/lib/theme-engine/defaults";

export const Route = createFileRoute("/_authenticated/loja/configuracao")({
  head: () => ({
    meta: [
      { title: "Aparência da loja — Modaly" },
      {
        name: "description",
        content: "Personalize o visual da sua vitrine online com o editor arrasta-e-solta.",
      },
    ],
  }),
  component: AparenciaPage,
});

function AparenciaPage() {
  const [nome, setNome] = useState(loja.nome);
  const [descricao, setDescricao] = useState(loja.descricao);
  const [cor, setCor] = useState(loja.corPrincipal);
  const [mostrarEstoque, setMostrarEstoque] = useState(loja.mostrarEstoque);

  // Determine currently active template name from saved theme
  const activeTheme = loadTheme();
  const activeTemplateName =
    ALL_TEMPLATES.find(
      (t) => t.accentColor === activeTheme.settings.colorPrimary,
    )?.name ?? "Atelier Mod";

  function applyTemplate(entry: TemplateEntry) {
    // Preserve the merchant's store name & tagline, swap the visual design
    const merged = {
      ...entry.theme,
      settings: {
        ...entry.theme.settings,
        storeName: activeTheme.settings.storeName,
        tagline: activeTheme.settings.tagline,
      },
    };
    saveTheme(merged);
    toast.success(`Template "${entry.name}" aplicado!`, {
      description: "Clique em 'Personalizar Loja' para ajustar os detalhes.",
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Design & Visual"
        title="Aparência"
        description="Escolha um template, personalize cada detalhe e publique sua vitrine."
        actions={
          <Button
            className="gradient-primary h-10 gap-2 rounded-full shadow-glow"
            onClick={() => toast.success("Configurações de identidade salvas")}
          >
            <Check className="h-4 w-4" />
            Salvar identidade
          </Button>
        }
      />

      {/* ── Active Theme Card ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6">
        {/* Background decorative blobs */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-10 blur-3xl"
          style={{ background: activeTheme.settings.colorPrimary }}
        />

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          {/* Theme palette preview */}
          <div className="flex shrink-0 gap-1.5">
            {[
              activeTheme.settings.colorBackground,
              activeTheme.settings.colorCanvas,
              activeTheme.settings.colorPrimary,
              activeTheme.settings.colorForeground,
            ].map((c, i) => (
              <div
                key={i}
                className="h-12 w-12 rounded-xl border border-white/20 shadow-sm ring-1 ring-black/5"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                Tema Ativo
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">{activeTemplateName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium" style={{ fontFamily: activeTheme.settings.fontDisplay }}>
                {activeTheme.settings.fontDisplay}
              </span>{" "}
              + {activeTheme.settings.fontBody} ·{" "}
              {activeTheme.sections.filter((s) => s.visible).length} seções ativas
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button variant="outline" size="sm" className="h-10 gap-2 rounded-xl" asChild>
              <a href="/loja/preview" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Ver ao vivo
              </a>
            </Button>
            <Button
              size="sm"
              className="gradient-primary h-10 gap-2 rounded-xl font-semibold shadow-glow"
              asChild
            >
              <Link to="/loja/personalizar">
                <Paintbrush className="h-3.5 w-3.5" />
                Personalizar Loja
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Template Gallery ──────────────────────────────────────────────────── */}
      <SectionCard
        title="Galeria de Templates"
        description="Escolha um visual para sua loja e personalize cada detalhe no editor."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ALL_TEMPLATES.map((tmpl) => {
            const isActive = tmpl.accentColor === activeTheme.settings.colorPrimary &&
              tmpl.bgColor === activeTheme.settings.colorBackground;
            return (
              <TemplateCard
                key={tmpl.id}
                entry={tmpl}
                isActive={isActive}
                onApply={() => applyTemplate(tmpl)}
              />
            );
          })}
        </div>
      </SectionCard>

      {/* ── Identity & Settings ───────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <SectionCard title="Identidade da marca" description="Nome, logo e capa da vitrine.">
            <div className="space-y-4">
              <Campo label="Nome da loja">
                <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 rounded-xl" />
              </Campo>
              <Campo label="Descrição curta (aparece no topo da vitrine)">
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  className="rounded-xl"
                />
              </Campo>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => toast.success("Logo enviada")}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-input bg-secondary/40 px-4 py-6 text-xs text-muted-foreground transition-colors duration-200 hover:border-primary hover:text-foreground"
                >
                  <Upload className="h-5 w-5" /> Enviar logo (PNG ou JPG)
                </button>
                <button
                  onClick={() => toast.success("Banner enviado")}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-input bg-secondary/40 px-4 py-6 text-xs text-muted-foreground transition-colors duration-200 hover:border-primary hover:text-foreground"
                >
                  <ImagePlus className="h-5 w-5" /> Enviar foto de capa
                </button>
              </div>

              <Campo label="Cor principal da loja">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    aria-label="Cor principal da loja"
                    className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-card p-1"
                  />
                  <Input value={cor} onChange={(e) => setCor(e.target.value)} className="h-11 max-w-[140px] rounded-xl" />
                </div>
              </Campo>
            </div>
          </SectionCard>

          <SectionCard title="Endereço da loja" description="Subdomínio gerado automaticamente.">
            <div className="space-y-4">
              <Campo label="Link da loja">
                <Input defaultValue={loja.subdominio} className="h-11 rounded-xl" />
              </Campo>
              <Campo label="Domínio próprio" extra={<PlanoBadge plan="crescimento" />}>
                <Input placeholder="minhaloja.com.br" className="h-11 rounded-xl" />
              </Campo>
            </div>
          </SectionCard>

          <SectionCard title="Contato e confiança" description="Aparece na vitrine para a cliente.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="WhatsApp">
                <Input defaultValue={loja.whatsapp} className="h-11 rounded-xl" />
              </Campo>
              <Campo label="Instagram">
                <Input defaultValue={loja.instagram} className="h-11 rounded-xl" />
              </Campo>
              <Campo label="Cidade">
                <Input defaultValue={loja.cidade} className="h-11 rounded-xl" />
              </Campo>
              <Campo label="Estado">
                <Input defaultValue={loja.estado} className="h-11 rounded-xl" />
              </Campo>
            </div>
          </SectionCard>

          <SectionCard title="Textos da loja" description="Boas-vindas e política de troca.">
            <div className="space-y-4">
              <Campo label="Mensagem de boas-vindas">
                <Textarea defaultValue={loja.boasVindas} rows={2} className="rounded-xl" />
              </Campo>
              <Campo label="Política de troca e devolução">
                <Textarea defaultValue={loja.politicaTroca} rows={4} className="rounded-xl" />
              </Campo>
              <div className="flex items-center justify-between rounded-2xl border border-border p-4">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium">Mostrar quantidade em estoque</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Quando desligado, a vitrine mostra apenas "disponível".
                  </p>
                </div>
                <Switch checked={mostrarEstoque} onCheckedChange={setMostrarEstoque} />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Live Preview Sidebar ────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionCard title="Prévia rápida" description="Atualiza conforme você edita." bodyClassName="p-4">
            <div className="overflow-hidden rounded-2xl border border-border">
              <div
                className="h-24 w-full"
                style={{ background: `linear-gradient(135deg, ${cor} 0%, ${cor}88 100%)` }}
              />
              <div className="-mt-8 px-4 pb-5">
                <div
                  className="grid h-16 w-16 place-items-center rounded-2xl border-4 border-card text-lg font-semibold text-white"
                  style={{ backgroundColor: cor }}
                >
                  {nome.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="mt-3 text-base font-semibold">{nome}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{descricao}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {loja.cidade} · {loja.estado}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: cor }}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Comprar pelo WhatsApp
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
                    <Instagram className="h-3.5 w-3.5" /> {loja.instagram}
                  </span>
                </div>
                <p className="mt-4 rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
                  {loja.boasVindas}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
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
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-200 hover:shadow-lift ${
        isActive ? "border-primary shadow-glow" : "border-border hover:border-primary/40"
      }`}
    >
      {/* Theme palette strip */}
      <div
        className="h-24 w-full transition-transform duration-300 group-hover:scale-105"
        style={{
          background: `linear-gradient(135deg, ${entry.bgColor} 0%, ${entry.accentColor}22 60%, ${entry.accentColor}55 100%)`,
        }}
      >
        {/* Font preview */}
        <div className="flex h-full flex-col items-start justify-end p-3">
          <p
            className="text-[10px] font-medium tracking-widest uppercase opacity-60"
            style={{ color: entry.accentColor }}
          >
            Título
          </p>
          <p
            className="text-base font-bold leading-tight"
            style={{ color: entry.accentColor, fontFamily: entry.fontStyle }}
          >
            {entry.name}
          </p>
        </div>

        {/* Color swatches */}
        <div className="absolute bottom-3 right-3 flex gap-1">
          {[entry.bgColor, entry.accentColor].map((c, i) => (
            <div
              key={i}
              className="h-5 w-5 rounded-full border border-white/30 shadow-sm"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{entry.name}</p>
            {isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Check className="h-2.5 w-2.5" />
                Ativo
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {entry.description}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-1">
          {isActive ? (
            <Button size="sm" className="gradient-primary h-8 w-full rounded-xl text-xs font-semibold gap-1.5" asChild>
              <Link to="/loja/personalizar">
                <Paintbrush className="h-3 w-3" />
                Personalizar
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full rounded-xl text-xs font-medium"
              onClick={onApply}
            >
              Aplicar & Personalizar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────
function Campo({
  label,
  extra,
  children,
}: {
  label: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        {extra}
      </div>
      {children}
    </div>
  );
}
