import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, Plus, Trash2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { transactionsQuery } from "@/lib/db";
import { brl, formatDate, monthLabel, monthStart, todayISO, toNumber } from "@/lib/format";
import {
  ENTRY_CATEGORIES,
  EXIT_CATEGORIES,
  PAYMENT_METHODS,
  labelOf,
  sumBy,
  type Transaction,
} from "@/lib/finance";
import { useStore } from "@/lib/store-context";
import { insertTransaction, deleteTransaction } from "@/lib/mutations";

export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({
    meta: [
      { title: "Controle de caixa — Modé" },
      {
        name: "description",
        content: "Registre entradas e saídas da loja e acompanhe o saldo do dia e do mês.",
      },
      { property: "og:title", content: "Controle de caixa — Modé" },
      { property: "og:description", content: "Entradas, saídas e saldo sempre atualizados." },
    ],
  }),
  component: Caixa,
});

function Caixa() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: all = [] } = useQuery(transactionsQuery());
  const txs = all as unknown as Transaction[];

  const [kind, setKind] = useState<"entrada" | "saida">("entrada");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("venda_produto");
  const [method, setMethod] = useState("pix");
  const [date, setDate] = useState(todayISO());

  const categories = kind === "entrada" ? ENTRY_CATEGORIES : EXIT_CATEGORIES;

  const month = monthStart(0);
  const monthTxs = useMemo(
    () => txs.filter((t) => t.occurred_on.slice(0, 7) === month.slice(0, 7)),
    [txs, month],
  );
  const today = todayISO();
  const todayTxs = txs.filter((t) => t.occurred_on === today);

  const revenue = sumBy(monthTxs, "entrada");
  const expenses = sumBy(monthTxs, "saida");
  const todayBalance = sumBy(todayTxs, "entrada") - sumBy(todayTxs, "saida");

  const create = useMutation({
    mutationFn: async () => {
      const value = toNumber(amount);
      if (!description.trim()) throw new Error("Descreva o lançamento");
      if (value <= 0) throw new Error("Informe um valor maior que zero");
      return insertTransaction({
        storeId,
        kind,
        description: description.trim(),
        amount: value,
        category,
        payment_method: method,
        occurred_on: date,
      });
    },
    onSuccess: () => {
      toast.success("Lançamento registrado");
      setDescription("");
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteTransaction(storeId, id),
    onSuccess: () => {
      toast.success("Lançamento excluído");
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={monthLabel(month)}
        title="Caixa"
        description="Cada venda e cada despesa no lugar certo. O saldo se atualiza na hora."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Entradas do mês" value={brl(revenue)} tone="positive" icon={<ArrowUpRight className="size-4" />} />
        <StatCard label="Saídas do mês" value={brl(expenses)} tone="negative" icon={<ArrowDownRight className="size-4" />} />
        <StatCard
          label="Saldo de hoje"
          value={brl(todayBalance)}
          tone={todayBalance >= 0 ? "primary" : "negative"}
          icon={<Wallet className="size-4" />}
          hint={`${todayTxs.length} lançamento(s) hoje`}
        />
      </div>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Novo lançamento</h2>
        <Tabs
          value={kind}
          onValueChange={(v) => {
            const next = v as "entrada" | "saida";
            setKind(next);
            setCategory(next === "entrada" ? "venda_produto" : "compra_estoque");
            setMethod(next === "entrada" ? "pix" : "pix");
          }}
          className="mt-5"
        >
          <TabsList className="grid w-full max-w-xs grid-cols-2 rounded-full bg-surface-muted p-1">
            <TabsTrigger value="entrada" className="rounded-full">
              Entrada
            </TabsTrigger>
            <TabsTrigger value="saida" className="rounded-full">
              Saída
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Descrição" className="lg:col-span-2">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={kind === "entrada" ? "Venda vestido midi" : "Aluguel da loja"}
            />
          </Field>
          <Field label="Valor (R$)">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="189,90"
            />
          </Field>
          <Field label="Categoria">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Forma de pagamento">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <Button
          className="mt-6 h-11 rounded-full px-6 font-semibold"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          <Plus className="size-4" /> Registrar {kind === "entrada" ? "entrada" : "saída"}
        </Button>
      </section>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Lançamentos de {monthLabel(month).toLowerCase()}</h2>
        {monthTxs.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<Wallet className="size-6" />}
            title="Nenhum lançamento neste mês"
            description="Registre a primeira venda ou despesa para acompanhar o caixa em tempo real."
          />
        ) : (
          <ul className="mt-5 divide-y divide-border">
            {monthTxs.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="rounded-full text-[10px] font-medium">
                      {labelOf(t.kind === "entrada" ? ENTRY_CATEGORIES : EXIT_CATEGORIES, t.category)}
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-[10px] font-medium">
                      {labelOf(PAYMENT_METHODS, t.payment_method)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(t.occurred_on)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p
                    className={`numeric text-sm font-semibold ${
                      t.kind === "entrada" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {t.kind === "entrada" ? "+" : "−"}
                    {brl(Number(t.amount))}
                  </p>
                  <ConfirmDelete
                    onConfirm={() => remove.mutate(t.id)}
                    description="O lançamento será removido do seu caixa."
                    trigger={
                      <Button variant="ghost" size="icon" className="size-8 rounded-full text-muted-foreground">
                        <Trash2 className="size-4" />
                      </Button>
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
