import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar na Modé — Gestão financeira para lojas de moda" },
      {
        name: "description",
        content:
          "Acesse sua conta Modé para controlar caixa, precificação, pró-labore e fiado da sua loja de moda.",
      },
      { property: "og:title", content: "Entrar na Modé" },
      {
        property: "og:description",
        content: "Gestão financeira premium para lojistas de moda.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    navigate({ to: "/painel" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { owner_name: name } },
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível criar a conta", { description: error.message });
      return;
    }
    if (!data.session) {
      setSent(true);
      return;
    }
    navigate({ to: "/onboarding" });
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/painel`,
      },
    });
    if (error) {
      toast.error("Falha no login com Google");
      return;
    }
  }

  async function forgot() {
    if (!email) {
      toast.error("Informe seu e-mail primeiro");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Enviamos um link de redefinição para seu e-mail");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute -right-24 -top-24 size-[420px] rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-[380px] rounded-full bg-primary-foreground/10 blur-3xl" />
        <Link to="/" className="relative">
          <span className="font-display text-lg font-semibold tracking-tight">Modé</span>
        </Link>
        <div className="relative max-w-md">
          <h2 className="font-display text-[2.6rem] font-semibold leading-[1.05]">
            O financeiro da sua loja, finalmente sob controle.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-primary-foreground/70">
            Precificação com margem real, caixa diário, pró-labore e fiado — em um sistema pensado
            para lojistas de moda.
          </p>
        </div>
        <p className="relative text-xs text-primary-foreground/50">
          Seus dados são privados e protegidos.
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-[400px]">
          <Link to="/" className="lg:hidden">
            <Logo />
          </Link>

          {sent ? (
            <div className="panel mt-10 p-8 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent">
                <Mail className="size-5 text-primary" />
              </span>
              <h1 className="mt-5 text-xl font-semibold">Confirme seu e-mail</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para
                ativar sua conta Modé.
              </p>
            </div>
          ) : (
            <>
              <h1 className="mt-10 text-[1.9rem] font-semibold leading-tight lg:mt-0">
                Bem-vinda à Modé
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Entre ou crie sua conta para começar.
              </p>

              <Button
                variant="outline"
                className="mt-8 h-12 w-full rounded-full text-sm font-semibold"
                onClick={() => void google()}
              >
                <GoogleIcon /> Continuar com Google
              </Button>

              <div className="my-7 flex items-center gap-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
              </div>

              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2 rounded-full bg-surface-muted p-1">
                  <TabsTrigger value="signin" className="rounded-full">
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-full">
                    Criar conta
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={signIn} className="mt-6 space-y-4">
                    <Field label="E-mail">
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@sualoja.com"
                      />
                    </Field>
                    <Field label="Senha">
                      <Input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() => void forgot()}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                    <SubmitButton loading={loading}>Entrar</SubmitButton>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={signUp} className="mt-6 space-y-4">
                    <Field label="Seu nome">
                      <Input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ana Souza"
                      />
                    </Field>
                    <Field label="E-mail">
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@sualoja.com"
                      />
                    </Field>
                    <Field label="Senha">
                      <Input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </Field>
                    <SubmitButton loading={loading}>Criar minha conta</SubmitButton>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={loading} className="h-12 w-full rounded-full text-sm font-semibold">
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
      {!loading ? <ArrowRight className="size-4" /> : null}
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1a7 7 0 0 1-6.6-4.8H1.4v3.1A11.9 11.9 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.4a7.1 7.1 0 0 1 0-4.8V6.5H1.4a11.9 11.9 0 0 0 0 11l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A11.6 11.6 0 0 0 12 0 11.9 11.9 0 0 0 1.4 6.5l4 3.1A7 7 0 0 1 12 4.8Z"
      />
    </svg>
  );
}
