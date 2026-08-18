import { useState, useEffect } from "react";
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
  Phone,
  MapPin,
  Globe,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard } from "@/components/loja/section-card";
import { PlanoBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/ui/image-uploader";
import { loadTheme, saveTheme } from "@/lib/theme-engine/defaults";
import { useStore } from "@/lib/store-context";
import { getVitrineSettings, saveVitrineSettings } from "@/lib/vitrine-settings";
import { updateStoreDetails } from "@/lib/mutations";

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
  const { store, storeId } = useStore();
  const queryClient = useQueryClient();

  // Campos que vêm do banco (tabela `stores`)
  const [nome, setNome] = useState(store?.name ?? "");
  const [whatsapp, setWhatsapp] = useState(store?.phone ?? "");
  const [cidade, setCidade] = useState(store?.city ?? "");

  // Leitura de localStorage feita UMA ÚNICA VEZ na montagem (lazy initializer).
  // Evita JSON.parse e I/O síncrono a cada re-render da página.
  const [vitrineSettings] = useState(() => getVitrineSettings(storeId));
  const [activeTheme] = useState(() => loadTheme());

  // Campos que ficam no localStorage isolado por loja
  const [descricao, setDescricao] = useState(vitrineSettings.descricao);
  const [cor, setCor] = useState(vitrineSettings.corPrincipal);
  const [instagram, setInstagram] = useState(vitrineSettings.instagram);
  const [estado, setEstado] = useState(vitrineSettings.estado);
  const [boasVindas, setBoasVindas] = useState(vitrineSettings.boasVindas);
  const [politicaTroca, setPoliticaTroca] = useState(vitrineSettings.politicaTroca);
  const [mostrarEstoque, setMostrarEstoque] = useState(vitrineSettings.mostrarEstoque);
  const [logoUrl, setLogoUrl] = useState(vitrineSettings.logoUrl ?? "");
  const [capaUrl, setCapaUrl] = useState(vitrineSettings.capaUrl ?? "");
  const [salvando, setSalvando] = useState(false);

  // Sincroniza se o store mudar (ex: após refetch)
  useEffect(() => {
    if (store?.name && !nome) setNome(store.name);
    if (store?.phone && !whatsapp) setWhatsapp(store.phone ?? "");
    if (store?.city && !cidade) setCidade(store.city ?? "");
  }, [store]);

  const salvar = async () => {
    setSalvando(true);
    try {
      // 1) Persiste Nome, Cidade e Telefone no banco (tabela stores)
      await updateStoreDetails(storeId, {
        ...(nome.trim() ? { name: nome.trim() } : {}),
        ...(cidade.trim() ? { city: cidade.trim() } : {}),
        ...(whatsapp.trim() ? { phone: whatsapp.trim() } : {}),
      });

      // 2) Persiste as configs de estilo no localStorage isolado por loja
      saveVitrineSettings(storeId, {
        descricao,
        corPrincipal: cor,
        boasVindas,
        politicaTroca,
        mostrarEstoque,
        instagram,
        estado,
        logoUrl,
        capaUrl,
      });

      // 3) Sincroniza nome e WhatsApp no Theme Engine (assim os templates ficam atualizados)
      const currentTheme = loadTheme();
      saveTheme({
        ...currentTheme,
        settings: {
          ...currentTheme.settings,
          storeName: nome.trim() || currentTheme.settings.storeName,
          storeWhatsApp: whatsapp.trim() || currentTheme.settings.storeWhatsApp || "",
        },
      });

      // 4) Invalida o cache do store para o AppShell/header exibir o nome novo
      await queryClient.invalidateQueries({ queryKey: ["active_store"] });

      toast.success("Configurações salvas com sucesso!", {
        description: `Loja "${nome}" atualizada.`,
      });
    } catch (err) {
      toast.error("Erro ao salvar configurações", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Design & Visual"
        title="Aparência"
        description="Personalize o layout e as configurações básicas da sua vitrine."
        actions={
          <Button
            className="gradient-primary h-10 gap-2 rounded-full shadow-glow"
            onClick={salvar}
            disabled={salvando}
          >
            <Check className="h-4 w-4" />
            {salvando ? "Salvando…" : "Salvar alterações"}
          </Button>
        }
      />

      {/* ── Layout Ativo — Banner Principal Full-Width ──────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        {/* Mockup preview */}
        <div className="relative select-none overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 p-8">
          {/* Browser chrome */}
          <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-stone-300/60 bg-white shadow-lift">
            {/* Browser bar */}
            <div className="flex h-8 items-center gap-2 border-b border-stone-200 bg-stone-50 px-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
              <div className="mx-auto flex h-4 w-56 items-center rounded-full border border-stone-200 bg-white px-2">
                <span className="truncate text-[9px] text-stone-400">
                  modenza.com.br/vitrine/{store?.slug ?? "sua-loja"}
                </span>
              </div>
            </div>

            {/* Store preview */}
            <div
              className="relative overflow-hidden"
              style={{ backgroundColor: activeTheme.settings.colorBackground }}
            >
              {/* Nav */}
              <div
                className="flex items-center justify-between border-b px-5 py-2.5"
                style={{ borderColor: activeTheme.settings.colorBorder }}
              >
                <span
                  className="text-[12px] font-bold tracking-tight"
                  style={{
                    color: activeTheme.settings.colorForeground,
                    fontFamily: activeTheme.settings.fontDisplay,
                  }}
                >
                  {nome || store?.name || activeTheme.settings.storeName}
                </span>
                <div
                  className="flex gap-4 text-[9px]"
                  style={{ color: activeTheme.settings.colorForeground + "80" }}
                >
                  <span>Início</span>
                  <span>Produtos</span>
                  <span>Sobre</span>
                  <span>Contato</span>
                </div>
              </div>

              {/* Hero */}
              <div
                className="relative flex h-32 items-center justify-center text-center"
                style={{ backgroundColor: activeTheme.settings.colorCanvas }}
              >
                <div>
                  <p
                    className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest"
                    style={{ color: cor || activeTheme.settings.colorPrimary + "cc" }}
                  >
                    Coleção Nova
                  </p>
                  <p
                    className="text-lg font-bold leading-tight"
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
                    className="mt-3 inline-block rounded-full px-4 py-1.5 text-[9px] font-semibold text-white"
                    style={{ backgroundColor: cor || activeTheme.settings.colorPrimary }}
                  >
                    Ver a coleção →
                  </div>
                </div>
              </div>

              {/* Product grid */}
              <div className="grid grid-cols-4 gap-2 p-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-lg"
                    style={{ backgroundColor: activeTheme.settings.colorCanvas }}
                  >
                    <div
                      className="h-12 w-full"
                      style={{ backgroundColor: activeTheme.settings.colorBorder }}
                    />
                    <div className="p-1.5">
                      <div
                        className="mb-1 h-1.5 w-10 rounded-full"
                        style={{ backgroundColor: activeTheme.settings.colorForeground + "40" }}
                      />
                      <div
                        className="h-1.5 w-6 rounded-full"
                        style={{
                          backgroundColor: (cor || activeTheme.settings.colorPrimary) + "70",
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Palette dots */}
            <div className="flex gap-1.5">
              {[
                activeTheme.settings.colorBackground,
                activeTheme.settings.colorCanvas,
                cor || activeTheme.settings.colorPrimary,
                activeTheme.settings.colorForeground,
              ].map((c, i) => (
                <div
                  key={i}
                  className="h-5 w-5 rounded-full border border-border shadow-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div>
              <span className="text-sm font-semibold">Atelier Mod</span>
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                Layout atual
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl text-xs" asChild>
              <a href="/loja/preview" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Ver ao vivo
              </a>
            </Button>
            <Button
              className="gradient-primary h-9 gap-1.5 rounded-xl text-sm font-semibold shadow-glow"
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

      {/* ── Grid de Configurações 2 Colunas ─────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Coluna Esquerda ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Identidade da marca */}
          <SectionCard title="Identidade da marca" description="Nome, logo e capa da vitrine.">
            <div className="space-y-4">
              <Campo label="Nome da loja">
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="Ex: Minha Boutique"
                />
              </Campo>

              <Campo label="Descrição curta">
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  className="rounded-xl resize-none"
                  placeholder="Aparece no topo da vitrine…"
                />
              </Campo>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-secondary/40 p-4 text-xs text-muted-foreground">
                  <span className="mb-2 font-medium text-foreground">Logo da vitrine</span>
                  <ImageUploader
                    currentUrl={logoUrl || null}
                    bucket="store-logos"
                    folder="brand"
                    onUploaded={setLogoUrl}
                    placeholder="Enviar logo (PNG ou JPG)"
                    aspect="square"
                  />
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-secondary/40 p-4 text-xs text-muted-foreground">
                  <span className="mb-2 font-medium text-foreground">Capa da vitrine</span>
                  <ImageUploader
                    currentUrl={capaUrl || null}
                    bucket="store-logos"
                    folder="brand"
                    onUploaded={setCapaUrl}
                    placeholder="Enviar capa (PNG, JPG)"
                    aspect="portrait"
                  />
                </div>
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
                    className="h-11 max-w-[140px] rounded-xl font-mono text-sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    Usada nos botões e destaques da vitrine
                  </span>
                </div>
              </Campo>
            </div>
          </SectionCard>

          {/* Endereço da loja */}
          <SectionCard
            title="Endereço da loja"
            description="Link público onde seus clientes acessam a vitrine."
          >
            <div className="space-y-4">
              <Campo label="Link da loja">
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    readOnly
                    value={`modenza.com.br/vitrine/${store?.slug ?? storeId}`}
                    className="h-11 rounded-xl pl-9 text-muted-foreground"
                  />
                </div>
              </Campo>
              <Campo label="Domínio próprio" extra={<PlanoBadge plan="crescimento" />}>
                <Input placeholder="minhaloja.com.br" className="h-11 rounded-xl" disabled />
              </Campo>
            </div>
          </SectionCard>
        </div>

        {/* ── Coluna Direita ──────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Contato e confiança */}
          <SectionCard title="Contato e confiança" description="Aparece na vitrine para a cliente.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="WhatsApp">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="h-11 rounded-xl pl-9"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </Campo>
              <Campo label="Instagram">
                <div className="relative">
                  <Instagram className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="h-11 rounded-xl pl-9"
                    placeholder="@sualoja"
                  />
                </div>
              </Campo>
              <Campo label="Cidade">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="h-11 rounded-xl pl-9"
                    placeholder="Sua cidade"
                  />
                </div>
              </Campo>
              <Campo label="Estado">
                <Input
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="UF"
                  maxLength={2}
                />
              </Campo>
            </div>
          </SectionCard>

          {/* Textos da loja */}
          <SectionCard title="Textos da loja" description="Boas-vindas e política de troca.">
            <div className="space-y-4">
              <Campo label="Mensagem de boas-vindas">
                <div className="relative">
                  <MessageCircle className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    value={boasVindas}
                    onChange={(e) => setBoasVindas(e.target.value)}
                    rows={2}
                    className="rounded-xl pl-9 resize-none"
                    placeholder="Oi! Que bom te ver por aqui…"
                  />
                </div>
              </Campo>

              <Campo label="Política de troca e devolução">
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    value={politicaTroca}
                    onChange={(e) => setPoliticaTroca(e.target.value)}
                    rows={4}
                    className="rounded-xl pl-9 resize-none"
                    placeholder="Trocas em até 7 dias…"
                  />
                </div>
              </Campo>

              {/* Toggle de estoque */}
              <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Mostrar estoque disponível</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Quando desligado, a vitrine exibe apenas "Disponível" sem mostrar a quantidade.
                  </p>
                </div>
                <Switch
                  checked={mostrarEstoque}
                  onCheckedChange={setMostrarEstoque}
                  className="shrink-0"
                />
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
