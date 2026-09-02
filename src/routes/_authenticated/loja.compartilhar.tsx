import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Instagram, Link2, QrCode, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard } from "@/components/loja/section-card";
import { PlanoBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/format";
import { useStore } from "@/lib/store-context";
import { inventoryQuery } from "@/lib/db";
import { loadShowcaseConfigs } from "@/lib/showcase-store";

export const Route = createFileRoute("/_authenticated/loja/compartilhar")({
  head: () => ({
    meta: [
      { title: "Compartilhar a loja — Vestuli" },
      {
        name: "description",
        content:
          "Copie o link da vitrine, gere o QR Code e compartilhe peças individuais no WhatsApp.",
      },
    ],
  }),
  component: CompartilharPage,
});

function CompartilharPage() {
  const { store, storeId } = useStore();

  // Slug real da loja
  const slug = store?.slug ?? storeId ?? "minha-loja";
  const baseUrl = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://vestuli.com.br";
  const linkLoja = (path = "") => `${baseUrl}/vitrine/${slug}${path}`;

  // Produtos reais do inventário
  const { data: inventario = [] } = useQuery(inventoryQuery());
  const showcaseConfigs = useMemo(() => loadShowcaseConfigs(), []);

  // Filtra apenas os produtos marcados como ativos na vitrine
  const produtosAtivos = useMemo(() => {
    return inventario
      .filter((item) => {
        const cfg = showcaseConfigs[item.id];
        return cfg?.ativo === true;
      })
      .slice(0, 5);
  }, [inventario, showcaseConfigs]);

  const copiar = (texto: string, mensagem: string) => {
    void navigator.clipboard?.writeText(texto);
    toast.success(mensagem, { description: texto });
  };

  return (
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
            <Button
              variant="outline"
              className="h-10 rounded-full text-xs"
              onClick={() => {
                copiar(linkLoja(), "Link copiado — cole na bio do Instagram!");
                toast.success("Abra o Instagram e cole o link na bio.");
              }}
            >
              <Instagram className="mr-2 h-3.5 w-3.5" /> Colocar na bio
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-full text-xs"
              onClick={() => {
                const msg = encodeURIComponent(`Olá! Confira nossa loja online: ${linkLoja()}`);
                window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank", "noopener,noreferrer");
              }}
            >
              <Link2 className="mr-2 h-3.5 w-3.5" /> Enviar no WhatsApp
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          title="QR Code da loja"
          description="Imprima para o balcão e para as embalagens."
        >
          <div className="flex flex-col items-center gap-4">
            <div className="grid h-40 w-40 place-items-center rounded-2xl border border-border bg-secondary/50">
              <QrCode className="h-24 w-24 text-foreground" />
            </div>
            <Button
              variant="outline"
              className="h-10 w-full rounded-full text-xs"
              onClick={() => toast.success("QR Code baixado em PNG")}
            >
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
        {produtosAtivos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <p className="text-sm font-medium">Nenhuma peça ativa na vitrine</p>
            <p className="text-xs">
              Ative produtos no menu <strong>Vitrine → Meus Produtos</strong> para compartilhar
              links diretamente.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/70">
            {produtosAtivos.map((p) => {
              const cfg = showcaseConfigs[p.id];
              const preco = cfg?.precoPromocional ?? Number(p.sale_price ?? 0);
              const foto = cfg?.vitrineFotos?.[0] || p.photo_url;
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 transition-colors duration-200 hover:bg-secondary/40"
                >
                  <div className="h-14 w-11 rounded-lg bg-secondary/60 flex items-center justify-center overflow-hidden">
                    {foto ? (
                      <img
                        src={foto}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] text-muted-foreground text-center px-1">
                        {p.name?.slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="num-display mt-0.5 text-xs text-muted-foreground">{brl(preco)}</p>
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
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Gerador de Stories"
        description="Imagem pronta com foto da peça, nome e preço para postar."
        actions={<PlanoBadge plan="crescimento" />}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          Escolha até 5 peças e o sistema monta os Stories no formato 1080x1920 com a cor principal
          da sua loja e o link colável.
        </p>
        <Button
          className="gradient-primary mt-4 h-11 rounded-xl shadow-glow"
          onClick={() => toast.success("Stories em fila de geração")}
        >
          Gerar Stories da semana
        </Button>
      </SectionCard>
    </div>
  );
}
