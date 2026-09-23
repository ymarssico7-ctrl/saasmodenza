import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Globe,
  LogOut,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { SubscriptionModal } from "@/components/subscription-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/ui/image-uploader";
import { supabase } from "@/integrations/supabase/client";
import {
  isAuthenticated,
  membersQuery,
  profileQuery,
  updateDemoProfile,
  currentUserId,
} from "@/lib/db";
import { brl, toNumber } from "@/lib/format";
import { ENTRY_CATEGORIES, EXIT_CATEGORIES, PAYMENT_METHODS } from "@/lib/finance";
import {
  getCustomOptions,
  addCustomEntry,
  addCustomExit,
  addCustomPaymentMethod,
  removeCustomOption,
  updateCustomOption,
  type CustomOptionsStore,
} from "@/lib/custom-options";
import { useStore } from "@/lib/store-context";
import { insertMember, deleteMember } from "@/lib/mutations";
import {
  isVitrineAtiva,
  setVitrineAtiva,
  getBusinessModel,
  setBusinessModel,
  type BusinessModel,
} from "@/lib/vitrine-settings";
import { cn } from "@/lib/utils";

type ConfiguracoesTab = "geral" | "canais" | "caixa" | "equipe" | "plano";

type ConfiguracoesSearch = {
  tab?: ConfiguracoesTab;
};

export const Route = createFileRoute("/_authenticated/configuracoes")({
  validateSearch: (search: Record<string, unknown>): ConfiguracoesSearch => {
    const validTabs: ConfiguracoesTab[] = ["geral", "canais", "caixa", "equipe", "plano"];
    const tab =
      typeof search.tab === "string" && validTabs.includes(search.tab as ConfiguracoesTab)
        ? (search.tab as ConfiguracoesTab)
        : "geral";
    return { tab };
  },
  head: () => ({
    meta: [
      { title: "Configurações — Vestui" },
      {
        name: "description",
        content: "Ajuste os dados da loja, canais de venda, regras do caixa, equipe e assinatura.",
      },
      { property: "og:title", content: "Configurações — Vestui" },
      { property: "og:description", content: "Configurações da sua loja no Vestui." },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { store, storeId } = useStore();
  const { data: profile } = useQuery(profileQuery());
  const { data: members = [] } = useQuery(membersQuery());

  const activeTab: ConfiguracoesTab = search.tab ?? "geral";
  const [subModalOpen, setSubModalOpen] = useState(false);

  const handleTabChange = (nextTab: ConfiguracoesTab) => {
    void navigate({ search: (prev) => ({ ...prev, tab: nextTab }) });
  };

  const [businessModel, setBusinessModelState] = useState<BusinessModel>(() =>
    getBusinessModel(storeId, store?.metadata),
  );
  const [vitrineAtiva, setVitrineAtivaState] = useState(() =>
    isVitrineAtiva(storeId, store?.metadata),
  );

  useEffect(() => {
    setBusinessModelState(getBusinessModel(storeId, store?.metadata));
    setVitrineAtivaState(isVitrineAtiva(storeId, store?.metadata));
    const handleModelChanged = () => {
      setBusinessModelState(getBusinessModel(storeId, store?.metadata));
      setVitrineAtivaState(isVitrineAtiva(storeId, store?.metadata));
    };
    window.addEventListener("business-model-changed", handleModelChanged);
    window.addEventListener("vitrine-settings-changed", handleModelChanged);
    return () => {
      window.removeEventListener("business-model-changed", handleModelChanged);
      window.removeEventListener("vitrine-settings-changed", handleModelChanged);
    };
  }, [storeId, store?.metadata]);

  const handleSelectBusinessModel = async (model: BusinessModel) => {
    setBusinessModelState(model);
    const ativa = model !== "fisica";
    setVitrineAtivaState(ativa);
    setBusinessModel(storeId, model);

    try {
      const currentMeta = (
        store?.metadata && typeof store.metadata === "object" ? store.metadata : {}
      ) as Record<string, any>;
      const updatedMeta = {
        ...currentMeta,
        business_model: model,
        vitrine_ativa: ativa,
        vitrineSettings: {
          ...((currentMeta["vitrineSettings"] as Record<string, unknown>) || {}),
          ativa,
        },
      };
      await supabase.from("stores").update({ metadata: updatedMeta }).eq("id", storeId);
      void queryClient.invalidateQueries({ queryKey: ["active_store"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("business-model-changed"));
        window.dispatchEvent(new Event("vitrine-settings-changed"));
      }
    } catch (err) {
      console.error("Erro ao salvar modelo de negócio:", err);
    }

    if (model === "fisica") {
      toast.success("Modelo atualizado: Apenas Loja Física 🏢", {
        description: "Menus ajustados para balcão, caixa diário e fiado.",
      });
    } else if (model === "hibrida") {
      toast.success("Modelo atualizado: Loja Física + Online ✨", {
        description: "Balcão físico + vitrine no ar com alternador na barra lateral.",
      });
    } else {
      toast.success("Modelo atualizado: Apenas Loja Online 🌐", {
        description: "100% digital: menus focados em pedidos, catálogo e Vestui Pay.",
      });
    }
  };

  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [target, setTarget] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("vendedora");

  useEffect(() => {
    if (!profile) return;
    setStoreName(profile.store_name ?? "");
    setOwnerName(profile.owner_name ?? "");
    setCity(profile.city ?? "");
    setPhone(profile.phone ?? "");
    setTarget(String(profile.prolabore_target ?? ""));
    setLogoUrl((profile as unknown as { logo_url?: string | null }).logo_url ?? "");
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const realUser = await isAuthenticated();
      if (!storeName.trim()) {
        throw new Error("Informe o nome da loja");
      }
      const prolaboreNum = target.trim() ? toNumber(target) : 0;
      if (isNaN(prolaboreNum) || prolaboreNum < 0) {
        throw new Error("Informe uma meta de pró-labore válida (não pode ser negativa)");
      }

      const profilePatch = {
        store_name: storeName.trim(),
        owner_name: ownerName.trim() || "Lojista",
        city: city.trim() || null,
        phone: phone.trim() || null,
        prolabore_target: prolaboreNum,
        logo_url: logoUrl.trim() || null,
      };

      const storePatch = {
        name: storeName.trim(),
        city: city.trim() || null,
        phone: phone.trim() || null,
        prolabore_target: prolaboreNum,
      };

      if (realUser) {
        const uid = await currentUserId();
        const [profileRes, storeRes] = await Promise.all([
          supabase.from("profiles").update(profilePatch).eq("id", uid),
          supabase.from("stores").update(storePatch).eq("owner_id", uid),
        ]);
        if (profileRes.error) throw new Error(profileRes.error.message);
        if (storeRes.error) throw new Error(storeRes.error.message);
      } else {
        updateDemoProfile(profilePatch);
      }

      try {
        const themeKey = `vestui_theme_config_${storeId}`;
        const raw =
          localStorage.getItem(themeKey) || localStorage.getItem(`vestuli_theme_config_${storeId}`);
        const theme = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        theme["nome"] = profilePatch.store_name;
        theme["whatsapp"] = phone.trim() || theme["whatsapp"] || "";
        theme["cidade"] = city.trim() || theme["cidade"] || "";
        localStorage.setItem(themeKey, JSON.stringify(theme));
      } catch {
        // Silencia erro de quota local
      }

      queryClient.setQueryData(["profile"], (old: Record<string, unknown> | undefined) => ({
        ...(old ?? {}),
        ...profilePatch,
      }));
      queryClient.setQueryData(["active_store"], (old: Record<string, unknown> | undefined) =>
        old ? { ...old, ...storePatch } : old,
      );
    },
    onSuccess: () => {
      toast.success("Dados salvos com sucesso! ✨");
      void isAuthenticated().then((real) => {
        if (real) {
          void queryClient.invalidateQueries({ queryKey: ["profile"] });
          void queryClient.invalidateQueries({ queryKey: ["active_store"] });
        }
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!memberName.trim()) throw new Error("Informe o nome do colaborador");
      return insertMember(storeId, memberName.trim(), memberEmail.trim() || null, memberRole);
    },
    onSuccess: () => {
      toast.success("Colaborador adicionado à equipe! 🎉");
      setMemberName("");
      setMemberEmail("");
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => deleteMember(storeId, id),
    onSuccess: () => {
      toast.success("Colaborador removido da equipe.");
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // ── Metadados do cabeçalho conforme a aba ativa (Padrão Shopify Imagem 5) ──
  const tabMetadata = {
    geral: {
      title: "Geral",
      description: "Informações oficiais da empresa, contato e logotipo da sua boutique.",
    },
    canais: {
      title: "Canais de Venda",
      description: "Defina como você atende suas clientes (Balcão Físico vs Vitrine Digital).",
    },
    caixa: {
      title: "Caixa & Pagamentos",
      description: "Classificações de receitas, despesas e formas de pagamento aceitas no balcão (PDV).",
    },
    equipe: {
      title: "Usuários & Equipe",
      description: "Gerencie quem atua no balcão e no atendimento para organizar responsabilidades.",
    },
    plano: {
      title: "Plano & Assinatura",
      description: "Detalhes da sua licença de uso do Vestui, metas financeiras e segurança.",
    },
  }[activeTab];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Navegador Mobile (visível apenas em telas menores onde a sidebar desktop está oculta) ── */}
      <div className="lg:hidden overflow-x-auto pb-1 scrollbar-none">
        <div className="inline-flex gap-1.5 p-1 rounded-2xl bg-surface-muted border border-border/60">
          {[
            { tab: "geral", label: "Geral" },
            { tab: "canais", label: "Canais" },
            { tab: "caixa", label: "Caixa" },
            { tab: "equipe", label: `Equipe${members.length > 0 ? ` (${members.length})` : ""}` },
            { tab: "plano", label: "Plano" },
          ].map((item) => (
            <button
              key={item.tab}
              type="button"
              onClick={() => handleTabChange(item.tab as ConfiguracoesTab)}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                activeTab === item.tab
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cabeçalho Oficial (Shopify style — direto e objetivo) ─────────── */}
      <PageHeader
        eyebrow="Configurações"
        title={tabMetadata.title}
        description={tabMetadata.description}
      />

      {/* ════ ABA 1: Geral ══════════════════════════════════════════════════ */}
      {activeTab === "geral" && (
        <div className="space-y-6">
          {/* Card: Informações da empresa */}
          <section className="panel p-6 sm:p-7 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Informações da empresa</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nome comercial e dados da proprietária da loja.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome da loja">
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ex: Boutique Elegance"
                  className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </Field>
              <Field label="Seu nome (Proprietária / Responsável)">
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ex: Mariana Castro"
                  className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </Field>
              <Field label="Cidade e Estado">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: São Paulo, SP"
                  className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </Field>
            </div>
          </section>

          {/* Card: Contato da loja */}
          <section className="panel p-6 sm:p-7 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Informações de contato da loja</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Utilizado para atendimento das clientes e envio de comprovantes via WhatsApp.
              </p>
            </div>

            <div className="max-w-md">
              <Field label="WhatsApp oficial de atendimento">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-0000"
                  className="h-11 rounded-xl bg-card border-border hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-primary/20 font-mono"
                />
              </Field>
            </div>
          </section>

          {/* Card: Logotipo da loja */}
          <section className="panel p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-full sm:w-56 shrink-0 space-y-2">
                <h2 className="text-base font-semibold text-foreground">Logotipo da loja</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Aparece no cabeçalho da sua vitrine online e nos comprovantes digitais. Recomendado: formato quadrado (PNG ou JPG) com fundo transparente.
                </p>
              </div>
              <div className="w-40 max-w-[160px]">
                <ImageUploader
                  currentUrl={logoUrl || null}
                  bucket="store-logos"
                  folder="logos"
                  onUploaded={setLogoUrl}
                  placeholder="Adicionar logo"
                  aspect="square"
                />
              </div>
            </div>
          </section>

          {/* Barra de ação de salvar */}
          <div className="flex justify-end pt-2">
            <Button
              className="h-11 rounded-xl px-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer"
              disabled={saveProfile.isPending}
              onClick={() => saveProfile.mutate()}
            >
              {saveProfile.isPending ? "Salvando alterações..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      )}

      {/* ════ ABA 2: Canais de Venda ════════════════════════════════════════ */}
      {activeTab === "canais" && (
        <div className="space-y-6">
          <section className="panel p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Store className="size-4" />
                  </span>
                  <h2 className="text-base font-semibold text-foreground">Modelo de Atuação da Loja</h2>
                  <Badge
                    variant={vitrineAtiva ? "default" : "secondary"}
                    className="text-[10px] uppercase font-bold tracking-wider"
                  >
                    {businessModel === "fisica"
                      ? "Loja Física"
                      : businessModel === "hibrida"
                      ? "Física + Online"
                      : "100% Loja Online"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                  Defina como você atende suas clientes. O Vestui adapta automaticamente a barra lateral e as ferramentas do dia a dia.
                </p>
              </div>

              {vitrineAtiva && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl px-4 text-xs font-semibold shrink-0 shadow-2xs hover:bg-secondary"
                >
                  <Link to="/loja/configuracao">
                    Personalizar Vitrine <ArrowRight className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              )}
            </div>

            {/* ── 3 Cards Interativos de Seleção (Padrão Apple / Shopify) ── */}
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Card 1: Apenas Loja Física */}
              <button
                type="button"
                onClick={() => void handleSelectBusinessModel("fisica")}
                className={cn(
                  "group relative flex flex-col text-left rounded-2xl border p-4.5 transition-all duration-200 cursor-pointer",
                  businessModel === "fisica"
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                    : "border-border bg-card hover:border-border/80 hover:bg-surface-muted/50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl transition-colors",
                      businessModel === "fisica"
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-muted text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    <Building2 className="size-4.5" />
                  </span>
                  {businessModel === "fisica" ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="size-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Balcão
                    </span>
                  )}
                </div>
                <h3 className="mt-3.5 text-sm font-semibold text-foreground">Apenas Loja Física</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Vendas no balcão presencial, caixa diário e controle de fiado. Sem vitrine digital.
                </p>
              </button>

              {/* Card 2: Física + Online (Híbrida) */}
              <button
                type="button"
                onClick={() => void handleSelectBusinessModel("hibrida")}
                className={cn(
                  "group relative flex flex-col text-left rounded-2xl border p-4.5 transition-all duration-200 cursor-pointer",
                  businessModel === "hibrida"
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                    : "border-border bg-card hover:border-border/80 hover:bg-surface-muted/50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl transition-colors",
                      businessModel === "hibrida"
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-muted text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    <Store className="size-4.5" />
                  </span>
                  {businessModel === "hibrida" ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="size-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Mais escolhido
                    </span>
                  )}
                </div>
                <h3 className="mt-3.5 text-sm font-semibold text-foreground">Física + Loja Online</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Balcão físico com caixa e fiado + vitrine no WhatsApp e Instagram com alternador rápido.
                </p>
              </button>

              {/* Card 3: Apenas Loja Online */}
              <button
                type="button"
                onClick={() => void handleSelectBusinessModel("online")}
                className={cn(
                  "group relative flex flex-col text-left rounded-2xl border p-4.5 transition-all duration-200 cursor-pointer",
                  businessModel === "online"
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                    : "border-border bg-card hover:border-border/80 hover:bg-surface-muted/50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl transition-colors",
                      businessModel === "online"
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-muted text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    <Globe className="size-4.5" />
                  </span>
                  {businessModel === "online" ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="size-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      100% Digital
                    </span>
                  )}
                </div>
                <h3 className="mt-3.5 text-sm font-semibold text-foreground">Apenas Loja Online</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Vendas exclusivamente digitais. Foco total em pedidos, catálogo e Vestui Pay, sem balcão.
                </p>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ════ ABA 3: Caixa & Pagamentos ═════════════════════════════════════ */}
      {activeTab === "caixa" && (
        <div className="space-y-6">
          <CustomOptionsSettingsSection storeId={storeId} />
        </div>
      )}

      {/* ════ ABA 4: Usuários & Equipe ══════════════════════════════════════ */}
      {activeTab === "equipe" && (
        <div className="space-y-6">
          <section className="panel p-6 sm:p-7 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Equipe da Boutique</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cadastre quem atua no balcão e no atendimento para organizar responsabilidades e vendas.
              </p>
            </div>

            {/* Formulário de Novo Colaborador */}
            <div className="rounded-2xl border border-border/70 bg-surface-muted/40 p-4 sm:p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Adicionar Colaborador
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Nome do colaborador">
                  <Input
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Ex: Júlia Santos"
                    className="h-10 rounded-xl bg-card border-border"
                  />
                </Field>
                <Field label="E-mail (opcional)">
                  <Input
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="julia@loja.com"
                    className="h-10 rounded-xl bg-card border-border"
                  />
                </Field>
                <Field label="Função / Cargo">
                  <Select value={memberRole} onValueChange={setMemberRole}>
                    <SelectTrigger className="h-10 rounded-xl bg-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedora">Vendedora</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="caixa">Caixa / Financeiro</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  className="h-10 rounded-xl px-5 text-xs font-semibold gap-1.5 cursor-pointer"
                  disabled={addMember.isPending || !memberName.trim()}
                  onClick={() => addMember.mutate()}
                >
                  <Plus className="size-3.5" /> Adicionar membro
                </Button>
              </div>
            </div>

            {/* Lista de Membros */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Colaboradores Cadastrados ({members.length})
              </h3>
              {members.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-surface-muted/20 p-8 text-center space-y-2">
                  <Users className="mx-auto size-7 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum colaborador cadastrado ainda.</p>
                  <p className="text-xs text-muted-foreground/70">Cadastre vendedoras para atribuir atendimentos e comissões.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card overflow-hidden">
                  {members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-4 p-4 hover:bg-surface-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm shrink-0">
                          {m.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground capitalize border border-border/60">
                              {m.role}
                            </span>
                            {m.email && (
                              <span className="text-xs text-muted-foreground truncate">{m.email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ConfirmDelete
                        onConfirm={() => removeMember.mutate(m.id)}
                        description={`${m.name} será removido da equipe.`}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                            title="Remover colaborador"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ════ ABA 5: Plano & Assinatura ═════════════════════════════════════ */}
      {activeTab === "plano" && (
        <div className="space-y-6">
          {/* Card: Assinatura */}
          <section className="panel p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Sparkles className="size-4" />
                  </span>
                  <h2 className="text-base font-semibold text-foreground">Plano & Assinatura</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gerencie sua licença de uso do Vestui e recursos contratados.
                </p>
              </div>

              <Button
                type="button"
                className="h-10 rounded-xl px-5 text-xs font-bold gradient-primary shadow-glow cursor-pointer shrink-0"
                onClick={() => setSubModalOpen(true)}
              >
                <Sparkles className="size-3.5 mr-1.5" />
                Gerenciar Assinatura / Upgrade
              </Button>
            </div>

            <div className="rounded-2xl border border-border/70 bg-surface-muted/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Plano atual da loja:</span>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary capitalize">
                    {profile?.plan ?? "Essencial"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Acesso completo a gestão de estoque por grade, caixa com PDV, cobrança amigável de fiado e relatórios DRE.
                </p>
              </div>
            </div>
          </section>

          {/* Card: Meta de Pró-labore Institucional */}
          <section className="panel p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Wallet className="size-4" />
                  </span>
                  <h2 className="text-base font-semibold text-foreground">Pró-Labore da Lojista (Meta Mensal)</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Defina o valor planejado de retirada mensal. O acompanhamento das retiradas reais vs a meta é feito no Hub Financeiro.
                </p>
              </div>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-xl border-border bg-card text-xs font-semibold hover:border-primary/40 hover:text-primary transition-all cursor-pointer h-9 px-3.5 shadow-2xs shrink-0"
              >
                <Link to="/prolabore">
                  Painel de Pró-Labore <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-end gap-3 max-w-md">
              <div className="flex-1 w-full space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/90">
                  Meta mensal de retirada (R$)
                </Label>
                <Input
                  inputMode="decimal"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="3000,00"
                  className="h-10 rounded-xl bg-card border-border font-mono text-sm"
                />
              </div>
              <Button
                className="h-10 rounded-xl px-5 text-xs font-semibold cursor-pointer shrink-0"
                disabled={saveProfile.isPending}
                onClick={() => saveProfile.mutate()}
              >
                {saveProfile.isPending ? "Salvando..." : "Salvar meta"}
              </Button>
            </div>
          </section>

          {/* Card: Segurança & Sessão */}
          <section className="panel p-6 sm:p-7 space-y-4 border border-border/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4.5 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Segurança & Sessão</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Você está autenticada com acesso administrativo à loja.
            </p>
            <div className="pt-2">
              <ConfirmDelete
                title="Deseja realmente sair da sua conta?"
                description="Você precisará informar seu e-mail e senha novamente para acessar a plataforma."
                confirmLabel="Sim, sair da conta"
                onConfirm={() => void signOut()}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:border-destructive/30 border-border cursor-pointer transition-colors"
                  >
                    <LogOut className="size-3.5 mr-2" />
                    Encerrar sessão / Sair da conta
                  </Button>
                }
              />
            </div>
          </section>
        </div>
      )}

      <SubscriptionModal open={subModalOpen} onOpenChange={setSubModalOpen} />
    </div>
  );
}

// ── Seção Dedicada de Categorias & Formas de Pagamento (Padrão Shopify / PDV) ─
function CustomOptionsSettingsSection({ storeId }: { storeId: string }) {
  const [tab, setTab] = useState<"entry" | "exit" | "pay">("entry");
  const [customOpts, setCustomOpts] = useState(() => getCustomOptions(storeId));
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const refresh = useCallback(() => {
    setCustomOpts(getCustomOptions(storeId));
  }, [storeId]);

  useEffect(() => {
    window.addEventListener("custom-options-changed", refresh);
    return () => window.removeEventListener("custom-options-changed", refresh);
  }, [refresh]);

  const handleStartEdit = (value: string, label: string) => {
    setEditingValue(value);
    setEditLabel(label);
  };

  const baseEntry = ENTRY_CATEGORIES as readonly { value: string; label: string }[];
  const baseExit = EXIT_CATEGORIES as readonly { value: string; label: string }[];
  const basePay = PAYMENT_METHODS as readonly { value: string; label: string }[];

  const activeKind =
    tab === "entry" ? "entryCategories" : tab === "exit" ? "exitCategories" : "paymentMethods";
  const activeCustoms =
    tab === "entry"
      ? customOpts.entryCategories
      : tab === "exit"
      ? customOpts.exitCategories
      : customOpts.paymentMethods;
  const activeBases = tab === "entry" ? baseEntry : tab === "exit" ? baseExit : basePay;

  const handleSaveEdit = (kind: keyof CustomOptionsStore, value: string) => {
    const trimmed = editLabel.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const jaExiste =
      activeBases.some((b) => b.label.toLowerCase() === lower || b.value.toLowerCase() === lower) ||
      activeCustoms.some((c) => c.value !== value && c.label.toLowerCase() === lower);

    if (jaExiste) {
      toast.error("Já existe uma opção com este nome.", {
        description: `"${trimmed}" já está cadastrada na lista.`,
      });
      return;
    }

    updateCustomOption(storeId, kind, value, trimmed);
    setEditingValue(null);
    setEditLabel("");
    toast.success("Opção atualizada");
  };

  const handleDelete = (kind: keyof CustomOptionsStore, value: string) => {
    removeCustomOption(storeId, kind, value);
    toast.success("Opção removida");
  };

  const handleAdd = (kind: keyof CustomOptionsStore) => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const jaExiste =
      activeBases.some((b) => b.label.toLowerCase() === lower || b.value.toLowerCase() === lower) ||
      activeCustoms.some((c) => c.label.toLowerCase() === lower);

    if (jaExiste) {
      toast.error("Esta opção já existe.", {
        description: `"${trimmed}" já está cadastrada na lista.`,
      });
      return;
    }

    if (kind === "entryCategories") addCustomEntry(storeId, trimmed);
    if (kind === "exitCategories") addCustomExit(storeId, trimmed);
    if (kind === "paymentMethods") addCustomPaymentMethod(storeId, trimmed);
    setNewLabel("");
    toast.success("Nova opção adicionada com sucesso!");
  };

  return (
    <section id="categorias-pagamentos" className="panel p-6 sm:p-7 space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/60">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="size-4.5 text-primary" />
            Classificações do Caixa & Formas de Pagamento
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Gerencie as opções exibidas nos formulários de lançamento e fechamento de caixa no balcão (PDV).
          </p>
        </div>
      </div>

      {/* ── Sub-Abas Segmentadas ────────────────────────────────────────── */}
      <div className="flex rounded-xl bg-surface-muted/70 border border-border/60 p-1 gap-1 max-w-lg">
        <button
          type="button"
          onClick={() => setTab("entry")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            tab === "entry"
              ? "bg-card text-emerald-600 shadow-xs dark:text-emerald-400"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Receitas (Entrada)
        </button>
        <button
          type="button"
          onClick={() => setTab("exit")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            tab === "exit"
              ? "bg-card text-rose-600 shadow-xs dark:text-rose-400"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Despesas (Saída)
        </button>
        <button
          type="button"
          onClick={() => setTab("pay")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            tab === "pay"
              ? "bg-card text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Formas de Pagamento
        </button>
      </div>

      {/* ── Adição Rápida de Opção ────────────────────────────────────────── */}
      <div className="flex gap-2 max-w-lg">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={
            tab === "entry"
              ? "Nova classificação de receita... Ex: Venda Instagram"
              : tab === "exit"
              ? "Nova classificação de despesa... Ex: Energia / Luz"
              : "Nova forma de pagamento... Ex: Pix Maquininha"
          }
          className="h-10 rounded-xl text-xs bg-card border-border"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd(activeKind);
          }}
        />
        <Button
          size="sm"
          className="h-10 rounded-xl px-4 text-xs font-semibold shrink-0 cursor-pointer"
          disabled={!newLabel.trim()}
          onClick={() => handleAdd(activeKind)}
        >
          <Plus className="size-3.5 mr-1" /> Criar
        </Button>
      </div>

      {/* ── Lista de Opções da Aba Ativa ──────────────────────────────────── */}
      <div className="grid gap-2 sm:grid-cols-2 max-w-3xl pt-1">
        {/* Opções Padrão */}
        {activeBases.map((item) => (
          <div
            key={item.value}
            className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 text-xs shadow-2xs"
          >
            <span className="font-medium text-foreground">{item.label}</span>
            <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground border-border/70">
              Padrão
            </Badge>
          </div>
        ))}

        {/* Opções Personalizadas */}
        {activeCustoms.map((item) => {
          const isEditing = editingValue === item.value;

          return (
            <div
              key={item.value}
              className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-2.5 px-3 text-xs shadow-2xs"
            >
              {isEditing ? (
                <div className="flex flex-1 items-center gap-2 mr-2">
                  <Input
                    autoFocus
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="h-8 rounded-lg text-xs bg-card"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(activeKind, item.value);
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8 rounded-lg px-3 text-xs cursor-pointer"
                    onClick={() => handleSaveEdit(activeKind, item.value)}
                  >
                    Salvar
                  </Button>
                </div>
              ) : (
                <>
                  <span className="font-semibold text-primary">{item.label}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => handleStartEdit(item.value, item.label)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                      onClick={() => handleDelete(activeKind, item.value)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground/90 tracking-tight">{label}</Label>
      {children}
    </div>
  );
}
