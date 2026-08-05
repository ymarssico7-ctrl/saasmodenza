import { cn } from "@/lib/utils";
import type { StatusPedido } from "@/data/loja";
import { statusPedidoLabel } from "@/data/loja";

const estilos: Record<StatusPedido, string> = {
  novo: "bg-info-soft text-info",
  confirmado: "bg-primary-soft text-accent-foreground",
  em_separacao: "bg-warning-soft text-warning",
  enviado: "bg-warning-soft text-warning",
  entregue: "bg-success-soft text-success",
  cancelado: "bg-danger-soft text-danger",
};

export function StatusBadge({ status, className }: { status: StatusPedido; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        estilos[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusPedidoLabel[status]}
    </span>
  );
}

export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "bg-secondary text-secondary-foreground",
    primary: "bg-primary-soft text-accent-foreground",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PlanoBadge({
  plan,
  className,
}: {
  plan?: string;
  className?: string;
}) {
  const labels: Record<string, string> = {
    lojista: "Lojista",
    digital: "Digital",
    crescimento: "Crescimento",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-foreground",
        className,
      )}
    >
      {labels[plan ?? "lojista"] ?? "Lojista"}
    </span>
  );
}
