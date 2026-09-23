import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  Instagram,
  MapPin,
  MessageCircle,
  Paintbrush,
  Phone,
  QrCode,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/loja/page-header";
import { VitrineConfigNav } from "@/components/loja/vitrine-config-nav";
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
import { profileQuery } from "@/lib/db";
import {
  getVitrineSettings,
  saveVitrineSettings,
  isVitrineAtiva,
  setVitrineAtiva,
} from "@/lib/vitrine-settings";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/loja/configuracao")({
  head: () => ({
    meta: [
      { title: "Configurações da Vitrine — Vestui" },
      {
        name: "description",
        content: "Personalize o layout, cores da marca e dados de recebimento Pix da sua vitrine online.",
      },
    ],
  }),
  component: AparenciaPage,
});

function AparenciaPage() {
  const { store, storeId } = useStore();
  const { data: profile } = useQuery(profileQuery());
  const queryClient = useQueryClient();

  // Dados Cadastrais Soberanos (Central de Configurações da Loja)
  const masterStoreName = profile?.store_name?.trim() || store?.name?.trim() || "Minha Loja";
  const masterPhone = profile?.phone?.trim() || store?.phone?.trim() || "Não informado";
  const masterCity = profile?.city?.trim() || store?.city?.trim() || "Não informada";
  const masterLogoUrl = profile?.logo_url || "";

  // Leitura de localStorage das configurações específicas da vitrine
  const [vitrineSettings] = useState(() => getVitrineSettings(storeId));
  const [activeTheme] = useState(() => loadTheme());

  // Campos exclusivos da vitrine online
  const [ativa, setAtiva] = useState(() => isVitrineAtiva(storeId, store?.metadata));
  const [descricao, setDescricao] = useState(vitrineSettings.descricao);
  const [cor, setCor] = useState(vitrineSettings.corPrincipal);
  const [instagram, setInstagram] = useState(vitrineSettings.instagram);
  const [boasVindas, setBoasVindas] = useState(vitrineSettings.boasVindas);
  const [politicaTroca, setPoliticaTroca] = useState(vitrineSettings.politicaTroca);
  const [mostrarEstoque, setMostrarEstoque] = useState(vitrineSettings.mostrarEstoque);
  const [capaUrl, setCapaUrl] = useState(vitrineSettings.capaUrl ?? "");
  const [chavePix, setChavePix] = useState(vitrineSettings.chavePix ?? "");
  const [tipoChavePix, setTipoChavePix] = useState<
    "cpf" | "cnpj" | "telefone" | "email" | "aleatoria"
  >(vitrineSettings.tipoChavePix ?? "cpf");
  const [titularPix, setTitularPix] = useState(vitrineSettings.titularPix ?? "");
  const [salvando, setSalvando] = useState(false);

  const handleToggleAtiva = async (novoStatus: boolean) => {
    setAtiva(novoStatus);
    setVitrineAtiva(storeId, novoStatus);
    try {
      const currentMeta =
        typeof store?.metadata === "object" && store?.metadata ? store.metadata : {};
      await supabase
        .from("stores")
        .update({
          metadata: {
            ...(currentMeta as Record<string, unknown>),
            vitrine_ativa: novoStatus,
            vitrineSettings: {
              ...getVitrineSettings(storeId),
              ativa: novoStatus,
            },
          },
        })
        .eq("id", storeId);
      void queryClient.invalidateQueries();
    } catch (e) {
      console.error("Erro ao sincronizar status da vitrine:", e);
    }
    toast.success(
      novoStatus
        ? "Vitrine Online ativada! O Canal Digital agora está no ar."
        : "Vitrine Online pausada. Seu sistema agora foca 100% no balcão da loja física.",
    );
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const vitrinePayload = {
        ativa,
        descricao,
        corPrincipal: cor,
        boasVindas,
        politicaTroca,
        mostrarEstoque,
        instagram,
        estado: vitrineSettings.estado || "",
        logoUrl: masterLogoUrl || vitrineSettings.logoUrl || "",
        capaUrl,
        chavePix: chavePix.trim(),
        tipoChavePix,
        titularPix: titularPix.trim(),
      };

      // 1) Persiste no Supabase (tabela stores.metadata) para sincronizar entre todos os dispositivos
      try {
        const currentMeta =
          typeof store?.metadata === "object" && store?.metadata ? store.metadata : {};
        await supabase
          .from("stores")
          .update({
            metadata: {
              ...(currentMeta as Record<string, unknown>),
              vitrineSettings: vitrinePayload,
            },
          })
          .eq("id", storeId);
      } catch (errDb) {
        console.error("Erro ao gravar metadata no Supabase:", errDb);
      }

      // 2) Persiste as configs de estilo no localStorage isolado por loja como cache rápido
      saveVitrineSettings(storeId, vitrinePayload);

      // 3) Sincroniza nome oficial e WhatsApp no Theme Engine
      const currentTheme = loadTheme();
      saveTheme({
        ...currentTheme,
        settings: {
          ...currentTheme.settings,
          storeName: masterStoreName || currentTheme.settings.storeName,
          storeWhatsApp: masterPhone !== "Não informado" ? masterPhone : currentTheme.settings.storeWhatsApp || "",
        },
      });

      // 4) Invalida o cache
      await queryClient.invalidateQueries({ queryKey: ["active_store"] });
      window.dispatchEvent(new Event("vitrine-settings-changed"));

      toast.success("Configurações da vitrine salvas com sucesso! ✨", {
        description: `Vitrine de "${masterStoreName}" atualizada.`,
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
        eyebrow="Loja Virtual"
        title="Configurações da Vitrine"
        description="Personalize o visual, cores da marca, bio e recebimento via Pix para suas clientes comprarem online."
        actions={
          <Button
            className="gradient-primary h-10 gap-2 rounded-full shadow-glow cursor-pointer"
            onClick={salvar}
            disabled={salvando}
          >
            <Check className="h-4 w-4" />
            {salvando ? "Salvando…" : "Salvar alterações"}
          </Button>
        }
      />

      <VitrineConfigNav />

      {/* ── Status da Vitrine Online (Controle Mestre Liga/Desliga) ─────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft">
        <div className="flex items-start gap-3.5">
          <div
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-2xl transition-colors",
              ativa
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Globe className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Vitrine Online (Link da Bio)</h2>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  ativa
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {ativa ? "● Online no ar" : "○ Pausada / Desativada"}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {ativa
                ? "Sua vitrine está ativa e recebendo pedidos pelo Instagram e WhatsApp. As clientes podem ver os produtos e pedir."
                : "Ative para publicar seu catálogo no Instagram. Quando pausada, as clientes veem que a loja está em manutenção."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <span className="text-xs font-medium text-muted-foreground">
            {ativa ? "Vitrine Ativada" : "Vitrine Desativada"}
          </span>
          <Switch
            checked={ativa}
            onCheckedChange={handleToggleAtiva}
            aria-label="Ativar ou desativar vitrine online"
          />
        </div>
      </div>

      {/* ── Card Unificado: Dados Cadastrais Soberanos da Loja ────────────────────── */}
      <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-6 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
              {masterLogoUrl ? (
                <img
                  src={masterLogoUrl}
                  alt={masterStoreName}
                  className="size-full object-cover"
                />
              ) : (
                <Store className="size-6 text-primary" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-foreground text-base">{masterStoreName}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <CheckCircle2 className="size-2.5" /> Dados Oficiais do Negócio
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <Phone className="size-3 text-emerald-600" /> WhatsApp: {masterPhone}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3 text-muted-foreground" /> Local: {masterCity}
                </span>
              </p>
            </div>
          </div>

          <Link
            to="/configuracoes"
            className="inline-flex items-center gap-1.5 self-start md:self-center rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-surface-muted transition-colors cursor-pointer"
          >
            Editar em Configurações Gerais <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Layout Ativo — Banner & Visualizador ─────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        {/* Mockup preview */}
        <div className="relative select-none overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 p-8">
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
                  vestui.app/vitrine/{store?.slug ?? "sua-loja"}
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
                  {masterStoreName}
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
              <span className="text-sm font-semibold">Tema Ativo</span>
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                No ar
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl text-xs" asChild>
              <a href={`/vitrine/${store?.slug ?? storeId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Ver vitrine online
              </a>
            </Button>
            <Button
              className="gradient-primary h-9 gap-1.5 rounded-xl text-sm font-semibold shadow-glow"
              size="sm"
              asChild
            >
              <Link to="/loja/templates">
                <Paintbrush className="h-3.5 w-3.5" />
                Galeria de Temas
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Grid de Configurações 2 Colunas ─────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Coluna Esquerda: Identidade Visual da Vitrine ─────────────────────── */}
        <div className="space-y-4">
          <SectionCard
            title="Aparência & Identidade da Vitrine"
            description="Personalize o visual e os destaques que suas clientes verão no catálogo."
          >
            <div className="space-y-4">
              <Campo label="Bio / Descrição curta da vitrine">
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  className="rounded-xl resize-none"
                  placeholder="Ex: Roupas femininas com caimento impecável e envio rápido para todo o Brasil ✨"
                />
              </Campo>

              <Campo label="Banner promocional / Imagem de capa da vitrine">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-secondary/40 p-4 text-xs text-muted-foreground">
                  <ImageUploader
                    currentUrl={capaUrl || null}
                    bucket="store-logos"
                    folder="brand"
                    onUploaded={setCapaUrl}
                    placeholder="Enviar banner de capa (PNG ou JPG)"
                    aspect="portrait"
                  />
                </div>
              </Campo>

              <Campo label="Cor principal de destaque">
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
                    Aplicada nos botões de compra e destaques
                  </span>
                </div>
              </Campo>

              <Campo label="Perfil do Instagram da Loja">
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
            </div>
          </SectionCard>

          {/* Endereço Web */}
          <SectionCard
            title="Endereço da Loja"
            description="Link público oficial onde suas clientes acessam a vitrine."
          >
            <div className="space-y-4">
              <Campo label="Link da vitrine">
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    readOnly
                    value={`vestui.app/vitrine/${store?.slug ?? storeId}`}
                    className="h-11 rounded-xl pl-9 text-muted-foreground"
                  />
                </div>
              </Campo>
              <Campo label="Domínio próprio" extra={<PlanoBadge plan="crescimento" />}>
                <Input placeholder="sualoja.com.br" className="h-11 rounded-xl" disabled />
              </Campo>
            </div>
          </SectionCard>
        </div>

        {/* ── Coluna Direita: Recebimento Pix & Textos ───────────────────────────── */}
        <div className="space-y-4">
          {/* Recebimento via Pix */}
          <SectionCard
            title="Recebimento via Pix (Direto para você)"
            description="Receba o valor total das vendas instantaneamente na sua conta bancária. Taxa 0%."
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <QrCode className="h-4 w-4 shrink-0" /> Venda sem intermediários e receba na hora
                </p>
                <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                  Esta chave Pix será apresentada na vitrine quando a cliente finalizar o pedido. O dinheiro cai direto na sua conta bancária sem retenção nem taxas.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Campo label="Tipo da chave">
                  <select
                    value={tipoChavePix}
                    onChange={(e) => setTipoChavePix(e.target.value as typeof tipoChavePix)}
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="telefone">Celular</option>
                    <option value="email">E-mail</option>
                    <option value="aleatoria">Chave aleatória</option>
                  </select>
                </Campo>

                <div className="sm:col-span-2">
                  <Campo label="Sua Chave Pix">
                    <div className="relative">
                      <QrCode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={chavePix}
                        onChange={(e) => setChavePix(e.target.value)}
                        className="h-11 rounded-xl pl-9 font-mono text-sm"
                        placeholder={
                          tipoChavePix === "cpf"
                            ? "000.000.000-00"
                            : tipoChavePix === "cnpj"
                            ? "00.000.000/0001-00"
                            : tipoChavePix === "telefone"
                            ? "(11) 99999-9999"
                            : tipoChavePix === "email"
                            ? "seu-pix@email.com"
                            : "Chave aleatória (EVP)"
                        }
                      />
                    </div>
                  </Campo>
                </div>
              </div>

              <Campo label="Nome do Titular da Conta (para conferência da cliente)">
                <Input
                  value={titularPix}
                  onChange={(e) => setTitularPix(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="Nome completo ou Razão Social que aparece no Pix"
                />
              </Campo>
            </div>
          </SectionCard>

          {/* Textos da vitrine */}
          <SectionCard
            title="Textos & Políticas da Vitrine"
            description="Mensagem de boas-vindas e regras de troca para as clientes online."
          >
            <div className="space-y-4">
              <Campo label="Mensagem de boas-vindas">
                <div className="relative">
                  <MessageCircle className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    value={boasVindas}
                    onChange={(e) => setBoasVindas(e.target.value)}
                    rows={2}
                    className="rounded-xl pl-9 resize-none"
                    placeholder="Oi, maravilhosa! Seja bem-vinda ao nosso catálogo online. Qualquer dúvida me chama no WhatsApp! 💕"
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
                    placeholder="Trocas em até 7 dias corridos após o recebimento, com etiqueta afixada e sem sinais de uso."
                  />
                </div>
              </Campo>

              {/* Toggle de contagem de estoque */}
              <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Exibir quantidade de peças em estoque</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Quando desligado, a vitrine exibe apenas "Disponível" sem revelar o número exato de peças restantes.
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
