import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  MessageCircle,
  Instagram,
  MapPin,
  ChevronRight,
  Search,
  Tag,
  Sparkles,
  Heart,
  RefreshCw,
  Truck,
  Shield,
} from "lucide-react";
import { CartProvider, useCart, type CartItem } from "@/lib/cart";
import { openWhatsAppCheckout } from "@/lib/whatsapp";
import { loja, produtos as mockProdutos } from "@/data/loja";

// ─── Route ───────────────────────────────────────────────────────
export const Route = createFileRoute("/vitrine/$storeSlug")({
  head: ({ params }) => ({
    meta: [
      { title: `Vitrine — ${params.storeSlug}` },
      { name: "description", content: "Vitrine online da loja." },
    ],
  }),
  component: VitrineRoot,
});

// Dados da loja (futuramente virão do Supabase via loader)
const STORE = {
  nome: loja.nome,
  descricao: loja.descricao,
  corPrincipal: loja.corPrincipal,
  whatsapp: loja.whatsapp,
  instagram: loja.instagram,
  cidade: loja.cidade,
  estado: loja.estado,
  boasVindas: loja.boasVindas,
  politicaTroca: loja.politicaTroca,
  template: "boutique" as "boutique" | "streetwear",
};

const CATEGORIAS = ["Tudo", "Blusas", "Calças", "Vestidos", "Saias", "Acessórios"] as const;

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isPromocaoAtiva(inicio?: string, fim?: string) {
  if (!inicio || !fim) return false;
  const now = Date.now();
  return now >= new Date(inicio).getTime() && now <= new Date(fim).getTime();
}

// ─── Root (wraps CartProvider) ────────────────────────────────────
function VitrineRoot() {
  return (
    <CartProvider>
      <VitrineLayout />
    </CartProvider>
  );
}

// ─── Main Layout ─────────────────────────────────────────────────
function VitrineLayout() {
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<(typeof mockProdutos)[0] | null>(null);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>("Tudo");
  const cart = useCart();

  const produtos = useMemo(
    () =>
      mockProdutos.filter(
        (p) =>
          p.ativo &&
          (categoria === "Tudo" || p.categoria === categoria) &&
          p.nome.toLowerCase().includes(busca.toLowerCase())
      ),
    [busca, categoria]
  );

  const destaques = mockProdutos.filter((p) => p.ativo && p.destaque);

  const cor = STORE.corPrincipal;

  return (
    <div className="min-h-screen bg-[#FAFAF8] font-sans antialiased">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 w-full border-b border-black/5 backdrop-blur-xl"
        style={{ backgroundColor: `${cor}08` }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo / Nome */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: cor }}
            >
              {STORE.nome.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[15px] font-semibold leading-none text-gray-900">{STORE.nome}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                <MapPin className="h-3 w-3" />
                {STORE.cidade}, {STORE.estado}
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/55${STORE.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 sm:flex"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>

            <button
              id="cart-open-btn"
              onClick={() => setCartOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-gray-700 transition-colors hover:bg-black/5"
              aria-label="Carrinho"
            >
              <ShoppingBag className="h-5 w-5" />
              {cart.totalItems > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: cor }}
                >
                  {cart.totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-14 md:py-20"
        style={{
          background: `linear-gradient(135deg, ${cor}18 0%, ${cor}06 60%, transparent 100%)`,
        }}
      >
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-xl">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-current/20 px-3 py-1 text-xs font-semibold" style={{ color: cor }}>
              <Sparkles className="h-3.5 w-3.5" />
              Nova coleção disponível
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl">
              {STORE.nome}
            </h1>
            <p className="mt-3 text-base text-gray-600 leading-relaxed">
              {STORE.descricao}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="#catalogo"
                className="inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
                style={{ backgroundColor: cor }}
              >
                Ver coleção
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
              <a
                href={`https://instagram.com/${STORE.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Instagram className="h-4 w-4" />
                {STORE.instagram}
              </a>
            </div>
          </div>
        </div>
        {/* Decoração */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: cor }}
        />
      </section>

      {/* ── DESTAQUES ──────────────────────────────────────── */}
      {destaques.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-gray-900">✨ Em destaque</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {destaques.map((p) => {
              const temPromocao = isPromocaoAtiva(p.promocaoInicio, p.promocaoFim);
              const precoFinal = temPromocao && p.precoPromocional ? p.precoPromocional : p.preco;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="group relative flex-shrink-0 w-52 overflow-hidden rounded-3xl border border-white bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="relative h-52 w-full overflow-hidden bg-gray-100">
                    <img
                      src={p.imagem}
                      alt={p.nome}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {temPromocao && (
                      <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        PROMO
                      </span>
                    )}
                  </div>
                  <div className="p-3 text-left">
                    <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">{p.nome}</p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-sm font-bold" style={{ color: cor }}>{brl(precoFinal)}</span>
                      {temPromocao && p.precoPromocional && (
                        <span className="text-[11px] text-gray-400 line-through">{brl(p.preco)}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── CATÁLOGO PRINCIPAL ────────────────────────────── */}
      <section id="catalogo" className="mx-auto max-w-6xl px-4 pb-20">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-bold text-gray-900">Catálogo completo</h2>

          {/* Busca */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-10 w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-current focus:outline-none focus:ring-2 focus:ring-current/20"
              style={{ "--tw-ring-color": `${cor}33` } as React.CSSProperties}
            />
          </div>
        </div>

        {/* Categorias */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all"
              style={
                categoria === cat
                  ? { backgroundColor: cor, color: "#fff" }
                  : { backgroundColor: "#fff", color: "#374151", border: "1px solid #e5e7eb" }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid de produtos */}
        {produtos.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg font-medium text-gray-400">Nenhum produto encontrado</p>
            <p className="mt-1 text-sm text-gray-400">Tente outra categoria ou busca</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {produtos.map((p) => {
              const temPromocao = isPromocaoAtiva(p.promocaoInicio, p.promocaoFim);
              const precoFinal = temPromocao && p.precoPromocional ? p.precoPromocional : p.preco;
              const semEstoque = p.estoque === 0;
              return (
                <button
                  key={p.id}
                  onClick={() => !semEstoque && setSelectedProduct(p)}
                  className={`group relative overflow-hidden rounded-3xl border border-white bg-white shadow-sm text-left transition-all ${
                    semEstoque ? "cursor-not-allowed opacity-60" : "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  }`}
                >
                  <div className="relative overflow-hidden bg-gray-100 aspect-square">
                    <img
                      src={p.imagem}
                      alt={p.nome}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {semEstoque && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-900">
                          Esgotado
                        </span>
                      </div>
                    )}
                    {temPromocao && !semEstoque && (
                      <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        PROMO
                      </span>
                    )}
                    {!temPromocao && p.destaque && !semEstoque && (
                      <span
                        className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: cor }}
                      >
                        DESTAQUE
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">{p.nome}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{p.categoria}</p>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      {p.precoOculto ? (
                        <span className="text-xs text-gray-400">Consulte preço</span>
                      ) : (
                        <>
                          <span className="text-sm font-bold" style={{ color: cor }}>{brl(precoFinal)}</span>
                          {temPromocao && p.precoPromocional && (
                            <span className="text-[11px] text-gray-400 line-through">{brl(p.preco)}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── INFO RODAPÉ ───────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-6 sm:grid-cols-3">
            <InfoCard icon={<MessageCircle className="h-5 w-5" />} title="Atendimento" text={`Chame no WhatsApp: ${STORE.whatsapp}`} cor={cor} />
            <InfoCard icon={<RefreshCw className="h-5 w-5" />} title="Política de troca" text={STORE.politicaTroca} cor={cor} />
            <InfoCard icon={<Shield className="h-5 w-5" />} title="Compra segura" text="Seus dados são protegidos. Pagamento combinado direto com a loja." cor={cor} />
          </div>
          <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            <p>
              {STORE.boasVindas}
            </p>
            <p className="mt-3">
              Vitrine criada com{" "}
              <a href="/" className="font-semibold text-gray-600 hover:underline">
                Modenza
              </a>{" "}
              · Sistema de gestão para lojas de moda
            </p>
          </div>
        </div>
      </section>

      {/* ── MODAL PRODUTO ─────────────────────────────────── */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          cor={cor}
          storeName={STORE.nome}
          onClose={() => setSelectedProduct(null)}
          onCartOpen={() => setCartOpen(true)}
        />
      )}

      {/* ── DRAWER CARRINHO ───────────────────────────────── */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cor={cor}
        storeName={STORE.nome}
        whatsapp={STORE.whatsapp}
      />
    </div>
  );
}

// ─── Product Modal ────────────────────────────────────────────────
function ProductModal({
  product,
  cor,
  storeName,
  onClose,
  onCartOpen,
}: {
  product: (typeof mockProdutos)[0];
  cor: string;
  storeName: string;
  onClose: () => void;
  onCartOpen: () => void;
}) {
  const { add } = useCart();
  const [tamanho, setTamanho] = useState(product.tamanhos[0] ?? "Único");
  const [cor2, setCor2] = useState(product.cores[0] ?? "");
  const [added, setAdded] = useState(false);

  const temPromocao = isPromocaoAtiva(product.promocaoInicio, product.promocaoFim);
  const precoFinal = temPromocao && product.precoPromocional ? product.precoPromocional : product.preco;

  function handleAdd() {
    const item: CartItem = {
      id: product.id,
      nome: product.nome,
      imagem: product.imagem,
      preco: precoFinal,
      tamanho,
      cor: cor2,
      quantidade: 1,
    };
    add(item);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
      onCartOpen();
    }, 1000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-gray-800 hover:bg-black/20 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Imagem */}
        <div className="relative h-72 w-full overflow-hidden bg-gray-100 sm:h-80">
          <img src={product.imagem} alt={product.nome} className="h-full w-full object-cover" />
          {temPromocao && (
            <span className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
              PROMOÇÃO
            </span>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{product.categoria}</p>
              <h2 className="mt-1 font-display text-xl font-bold text-gray-900">{product.nome}</h2>
            </div>
            <div className="text-right">
              {product.precoOculto ? (
                <p className="text-sm text-gray-400">Consulte preço</p>
              ) : (
                <>
                  <p className="text-2xl font-bold" style={{ color: cor }}>{brl(precoFinal)}</p>
                  {temPromocao && product.precoPromocional && (
                    <p className="text-sm text-gray-400 line-through">{brl(product.preco)}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tamanhos */}
          {product.tamanhos.length > 0 && product.tamanhos[0] !== "Único" && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Tamanho</p>
              <div className="flex flex-wrap gap-2">
                {product.tamanhos.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTamanho(t)}
                    className="min-w-[2.5rem] rounded-xl border px-3 py-1.5 text-sm font-medium transition-all"
                    style={
                      tamanho === t
                        ? { borderColor: cor, backgroundColor: `${cor}15`, color: cor }
                        : { borderColor: "#e5e7eb", color: "#374151" }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cores */}
          {product.cores.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Cor — <span className="font-semibold text-gray-900">{cor2}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.cores.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCor2(c)}
                    className="rounded-xl border px-3 py-1.5 text-sm font-medium transition-all"
                    style={
                      cor2 === c
                        ? { borderColor: cor, backgroundColor: `${cor}15`, color: cor }
                        : { borderColor: "#e5e7eb", color: "#374151" }
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Estoque */}
          <p className="mt-4 text-xs text-gray-400">
            {product.estoque > 0
              ? `${product.estoque} unidade${product.estoque !== 1 ? "s" : ""} disponíve${product.estoque !== 1 ? "is" : "l"}`
              : "Sem estoque"}
          </p>

          <button
            id="add-to-cart-btn"
            onClick={handleAdd}
            disabled={product.estoque === 0 || added}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-60 hover:opacity-90"
            style={{ backgroundColor: cor }}
          >
            {added ? (
              <>✓ Adicionado ao carrinho!</>
            ) : product.estoque === 0 ? (
              "Sem estoque"
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                Adicionar ao carrinho
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cart Drawer ──────────────────────────────────────────────────
function CartDrawer({
  open,
  onClose,
  cor,
  storeName,
  whatsapp,
}: {
  open: boolean;
  onClose: () => void;
  cor: string;
  storeName: string;
  whatsapp: string;
}) {
  const { items, totalItems, totalPrice, remove, increment, decrement, clear } = useCart();

  function handleCheckout() {
    openWhatsAppCheckout(whatsapp, storeName, items, totalPrice);
    clear();
    onClose();
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-gray-900">Seu carrinho</h2>
            <p className="text-xs text-gray-400">{totalItems} {totalItems === 1 ? "item" : "itens"}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Fechar carrinho"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 text-gray-400 mb-4">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <p className="font-medium text-gray-500">Carrinho vazio</p>
              <p className="mt-1 text-sm text-gray-400">Adicione produtos para continuar</p>
              <button
                onClick={onClose}
                className="mt-5 rounded-full px-5 py-2 text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: cor }}
              >
                Ver produtos
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.id}::${item.tamanho}::${item.cor}`}
                  className="flex gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-3"
                >
                  <img
                    src={item.imagem}
                    alt={item.nome}
                    className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
                  />
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{item.nome}</p>
                      {(item.tamanho !== "Único" || item.cor) && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {[item.tamanho !== "Único" ? item.tamanho : "", item.cor].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold" style={{ color: cor }}>{brl(item.preco * item.quantidade)}</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (item.quantidade === 1) {
                              remove(item.id, item.tamanho, item.cor);
                            } else {
                              decrement(item.id, item.tamanho, item.cor);
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100"
                        >
                          {item.quantidade === 1 ? <X className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{item.quantidade}</span>
                        <button
                          onClick={() => increment(item.id, item.tamanho, item.cor)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{brl(totalPrice)}</p>
            </div>
            <button
              id="whatsapp-checkout-btn"
              onClick={handleCheckout}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "#25D366" }}
            >
              <MessageCircle className="h-4 w-4" />
              Finalizar pelo WhatsApp
            </button>
            <p className="mt-2 text-center text-[11px] text-gray-400">
              Você será redirecionada para o WhatsApp da loja
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Info Card ────────────────────────────────────────────────────
function InfoCard({ icon, title, text, cor }: { icon: React.ReactNode; title: string; text: string; cor: string }) {
  return (
    <div className="flex gap-3">
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-white"
        style={{ backgroundColor: `${cor}20`, color: cor }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
