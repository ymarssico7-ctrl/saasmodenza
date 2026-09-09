import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, isAuthenticated, updateDemoProfile } from "@/lib/db";
import { toNumber, slugify } from "@/lib/format";
import { loadTheme, saveTheme } from "@/lib/theme-engine/defaults";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Configurar sua loja — Modaly" },
      { name: "description", content: "Configure os dados da sua loja para começar no Modaly." },
      { property: "og:title", content: "Configurar sua loja — Modaly" },
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
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ex: Bella Mulher, Ateliê..."
            />
          </FieldRow>
          <FieldRow label="Cidade">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="São Paulo, SP"
            />
          </FieldRow>
        </>
      ),
    },
    {
      title: "Você & Contato",
      description: "Para personalizarmos seu painel e conectar sua vitrine.",
      fields: (
        <>
          <FieldRow label="Seu nome">
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ex: Ana Souza"
            />
          </FieldRow>
          <FieldRow
            label="WhatsApp da loja"
            hint="Essencial para pedidos"
          >
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 98765-4321"
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Seus clientes enviarão os pedidos da vitrine online diretamente para este WhatsApp.
            </p>
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
      const isAuth = await isAuthenticated();
      const uid = await currentUserId();

      // ── Gera slug único (excluindo a própria loja se já inicializada) ──
      const base = slugify(storeName.trim() || "boutique");
      let uniqueSlug = base;
      let attempt = 0;

      if (isAuth) {
        while (true) {
          const { data: existing } = await supabase
            .from("stores")
            .select("id")
            .eq("slug", uniqueSlug)
            .neq("owner_id", uid)
            .maybeSingle();
          if (!existing) break; // slug disponível
          attempt++;
          uniqueSlug = `${base}-${attempt}`;
        }
      }

      // ── Trial de 7 dias ────────────────────────────────────────────
      const now = new Date();
      const trialExpires = new Date(now);
      trialExpires.setDate(trialExpires.getDate() + 7);

      const profilePatch = {
        store_name: storeName.trim() || "Minha loja",
        owner_name: ownerName.trim() || "Lojista",
        city: city.trim() || null,
        phone: phone.trim() || null,
        prolabore_target: toNumber(target),
        onboarding_done: true,
      };

      const storePatch = {
        name: storeName.trim() || "Minha loja",
        city: city.trim() || null,
        phone: phone.trim() || null,
        prolabore_target: toNumber(target),
        slug: uniqueSlug,
        store_trial_offered_at: now.toISOString(),
        store_trial_accepted: true,
        store_trial_expires_at: trialExpires.toISOString(),
      };

      if (!isAuth) {
        // Modo demo / dev local sem autenticação Supabase
        updateDemoProfile({
          ...profilePatch,
          plan: "gestao_anual",
        });
        try {
          const demoStore = {
            id: "demo-store",
            owner_id: uid,
            ...storePatch,
            plan: "gestao_anual",
            onboarding_done: true,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          };
          localStorage.setItem("demo_active_store", JSON.stringify(demoStore));
        } catch {
          // ignora erro de localStorage
        }
      } else {
        // 1. Atualizar ou Criar perfil (profiles) garantindo persistência
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", uid)
          .maybeSingle();

        if (existingProfile) {
          const { error } = await supabase
            .from("profiles")
            .update(profilePatch)
            .eq("id", uid);
          if (error) throw new Error(`Erro ao salvar perfil: ${error.message}`);
        } else {
          const { error } = await supabase
            .from("profiles")
            .insert({ ...profilePatch, id: uid });
          if (error) throw new Error(`Erro ao criar perfil: ${error.message}`);
        }

        // 2. Atualizar ou Criar loja (stores - Upsert seguro)
        const { data: existingStore } = await supabase
          .from("stores")
          .select("id")
          .eq("owner_id", uid)
          .maybeSingle();

        if (existingStore) {
          const { error } = await supabase
            .from("stores")
            .update(storePatch)
            .eq("owner_id", uid);
          if (error) throw new Error(`Erro ao atualizar loja: ${error.message}`);
        } else {
          const { error } = await supabase
            .from("stores")
            .insert({ ...storePatch, owner_id: uid });
          if (error) throw new Error(`Erro ao criar loja: ${error.message}`);
        }
      }

      // Invalida ambas as queries para sincronizar sidebar, header e loja
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["active_store"] }),
      ]);

      // Escreve o nome da loja no Theme Engine para que os templates
      // exibam imediatamente o nome real — sem precisar editar manualmente.
      const savedTheme = loadTheme();
      const realName = storeName.trim() || "Minha loja";
      saveTheme({
        ...savedTheme,
        settings: {
          ...savedTheme.settings,
          storeName: realName,
          storeWhatsApp: phone.trim() || savedTheme.settings.storeWhatsApp || "",
        },
      });

      toast.success(
        `Tudo pronto! Sua vitrine já está em modaly.app/vitrine/${uniqueSlug} 🎉`,
        { duration: 6000 },
      );
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
              <Button
                className="h-11 rounded-full px-6 font-semibold"
                onClick={() => setStep((s) => s + 1)}
              >
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

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
        {hint && (
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
