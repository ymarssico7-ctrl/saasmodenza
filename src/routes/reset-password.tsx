import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Modé" },
      { name: "description", content: "Defina uma nova senha para sua conta Modé." },
      { property: "og:title", content: "Redefinir senha — Modé" },
      { property: "og:description", content: "Defina uma nova senha para sua conta Modé." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada");
    navigate({ to: "/painel" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="panel w-full max-w-[400px] p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold">Nova senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha uma senha com pelo menos 6 caracteres.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Senha</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-full text-sm font-semibold"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Salvar nova senha
          </Button>
        </form>
      </div>
    </div>
  );
}
