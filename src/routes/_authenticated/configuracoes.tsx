import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { isAuthenticated, membersQuery, profileQuery, updateDemoProfile, currentUserId } from "@/lib/db";
import { brl, toNumber } from "@/lib/format";
import { useStore } from "@/lib/store-context";
import { insertMember, deleteMember } from "@/lib/mutations";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da loja — Modé" },
      { name: "description", content: "Ajuste os dados da loja, sua retirada mensal e a equipe com acesso." },
      { property: "og:title", content: "Configurações da loja — Modé" },
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
        title="Sua loja na Modé"
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
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo, SP" />
          </Field>
          <Field label="WhatsApp">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
          </Field>
          <Field label="Pró-labore mensal (R$)">
            <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
          </Field>
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
            <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Júlia" />
          </Field>
          <Field label="E-mail (opcional)">
            <Input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="julia@loja.com" />
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
                    <Button variant="ghost" size="icon" className="size-8 rounded-full text-muted-foreground">
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Plano</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Plano atual: <span className="font-semibold capitalize text-foreground">{profile?.plan ?? "essencial"}</span>
          {profile?.prolabore_target
            ? ` · retirada planejada de ${brl(Number(profile.prolabore_target))} por mês`
            : ""}
        </p>
        <Button variant="ghost" className="mt-6 rounded-full text-destructive" onClick={() => void signOut()}>
          <LogOut className="size-4" /> Sair da conta
        </Button>
      </section>
    </div>
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
