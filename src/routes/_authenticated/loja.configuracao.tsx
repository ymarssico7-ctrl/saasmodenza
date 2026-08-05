import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Instagram, MessageCircle, Upload } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard } from "@/components/loja/section-card";
import { PlanoBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { loja } from "@/data/loja";
import { PlanGuard } from "@/components/plan-guard";

export const Route = createFileRoute("/_authenticated/loja/configuracao")({
  head: () => ({
    meta: [
      { title: "Configuração da loja — Modaly" },
      {
        name: "description",
        content: "Nome, logo, capa, cor principal, contatos e política de troca da vitrine.",
      },
    ],
  }),
  component: ConfiguracaoPage,
});

function ConfiguracaoPage() {
  const [nome, setNome] = useState(loja.nome);
  const [descricao, setDescricao] = useState(loja.descricao);
  const [cor, setCor] = useState(loja.corPrincipal);
  const [mostrarEstoque, setMostrarEstoque] = useState(loja.mostrarEstoque);

  return (
    <PlanGuard requires="digital" featureName="Configuração da Vitrine" featureDescription="Personalize a identidade da sua loja online. Disponível no Plano Digital.">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Identidade"
          title="Configuração da loja"
          description="É isso que suas clientes vêm ao abrir o link da vitrine."
          actions={
            <Button
              className="gradient-primary h-10 rounded-full shadow-glow"
              onClick={() => toast.success("Configurações da loja salvas")}
            >
              Salvar alterações
            </Button>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <SectionCard title="Marca" description="Nome, logo e capa da vitrine.">
              <div className="space-y-4">
                <Campo label="Nome da loja">
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 rounded-xl" />
                </Campo>
                <Campo label="Descrição curta (aparece no topo da vitrine)">
                  <Textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={3}
                    className="rounded-xl"
                  />
                </Campo>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => toast.success("Logo enviada")}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-input bg-secondary/40 px-4 py-6 text-xs text-muted-foreground transition-colors duration-200 hover:border-primary hover:text-foreground"
                  >
                    <Upload className="h-5 w-5" /> Enviar logo (PNG ou JPG)
                  </button>
                  <button
                    onClick={() => toast.success("Banner enviado")}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-input bg-secondary/40 px-4 py-6 text-xs text-muted-foreground transition-colors duration-200 hover:border-primary hover:text-foreground"
                  >
                    <ImagePlus className="h-5 w-5" /> Enviar foto de capa
                  </button>
                </div>

                <Campo label="Cor principal da loja">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={cor}
                      onChange={(e) => setCor(e.target.value)}
                      aria-label="Cor principal da loja"
                      className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-card p-1"
                    />
                    <Input value={cor} onChange={(e) => setCor(e.target.value)} className="h-11 max-w-[140px] rounded-xl" />
                  </div>
                </Campo>
              </div>
            </SectionCard>

            <SectionCard title="Endereço da loja" description="Subdomínio gerado automaticamente.">
              <div className="space-y-4">
                <Campo label="Link da loja">
                  <Input defaultValue={loja.subdominio} className="h-11 rounded-xl" />
                </Campo>
                <Campo
                  label="Domínio próprio"
                  extra={<PlanoBadge plan="crescimento" />}
                >
                  <Input placeholder="minhaloja.com.br" className="h-11 rounded-xl" />
                </Campo>
              </div>
            </SectionCard>

            <SectionCard title="Contato e confiança" description="Aparece na vitrine para a cliente.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="WhatsApp">
                  <Input defaultValue={loja.whatsapp} className="h-11 rounded-xl" />
                </Campo>
                <Campo label="Instagram">
                  <Input defaultValue={loja.instagram} className="h-11 rounded-xl" />
                </Campo>
                <Campo label="Cidade">
                  <Input defaultValue={loja.cidade} className="h-11 rounded-xl" />
                </Campo>
                <Campo label="Estado">
                  <Input defaultValue={loja.estado} className="h-11 rounded-xl" />
                </Campo>
              </div>
            </SectionCard>

            <SectionCard title="Textos da loja" description="Boas-vindas e política de troca.">
              <div className="space-y-4">
                <Campo label="Mensagem de boas-vindas">
                  <Textarea defaultValue={loja.boasVindas} rows={2} className="rounded-xl" />
                </Campo>
                <Campo label="Política de troca e devolução">
                  <Textarea defaultValue={loja.politicaTroca} rows={4} className="rounded-xl" />
                </Campo>
                <div className="flex items-center justify-between rounded-2xl border border-border p-4">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-medium">Mostrar quantidade em estoque</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Quando desligado, a vitrine mostra apenas “disponível”.
                    </p>
                  </div>
                  <Switch checked={mostrarEstoque} onCheckedChange={setMostrarEstoque} />
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionCard title="Prévia da vitrine" description="Atualiza conforme você edita." bodyClassName="p-4">
              <div className="overflow-hidden rounded-2xl border border-border">
                <div
                  className="h-24 w-full"
                  style={{ background: `linear-gradient(135deg, ${cor} 0%, ${cor}88 100%)` }}
                />
                <div className="-mt-8 px-4 pb-5">
                  <div
                    className="grid h-16 w-16 place-items-center rounded-2xl border-4 border-card text-lg font-semibold text-primary-foreground"
                    style={{ backgroundColor: cor }}
                  >
                    {nome.slice(0, 2).toUpperCase()}
                  </div>
                  <h3 className="mt-3 text-base font-semibold">{nome}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{descricao}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {loja.cidade} · {loja.estado}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      style={{ backgroundColor: cor }}
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Comprar pelo WhatsApp
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
                      <Instagram className="h-3.5 w-3.5" /> {loja.instagram}
                    </span>
                  </div>
                  <p className="mt-4 rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
                    {loja.boasVindas}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </PlanGuard>
  );
}

function Campo({
  label,
  extra,
  children,
}: {
  label: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        {extra}
      </div>
      {children}
    </div>
  );
}
