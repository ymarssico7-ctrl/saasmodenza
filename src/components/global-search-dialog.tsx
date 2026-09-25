import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  Calculator,
  Globe,
  LayoutGrid,
  PlusCircle,
  Search,
  Settings,
  ShoppingBag,
  Sliders,
  Sparkles,
  Tag,
  Target,
  Ticket,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  BookOpen,
  ArrowRight,
  CornerDownLeft,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command as CommandPrimitive } from "cmdk";
import { inventoryQuery, customersQuery } from "@/lib/db";
import { brl } from "@/lib/format";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Botões de Acesso aos Módulos Principais (Visíveis no estado inicial) ───
const MAIN_MODULE_BUTTONS = [
  {
    title: "Peças em Estoque",
    description: "Catálogo completo, grade de tamanhos e precificação",
    icon: Boxes,
    to: "/estoque",
    search: { tab: "pecas" },
    keywords: ["estoque", "pecas", "produtos", "roupas", "catalogo", "grade"],
  },
  {
    title: "Coleções & Categorias",
    description: "Categorias de produtos e organização do catálogo",
    icon: Tag,
    to: "/estoque",
    search: { tab: "categorias" },
    keywords: ["categorias", "colecoes", "catalogo", "secoes"],
  },
  {
    title: "Lista de Clientes",
    description: "Carteira de clientes, histórico de compras e contatos",
    icon: Users,
    to: "/clientes",
    keywords: ["clientes", "contatos", "compradores", "crm", "fidelidade"],
  },
  {
    title: "Caixa & PDV",
    description: "Frente de caixa, registro de vendas e pagamentos",
    icon: Wallet,
    to: "/caixa",
    keywords: ["pdv", "caixa", "venda", "pagamento", "dinheiro", "pix", "cartao"],
  },
  {
    title: "Pedidos da Loja",
    description: "Gerencie pedidos recebidos e status de entrega",
    icon: ShoppingBag,
    to: "/loja/pedidos",
    keywords: ["pedidos", "encomendas", "checkout", "vendas online"],
  },
  {
    title: "Precificação & Markup",
    description: "Calculadora de margem, markup e lucro por peça",
    icon: Calculator,
    to: "/precificacao",
    keywords: ["precificacao", "markup", "margem", "lucro", "custo", "calculadora"],
  },
  {
    title: "Metas & Vendas",
    description: "Acompanhamento diário e meta mensal da equipe",
    icon: Target,
    to: "/metas",
    keywords: ["metas", "objetivos", "vendas mes", "progresso"],
  },
  {
    title: "Relatório DRE & Lucro",
    description: "Demonstrativo de resultado e saúde financeira",
    icon: TrendingUp,
    to: "/relatorio",
    keywords: ["dre", "relatorio", "lucro liquido", "contabilidade", "despesas"],
  },
  {
    title: "Vitrine Online",
    description: "Painel da loja virtual e catálogo público",
    icon: Globe,
    to: "/loja",
    keywords: ["vitrine", "loja online", "e-commerce", "site"],
  },
  {
    title: "Configurações da Loja",
    description: "Nome, WhatsApp, frete e integrações",
    icon: Sliders,
    to: "/loja/configuracao",
    keywords: ["configuracoes loja", "whatsapp", "frete", "pagamentos"],
  },
  {
    title: "Configurações do Sistema",
    description: "Perfil da loja, plano e assinatura",
    icon: Settings,
    to: "/configuracoes",
    keywords: ["configuracoes", "ajustes", "perfil", "conta", "plano", "senha"],
  },
];

// ── Ações Rápidas (Padronizadas como Botões) ──────────────────────────────
const QUICK_ACTIONS = [
  {
    id: "action-nova-peca",
    title: "Cadastrar Nova Peça no Estoque",
    subtitle: "Adicionar produto com foto, tamanhos e preços",
    icon: PlusCircle,
    to: "/estoque",
    search: { tab: "pecas" },
    keywords: ["novo", "cadastrar", "peca", "adicionar", "produto"],
  },
  {
    id: "action-nova-venda",
    title: "Nova Venda / Abrir Caixa",
    subtitle: "Registrar venda rápida com cálculo de troco",
    icon: Wallet,
    to: "/caixa",
    keywords: ["venda", "nova venda", "vender", "pdv", "caixa"],
  },
  {
    id: "action-novo-cliente",
    title: "Cadastrar Nova Cliente",
    subtitle: "Salvar nome, telefone e preferências",
    icon: Users,
    to: "/clientes",
    keywords: ["cliente", "nova cliente", "adicionar cliente", "contato"],
  },
  {
    id: "action-novo-cupom",
    title: "Criar Cupom de Desconto",
    subtitle: "Oferecer código promocional para compras",
    icon: Ticket,
    to: "/loja/cupons",
    keywords: ["cupom", "novo cupom", "promocao", "desconto"],
  },
];

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Dados em tempo real
  const { data: inventoryItems = [] } = useQuery(inventoryQuery());
  const { data: customers = [] } = useQuery(customersQuery());

  const hasSearch = search.trim().length > 0;

  // Limpa o termo de busca ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const handleSelect = (to: string, searchParams?: Record<string, unknown>) => {
    onOpenChange(false);
    navigate({
      to: to as any,
      search: searchParams as any,
    });
  };

  // Cálculo de estoque total para cada peça
  const getProductStock = (item: any) => {
    if (!item?.sizes || typeof item.sizes !== "object") return 0;
    return Object.values(item.sizes as Record<string, number>).reduce(
      (acc, q) => acc + (Number(q) || 0),
      0
    );
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop suave estilo Apple / Shopify */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in-0" />

        {/* Modal Spotlight posicionado no terço superior */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[16%] -translate-x-1/2 z-50 w-[94vw] max-w-2xl rounded-2xl bg-[#141416] text-white border border-white/12 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] outline-none overflow-hidden duration-200 animate-in fade-in-0 zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">Pesquisa Global do Vestui</DialogPrimitive.Title>

          <CommandPrimitive
            className="flex h-full w-full flex-col overflow-hidden"
            shouldFilter={true}
          >
            {/* Campo de Entrada de Busca (Search Input) */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5 bg-[#18181B]/80">
              <Search className="size-4.5 text-white/50 shrink-0" />
              <CommandPrimitive.Input
                value={search}
                onValueChange={setSearch}
                autoFocus
                placeholder="Pesquisar módulos, peças, clientes ou ações..."
                className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/40 outline-none select-text"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-md p-1 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <span className="text-xs">Limpar</span>
                </button>
              )}
              <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-white/15 bg-white/5 px-1.5 font-mono text-[10px] text-white/40">
                ESC
              </kbd>
            </div>

            {/* Lista de Resultados Filtrada em Tempo Real */}
            <CommandPrimitive.List className="max-h-[380px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
              <CommandPrimitive.Empty className="py-12 text-center text-xs text-white/40">
                <Search className="mx-auto size-8 opacity-30 mb-2" />
                Nenhum resultado encontrado para &ldquo;<span className="text-white/70 font-medium">{search}</span>&rdquo;.
              </CommandPrimitive.Empty>

              {/* ─────────────────────────────────────────────────────────────
                  1. ESTADO DE BUSCA ATIVA (Apenas quando o usuário digita)
                  ───────────────────────────────────────────────────────────── */}
              {hasSearch && (
                <>
                  {/* 👗 Peças Encontradas no Estoque (Formatadas como Botão) */}
                  {inventoryItems.length > 0 && (
                    <CommandPrimitive.Group
                      heading="Peças no Estoque"
                      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-white/40"
                    >
                      {inventoryItems.map((item) => {
                        const stock = getProductStock(item);
                        return (
                          <CommandPrimitive.Item
                            key={`search-item-${item.id}`}
                            value={`${item.name} ${item.category ?? ""} ${item.color ?? ""} ${item.sale_price}`}
                            onSelect={() => handleSelect("/estoque", { tab: "pecas" })}
                            className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-white/85 data-[selected=true]:bg-white/10 data-[selected=true]:text-white cursor-pointer select-none transition-colors group mb-0.5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {item.photo_url ? (
                                <img
                                  src={item.photo_url}
                                  alt={item.name}
                                  className="size-7 rounded-lg object-cover shrink-0 border border-white/10"
                                />
                              ) : (
                                <div className="flex size-7 items-center justify-center rounded-lg bg-white/8 text-white/60 border border-white/10 shrink-0">
                                  <Boxes className="size-3.5" />
                                </div>
                              )}
                              <div className="truncate">
                                <p className="font-medium text-[13px] text-white truncate">{item.name}</p>
                                <p className="text-[11px] text-white/45 truncate">
                                  {item.category ?? "Geral"} {item.color ? `· ${item.color}` : ""} · Estoque: {stock} un.
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <span className="font-semibold text-xs text-white/90">
                                {brl(item.sale_price ?? 0)}
                              </span>
                              <ArrowRight className="size-3.5 text-white/30 opacity-0 group-data-[selected=true]:opacity-100 transition-opacity" />
                            </div>
                          </CommandPrimitive.Item>
                        );
                      })}
                    </CommandPrimitive.Group>
                  )}

                  {/* 👥 Clientes Encontrados (Formatados como Botão) */}
                  {customers.length > 0 && (
                    <CommandPrimitive.Group
                      heading="Clientes"
                      className="mt-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-white/40"
                    >
                      {customers.map((c) => (
                        <CommandPrimitive.Item
                          key={`search-client-${c.id}`}
                          value={`${c.name} ${c.phone ?? ""} ${c.city ?? ""}`}
                          onSelect={() => handleSelect("/clientes")}
                          className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-white/85 data-[selected=true]:bg-white/10 data-[selected=true]:text-white cursor-pointer select-none transition-colors group mb-0.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
                              <Users className="size-3.5" />
                            </div>
                            <div className="truncate">
                              <p className="font-medium text-[13px] text-white truncate">{c.name}</p>
                              <p className="text-[11px] text-white/45 truncate">
                                {c.phone ? `${c.phone} ` : ""}
                                {c.city ? `· ${c.city}` : "Cliente cadastrada"}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="size-3.5 text-white/30 opacity-0 group-data-[selected=true]:opacity-100 transition-opacity shrink-0 ml-2" />
                        </CommandPrimitive.Item>
                      ))}
                    </CommandPrimitive.Group>
                  )}
                </>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  2. MÓDULOS DE ACESSO (Padrão de Botões Elegantes e Simétricos)
                  ───────────────────────────────────────────────────────────── */}
              <CommandPrimitive.Group
                heading={hasSearch ? "Páginas & Módulos" : "Módulos de Acesso Rápido"}
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-white/40"
              >
                {MAIN_MODULE_BUTTONS.map((module) => (
                  <CommandPrimitive.Item
                    key={module.to + (module.search?.tab ?? "")}
                    value={`${module.title} ${module.description} ${module.keywords.join(" ")}`}
                    onSelect={() => handleSelect(module.to, module.search)}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-white/85 data-[selected=true]:bg-white/10 data-[selected=true]:text-white cursor-pointer select-none transition-colors group mb-0.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-white/8 text-white/70 border border-white/10 shrink-0">
                        <module.icon className="size-3.5" />
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-[13px] text-white truncate">{module.title}</p>
                        <p className="text-[11px] text-white/45 truncate">{module.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-white/30 opacity-0 group-data-[selected=true]:opacity-100 transition-opacity shrink-0 ml-2" />
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>

              {/* ─────────────────────────────────────────────────────────────
                  3. AÇÕES RÁPIDAS
                  ───────────────────────────────────────────────────────────── */}
              <CommandPrimitive.Group
                heading="Ações Rápidas"
                className="mt-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-white/40"
              >
                {QUICK_ACTIONS.map((action) => (
                  <CommandPrimitive.Item
                    key={action.id}
                    value={`${action.title} ${action.subtitle} ${action.keywords.join(" ")}`}
                    onSelect={() => handleSelect(action.to, action.search)}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs text-white/85 data-[selected=true]:bg-white/10 data-[selected=true]:text-white cursor-pointer select-none transition-colors group mb-0.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/20 shrink-0">
                        <action.icon className="size-3.5" />
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-[13px] text-white truncate">{action.title}</p>
                        <p className="text-[11px] text-white/45 truncate">{action.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-white/30 opacity-0 group-data-[selected=true]:opacity-100 transition-opacity shrink-0 ml-2" />
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            </CommandPrimitive.List>

            {/* Barra Inferior com Atalhos de Navegação (Padrão Shopify / Mac) */}
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-[11px] text-white/40 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-white/15 bg-white/5 px-1 font-mono text-[9px]">↑</kbd>
                  <kbd className="rounded border border-white/15 bg-white/5 px-1 font-mono text-[9px]">↓</kbd>
                  <span>Navegar</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-white/15 bg-white/5 px-1 font-mono text-[9px] flex items-center">
                    <CornerDownLeft className="size-2.5" />
                  </kbd>
                  <span>Selecionar</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-white/15 bg-white/5 px-1 font-mono text-[9px]">ESC</kbd>
                  <span>Fechar</span>
                </span>
              </div>
              <span className="font-medium text-white/30 tracking-tight">Vestui Spotlight</span>
            </div>
          </CommandPrimitive>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
