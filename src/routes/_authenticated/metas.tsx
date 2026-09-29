import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Target, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FinanceiroTabs } from "@/components/financeiro-tabs";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { goalsQuery, transactionsQuery } from "@/lib/db";
import { brl, monthLabel, monthStart, pct, toNumber } from "@/lib/format";
import { REFUND_CATEGORIES, projectMonth, sumBy, sumByCategories, type Transaction } from "@/lib/finance";
import { useStore } from "@/lib/store-context";
import { upsertGoal, deleteGoal } from "@/lib/mutations";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas mensais — Vestui" },
      {
        name: "description",
        content: "Defina a meta de faturamento do mês e acompanhe o progresso da sua loja.",
      },
      { property: "og:title", content: "Metas mensais — Vestui" },
      { property: "og:description", content: "Meta, progresso e projeção de fechamento do mês." },
    ],
  }),
  component: Metas,
});

function Metas() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: goals = [] } = useQuery(goalsQuery());
  const { data: all = [] } = useQuery(transactionsQuery());
  const txs = all as unknown as Transaction[];
  const [target, setTarget] = useState("");
  const month = monthStart(0);

  // Receita Líquida Real do mês (Vendas − Estornos/Devoluções)
  const revenueDetailsOf = (m: string) => {
    const mPrefix = m.slice(0, 7);
    const monthTransactions = txs.filter((t) => t.occurred_on.slice(0, 7) === mPrefix);
    const grossSales = sumBy(monthTransactions, "entrada");
    const onlineSales = sumByCategories(monthTransactions, "entrada", new Set(["venda_online"]));
    const refunds = sumByCategories(monthTransactions, "saida", REFUND_CATEGORIES);
    const netRevenue = Math.max(grossSales - refunds, 0);
    return { grossSales, onlineSales, refunds, netRevenue };
  };

  const revenueOf = (m: string) => revenueDetailsOf(m).netRevenue;

  const currentGoal = goals.find((g) => g.month.slice(0, 7) === month.slice(0, 7));
  const { grossSales, onlineSales, refunds, netRevenue: revenue } = revenueDetailsOf(month);
  const goalAmount = Number(currentGoal?.target_amount ?? 0);
  const progress = goalAmount > 0 ? Math.min((revenue / goalAmount) * 100, 100) : 0;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projection = projectMonth(revenue, now.getDate(), daysInMonth);
  const missing = Math.max(goalAmount - revenue, 0);
  const perDay = missing / Math.max(daysInMonth - now.getDate() + 1, 1);

  const save = useMutation({
    mutationFn: async () => {
      const value = toNumber(target);
      if (value <= 0) throw new Error("Informe uma meta válida");
      return upsertGoal(storeId, month, value);
    },
    onSuccess: () => {
      toast.success("Meta salva");
      setTarget("");
      void queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteGoal(storeId, id),
    onSuccess: () => {
      toast.success("Meta excluída");
      void queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finanças da Loja"
        title="Metas de Vendas"
        description="Uma meta clara muda o ritmo da sua loja. Acompanhe o progresso dia a dia."
      />

      <FinanceiroTabs />

      <section className="panel p-6 sm:p-8 relative overflow-hidden bg-card border border-border shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Meta de {monthLabel(month).toLowerCase()}
            </p>
            <p className="numeric mt-2 text-3xl sm:text-[2.6rem] font-bold tracking-tight text-foreground leading-none">
              {goalAmount > 0 ? brl(goalAmount) : "Sem meta"}
            </p>
          </div>
          {goalAmount > 0 && (
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                missing === 0
                  ? "bg-success-soft text-success border border-success/20"
                  : "bg-primary-soft text-primary border border-primary/20",
              )}>
                {missing === 0 ? "🎉 Meta batida!" : `${pct(progress)} concluído`}
              </span>
            </div>
          )}
        </div>

        {goalAmount > 0 ? (
          <>
            <Progress value={progress} className="mt-6 h-2.5 bg-secondary" />
            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3 pt-4 border-t border-border/60">
              <div>
                <p className="text-xs text-muted-foreground">Faturamento Líquido</p>
                <p className="numeric text-lg font-bold text-foreground mt-0.5">{brl(revenue)}</p>
                {onlineSales > 0 ? (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    ({brl(Math.max(0, revenue - onlineSales))} balcão · {brl(onlineSales)} vitrine)
                  </p>
                ) : refunds > 0 ? (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    ({brl(grossSales)} brutos − {brl(refunds)} estornos)
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Falta para a meta</p>
                <p className="numeric text-lg font-bold text-foreground mt-0.5">{brl(missing)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {missing > 0 ? `${brl(perDay)} / dia restante` : "100% atingido"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Projeção de fechamento</p>
                <p className="numeric text-lg font-bold text-foreground mt-0.5">{brl(projection)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Com base no ritmo diário atual
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Defina abaixo quanto você quer faturar neste mês para ativar o acompanhamento de ritmo.
          </p>
        )}
      </section>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">
          {currentGoal ? "Atualizar meta" : "Definir meta do mês"}
        </h2>
        <div className="mt-6 max-w-xs space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            Faturamento desejado (R$)
          </Label>
          <Input
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="25.000,00"
          />
        </div>
        <Button
          className="mt-6 h-11 rounded-full px-6 font-semibold"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          Salvar meta
        </Button>
      </section>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Histórico de metas</h2>
        {goals.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<Target className="size-6" />}
            title="Nenhuma meta definida"
            description="Defina a meta deste mês e acompanhe o histórico de desempenho aqui."
          />
        ) : (
          <ul className="mt-5 divide-y divide-border">
            {goals.map((g) => {
              const achieved = revenueOf(g.month);
              const targetAmount = Number(g.target_amount);
              const percentualReal = targetAmount > 0 ? (achieved / targetAmount) * 100 : 0;
              const percentualBarra = Math.min(percentualReal, 100);
              return (
                <li key={g.id} className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{monthLabel(g.month)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {brl(achieved)} líquido de {brl(targetAmount)} · {pct(percentualReal)}
                      </p>
                    </div>
                    <ConfirmDelete
                      onConfirm={() => remove.mutate(g.id)}
                      description="A meta será removida do histórico."
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
                  <Progress value={percentualBarra} className="mt-3 h-1.5" />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
