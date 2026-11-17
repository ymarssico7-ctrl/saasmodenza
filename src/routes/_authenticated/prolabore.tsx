import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, HandCoins, Plus, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FinanceiroTabs } from "@/components/financeiro-tabs";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { prolaboreQuery, profileQuery, transactionsQuery } from "@/lib/db";
import { brl, monthLabel, monthStart, pct, toNumber, todayISO } from "@/lib/format";
import {
  sumBy,
  sumByCategories,
  sumByExcluding,
  REFUND_CATEGORIES,
  STOCK_PURCHASE_CATEGORIES,
  PROLABORE_CATEGORIES,
  type Transaction,
} from "@/lib/finance";
import { useStore } from "@/lib/store-context";
import { insertProlabore, deleteProlabore, updateProlaboreTarget } from "@/lib/mutations";
import { useAccess } from "@/lib/useAccess";

export const Route = createFileRoute("/_authenticated/prolabore")({
  head: () => ({
    meta: [
      { title: "Pró-labore da lojista — Vestui" },
      {
        name: "description",
        content:
          "Separe o dinheiro da loja do seu dinheiro pessoal com o controle de pró-labore mensal.",
      },
      { property: "og:title", content: "Pró-labore da lojista — Vestui" },
      {
        property: "og:description",
        content: "Defina sua retirada mensal e acompanhe o quanto já retirou.",
      },
    ],
  }),
  component: ProlaboreRouteWrapper,
});

// ── Wrapper com Proteção de Plano (Store only) ────────────────────────────────
function ProlaboreRouteWrapper() {
  const { store } = useStore();
  const { data: profile } = useQuery(profileQuery());
  const access = useAccess(profile, store);

  if (!access.limits.hasProlabore) {
    return <ProlaboreGatePresentation />;
  }
  return <Prolabore />;
}

// ── Gate de Apresentação do Pró-labore para usuários Free/Pro ────────────────
function ProlaboreGatePresentation() {
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Finanças da Loja"
        title="Pró-labore da Lojista"
        description="O dinheiro da loja não é o seu salário. Defina sua retirada e respeite o limite."
      />
      <FinanceiroTabs />

      {/* Hero Gate */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background p-6 sm:p-10 shadow-sm">
        <div className="max-w-2xl space-y-4">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 uppercase tracking-wider">
            ✦ Disponível no Vestui Store
          </Badge>

          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight leading-tight">
            O Dinheiro da Loja Não É o Seu Salário
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Defina sua retirada mensal (pró-labore), acompanhe o quanto já retirou e separe as finanças
            da loja das suas. Uma das regras de ouro da gestão financeira do varejo.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-2xl gradient-primary text-primary-foreground px-7 text-sm font-bold shadow-glow hover:opacity-95 transition-all active:scale-[0.98] cursor-pointer"
            >
              <a href="/configuracoes?tab=plano">
                <Sparkles className="size-4 mr-2" />
                Desbloquear Pró-labore →
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-2xl px-6 text-sm font-semibold border-border/80 hover:bg-secondary/60 cursor-pointer"
            >
              <a href="/configuracoes?tab=plano">Ver Todos os Planos</a>
            </Button>
          </div>
          <p className="text-xs text-foreground/70 font-semibold flex items-center gap-1.5 pt-1">
            <Check className="size-3.5 text-emerald-500" />
            <span className="font-semibold text-foreground/80">Sem fidelidade • Liberação imediata • Apenas R$ 0,66 por dia</span>
          </p>
        </div>

        {/* Orbs decorativos */}
        <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-16 size-48 rounded-full bg-primary/5 blur-2xl" />
      </div>

      {/* Mockup de cards blurred */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Retirado no mês", icon: <HandCoins className="size-4" /> },
          { label: "Meta de retirada", hint: "Defina abaixo" },
          { label: "Disponível para retirar", hint: "Lucro operacional" },
        ].map((c) => (
          <div
            key={c.label}
            className="relative rounded-2xl border border-border/60 bg-card p-5 shadow-2xs overflow-hidden"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{c.label}</p>
            <div className="select-none blur-sm">
              <p className="text-2xl font-black text-foreground numeric">R$ 1.500,00</p>
              {c.hint && <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                Store
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const monthTxs = txs.filter((t) => t.occurred_on.slice(0, 7) === month.slice(0, 7));
  const monthWithdrawals = withdrawals.filter((w) => w.month.slice(0, 7) === month.slice(0, 7));
  const withdrawn = monthWithdrawals.reduce((acc, w) => acc + (Number(w.amount) || 0), 0);
  const goal = Number(profile?.prolabore_target ?? 0);
  const progress = goal > 0 ? Math.min((withdrawn / goal) * 100, 100) : 0;
  // Segregação contábil homogênea com relatorio.tsx e painel.tsx:
  // Excluímos estornos (dedução de receita), pró-labore (retirada) e compra de estoque (investimento em ativo)
  const opexExclusions = new Set([
    ...REFUND_CATEGORIES,
    ...PROLABORE_CATEGORIES,
    ...STOCK_PURCHASE_CATEGORIES,
  ]);
  const grossRevenue    = sumBy(monthTxs, "entrada");
  const monthRefunds    = sumByCategories(monthTxs, "saida", REFUND_CATEGORIES);
  const netRevenue      = grossRevenue - monthRefunds;
  const opex            = sumByExcluding(monthTxs, "saida", opexExclusions);
  const operatingProfit = netRevenue - opex;
  const stockPurchases  = sumByCategories(monthTxs, "saida", STOCK_PURCHASE_CATEGORIES);
  const available       = Math.max(operatingProfit - stockPurchases - withdrawn, 0);

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
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finanças da Loja"
        title="Pró-labore da Lojista"
        description="O dinheiro da loja não é o seu salário. Defina sua retirada e respeite o limite."
      />

      <FinanceiroTabs />

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
          hint={
            operatingProfit >= 0
              ? `Lucro operacional: ${brl(operatingProfit)}`
              : `Prejuízo operacional: ${brl(Math.abs(operatingProfit))}`
          }
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
                  <span className="numeric text-sm font-semibold">{brl(Number(w.amount) || 0)}</span>
                  <ConfirmDelete
                    onConfirm={() => remove.mutate(w.id)}
                    description="A retirada e o lançamento no caixa serão removidos permanentemente."
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
