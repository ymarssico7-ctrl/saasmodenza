import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Sparkles, Store, Target, Trash2, TrendingUp, Zap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FinanceiroTabs } from "@/components/financeiro-tabs";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { goalsQuery, profileQuery, transactionsQuery } from "@/lib/db";
import { brl, monthLabel, monthStart, pct, toNumber } from "@/lib/format";
import { REFUND_CATEGORIES, projectMonth, sumBy, sumByCategories, type Transaction } from "@/lib/finance";
import { useStore } from "@/lib/store-context";
import { upsertGoal, deleteGoal } from "@/lib/mutations";
import { cn } from "@/lib/utils";
import { useAccess } from "@/lib/useAccess";

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
  component: MetasRouteWrapper,
});

// ── Wrapper com Proteção de Plano (Store only) ────────────────────────────────
function MetasRouteWrapper() {
  const { store } = useStore();
  const { data: profile } = useQuery(profileQuery());
  const access = useAccess(profile, store);

  if (!access.limits.hasFinancialDashboard) {
    return <MetasGatePresentation />;
  }
  return <Metas />;
}

// ── Gate de Apresentação de Metas para usuários Free/Pro (Padrão Benchmark) ──
function MetasGatePresentation() {
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Finanças da Loja"
        title="Metas de Vendas"
        description="Uma meta clara muda o ritmo da sua loja. Acompanhe o progresso dia a dia."
      />
      <FinanceiroTabs />

      {/* Hero Gate com Mockup Integrado */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background p-6 sm:p-10 shadow-sm">
        <div className="max-w-2xl space-y-4">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 uppercase tracking-wider">
            ✦ Disponível no Vestui Store
          </Badge>

          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight leading-tight">
            Defina Metas e Acompanhe o Ritmo de Vendas da Sua Loja
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Uma meta clara muda o ritmo da sua equipe e do seu caixa. Acompanhe o faturamento diário,
            projeção de fechamento do mês e alertas inteligentes de velocidade de vendas.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              asChild
              size="lg"
              className="gradient-primary h-12 rounded-2xl px-6 text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 cursor-pointer gap-2"
            >
              <Link to="/configuracoes" search={{ tab: "plano" }}>
                <Sparkles className="size-4" />
                Desbloquear Metas de Vendas →
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-2xl px-6 text-sm font-semibold border-border/80 hover:bg-secondary/60 cursor-pointer"
            >
              <Link to="/configuracoes" search={{ tab: "plano" }}>
                Comparar Todos os Planos
              </Link>
            </Button>
          </div>

          <p className="text-xs text-foreground/70 font-semibold flex items-center gap-1.5 pt-1">
            <Check className="size-3.5 text-emerald-500" />
            <span className="font-semibold text-foreground/80">Sem fidelidade • Liberação imediata • Apenas R$ 0,66 por dia</span>
          </p>
        </div>

        {/* ── Mockup Ilustrativo da Tela de Metas (Padrão Shopify/Linear com Janela macOS) ── */}
        <div className="mt-8 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xs p-4 sm:p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-rose-500/80" />
              <div className="size-3 rounded-full bg-amber-500/80" />
              <div className="size-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-muted-foreground ml-2">Metas de Vendas · Acompanhamento de Ritmo</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
              ● Meta Ativa
            </Badge>
          </div>

          <div className="space-y-4">
            {/* Barra de Progresso Ilustrada */}
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Progresso da Meta de Novembro</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 numeric">
                  R$ 22.450,00 / R$ 35.000,00 (64%)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full w-[64%]" />
              </div>
            </div>

            {/* 3 KPIs de Ritmo e Previsão */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/40 bg-secondary/30 p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Ritmo Diário Necessário
                </span>
                <p className="text-lg font-bold text-foreground numeric">R$ 1.568,75 / dia</p>
                <p className="text-[10px] text-muted-foreground">Para 8 dias úteis restantes</p>
              </div>

              <div className="rounded-xl border border-border/40 bg-secondary/30 p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Projeção de Fechamento
                </span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 numeric">R$ 38.200,00</p>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-medium">▲ +9,1% acima da meta</p>
              </div>

              <div className="rounded-xl border border-border/40 bg-secondary/30 p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Divisão de Canais
                </span>
                <p className="text-lg font-bold text-foreground numeric">72% balcão · 28% online</p>
                <p className="text-[10px] text-muted-foreground">Conciliação multimétodo</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de 4 Benefícios de Metas de Vendas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-5 space-y-2">
          <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Zap className="size-4.5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Ritmo Diário Automático</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Calcula exatamente quanto a sua loja precisa faturar por dia útil para atingir o objetivo planejado.
          </p>
        </div>

        <div className="panel p-5 space-y-2">
          <div className="size-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <TrendingUp className="size-4.5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Projeção Inteligente</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Inteligência preditiva que calcula onde você vai chegar com base na velocidade de vendas atual.
          </p>
        </div>

        <div className="panel p-5 space-y-2">
          <div className="size-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
            <Store className="size-4.5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Balcão vs Vitrine</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Separe e monitore a contribuição de cada canal físico e online para o faturamento da marca.
          </p>
        </div>

        <div className="panel p-5 space-y-2">
          <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Target className="size-4.5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Alertas de Aceleração</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Identifique dias abaixo do ritmo a tempo de lançar campanhas e queimar peças paradas.
          </p>
        </div>
      </div>
    </div>
  );
}

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
