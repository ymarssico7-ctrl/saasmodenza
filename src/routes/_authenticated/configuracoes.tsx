import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Pencil, Plus, Settings, Tags, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
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

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da loja — Vestuli" },
      {
        name: "description",
        content: "Ajuste os dados da loja, sua retirada mensal e a equipe com acesso.",
      },
      { property: "og:title", content: "Configurações da loja — Vestuli" },
      { property: "og:description", content: "Dados da loja, pró-labore e equipe." },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { storeId, isDemoMode } = useStore();
  const { data: profile } = useQuery(profileQuery());
  const { data: members = [] } = useQuery(membersQuery());

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
      const profilePatch = {
        store_name: storeName.trim() || "Minha loja",
        owner_name: ownerName.trim() || "Lojista",
        city: city.trim() || null,
        phone: phone.trim() || null,
        prolabore_target: toNumber(target),
        logo_url: logoUrl.trim() || null,
      };

      // Patch de campos espelhados na tabela `stores` (multi-tenant)
      const storePatch = {
        name: storeName.trim() || "Minha loja",
        city: city.trim() || null,
        phone: phone.trim() || null,
        prolabore_target: toNumber(target),
      };

      if (realUser) {
        // Usuário real → atualiza profiles e stores simultaneamente
        const uid = await currentUserId();

        const [profileRes, storeRes] = await Promise.all([
          supabase.from("profiles").update(profilePatch).eq("id", uid),
          supabase.from("stores").update(storePatch).eq("owner_id", uid),
        ]);

        if (profileRes.error) throw new Error(profileRes.error.message);
        if (storeRes.error) throw new Error(storeRes.error.message);
      } else {
        // Modo demo → persiste no localStorage (sem chamar o banco)
        updateDemoProfile(profilePatch);
      }

      // Sincroniza o nome da loja no tema da vitrine (localStorage),
      // garantindo que a vitrine pública reflita imediatamente o nome correto
      // independente do modo (demo ou real).
      try {
        const themeKey = `vestuli_theme_config_${storeId}`;
        const raw = localStorage.getItem(themeKey) || localStorage.getItem(`modaly_theme_config_${storeId}`);
        const theme = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        theme['nome'] = profilePatch.store_name;
        theme['whatsapp'] = phone.trim() || theme['whatsapp'] || "";
        theme['cidade'] = city.trim() || theme['cidade'] || "";
        localStorage.setItem(themeKey, JSON.stringify(theme));
      } catch {
        // Silencia erros de JSON/quota — não é crítico
      }

      // Atualiza a interface imediatamente em ambos os casos
      queryClient.setQueryData(["profile"], (old: any) => ({ ...old, ...profilePatch }));
      queryClient.setQueryData(["active_store"], (old: any) =>
        old ? { ...old, ...storePatch } : old,
      );
    },
    onSuccess: () => {
      toast.success("Dados atualizados");
      // Invalida ambas as queries para garantir sincronia total com o banco
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
      if (!memberName.trim()) throw new Error("Informe o nome");
      return insertMember(storeId, memberName.trim(), memberEmail.trim() || null, memberRole);
    },
    onSuccess: () => {
      toast.success("Membro adicionado");
      setMemberName("");
      setMemberEmail("");
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => deleteMember(storeId, id),
    onSuccess: () => {
      toast.success("Membro removido");
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

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Configurações"
        title="Sua loja no Vestuli"
        description="Ajuste os dados da loja, sua retirada mensal e quem trabalha com você."
      />

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Dados da loja</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Nome da loja">
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </Field>
          <Field label="Seu nome">
            <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </Field>
          <Field label="Cidade">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="São Paulo, SP"
            />
          </Field>
          <Field label="WhatsApp">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-0000"
            />
          </Field>
          <Field label="Pró-labore mensal (R$)">
            <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
          </Field>
        </div>

        {/* ── Logo da loja ── */}
        <div className="mt-6">
          <Label className="text-xs font-semibold text-muted-foreground">Logo da loja (opcional)</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Aparece no cabeçalho da sua vitrine online. Recomendado: fundo transparente, formato quadrado.
          </p>
          <div className="mt-3">
            <ImageUploader
              currentUrl={logoUrl || null}
              bucket="store-logos"
              folder="logos"
              onUploaded={setLogoUrl}
              placeholder="Clique para adicionar logo"
              aspect="square"
            />
          </div>
        </div>

        <Button
          className="mt-6 h-11 rounded-full px-6 font-semibold"
          disabled={saveProfile.isPending}
          onClick={() => saveProfile.mutate()}
        >
          Salvar alterações
        </Button>
      </section>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Equipe</h2>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Registre quem atua na loja para organizar responsabilidades.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Field label="Nome">
            <Input
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Júlia"
            />
          </Field>
          <Field label="E-mail (opcional)">
            <Input
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="julia@loja.com"
            />
          </Field>
          <Field label="Função">
            <Select value={memberRole} onValueChange={setMemberRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendedora">Vendedora</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Button
          variant="outline"
          className="mt-6 h-11 rounded-full px-6 font-semibold"
          disabled={addMember.isPending}
          onClick={() => addMember.mutate()}
        >
          <Plus className="size-4" /> Adicionar membro
        </Button>

        {members.length > 0 ? (
          <ul className="mt-7 divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-accent text-primary">
                    <Users className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                      {m.role}
                      {m.email ? ` · ${m.email}` : ""}
                    </p>
                  </div>
                </div>
                <ConfirmDelete
                  onConfirm={() => removeMember.mutate(m.id)}
                  description={`${m.name} será removido da equipe.`}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full text-muted-foreground"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* ── Seção dedicada: Categorias & Formas de Pagamento da Loja ─────── */}
      <CustomOptionsSettingsSection storeId={storeId} />

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Plano</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Plano atual:{" "}
          <span className="font-semibold capitalize text-foreground">
            {profile?.plan ?? "essencial"}
          </span>
          {profile?.prolabore_target
            ? ` · retirada planejada de ${brl(Number(profile.prolabore_target))} por mês`
            : ""}
        </p>
        <Button
          variant="ghost"
          className="mt-6 rounded-full text-destructive"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" /> Sair da conta
        </Button>
      </section>
    </div>
  );
}

// ── Seção Dedicada de Categorias & Formas de Pagamento (Apple Level) ────────
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

  const handleSaveEdit = (kind: keyof CustomOptionsStore, value: string) => {
    if (!editLabel.trim()) return;
    updateCustomOption(storeId, kind, value, editLabel);
    setEditingValue(null);
    setEditLabel("");
    toast.success("Opção atualizada");
  };

  const handleDelete = (kind: keyof CustomOptionsStore, value: string) => {
    removeCustomOption(storeId, kind, value);
    toast.success("Opção removida");
  };

  const handleAdd = (kind: keyof CustomOptionsStore) => {
    if (!newLabel.trim()) return;
    if (kind === "entryCategories") addCustomEntry(storeId, newLabel);
    if (kind === "exitCategories") addCustomExit(storeId, newLabel);
    if (kind === "paymentMethods") addCustomPaymentMethod(storeId, newLabel);
    setNewLabel("");
    toast.success("Nova opção adicionada");
  };

  const baseEntry = ENTRY_CATEGORIES as readonly { value: string; label: string }[];
  const baseExit = EXIT_CATEGORIES as readonly { value: string; label: string }[];
  const basePay = PAYMENT_METHODS as readonly { value: string; label: string }[];

  const activeKind = tab === "entry" ? "entryCategories" : tab === "exit" ? "exitCategories" : "paymentMethods";
  const activeCustoms = tab === "entry" ? customOpts.entryCategories : tab === "exit" ? customOpts.exitCategories : customOpts.paymentMethods;
  const activeBases = tab === "entry" ? baseEntry : tab === "exit" ? baseExit : basePay;

  return (
    <section id="categorias-pagamentos" className="panel p-6 sm:p-7 space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            Categorias & Formas de Pagamento
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Gerencie as opções exibidas nos formulários de lançamento do caixa.
          </p>
        </div>
      </div>

      {/* ── Segmented Tabs Apple Style ────────────────────────────────────── */}
      <div className="flex rounded-xl bg-surface-muted p-1 gap-1 max-w-md">
        <button
          type="button"
          onClick={() => setTab("entry")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
            tab === "entry"
              ? "bg-card text-emerald-600 shadow-sm dark:text-emerald-400"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Categorias de Entrada
        </button>
        <button
          type="button"
          onClick={() => setTab("exit")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
            tab === "exit"
              ? "bg-card text-rose-600 shadow-sm dark:text-rose-400"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Categorias de Saída
        </button>
        <button
          type="button"
          onClick={() => setTab("pay")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
            tab === "pay"
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Formas de Pagamento
        </button>
      </div>

      {/* ── Adição Rápida de Opção ────────────────────────────────────────── */}
      <div className="flex gap-2 max-w-md">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={
            tab === "entry"
              ? "Nova categoria de entrada…"
              : tab === "exit"
              ? "Nova categoria de saída…"
              : "Nova forma de pagamento…"
          }
          className="h-10 rounded-xl text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd(activeKind);
          }}
        />
        <Button
          size="sm"
          className="h-10 rounded-xl px-4 text-xs font-semibold shrink-0"
          disabled={!newLabel.trim()}
          onClick={() => handleAdd(activeKind)}
        >
          <Plus className="h-4 w-4 mr-1" /> Criar
        </Button>
      </div>

      {/* ── Lista de Opções da Aba Ativa ──────────────────────────────────── */}
      <div className="grid gap-2 sm:grid-cols-2 max-w-3xl pt-2">
        {/* Opções Padrão */}
        {activeBases.map((item) => (
          <div
            key={item.value}
            className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-3 text-xs"
          >
            <span className="font-medium text-foreground">{item.label}</span>
            <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground">
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
              className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary-soft/20 p-2.5 px-3 text-xs"
            >
              {isEditing ? (
                <div className="flex flex-1 items-center gap-2 mr-2">
                  <Input
                    autoFocus
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="h-8 rounded-lg text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(activeKind, item.value);
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8 rounded-lg px-3 text-xs"
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
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={() => handleStartEdit(item.value, item.label)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      onClick={() => handleDelete(activeKind, item.value)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
