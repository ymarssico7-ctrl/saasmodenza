import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Configurar sua loja — Modé" },
      { name: "description", content: "Configure os dados da sua loja para começar na Modé." },
      { property: "og:title", content: "Configurar sua loja — Modé" },
      { property: "og:description", content: "Três passos rápidos para começar." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const [step, setStep] = useState(0);
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const steps = [
    {
      title: "Sua loja",
      description: "Como sua loja se chama e onde ela fica.",
      fields: (
        <>
          <FieldRow label="Nome da loja">
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Modé Boutique" />
          </FieldRow>
          <FieldRow label="Cidade">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo, SP" />
          </FieldRow>
        </>
      ),
    },
    {
      title: "Você",
      description: "Para personalizarmos seu painel.",
      fields: (
        <>
          <FieldRow label="Seu nome">
            <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Ana Souza" />
          </FieldRow>
          <FieldRow label="WhatsApp (opcional)">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
          </FieldRow>
        </>
      ),
    },
    {
      title: "Pró-labore",
      description: "Quanto você quer retirar por mês da loja?",
      fields: (
        <FieldRow label="Retirada mensal desejada (R$)">
          <Input
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="3.500,00"
          />
        </FieldRow>
      ),
    },
  ];

  async function finish() {
    setLoading(true);
    try {
      const uid = await currentUserId();
      const { error } = await supabase
        .from("profiles")
        .update({
          store_name: storeName.trim() || "Minha loja",
          owner_name: ownerName.trim() || "Lojista",
          city: city.trim() || null,
          phone: phone.trim() || null,
          prolabore_target: toNumber(target),
          onboarding_done: true,
        })
        .eq("id", uid);
      if (error) throw new Error(error.message);
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Tudo pronto! Bem-vinda à Modé.");
      navigate({ to: "/painel" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const current = steps[step]!;

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-14">
      <div className="w-full max-w-[460px]">
        <Logo />
        <div className="mt-8 flex gap-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="panel mt-8 p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Passo {step + 1} de {steps.length}
          </p>
          <h1 className="mt-3 text-2xl font-semibold">{current.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{current.description}</p>
          <div className="mt-7 space-y-4">{current.fields}</div>

          <div className="mt-9 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              className="rounded-full"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              Voltar
            </Button>
            {step < steps.length - 1 ? (
              <Button className="h-11 rounded-full px-6 font-semibold" onClick={() => setStep((s) => s + 1)}>
                Continuar <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                className="h-11 rounded-full px-6 font-semibold"
                disabled={loading}
                onClick={() => void finish()}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Concluir
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
