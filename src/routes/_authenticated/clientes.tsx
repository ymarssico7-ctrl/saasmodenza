import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, UserRound } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { creditsQuery, customersQuery } from "@/lib/db";
import { brl } from "@/lib/format";
import { useStore } from "@/lib/store-context";
import { insertCustomer, deleteCustomer } from "@/lib/mutations";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes da loja — Modé" },
      {
        name: "description",
        content: "Cadastro de clientes com histórico de fiado e saldo devedor.",
      },
      { property: "og:title", content: "Clientes da loja — Modé" },
      { property: "og:description", content: "Saiba quem compra e quem ainda deve na sua loja." },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: customers = [] } = useQuery(customersQuery());
  const { data: credits = [] } = useQuery(creditsQuery());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const balanceOf = (customerId: string) =>
    credits
      .filter((c) => c.customer_id === customerId)
      .reduce((acc, c) => acc + (Number(c.amount) - Number(c.paid_amount)), 0);

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe o nome do cliente");
      return insertCustomer(storeId, name.trim(), phone.trim() || null);
    },
    onSuccess: () => {
      toast.success("Cliente cadastrado");
      setName("");
      setPhone("");
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteCustomer(storeId, id),
    onSuccess: () => {
      toast.success("Cliente excluído");
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Clientes"
        title="Sua base de clientes"
        description="Cadastre quem compra na sua loja para vincular fiados e acompanhar saldos."
      />

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Novo cliente</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Oliveira" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">WhatsApp (opcional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 98888-0000" />
          </div>
        </div>
        <Button
          className="mt-6 h-11 rounded-full px-6 font-semibold"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          <Plus className="size-4" /> Cadastrar cliente
        </Button>
      </section>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Clientes cadastrados</h2>
        {customers.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<UserRound className="size-6" />}
            title="Nenhum cliente ainda"
            description="Cadastre a primeira cliente para começar a controlar fiado por pessoa."
          />
        ) : (
          <ul className="mt-5 divide-y divide-border">
            {customers.map((c) => {
              const balance = balanceOf(c.id);
              return (
                <li key={c.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{c.phone || "Sem telefone"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p
                        className={`numeric text-sm font-semibold ${
                          balance > 0 ? "text-warning" : "text-muted-foreground"
                        }`}
                      >
                        {brl(balance)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">em aberto</p>
                    </div>
                    <ConfirmDelete
                      onConfirm={() => remove.mutate(c.id)}
                      description="O cliente e seus fiados serão removidos."
                      trigger={
                        <Button variant="ghost" size="icon" className="size-8 rounded-full text-muted-foreground">
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
