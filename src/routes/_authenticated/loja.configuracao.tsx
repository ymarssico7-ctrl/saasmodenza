import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Instagram,
  MessageCircle,
  MoreHorizontal,
  Paintbrush,
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
import { loadTheme } from "@/lib/theme-engine/defaults";

export const Route = createFileRoute("/_authenticated/loja/configuracao")({
  head: () => ({
    meta: [
      { title: "Aparência da loja — Modaly" },
      {
        name: "description",
        content: "Personalize o layout e as configurações da sua vitrine online.",
      },
    ],
  }),
  component: AparenciaPage,
});

function AparenciaPage() {
  const activeTheme = loadTheme();

  const [nome, setNome] = useState(loja.nome);
  const [descricao, setDescricao] = useState(loja.descricao);
  const [cor, setCor] = useState(loja.corPrincipal);
  const [mostrarEstoque, setMostrarEstoque] = useState(loja.mostrarEstoque);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Design & Visual"
        title="Aparência"
        description="Personalize o layout da sua vitrine e ajuste as informações básicas da loja."
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

      {/* ── Layout Ativo (Mockup estilo Nuvemshop) ─────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        {/* Mockup preview */}
        <div className="relative select-none overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 p-6">
          {/* Browser chrome */}
          <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-stone-300/60 bg-white shadow-lift">
            {/* Browser bar */}
            <div className="flex h-8 items-center gap-2 border-b border-stone-200 bg-stone-50 px-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <div className="mx-auto flex h-4 w-48 items-center rounded-full border border-stone-200 bg-white px-2">
                <span className="truncate text-[9px] text-stone-400">
                  minhaloja.modaly.com.br
                </span>
              </div>
            </div>

            {/* Store preview */}
            <div
              className="relative overflow-hidden"
              style={{ backgroundColor: activeTheme.settings.colorBackground }}
            >
              {/* Store nav */}
              <div
                className="flex items-center justify-between border-b px-4 py-2"
                style={{ borderColor: activeTheme.settings.colorBorder }}
              >
                <span
                  className="text-[11px] font-bold"
                  style={{
                    color: activeTheme.settings.colorForeground,
                    fontFamily: activeTheme.settings.fontDisplay,
                  }}
                >
                  {activeTheme.settings.storeName}
                </span>
                <div
                  className="flex gap-3 text-[9px]"
                  style={{ color: activeTheme.settings.colorForeground + "99" }}
                >
                  <span>Início</span>
                  <span>Produtos</span>
                  <span>Contato</span>
                </div>
              </div>

              {/* Hero */}
              <div
                className="relative flex h-28 items-center justify-center text-center"
                style={{ backgroundColor: activeTheme.settings.colorCanvas }}
              >
                <div>
                  <p
                    className="mb-1 text-[9px] font-medium uppercase tracking-widest"
                    style={{ color: activeTheme.settings.colorPrimary + "bb" }}
                  >
                    Coleção Nova
                  </p>
                  <p
                    className="text-base font-bold leading-tight"
                    style={{
                      color: activeTheme.settings.colorForeground,
                      fontFamily: activeTheme.settings.fontDisplay,
                    }}
                  >
                    O essencial,
                    <br />
                    refeito à mão
                  </p>
                  <div
                    className="mt-2 inline-block rounded px-3 py-1 text-[9px] font-semibold text-white"
                    style={{ backgroundColor: activeTheme.settings.colorPrimary }}
                  >
                    Ver a coleção
                  </div>
                </div>
              </div>

              {/* Product grid */}
              <div className="grid grid-cols-3 gap-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded"
                    style={{ backgroundColor: activeTheme.settings.colorCanvas }}
                  >
                    <div
                      className="h-10 w-full"
                      style={{ backgroundColor: activeTheme.settings.colorBorder }}
                    />
                    <div className="p-1">
                      <div
                        className="mb-1 h-1.5 w-10 rounded-full"
                        style={{
                          backgroundColor: activeTheme.settings.colorForeground + "40",
                        }}
                      />
                      <div
                        className="h-1.5 w-6 rounded-full"
                        style={{
                          backgroundColor: activeTheme.settings.colorPrimary + "60",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card footer */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold">Atelier Mod</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Layout atual
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl" asChild>
              <a href="/loja/preview" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Ver ao vivo
              </a>
            </Button>
            <Button
              className="gradient-primary h-9 gap-1.5 rounded-xl font-semibold shadow-glow"
              size="sm"
              asChild
            >
              <Link to="/loja/personalizar">
                <Paintbrush className="h-3.5 w-3.5" />
                Personalizar Loja
              </Link>
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Identity & Settings + Sidebar ─────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Left: Forms */}
        <div className="space-y-4">
          {/* Identidade da marca */}
          <SectionCard
            title="Identidade da marca"
            description="Nome, logo e capa da vitrine."
          >
            <div className="space-y-4">
              <Campo label="Nome da loja">
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="h-11 rounded-xl"
                />
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
                  <Upload className="h-5 w-5" />
                  Enviar logo (PNG ou JPG)
                </button>
                <button
                  onClick={() => toast.success("Banner enviado")}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-input bg-secondary/40 px-4 py-6 text-xs text-muted-foreground transition-colors duration-200 hover:border-primary hover:text-foreground"
                >
                  <ImagePlus className="h-5 w-5" />
                  Enviar foto de capa
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
                  <Input
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="h-11 max-w-[140px] rounded-xl"
                  />
                </div>
              </Campo>
            </div>
          </SectionCard>

          {/* Endereço */}
          <SectionCard
            title="Endereço da loja"
            description="Subdomínio gerado automaticamente."
          >
            <div className="space-y-4">
              <Campo label="Link da loja">
                <Input defaultValue={loja.subdominio} className="h-11 rounded-xl" />
              </Campo>
              <Campo label="Domínio próprio" extra={<PlanoBadge plan="crescimento" />}>
                <Input placeholder="minhaloja.com.br" className="h-11 rounded-xl" />
              </Campo>
            </div>
          </SectionCard>

          {/* Contato */}
          <SectionCard
            title="Contato e confiança"
            description="Aparece na vitrine para a cliente."
          >
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

          {/* Textos */}
          <SectionCard
            title="Textos da loja"
            description="Boas-vindas e política de troca."
          >
            <div className="space-y-4">
              <Campo label="Mensagem de boas-vindas">
                <Textarea
                  defaultValue={loja.boasVindas}
                  rows={2}
                  className="rounded-xl"
                />
              </Campo>
              <Campo label="Política de troca e devolução">
                <Textarea
                  defaultValue={loja.politicaTroca}
                  rows={4}
                  className="rounded-xl"
                />
              </Campo>
              <div className="flex items-center justify-between rounded-2xl border border-border p-4">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium">Mostrar quantidade em estoque</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Quando desligado, a vitrine mostra apenas "disponível".
                  </p>
                </div>
                <Switch
                  checked={mostrarEstoque}
                  onCheckedChange={setMostrarEstoque}
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Right: Sticky sidebar */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionCard
            title="Prévia rápida"
            description="Atualiza conforme você edita."
            bodyClassName="p-4"
          >
            <div className="overflow-hidden rounded-2xl border border-border">
              <div
                className="h-24 w-full"
                style={{
                  background: `linear-gradient(135deg, ${cor} 0%, ${cor}88 100%)`,
                }}
              />
              <div className="-mt-8 px-4 pb-5">
                <div
                  className="grid h-16 w-16 place-items-center rounded-2xl border-4 border-card text-lg font-semibold text-white"
                  style={{ backgroundColor: cor }}
                >
                  {nome.slice(0, 2).toUpperCase()}
                </div>
                <h3 className="mt-3 text-base font-semibold">{nome}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {descricao}
                </p>
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

// ── Field helper ───────────────────────────────────────────────────────────────
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
