import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { brl, brlCompact } from "@/lib/format";
import type { Transaction } from "@/lib/finance";

const toNum = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

export type PeriodoGrafico = "7d" | "30d" | "mes" | "custom";

export interface PainelGraficoVendasProps {
  transactions: Transaction[];
  orders?: Array<{
    id: string;
    status?: string;
    total?: number;
    created_at?: string;
    criadoEm?: string;
    payment_status?: string;
    payment_method?: string;
  }> | undefined;
  ocultarSaldos: boolean;
  mascaraSaldo: (valor: number) => string;
}

interface DiaVendaData {
  dia: string;
  dataFull: string;
  diaSemana: string;
  vendas: number;
  qtdVendas: number;
  ticketMedio: number;
}

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const MESES_ABREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function PainelGraficoVendas({
  transactions,
  orders = [],
  ocultarSaldos,
  mascaraSaldo,
}: PainelGraficoVendasProps) {
  const [periodo, setPeriodo] = useState<PeriodoGrafico>("7d");
  const [dataInicioCustom, setDataInicioCustom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [dataFimCustom, setDataFimCustom] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // ── Geração do Vetor de Datas do Período ───────────────────────────────────
  const chartData = useMemo<DiaVendaData[]>(() => {
    const dates: string[] = [];
    const hoje = new Date();

    if (periodo === "7d") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(hoje);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
    } else if (periodo === "30d") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(hoje);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
    } else if (periodo === "mes") {
      const ano = hoje.getFullYear();
      const mes = hoje.getMonth();
      const diaHoje = hoje.getDate();
      for (let dia = 1; dia <= diaHoje; dia++) {
        const d = new Date(ano, mes, dia);
        dates.push(d.toISOString().slice(0, 10));
      }
    } else if (periodo === "custom") {
      const inicio = new Date(dataInicioCustom || hoje.toISOString().slice(0, 10));
      const fim = new Date(dataFimCustom || hoje.toISOString().slice(0, 10));
      if (inicio <= fim) {
        const cur = new Date(inicio);
        let count = 0;
        while (cur <= fim && count < 90) {
          dates.push(cur.toISOString().slice(0, 10));
          cur.setDate(cur.getDate() + 1);
          count++;
        }
      } else {
        dates.push(hoje.toISOString().slice(0, 10));
      }
    }

    // ── Agrupamento de Vendas por Dia ───────────────────────────────────────
    const entradas = transactions.filter((t) => t.kind === "entrada");

    return dates.map((dateStr) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      const dataObj = new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1);
      const diaSemana = DIAS_SEMANA[dataObj.getDay()] ?? "";
      const labelDia = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;

      const txsDoDia = entradas.filter((t) => t.occurred_on.slice(0, 10) === dateStr);
      const valorTxs = txsDoDia.reduce((acc, t) => acc + toNum(t.amount), 0);
      const qtdTxs = txsDoDia.length;

      // Pedidos online do dia
      const onlineOrdersDoDia = orders.filter((o) => {
        const dt = (o.created_at || o.criadoEm || "").slice(0, 10);
        if (dt !== dateStr) return false;
        const isPago =
          o.payment_status === "pago" ||
          o.status === "pago" ||
          o.status === "entregue" ||
          o.status === "enviado" ||
          o.status === "preparando";
        return isPago;
      });

      const temOnlineEmTxs = txsDoDia.some((t) => t.category === "venda_online");
      const valorOnlineExtra = temOnlineEmTxs
        ? 0
        : onlineOrdersDoDia.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
      const qtdOnlineExtra = temOnlineEmTxs ? 0 : onlineOrdersDoDia.length;

      const totalDia = valorTxs + valorOnlineExtra;
      const totalQtd = qtdTxs + qtdOnlineExtra;
      const ticketMedio = totalQtd > 0 ? totalDia / totalQtd : 0;

      return {
        dia: labelDia,
        dataFull: `${day} de ${MESES_ABREV[(month ?? 1) - 1]}`,
        diaSemana,
        vendas: totalDia,
        qtdVendas: totalQtd,
        ticketMedio,
      };
    });
  }, [periodo, dataInicioCustom, dataFimCustom, transactions, orders]);

  // ── Métricas Consolidadas do Período ───────────────────────────────────────
  const totalPeriodo = useMemo(
    () => chartData.reduce((acc, d) => acc + d.vendas, 0),
    [chartData],
  );

  const totalVendasCount = useMemo(
    () => chartData.reduce((acc, d) => acc + d.qtdVendas, 0),
    [chartData],
  );

  const ticketMedioPeriodo = useMemo(() => {
    return totalVendasCount > 0 ? totalPeriodo / totalVendasCount : 0;
  }, [totalPeriodo, totalVendasCount]);

  const maxVenda = useMemo(
    () => Math.max(...chartData.map((d) => d.vendas), 0),
    [chartData],
  );

  return (
    <section className="panel p-5 sm:p-6 transition-all duration-200 hover:shadow-lift">
      {/* ── Topo do Gráfico: Título, Resumo Executivo & Seletor de Período ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-lg bg-secondary text-foreground/80 shadow-2xs">
              <TrendingUp className="size-3.5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Ritmo de vendas
            </h2>
          </div>
          <div className="mt-1 flex items-baseline gap-2 pl-8">
            <span className="numeric text-lg font-bold tracking-tight text-foreground">
              {ocultarSaldos ? "R$ ••••••" : mascaraSaldo(totalPeriodo)}
            </span>
            <span className="text-xs text-muted-foreground">
              · {totalVendasCount} {totalVendasCount === 1 ? "venda" : "vendas"}
              {ticketMedioPeriodo > 0 && !ocultarSaldos
                ? ` (Médio: ${brlCompact(ticketMedioPeriodo)})`
                : ""}
            </span>
          </div>
        </div>

        {/* Seletores de Período (Pills Compactas) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-full border border-border/80 bg-secondary/60 p-0.5 text-[11px] shadow-2xs">
            <button
              type="button"
              onClick={() => setPeriodo("7d")}
              className={cn(
                "rounded-full px-2.5 py-0.5 font-medium transition-all cursor-pointer",
                periodo === "7d"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              7 dias
            </button>
            <button
              type="button"
              onClick={() => setPeriodo("30d")}
              className={cn(
                "rounded-full px-2.5 py-0.5 font-medium transition-all cursor-pointer",
                periodo === "30d"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              30 dias
            </button>
            <button
              type="button"
              onClick={() => setPeriodo("mes")}
              className={cn(
                "rounded-full px-2.5 py-0.5 font-medium transition-all cursor-pointer",
                periodo === "mes"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setPeriodo("custom")}
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 font-medium transition-all cursor-pointer",
                periodo === "custom"
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Calendar className="size-2.5" />
              <span>Custom</span>
            </button>
          </div>

          {/* Seletor de Datas Personalizado (Abre se custom estiver ativo) */}
          {periodo === "custom" && (
            <div className="flex items-center gap-1 text-[11px] animate-in fade-in slide-in-from-top-1 duration-200">
              <input
                type="date"
                value={dataInicioCustom}
                onChange={(e) => setDataInicioCustom(e.target.value)}
                className="h-6 rounded-md border border-border/80 bg-card px-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              />
              <span className="text-muted-foreground text-[10px]">a</span>
              <input
                type="date"
                value={dataFimCustom}
                onChange={(e) => setDataFimCustom(e.target.value)}
                className="h-6 rounded-md border border-border/80 bg-card px-1.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── O Gráfico Interativo com Recharts (Canvas Nobre de 230px) ── */}
      <div className="mt-4 h-[230px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ left: -12, right: 12, top: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillVendasPainel" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              opacity={0.5}
            />

            <XAxis
              dataKey="dia"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              dy={6}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              domain={maxVenda > 0 ? [0, "auto"] : [0, 100]}
              ticks={maxVenda > 0 ? undefined : [0, 50, 100]}
              allowDecimals={false}
              tickFormatter={(v: number) =>
                ocultarSaldos ? "••••" : brlCompact(v)
              }
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0]?.payload as DiaVendaData | undefined;
                if (!data) return null;

                return (
                  <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-3 shadow-lifted text-xs space-y-1 min-w-[160px]">
                    <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between gap-2 border-b border-border/50 pb-1.5">
                      <span>{data.dataFull}</span>
                      <span className="text-[10px] text-primary font-semibold">
                        {data.diaSemana}
                      </span>
                    </div>

                    <div className="pt-1">
                      <span className="text-[11px] text-muted-foreground block">
                        Faturamento do dia:
                      </span>
                      <span className="numeric text-base font-bold text-foreground block">
                        {ocultarSaldos ? "R$ ••••••" : brl(data.vendas)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>
                        {data.qtdVendas}{" "}
                        {data.qtdVendas === 1 ? "venda" : "vendas"}
                      </span>
                      {data.ticketMedio > 0 && (
                        <span>
                          Médio:{" "}
                          <strong className="text-foreground font-medium">
                            {ocultarSaldos ? "R$ ••••" : brl(data.ticketMedio)}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="vendas"
              stroke="var(--color-primary)"
              strokeWidth={3}
              fill="url(#fillVendasPainel)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "var(--color-primary)",
                stroke: "var(--color-card)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Nota sutil caso ainda não haja vendas no período */}
      {totalPeriodo === 0 && (
        <div className="mt-2 text-center">
          <p className="text-[11px] text-muted-foreground/70">
            Novas vendas confirmadas entrarão na curva automaticamente
          </p>
        </div>
      )}
    </section>
  );
}
