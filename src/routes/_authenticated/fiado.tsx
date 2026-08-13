import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Plus, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { creditsQuery, customersQuery } from "@/lib/db";
import { brl, formatDate, todayISO, toNumber } from "@/lib/format";
import { CREDIT_STATUS_LABEL, creditStatus } from "@/lib/finance";
import { useStore } from "@/lib/store-context";
import { insertCredit, deleteCredit, insertTransaction } from "@/lib/mutations";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/fiado")({
  head: () => ({
    meta: [
      { title: "Controle de fiado — Modé" },
      {
        name: "description",
        content: "Acompanhe quem deve, quanto deve e quando vence cada fiado da sua loja.",
      },
      { property: "og:title", content: "Controle de fiado — Modé" },
      {
        property: "og:description",
        content: "Fiado organizado, com pagamentos parciais e alertas de atraso.",
      },
    ],
  }),
  component: Fiado,
});

type CreditRow = {
  id: string;
  customer_id: string;
  description: string;
  amount: number;
  paid_amount: number;
  purchase_date: string;
  due_date: string;
  customers?: { id: string; name: string; phone: string | null } | null;
};

function Fiado() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: customers = [] } = useQuery(customersQuery());
  const { data: rawCredits = [] } = useQuery(creditsQuery());
  const credits = rawCredits as unknown as CreditRow[];
  const today = todayISO();

  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [purchase, setPurchase] = useState(today);
  const [due, setDue] = useState(today);
  const [payments, setPayments] = useState<Record<string, string>>({});

  const withStatus = credits.map((c) => ({
    ...c,
    status: creditStatus(
      { amount: Number(c.amount), paid_amount: Number(c.paid_amount), due_date: c.due_date },
      today,
    ),
  }));

  const open = withStatus.filter((c) => c.status !== "pago");
  const openTotal = open.reduce((acc, c) => acc + (Number(c.amount) - Number(c.paid_amount)), 0);
  const overdueTotal = open
    .filter((c) => c.status === "vencido")
    .reduce((acc, c) => acc + (Number(c.amount) - Number(c.paid_amount)), 0);
  const receivedTotal = withStatus.reduce((acc, c) => acc + Number(c.paid_amount), 0);

  const create = useMutation({
    mutationFn: async () => {
      const value = toNumber(amount);
      if (!customerId) throw new Error("Escolha um cliente");
      if (!description.trim()) throw new Error("Descreva a compra");
      if (value <= 0) throw new Error("Informe um valor maior que zero");
      return insertCredit({
        storeId,
        customer_id: customerId,
        description: description.trim(),
        amount: value,
        purchase_date: purchase,
        due_date: due,
      });
    },
    onSuccess: () => {
      toast.success("Fiado registrado");
      setDescription("");
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pay = useMutation({
    mutationFn: async ({ credit, value }: { credit: CreditRow; value: number }) => {
      if (value <= 0) throw new Error("Informe o valor recebido");
      const remaining = Number(credit.amount) - Number(credit.paid_amount);
      if (value > remaining + 0.005) throw new Error("Valor maior que o saldo devedor");
      // credit_payments insert
      const { error } = await supabase
        .from("credit_payments")
        .insert({
          store_id: storeId,
          user_id: storeId,
          credit_id: credit.id,
          amount: value,
          paid_on: todayISO(),
        });
      if (error) throw new Error(error.message);
      // update paid_amount
      const { error: updateError } = await supabase
        .from("credits")
        .update({ paid_amount: Number(credit.paid_amount) + value })
        .eq("id", credit.id);
      if (updateError) throw new Error(updateError.message);
      // register as a cash transaction
      await insertTransaction({
        storeId,
        kind: "entrada",
        description: `Recebimento fiado — ${credit.customers?.name ?? "cliente"}`,
        amount: value,
        category: "venda_produto",
        payment_method: "fiado",
        occurred_on: todayISO(),
      });
    },
    onSuccess: () => {
      toast.success("Pagamento registrado e lançado no caixa");
      setPayments({});
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteCredit(storeId, id),
    onSuccess: () => {
      toast.success("Fiado excluído");
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Fiado"
        title="Quem deve, quanto e até quando"
        description="Registre as vendas a prazo, receba em partes e acompanhe o que está atrasado."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total em aberto"
          value={brl(openTotal)}
          tone="primary"
          icon={<Users className="size-4" />}
        />
        <StatCard
          label="Vencido"
          value={brl(overdueTotal)}
          tone={overdueTotal > 0 ? "negative" : "default"}
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          label="Já recebido"
          value={brl(receivedTotal)}
          tone="positive"
          icon={<CheckCircle2 className="size-4" />}
        />
      </div>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Novo fiado</h2>
        {customers.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Cadastre um cliente na aba Clientes para registrar um fiado.
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Cliente">
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Descrição da compra">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="2 blusas + saia"
                />
              </Field>
              <Field label="Valor (R$)">
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="240,00"
                />
              </Field>
              <Field label="Data da compra">
                <Input type="date" value={purchase} onChange={(e) => setPurchase(e.target.value)} />
              </Field>
              <Field label="Vencimento">
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </Field>
            </div>
            <Button
              className="mt-6 h-11 rounded-full px-6 font-semibold"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              <Plus className="size-4" /> Registrar fiado
            </Button>
          </>
        )}
      </section>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Fiados</h2>
        {withStatus.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<Users className="size-6" />}
            title="Nenhum fiado registrado"
            description="Quando registrar uma venda a prazo, ela aparece aqui com status e vencimento."
          />
        ) : (
          <ul className="mt-5 space-y-3">
            {withStatus.map((c) => {
              const remaining = Number(c.amount) - Number(c.paid_amount);
              return (
                <li key={c.id} className="rounded-3xl bg-surface-muted p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {c.customers?.name ?? "Cliente"}
                        </p>
                        <Badge
                          className="rounded-full text-[10px] font-semibold"
                          variant={
                            c.status === "pago"
                              ? "secondary"
                              : c.status === "vencido"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {CREDIT_STATUS_LABEL[c.status]}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{c.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Compra {formatDate(c.purchase_date)} · vence {formatDate(c.due_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="numeric text-sm font-semibold">{brl(remaining)}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        de {brl(Number(c.amount))}
                      </p>
                    </div>
                  </div>

                  {c.status !== "pago" ? (
                    <div className="mt-4 flex flex-wrap items-end gap-2">
                      <div className="w-40 space-y-1.5">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Receber (R$)
                        </Label>
                        <Input
                          inputMode="decimal"
                          value={payments[c.id] ?? ""}
                          onChange={(e) => setPayments((p) => ({ ...p, [c.id]: e.target.value }))}
                          placeholder={brl(remaining)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="h-10 rounded-full font-semibold"
                        disabled={pay.isPending}
                        onClick={() =>
                          pay.mutate({
                            credit: c,
                            value: toNumber(payments[c.id] ?? "") || remaining,
                          })
                        }
                      >
                        Registrar pagamento
                      </Button>
                      <ConfirmDelete
                        onConfirm={() => remove.mutate(c.id)}
                        description="O fiado e seu histórico de pagamentos serão removidos."
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-10 rounded-full text-muted-foreground"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        }
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
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
