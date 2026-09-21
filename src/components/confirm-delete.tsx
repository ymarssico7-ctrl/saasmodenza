import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConfirmDelete({
  trigger,
  icon,
  title = "Excluir registro?",
  description = "Essa ação não pode ser desfeita.",
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  onConfirm,
}: {
  trigger: ReactNode;
  icon?: ReactNode;
  title?: string;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const isStringDesc = typeof description === "string";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl border border-border/80 bg-card p-6 shadow-2xl sm:max-w-[460px]">
        <AlertDialogHeader className="space-y-2">
          {icon && <div className="mb-1">{icon}</div>}
          <AlertDialogTitle className="text-lg font-bold tracking-tight text-foreground">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild={!isStringDesc} className="text-xs text-muted-foreground leading-relaxed">
            {isStringDesc ? description : <div>{description}</div>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-3 gap-2 sm:gap-2">
          <AlertDialogCancel className="rounded-xl border border-border/70 bg-surface-muted/60 hover:bg-surface-muted text-foreground font-semibold px-4 h-10 transition-colors">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold px-4 h-10 gap-2 shadow-xs transition-all cursor-pointer"
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
