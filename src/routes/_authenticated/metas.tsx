import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Target, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, goalsQuery, transactionsQuery } from "@/lib/db";
import { brl, monthLabel, monthStart, pct, toNumber } from "@/lib/format";
import { projectMonth, sumBy, type Transaction } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas mensais — Modé" },
      { name: "description", content: "Defina a meta de faturamento do mês e acompanhe o progresso da sua loja." },
      { property: "og:title", content: "Metas mensais — Modé" },
      { property: "og:description", content: "Meta, progresso e projeção de fechamento do mês." },
    ],
  }),
  component: Metas,
});

function Metas() {
  const queryClient = useQueryClient();
  const { data: goals = [] } = useQuery(goalsQuery());
  const { data: all = [] } = useQuery(transactionsQuery());
  const txs = all as unknown as Transaction[];
  const [target, setTarget] = useState("");
  const month = monthStart(0);

  const revenueOf = (m: string) =>
    sumBy(
      txs.filter((t) => t.occurred_on.slice(0, 7) === m.slice(0, 7)),
      "entrada",
    );

  const currentGoal = goals.find((g) => g.month.slice(0, 7) === month.slice(0, 7));
  const revenue = revenueOf(month);
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
      const user_id = await currentUserId();
      if (currentGoal) {
        const { error } = await supabase
          .from("goals")
          .update({ target_amount: value })
          .eq("id", currentGoal.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("goals").insert({ user_id, month, target_amount: value });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Meta salva");
      setTarget("");
      void queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Meta excluída");
      void queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={monthLabel(month)}
        title="Metas"
        description="Uma meta clara muda o jeito de vender. Acompanhe o progresso dia a dia."
      />

      <section className="panel bg-primary p-7 text-primary-foreground sm:p-9">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/60">
          Meta de {monthLabel(month).toLowerCase()}
        </p>
        <p className="numeric mt-3 text-[2.6rem] font-semibold leading-none">
          {goalAmount > 0 ? brl(goalAmount) : "Sem meta"}
        </p>
        {goalAmount > 0 ? (
          <>
            <Progress value={progress} className="mt-7 h-2.5 bg-primary-foreground/20" />
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <p className="text-primary-foreground/80">
                Faturado: <span className="numeric font-semibold">{brl(revenue)}</span>
              </p>
              <p className="text-primary-foreground/80">
                Falta: <span className="numeric font-semibold">{brl(missing)}</span>
              </p>
              <p className="text-primary-foreground/80">
                Projeção: <span className="numeric font-semibold">{brl(projection)}</span>
              </p>
            </div>
            <p className="mt-5 text-xs text-primary-foreground/60">
              {pct(progress)} concluído · precisa de {brl(perDay)} por dia para bater a meta
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-primary-foreground/70">
            Defina abaixo quanto você quer faturar neste mês.
          </p>
        )}
      </section>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">{currentGoal ? "Atualizar meta" : "Definir meta do mês"}</h2>
        <div className="mt-6 max-w-xs space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">Faturamento desejado (R$)</Label>
          <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="25.000,00" />
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
              const p = Number(g.target_amount) > 0 ? Math.min((achieved / Number(g.target_amount)) * 100, 100) : 0;
              return (
                <li key={g.id} className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{monthLabel(g.month)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {brl(achieved)} de {brl(Number(g.target_amount))} · {pct(p)}
                      </p>
                    </div>
                    <ConfirmDelete
                      onConfirm={() => remove.mutate(g.id)}
                      description="A meta será removida do histórico."
                      trigger={
                        <Button variant="ghost" size="icon" className="size-8 rounded-full text-muted-foreground">
                          <Trash2 className="size-4" />
                        </Button>
                      }
                    />
                  </div>
                  <Progress value={p} className="mt-3 h-1.5" />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
