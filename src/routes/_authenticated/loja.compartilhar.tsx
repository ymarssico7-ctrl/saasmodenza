import { createFileRoute } from "@tanstack/react-router";
import { Copy, Instagram, Link2, QrCode, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard } from "@/components/loja/section-card";
import { PlanoBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/format";
import { loja, produtos } from "@/data/loja";
import { PlanGuard } from "@/components/plan-guard";

export const Route = createFileRoute("/_authenticated/loja/compartilhar")({
  head: () => ({
    meta: [
      { title: "Compartilhar a loja — Modaly" },
      {
        name: "description",
        content: "Copie o link da vitrine, gere o QR Code e compartilhe peças individuais no WhatsApp.",
      },
    ],
  }),
  component: CompartilharPage,
});

const linkLoja = (path = "") => `https://${loja.subdominio}${path}`;

function CompartilharPage() {
  const copiar = (texto: string, mensagem: string) => {
    void navigator.clipboard?.writeText(texto);
    toast.success(mensagem, { description: texto });
  };

  return (
    <PlanGuard requires="digital" featureName="Compartilhamento" featureDescription="Copie o link da sua vitrine e compartilhe peças individuais. Disponível no Plano Digital.">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Divulgação"
          title="Compartilhar a loja"
          description="Um link só para Instagram, WhatsApp e TikTok — e um QR Code para o balcão."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <SectionCard title="Link da loja" description="Use na bio do Instagram e nos Stories.">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input readOnly value={linkLoja()} className="h-11 rounded-xl" />
              <Button
                onClick={() => copiar(linkLoja(), "Link da loja copiado")}
                className="gradient-primary h-11 shrink-0 rounded-xl shadow-glow"
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar link
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" className="h-10 rounded-full text-xs" onClick={() => toast.success("Abrindo Instagram")}>
                <Instagram className="mr-2 h-3.5 w-3.5" /> Colocar na bio
              </Button>
              <Button variant="outline" className="h-10 rounded-full text-xs" onClick={() => toast.success("Mensagem pronta no WhatsApp")}>
                <Link2 className="mr-2 h-3.5 w-3.5" /> Enviar no WhatsApp
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="QR Code da loja" description="Imprima para o balcão e para as embalagens.">
            <div className="flex flex-col items-center gap-4">
              <div className="grid h-40 w-40 place-items-center rounded-2xl border border-border bg-secondary/50">
                <QrCode className="h-24 w-24 text-foreground" />
              </div>
              <Button variant="outline" className="h-10 w-full rounded-full text-xs" onClick={() => toast.success("QR Code baixado em PNG")}>
                Baixar QR Code
              </Button>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Links diretos de peças"
          description="Mande a peça exata para a cliente que perguntou no direct."
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border/70">
            {produtos.slice(0, 5).map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 transition-colors duration-200 hover:bg-secondary/40"
              >
                <img
                  src={p.imagem}
                  alt={p.nome}
                  loading="lazy"
                  width={640}
                  height={800}
                  className="h-14 w-11 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.nome}</p>
                  <p className="num-display mt-0.5 text-xs text-muted-foreground">
                    {brl(p.precoPromocional ?? p.preco)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    className="h-9 rounded-full text-xs"
                    onClick={() => copiar(linkLoja(`/p/${p.id}`), "Link da peça copiado")}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Link
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 rounded-full text-xs"
                    onClick={() => toast.success("Story gerado com preço e foto da peça")}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Story
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Gerador de Stories"
          description="Imagem pronta com foto da peça, nome e preço para postar."
          actions={<PlanoBadge plan="crescimento" />}
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            Escolha até 5 peças e o sistema monta os Stories no formato 1080x1920 com a cor principal da sua
            loja e o link colável.
          </p>
          <Button
            className="gradient-primary mt-4 h-11 rounded-xl shadow-glow"
            onClick={() => toast.success("Stories em fila de geração")}
          >
            Gerar Stories da semana
          </Button>
        </SectionCard>
      </div>
    </PlanGuard>
  );
}
