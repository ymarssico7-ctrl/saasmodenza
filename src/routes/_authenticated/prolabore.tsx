import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, Check, Coins, HandCoins, Plus, ShieldCheck, Sparkles, Trash2, Wallet } from "lucide-react";
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

// ── Gate de Apresentação do Pró-labore para usuários Free/Pro (Padrão Benchmark) ──
function ProlaboreGatePresentation() {
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Finanças da Loja"
        title="Pró-labore da Lojista"
        description="O dinheiro da loja não é o seu salário. Defina sua retirada e respeite o limite."
      />
      <FinanceiroTabs />

      {/* Hero Gate com Mockup Integrado */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background p-6 sm:p-10 shadow-sm">
        <div className="max-w-2xl space-y-4">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1 uppercase tracking-wider">
            ✦ Disponível no Vestui Store
          </Badge>

          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight leading-tight">
            O Dinheiro da Loja Não É o Seu Salário Pessoal
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Defina sua retirada mensal planejada, acompanhe o teto de retiradas e separe de uma vez por todas
            o caixa da boutique das suas despesas pessoais com controle automático no fluxo financeiro.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              asChild
              size="lg"
              className="gradient-primary h-12 rounded-2xl px-6 text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 cursor-pointer gap-2"
            >
              <Link to="/configuracoes" search={{ tab: "plano" }}>
                <Sparkles className="size-4" />
                Desbloquear Pró-Labore da Lojista →
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

        {/* ── Mockup Ilustrativo da Tela de Pró-labore (Padrão Shopify/Linear com Janela macOS) ── */}
        <div className="mt-8 rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xs p-4 sm:p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-rose-500/80" />
              <div className="size-3 rounded-full bg-amber-500/80" />
              <div className="size-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-muted-foreground ml-2">Pró-Labore da Dona · Conciliação Pessoal vs Empresa</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
              ● Retirada Sob Controle
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-12">
            {/* Lado esquerdo: 3 KPIs de Retirada */}
            <div className="md:col-span-7 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border/40 bg-secondary/30 p-2.5 space-y-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground">Retirado no Mês</span>
                  <p className="text-sm font-bold text-foreground numeric">R$ 2.800,00</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-secondary/30 p-2.5 space-y-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground">Meta Mensal</span>
                  <p className="text-sm font-bold text-foreground numeric">R$ 4.500,00</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 space-y-0.5">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Disponível</span>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 numeric">R$ 1.700,00</p>
                </div>
              </div>

              {/* Barra de Progresso do Pró-labore */}
              <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Progresso do teto estipulado:</span>
                  <strong className="text-foreground numeric">62% da meta pessoal</strong>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary rounded-full w-[62%]" />
                </div>
              </div>
            </div>

            {/* Lado direito: Mini Extrato de Retiradas */}
            <div className="md:col-span-5 rounded-xl border border-border/60 bg-background/50 p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Últimas Retiradas Lançadas no Caixa
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-2 border border-border/30">
                  <div>
                    <p className="font-semibold text-foreground">Retirada Quinzenal</p>
                    <p className="text-[10px] text-muted-foreground">15/11 · Caixa Principal</p>
                  </div>
                  <span className="font-bold text-foreground numeric">R$ 1.400,00</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-2 border border-border/30">
                  <div>
                    <p className="font-semibold text-foreground">Retirada Inicial</p>
                    <p className="text-[10px] text-muted-foreground">01/11 · Caixa Principal</p>
                  </div>
                  <span className="font-bold text-foreground numeric">R$ 1.400,00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de 4 Benefícios do Pró-labore */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-5 space-y-2">
          <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="size-4.5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Blindagem de Caixa</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Evita que retiradas desordenadas gerem furos no caixa para pagar fornecedores ou aluguel.
          </p>
        </div>

        <div className="panel p-5 space-y-2">
          <div className="size-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Coins className="size-4.5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Teto Mensal Seguro</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Monitore visualmente quanto você ainda pode retirar sem comprometer o capital de giro da loja.
          </p>
        </div>

        <div className="panel p-5 space-y-2">
          <div className="size-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
            <Wallet className="size-4.5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Débito no Caixa Físico</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ao registrar a retirada, o sistema lança automaticamente a saída no caixa da loja na hora.
          </p>
        </div>

        <div className="panel p-5 space-y-2">
          <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <BarChart3 className="size-4.5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">DRE Integrado</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Contabilize a remuneração da dona separadamente do lucro líquido e das despesas operacionais.
          </p>
        </div>
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
