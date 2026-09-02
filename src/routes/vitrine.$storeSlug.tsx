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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CartProvider, useCart, type CartItem } from "@/lib/cart";
import { openWhatsAppCheckout } from "@/lib/whatsapp";
import {
  mergeInventoryWithShowcase,
  loadShowcaseConfigs,
  type ShowcaseProduct,
} from "@/lib/showcase-store";
import { getVitrineSettings } from "@/lib/vitrine-settings";

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

// ─── Tipos internos ───────────────────────────────────────────────
type StoreData = {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  owner_id: string;
};

// ─── Utilitários ──────────────────────────────────────────────────
function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CATEGORIAS_PADRAO = ["Tudo"] as const;

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
  const { storeSlug } = Route.useParams();
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShowcaseProduct | null>(null);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Tudo");
  const cart = useCart();

  // ── Busca a loja pelo slug no Supabase ────────────────────────
  const { data: store, isLoading: storeLoading } = useQuery<StoreData | null>({
    queryKey: ["vitrine-store", storeSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, phone, city, owner_id")
        .eq("slug", storeSlug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // ── Busca o inventário da loja ────────────────────────────────
  const { data: inventoryItems = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ["vitrine-inventory", store?.owner_id],
    queryFn: async () => {
      if (!store?.owner_id) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("user_id", store.owner_id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!store?.owner_id,
  });

  // ── Mescla inventário com configs de vitrine (localStorage) ──
  const allProducts: ShowcaseProduct[] = useMemo(() => {
    if (!inventoryItems.length) return [];
    return mergeInventoryWithShowcase(inventoryItems as Parameters<typeof mergeInventoryWithShowcase>[0]);
  }, [inventoryItems]);

  // ── Filtros dinâmicos ─────────────────────────────────────────
  const categorias = useMemo(() => {
    const unique = Array.from(new Set(allProducts.filter((p) => p.showcase.ativo).map((p) => p.category))).sort();
    return ["Tudo", ...unique];
  }, [allProducts]);

  const produtos = useMemo(
    () =>
      allProducts.filter(
        (p) =>
          p.showcase.ativo &&
          (categoria === "Tudo" || p.category === categoria) &&
          p.name.toLowerCase().includes(busca.toLowerCase()),
      ),
    [allProducts, busca, categoria],
  );

  const destaques = allProducts.filter((p) => p.showcase.ativo && p.showcase.destaque);

  // storeId usado para ler cupons e orders do localStorage.
  // Fallback para storeSlug em preview demo (sem registro no banco).
  const storeId = store?.id ?? storeSlug;
  const vitrineSettings = getVitrineSettings(storeId);
  const cor = vitrineSettings.corPrincipal || "#3A3AF0";
  const storeName = store?.name ?? storeSlug;
  const storeCity = store?.city ?? "";
  const storeWhatsapp = store?.phone ?? "";

  const isLoading = storeLoading || inventoryLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
          <p className="text-sm text-gray-500">Carregando vitrine...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8]">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Vitrine não encontrada</p>
          <p className="mt-1 text-sm text-gray-400">
            O link <strong>{storeSlug}</strong> não corresponde a nenhuma loja cadastrada.
          </p>
        </div>
      </div>
    );
  }

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
            {vitrineSettings.logoUrl ? (
              <img
                src={vitrineSettings.logoUrl}
                alt={storeName}
                className="h-10 w-10 rounded-2xl object-cover shadow-sm"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: cor }}
              >
                {storeName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[15px] font-semibold leading-none text-gray-900">{storeName}</p>
              {storeCity && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                  <MapPin className="h-3 w-3" />
                  {storeCity}
                </p>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            {storeWhatsapp && (() => {
              const digits = storeWhatsapp.replace(/\D/g, "");
              const phone = digits.startsWith("55") ? digits : `55${digits}`;
              return (
                <a
                  href={`https://wa.me/${phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 sm:flex"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
              );
            })()}

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
          background: vitrineSettings.capaUrl
            ? `linear-gradient(to right, rgba(0,0,0,0.7), rgba(0,0,0,0.3)), url(${vitrineSettings.capaUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, ${cor}18 0%, ${cor}06 60%, transparent 100%)`,
          color: vitrineSettings.capaUrl ? "#ffffff" : undefined,
        }}
      >
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-xl">
            <p
              className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-current/20 px-3 py-1 text-xs font-semibold"
              style={{ color: cor }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Coleção disponível
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl">
              {storeName}
            </h1>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="#catalogo"
                className="inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
                style={{ backgroundColor: cor }}
              >
                Ver coleção
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
              {storeWhatsapp && (
                <a
                  href={`https://wa.me/55${storeWhatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
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
              const precoFinal = p.precoEfetivo;
              const temPromocao = p.emPromocao;
              const foto =
                p.fotoEfetiva ??
                `https://placehold.co/400x400/f5f5f5/999?text=${encodeURIComponent(p.name)}`;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="group relative flex-shrink-0 w-52 overflow-hidden rounded-3xl border border-white bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="relative h-52 w-full overflow-hidden bg-gray-100">
                    <img
                      src={foto}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {temPromocao && (
                      <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        PROMO
                      </span>
                    )}
                  </div>
                  <div className="p-3 text-left">
                    <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">
                      {p.name}
                    </p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-sm font-bold" style={{ color: cor }}>
                        {brl(precoFinal)}
                      </span>
                      {temPromocao && p.showcase.precoPromocional && (
                        <span className="text-[11px] text-gray-400 line-through">
                          {brl(p.sale_price)}
                        </span>
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
          {categorias.map((cat) => (
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
              const precoFinal = p.precoEfetivo;
              const temPromocao = p.emPromocao;
              const semEstoque = p.totalEstoque === 0;
              const foto =
                p.fotoEfetiva ??
                `https://placehold.co/400x400/f5f5f5/999?text=${encodeURIComponent(p.name)}`;
              return (
                <button
                  key={p.id}
                  onClick={() => !semEstoque && setSelectedProduct(p)}
                  className={`group relative overflow-hidden rounded-3xl border border-white bg-white shadow-sm text-left transition-all ${
                    semEstoque
                      ? "cursor-not-allowed opacity-60"
                      : "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  }`}
                >
                  <div className="relative overflow-hidden bg-gray-100 aspect-square">
                    <img
                      src={foto}
                      alt={p.name}
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
                    {!temPromocao && p.showcase.destaque && !semEstoque && (
                      <span
                        className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: cor }}
                      >
                        DESTAQUE
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{p.category}</p>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      {p.showcase.precoOculto ? (
                        <span className="text-xs text-gray-400">Consulte preço</span>
                      ) : (
                        <>
                          <span className="text-sm font-bold" style={{ color: cor }}>
                            {brl(precoFinal)}
                          </span>
                          {temPromocao && p.showcase.precoPromocional && (
                            <span className="text-[11px] text-gray-400 line-through">
                              {brl(p.sale_price)}
                            </span>
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
            {storeWhatsapp && (
              <InfoCard
                icon={<MessageCircle className="h-5 w-5" />}
                title="Atendimento"
                text={`Chame no WhatsApp: ${storeWhatsapp}`}
                cor={cor}
              />
            )}
            <InfoCard
              icon={<RefreshCw className="h-5 w-5" />}
              title="Política de troca"
              text="Entre em contato com a loja para verificar a política de trocas."
              cor={cor}
            />
            <InfoCard
              icon={<Shield className="h-5 w-5" />}
              title="Compra segura"
              text="Seus dados são protegidos. Pagamento combinado direto com a loja."
              cor={cor}
            />
          </div>
          <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
            <p className="mt-3">
              Vitrine criada com{" "}
              <a href="/" className="font-semibold text-gray-600 hover:underline">
                Vestuli
              </a>{" "}
              · Gestão e loja online para moda
            </p>
          </div>
        </div>
      </section>

      {/* ── MODAL PRODUTO ─────────────────────────────────── */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          cor={cor}
          storeName={storeName}
          onClose={() => setSelectedProduct(null)}
          onCartOpen={() => setCartOpen(true)}
        />
      )}

      {/* ── DRAWER CARRINHO ───────────────────────────────── */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cor={cor}
        storeName={storeName}
        whatsapp={storeWhatsapp}
        storeId={storeId}
        allProducts={allProducts}
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
  product: ShowcaseProduct;
  cor: string;
  storeName: string;
  onClose: () => void;
  onCartOpen: () => void;
}) {
  const { add } = useCart();
  const sizesObj = (product.sizes ?? {}) as Record<string, number>;
  const tamanhos = Object.entries(sizesObj)
    .filter(([, qty]) => qty > 0)
    .map(([size]) => size);

  const [tamanho, setTamanho] = useState(tamanhos[0] ?? "Único");
  const [cor2, setCor2] = useState(product.color ?? "");
  const [added, setAdded] = useState(false);

  const precoFinal = product.precoEfetivo;
  const temPromocao = product.emPromocao;
  const foto =
    product.fotoEfetiva ??
    `https://placehold.co/600x800/f5f5f5/999?text=${encodeURIComponent(product.name)}`;

  function handleAdd() {
    const item: CartItem = {
      id: product.id,
      nome: product.name,
      imagem: foto,
      preco: precoFinal,
      tamanho,
      cor: cor2,
      quantidade: 1,
      // Fix 6: teto de estoque real — o reducer não deixa ultrapassar
      maxQuantity: product.totalEstoque,
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
          <img src={foto} alt={product.name} className="h-full w-full object-cover" />
          {temPromocao && (
            <span className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
              PROMOÇÃO
            </span>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                {product.category}
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-gray-900">{product.name}</h2>
            </div>
            <div className="text-right">
              {product.showcase.precoOculto ? (
                <p className="text-sm text-gray-400">Consulte preço</p>
              ) : (
                <>
                  <p className="text-2xl font-bold" style={{ color: cor }}>
                    {brl(precoFinal)}
                  </p>
                  {temPromocao && product.showcase.precoPromocional && (
                    <p className="text-sm text-gray-400 line-through">{brl(product.sale_price)}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tamanhos */}
          {tamanhos.length > 0 && tamanhos[0] !== "Único" && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Tamanho
              </p>
              <div className="flex flex-wrap gap-2">
                {tamanhos.map((t) => (
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

          {/* Cor */}
          {product.color && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Cor — <span className="font-semibold text-gray-900">{cor2}</span>
              </p>
              <button
                onClick={() => setCor2(product.color!)}
                className="rounded-xl border px-3 py-1.5 text-sm font-medium transition-all"
                style={{ borderColor: cor, backgroundColor: `${cor}15`, color: cor }}
              >
                {product.color}
              </button>
            </div>
          )}

          {/* Estoque */}
          <p className="mt-4 text-xs text-gray-400">
            {product.totalEstoque > 0
              ? `${product.totalEstoque} unidade${product.totalEstoque !== 1 ? "s" : ""} disponíve${product.totalEstoque !== 1 ? "is" : "l"}`
              : "Sem estoque"}
          </p>

          <button
            id="add-to-cart-btn"
            onClick={handleAdd}
            disabled={product.totalEstoque === 0 || added}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-60 hover:opacity-90"
            style={{ backgroundColor: cor }}
          >
            {added ? (
              <>✓ Adicionado ao carrinho!</>
            ) : product.totalEstoque === 0 ? (
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
  storeId,
  allProducts = [],
}: {
  open: boolean;
  onClose: () => void;
  cor: string;
  storeName: string;
  whatsapp: string;
  storeId: string;
  allProducts?: ShowcaseProduct[];
}) {
  const { items, totalItems, totalPrice, remove, increment, decrement, clear } = useCart();
  const [codigoCupom, setCodigoCupom] = useState("");
  // Armazena as regras do cupom (tipo + valor), NÃO o desconto estático
  const [cupomAplicado, setCupomAplicado] = useState<{
    codigo: string;
    tipo: "percentual" | "fixo";
    valor: number;
  } | null>(null);
  const [cupomErro, setCupomErro] = useState("");

  // Fix 3: Opções de frete lidas do localStorage (mesma config do loja.frete.tsx)
  type OpcaoFrete = {
    id: string;
    label: string;
    ativa: boolean;
    valor?: number;
    gratis?: boolean;
    prazo?: string;
    freteGratisMinimoAtivo?: boolean;
    freteGratisMinimo?: number;
  };
  // Recalcula o desconto dinamicamente sempre que o carrinho ou o cupom muda
  const valorDesconto = useMemo(() => {
    if (!cupomAplicado || totalPrice <= 0) return 0;
    if (cupomAplicado.tipo === "percentual") {
      return (totalPrice * cupomAplicado.valor) / 100;
    }
    return Math.min(cupomAplicado.valor, totalPrice);
  }, [cupomAplicado, totalPrice]);

  const opcoesFreteDisponiveis = useMemo((): OpcaoFrete[] => {
    try {
      const raw =
        localStorage.getItem(`vestuli_frete_config_${storeId}`) ||
        localStorage.getItem(`modaly_frete_config_${storeId}`);
      if (!raw) return [];
      const cfg = JSON.parse(raw) as {
        opcoes?: OpcaoFrete[];
        freteGratisMinimoAtivo?: boolean;
        freteGratisMinimo?: string;
      };
      const minGratis = cfg.freteGratisMinimoAtivo
        ? parseFloat((cfg.freteGratisMinimo ?? "0").replace(",", ".")) || 0
        : 0;
      return (cfg.opcoes ?? [])
        .filter((o) => o.ativa)
        .map((o) => ({
          ...o,
          // Frete grátis por valor mínimo examina o subtotal líquido de desconto
          valor:
            o.gratis || (minGratis > 0 && totalPrice - valorDesconto >= minGratis)
              ? 0
              : (o.valor ?? 0),
        }));
    } catch {
      return [];
    }
  }, [storeId, totalPrice, valorDesconto]);

  const [freteSelecionadoId, setFreteSelecionadoId] = useState<string>("");
  const freteSelecionado = opcoesFreteDisponiveis.find((o) => o.id === freteSelecionadoId) ?? null;
  const valorFrete = freteSelecionado?.valor ?? 0;

  const totalFinal = Math.max(totalPrice - valorDesconto + valorFrete, 0);

  const aplicarCupom = () => {
    const codigo = codigoCupom.trim().toUpperCase();
    if (!codigo) return;
    try {
      const raw =
        localStorage.getItem(`vestuli_cupons_${storeId}`) ||
        localStorage.getItem(`modaly_cupons_${storeId}`);
      const lista = raw ? (JSON.parse(raw) as Array<{
        id: string; codigo: string; tipo: "percentual" | "fixo"; valor: number;
        usos: number; ativo: boolean; limite?: number; validade?: string;
      }>) : [];
      const cupom = lista.find((c) => c.codigo === codigo);
      if (!cupom) { setCupomErro("Cupom não encontrado."); return; }
      if (!cupom.ativo) { setCupomErro("Este cupom está inativo."); return; }
      if (cupom.validade) {
        const datePart = cupom.validade.slice(0, 10);
        if (new Date(`${datePart}T23:59:59.999`).getTime() < Date.now()) {
          setCupomErro("Este cupom expirou."); return;
        }
      }
      if (cupom.limite && cupom.usos >= cupom.limite) {
        setCupomErro("Limite de uso deste cupom atingido."); return;
      }
      // Salva as regras — o desconto será calculado dinamicamente
      setCupomAplicado({ codigo: cupom.codigo, tipo: cupom.tipo, valor: cupom.valor });
      setCupomErro("");
    } catch {
      setCupomErro("Erro ao validar cupom.");
    }
  };

  const removerCupom = () => {
    setCupomAplicado(null);
    setCodigoCupom("");
    setCupomErro("");
  };

  function handleCheckout() {
    // ── 1) Incrementa uso do cupom ──────────────────────────────────
    if (cupomAplicado) {
      try {
        const chave = `vestuli_cupons_${storeId}`;
        const raw =
          localStorage.getItem(chave) || localStorage.getItem(`modaly_cupons_${storeId}`);
        if (raw) {
          const lista = JSON.parse(raw) as Array<{ codigo: string; usos: number }>;
          const atualizado = lista.map((c) =>
            c.codigo === cupomAplicado.codigo ? { ...c, usos: c.usos + 1 } : c,
          );
          localStorage.setItem(chave, JSON.stringify(atualizado));
        }
      } catch { /* silencia */ }
    }

    // ── 2) Persiste o pedido no histórico da loja ───────────────────
    try {
      const chaveOrders = `vestuli_orders_${storeId}`;
      const rawOrders =
        localStorage.getItem(chaveOrders) || localStorage.getItem(`modaly_orders_${storeId}`);
      const existentes = JSON.parse(rawOrders ?? "[]") as Array<{ numero?: string }>;
      let maxNum = 1000;
      for (const ord of existentes) {
        const n = parseInt(String(ord.numero ?? "").replace(/\D/g, ""), 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
      const numeroPedido = `#${maxNum + 1}`;
      const novoPedido = {
        id: crypto.randomUUID(),
        numero: numeroPedido,
        cliente: "Cliente Vitrine",
        telefone: "",
        cidade: "",
        criadoEm: new Date().toISOString(),
        status: "novo",
        origem: "Checkout",
        pagamento: "Pix",
        // Fix 3: salva a opção de entrega escolhida (ou padrão) e o valor real do frete
        entrega: freteSelecionado?.label ?? "A definir",
        endereco: "",
        frete: valorFrete,
        desconto: cupomAplicado ? valorDesconto : 0,
        cupom: cupomAplicado?.codigo ?? undefined,
        itens: items.map((i) => ({
          produtoId: i.id,
          nome: i.nome,
          tamanho: i.tamanho,
          cor: i.cor,
          qtd: i.quantidade,
          preco: i.preco,
        })),
      };
      localStorage.setItem(chaveOrders, JSON.stringify([novoPedido, ...existentes]));
    } catch { /* silencia — nunca bloquear o checkout */ }

    // ── 3) Abre WhatsApp e limpa estado ─────────────────────────────
    const infoCupom = cupomAplicado
      ? { codigo: cupomAplicado.codigo, desconto: valorDesconto }
      : undefined;
    const infoFrete = freteSelecionado
      ? { label: freteSelecionado.label, valor: valorFrete }
      : undefined;
    openWhatsAppCheckout(whatsapp, storeName, items, totalFinal, infoCupom, infoFrete);
    clear();
    setCupomAplicado(null);
    setCodigoCupom("");
    setFreteSelecionadoId("");
    onClose();
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
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
            <p className="text-xs text-gray-400">
              {totalItems} {totalItems === 1 ? "item" : "itens"}
            </p>
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
                      <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                        {item.nome}
                      </p>
                      {(item.tamanho !== "Único" || item.cor) && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {[item.tamanho !== "Único" ? item.tamanho : "", item.cor]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold" style={{ color: cor }}>
                        {brl(item.preco * item.quantidade)}
                      </p>
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
                          {item.quantidade === 1 ? (
                            <X className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {item.quantidade}
                        </span>
                        <button
                          onClick={() => {
                            const prod = allProducts.find((p) => p.id === item.id);
                            const maxEstoque = prod ? prod.totalEstoque : 99;
                            if (item.quantidade < maxEstoque) {
                              increment(item.id, item.tamanho, item.cor);
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
                          disabled={(() => {
                            const prod = allProducts.find((p) => p.id === item.id);
                            return prod ? item.quantidade >= prod.totalEstoque : false;
                          })()}
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
            {/* Campo de cupom */}
            {!cupomAplicado ? (
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cupom de desconto"
                    value={codigoCupom}
                    onChange={(e) => { setCodigoCupom(e.target.value.toUpperCase()); setCupomErro(""); }}
                    className="h-9 flex-1 rounded-xl border border-gray-200 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-current focus:outline-none focus:ring-2 focus:ring-current/20 uppercase"
                    style={{ "--tw-ring-color": `${cor}33` } as React.CSSProperties}
                  />
                  <button
                    onClick={aplicarCupom}
                    className="h-9 rounded-xl px-3 text-xs font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: cor }}
                  >
                    Aplicar
                  </button>
                </div>
                {cupomErro && <p className="mt-1 text-xs text-red-500">{cupomErro}</p>}
              </div>
            ) : (
              <div className="mb-4 flex items-center justify-between rounded-xl bg-green-50 px-3 py-2">
                <span className="text-xs font-semibold text-green-700">
                  Cupom <span className="font-bold">{cupomAplicado.codigo}</span> aplicado
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-green-700">−{brl(valorDesconto)}</span>
                  <button onClick={removerCupom} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
            {/* Fix 3: Seletor de frete — opções configuradas no módulo Frete da loja */}
            {opcoesFreteDisponiveis.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold text-gray-500">Entrega</p>
                <div className="space-y-1.5">
                  {opcoesFreteDisponiveis.map((opcao) => (
                    <button
                      key={opcao.id}
                      onClick={() => setFreteSelecionadoId(opcao.id)}
                      className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all"
                      style={
                        freteSelecionadoId === opcao.id
                          ? { borderColor: cor, backgroundColor: `${cor}12`, color: cor }
                          : { borderColor: "#e5e7eb", color: "#374151" }
                      }
                    >
                      <span className="font-medium">{opcao.label}</span>
                      <span className="font-semibold">
                        {opcao.valor === 0 ? "Grátis" : brl(opcao.valor ?? 0)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Totais */}
            <div className="mb-4 space-y-1">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{brl(totalPrice)}</span>
              </div>
              {cupomAplicado && (
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>Desconto</span>
                  <span>−{brl(valorDesconto)}</span>
                </div>
              )}
              {/* Fix 3: linha de frete nos totais */}
              {freteSelecionado && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Frete ({freteSelecionado.label})</span>
                  <span>{valorFrete === 0 ? "Grátis" : `+ ${brl(valorFrete)}`}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span>{brl(totalFinal)}</span>
              </div>
            </div>
            <button
              id="whatsapp-checkout-btn"
              onClick={handleCheckout}
              disabled={!whatsapp}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#25D366" }}
            >
              <MessageCircle className="h-4 w-4" />
              Finalizar pelo WhatsApp
            </button>
            <p className="mt-2 text-center text-[11px] text-gray-400">
              Voce sera redirecionada para o WhatsApp da loja
            </p>
          </div>
        )}

      </div>
    </>
  );
}

// ─── Info Card ────────────────────────────────────────────────────
function InfoCard({
  icon,
  title,
  text,
  cor,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  cor: string;
}) {
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
