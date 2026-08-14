import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HandCoins, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { prolaboreQuery, profileQuery, transactionsQuery } from "@/lib/db";
import { brl, monthLabel, monthStart, pct, toNumber, todayISO } from "@/lib/format";
import { sumBy, type Transaction } from "@/lib/finance";
import { useStore } from "@/lib/store-context";
import { insertProlabore, deleteProlabore, updateProlaboreTarget } from "@/lib/mutations";

export const Route = createFileRoute("/_authenticated/prolabore")({
  head: () => ({
    meta: [
      { title: "Pró-labore da lojista — Modé" },
      {
        name: "description",
        content:
          "Separe o dinheiro da loja do seu dinheiro pessoal com o controle de pró-labore mensal.",
      },
      { property: "og:title", content: "Pró-labore da lojista — Modé" },
      {
        property: "og:description",
        content: "Defina sua retirada mensal e acompanhe o quanto já retirou.",
      },
    ],
  }),
  component: Prolabore,
});

function Prolabore() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: profile } = useQuery(profileQuery());
  const { data: withdrawals = [] } = useQuery(prolaboreQuery());
  const { data: all = [] } = useQuery(transactionsQuery());
  const txs = all as unknown as Transaction[];

  const month = monthStart(0);
  const [amount, setAmount] = useState("");
  const [target, setTarget] = useState("");

  const monthWithdrawals = withdrawals.filter((w) => w.month.slice(0, 7) === month.slice(0, 7));
  const withdrawn = monthWithdrawals.reduce((acc, w) => acc + Number(w.amount), 0);
  const goal = Number(profile?.prolabore_target ?? 0);
  const progress = goal > 0 ? Math.min((withdrawn / goal) * 100, 100) : 0;

  const monthTxs = txs.filter((t) => t.occurred_on.slice(0, 7) === month.slice(0, 7));
  const profit = sumBy(monthTxs, "entrada") - sumBy(monthTxs, "saida");
  const available = Math.max(profit - withdrawn, 0);

  const create = useMutation({
    mutationFn: async () => {
      const value = toNumber(amount);
      if (value <= 0) throw new Error("Informe um valor maior que zero");
      return insertProlabore(storeId, month, value);
    },
    onSuccess: () => {
      toast.success("Retirada registrada e lançada no caixa");
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: ["prolabore"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteProlabore(storeId, id),
    onSuccess: () => {
      toast.success("Retirada excluída");
      void queryClient.invalidateQueries({ queryKey: ["prolabore"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveTarget = useMutation({
    mutationFn: async () => {
      const value = toNumber(target);
      if (value <= 0) throw new Error("Informe uma meta válida");
      return updateProlaboreTarget(storeId, value);
    },
    onSuccess: () => {
      toast.success("Meta de retirada atualizada");
      setTarget("");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={monthLabel(month)}
        title="Pró-labore"
        description="O dinheiro da loja não é o seu salário. Defina sua retirada e respeite o limite."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Retirado no mês"
          value={brl(withdrawn)}
          icon={<HandCoins className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="Meta de retirada"
          value={brl(goal)}
          hint={goal > 0 ? `${pct(progress)} concluído` : "Defina abaixo"}
        />
        <StatCard
          label="Disponível para retirar"
          value={brl(available)}
          tone={available > 0 ? "positive" : "warning"}
          hint={`Lucro do mês: ${brl(profit)}`}
        />
      </div>

      {goal > 0 ? (
        <section className="panel p-6 sm:p-7">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Progresso da retirada</span>
            <span className="numeric text-muted-foreground">
              {brl(withdrawn)} / {brl(goal)}
            </span>
          </div>
          <Progress value={progress} className="mt-4 h-2.5" />
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-6 sm:p-7">
          <h2 className="text-base font-semibold">Registrar retirada</h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            A retirada também entra como saída no caixa da loja.
          </p>
          <div className="mt-6 space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Valor (R$)</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1.500,00"
            />
          </div>
          <Button
            className="mt-6 h-11 rounded-full px-6 font-semibold"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            <Plus className="size-4" /> Registrar retirada
          </Button>
        </section>

        <section className="panel p-6 sm:p-7">
          <h2 className="text-base font-semibold">Meta mensal de retirada</h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Quanto você pretende retirar da loja por mês.
          </p>
          <div className="mt-6 space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Nova meta (R$)</Label>
            <Input
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={goal > 0 ? brl(goal) : "3.500,00"}
            />
          </div>
          <Button
            variant="outline"
            className="mt-6 h-11 rounded-full px-6 font-semibold"
            disabled={saveTarget.isPending}
            onClick={() => saveTarget.mutate()}
          >
            Atualizar meta
          </Button>
        </section>
      </div>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Histórico de retiradas</h2>
        {withdrawals.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<HandCoins className="size-6" />}
            title="Nenhuma retirada registrada"
            description="Assim que você fizer sua primeira retirada, ela aparece aqui com o mês de referência."
          />
        ) : (
          <ul className="mt-5 divide-y divide-border">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-4 py-3.5">
                <div>
                  <p className="text-sm font-medium">{monthLabel(w.month)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Retirada de pró-labore</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="numeric text-sm font-semibold">{brl(Number(w.amount))}</span>
                  <ConfirmDelete
                    onConfirm={() => remove.mutate(w.id)}
                    description="A retirada será removida do histórico."
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
