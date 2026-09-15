import { useState, useMemo, useEffect } from "react";
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
  AlertCircle,
  CheckCircle,
  User,
  Phone,
  Home,
  CreditCard,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CartProvider, useCart, type CartItem } from "@/lib/cart";
import { openWhatsAppCheckout, formatWhatsAppMessage } from "@/lib/whatsapp";
import {
  mergeInventoryWithShowcase,
  loadShowcaseConfigs,
  type ShowcaseProduct,
} from "@/lib/showcase-store";
import { getVitrineSettings, type VitrineSettings } from "@/lib/vitrine-settings";
import { generatePixPayload, generatePixQrCodeUrl } from "@/lib/pix";
import { calculateOrderNet } from "@/lib/fees";

// ─── Route ───────────────────────────────────────────────────────
export const Route = createFileRoute("/vitrine/$storeSlug")({
  head: ({ params }) => ({
    meta: [
      { title: `Vitrine Online — Vestui` },
      {
        name: "description",
        content:
          "Conheça as novidades e compre online com atendimento direto no WhatsApp.",
      },
      { property: "og:title", content: `Vitrine Online — Vestui` },
      {
        property: "og:description",
        content: "Conheça nossas peças e compre direto pelo WhatsApp.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: `https://vestui.com.br/vitrine/${params.storeSlug}`,
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `Vitrine Online — Vestui` },
      {
        name: "twitter:description",
        content: "Conheça nossas peças e compre direto pelo WhatsApp.",
      },
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
  metadata?: Record<string, unknown> | null;
};

// ─── Utilitários ──────────────────────────────────────────────────
function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CATEGORIAS_PADRAO = ["Tudo"] as const;

// ─── Root (wraps CartProvider) ────────────────────────────────────
function VitrineRoot() {
  const { storeSlug } = Route.useParams();
  return (
    <CartProvider storeKey={storeSlug}>
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
        // SEGURANÇA: metadata contém chavePix (PII da lojista) — NÃO incluir em queries públicas.
        // vitrineSettings (cor, logo, etc.) vêm via campo dedicado sem PII.
        .select("id, name, phone, city, owner_id, metadata")
        .eq("slug", storeSlug)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as StoreData;
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

  // Deep link: ao acessar com ?p=id ou ?produto=id, abre o modal da peça automaticamente
  useEffect(() => {
    if (typeof window === "undefined" || !allProducts.length) return;
    const params = new URLSearchParams(window.location.search);
    const pId = params.get("p") || params.get("produto");
    if (pId) {
      const found = allProducts.find((p) => p.id === pId);
      if (found) setSelectedProduct(found);
    }
  }, [allProducts]);

  // ── Filtros dinâmicos ─────────────────────────────────────────
  const categorias = useMemo(() => {
    const unique = Array.from(
      new Set(allProducts.filter((p) => p.showcase.ativo !== false).map((p) => p.category)),
    ).sort();
    return ["Tudo", ...unique];
  }, [allProducts]);

  const produtos = useMemo(
    () =>
      allProducts.filter(
        (p) =>
          p.showcase.ativo !== false &&
          (categoria === "Tudo" || p.category === categoria) &&
          p.name.toLowerCase().includes(busca.toLowerCase()),
      ),
    [allProducts, busca, categoria],
  );

  const destaques = allProducts.filter((p) => p.showcase.ativo !== false && p.showcase.destaque);

  // storeId usado para ler cupons e orders do localStorage.
  // Fallback para storeSlug em preview demo (sem registro no banco).
  const storeId = store?.id ?? storeSlug;
  type StoreMetadataObj = { vitrineSettings?: VitrineSettings };
  const dbVitrineSettings = (store?.metadata as StoreMetadataObj | null)?.vitrineSettings;
  const vitrineSettings = dbVitrineSettings
    ? { ...getVitrineSettings(storeId), ...dbVitrineSettings }
    : getVitrineSettings(storeId);
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
              const semEstoque = p.totalEstoque === 0;
              const foto =
                p.fotoEfetiva ??
                `https://placehold.co/400x400/f5f5f5/999?text=${encodeURIComponent(p.name)}`;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`group relative flex-shrink-0 w-52 overflow-hidden rounded-3xl border border-white bg-white shadow-sm transition-all ${
                    semEstoque
                      ? "cursor-not-allowed opacity-60"
                      : "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  }`}
                >
                  <div className="relative h-52 w-full overflow-hidden bg-gray-100">
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
                Vestui
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
        vitrineSettings={vitrineSettings}
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
  const sizeEntries = Object.entries(sizesObj);
  const hasMultipleSizes = sizeEntries.length > 0 && !(sizeEntries.length === 1 && sizeEntries[0]![0] === "Único");

  // Primeiro tamanho disponível com estoque > 0, ou o primeiro tamanho, ou "Único"
  const defaultSize = sizeEntries.find(([, qty]) => qty > 0)?.[0] ?? sizeEntries[0]?.[0] ?? "Único";

  const [tamanho, setTamanho] = useState(defaultSize);
  const [cor2, setCor2] = useState(product.color ?? "");
  const [added, setAdded] = useState(false);

  const precoFinal = product.precoEfetivo;
  const temPromocao = product.emPromocao;
  const foto =
    product.fotoEfetiva ??
    `https://placehold.co/600x800/f5f5f5/999?text=${encodeURIComponent(product.name)}`;

  // Estoque específico do tamanho selecionado
  const estoqueTamanho = (tamanho in sizesObj ? sizesObj[tamanho] : product.totalEstoque) ?? 0;

  function handleAdd() {
    if (estoqueTamanho <= 0) return;
    const item: CartItem = {
      id: product.id,
      nome: product.name,
      imagem: foto,
      preco: precoFinal,
      tamanho,
      cor: cor2,
      quantidade: 1,
      // Fix QA/Dev: Teto de estoque restrito ao tamanho exato escolhido
      maxQuantity: estoqueTamanho,
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
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-gray-800 hover:bg-black/20 transition-colors cursor-pointer"
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

          {/* Tamanhos — UI Apple: todos visíveis; zerados riscados com feedback tátil */}
          {hasMultipleSizes && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tamanho
                </p>
                {estoqueTamanho > 0 && (
                  <span className="text-[11px] text-gray-500">
                    {estoqueTamanho === 1 ? (
                      <span className="font-semibold text-amber-600">⚡ Última unidade no tamanho {tamanho}</span>
                    ) : estoqueTamanho <= 3 ? (
                      <span className="text-amber-600 font-medium">Apenas {estoqueTamanho} unidades no tamanho {tamanho}</span>
                    ) : (
                      <span>{estoqueTamanho} unidades no tamanho {tamanho}</span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {sizeEntries.map(([t, qty]) => {
                  const isAvailable = qty > 0;
                  const isSelected = tamanho === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setTamanho(t)}
                      className={`relative min-w-[2.75rem] rounded-xl border px-3 py-1.5 text-sm font-medium transition-all ${
                        !isAvailable
                          ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300 line-through"
                          : isSelected
                          ? "font-semibold shadow-sm cursor-pointer"
                          : "border-gray-200 text-gray-700 hover:border-gray-300 cursor-pointer"
                      }`}
                      style={
                        isSelected && isAvailable
                          ? { borderColor: cor, backgroundColor: `${cor}15`, color: cor }
                          : undefined
                      }
                      title={!isAvailable ? `Tamanho ${t} esgotado` : `${qty} un. disponíveis`}
                    >
                      {t}
                    </button>
                  );
                })}
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
                type="button"
                onClick={() => setCor2(product.color!)}
                className="rounded-xl border px-3 py-1.5 text-sm font-medium transition-all cursor-pointer"
                style={{ borderColor: cor, backgroundColor: `${cor}15`, color: cor }}
              >
                {product.color}
              </button>
            </div>
          )}

          {/* Estoque dinâmico e semântico */}
          <div className="mt-4 flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                estoqueTamanho > 0 ? "bg-emerald-500" : "bg-red-400"
              }`}
            />
            <p className="text-xs text-gray-500">
              {estoqueTamanho > 0
                ? estoqueTamanho === 1
                  ? "Última unidade disponível neste tamanho"
                  : `${estoqueTamanho} unidades disponíveis no tamanho ${tamanho}`
                : `Tamanho ${tamanho} esgotado`}
            </p>
          </div>

          <button
            id="add-to-cart-btn"
            type="button"
            onClick={handleAdd}
            disabled={product.totalEstoque === 0 || estoqueTamanho === 0 || added}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90 cursor-pointer disabled:cursor-not-allowed shadow-sm"
            style={{ backgroundColor: cor }}
          >
            {added ? (
              <>✓ Adicionado ao carrinho!</>
            ) : product.totalEstoque === 0 ? (
              "Produto esgotado"
            ) : estoqueTamanho === 0 ? (
              "Tamanho esgotado"
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
  vitrineSettings: vs,
}: {
  open: boolean;
  onClose: () => void;
  cor: string;
  storeName: string;
  whatsapp: string;
  storeId: string;
  allProducts?: ShowcaseProduct[];
  /** Configurações da loja vindas do Supabase (inclui dadosPix). Nunca leia localStorage da cliente aqui! */
  vitrineSettings?: VitrineSettings;
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

  // ── Checkout multi-etapa ─────────────────────────────────────────────────
  type CheckoutStep = "cart" | "dados" | "pagamento";
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerRua, setCustomerRua] = useState("");
  const [customerNumero, setCustomerNumero] = useState("");
  const [customerBairro, setCustomerBairro] = useState("");
  const [customerCep, setCustomerCep] = useState("");
  const [customerComplemento, setCustomerComplemento] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "cartao" | "retirada">("pix");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Estado do Pix Dinâmico Asaas ────────────────────────────────────────────
  type PixAsaasStatus = "idle" | "gerando" | "aguardando" | "confirmado" | "expirado" | "erro";
  const [pixAsaasStatus, setPixAsaasStatus] = useState<PixAsaasStatus>("idle");
  const [pixChargeData, setPixChargeData] = useState<{
    chargeId: string;
    pixCode: string;
    encodedImage: string; // QR Code base64 do Asaas (sem API externa)
    expiresAt: string;
  } | null>(null);
  const [pixCountdown, setPixCountdown] = useState(0); // segundos restantes
  const [pixOrderId, setPixOrderId] = useState<string | null>(null); // UUID do pedido criado


  function resetCheckout() {
    setCheckoutStep("cart");
    setCustomerName(""); setCustomerPhone(""); setCustomerEmail("");
    setCustomerRua(""); setCustomerNumero(""); setCustomerBairro("");
    setCustomerCep(""); setCustomerComplemento("");
    setPaymentMethod("pix"); setIsSubmitting(false);
    // Reset Pix dinâmico
    setPixAsaasStatus("idle"); setPixChargeData(null);
    setPixCountdown(0); setPixOrderId(null);
  }

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
        localStorage.getItem(`vestui_frete_config_${storeId}`) ||
        localStorage.getItem(`modaly_frete_config_${storeId}`) ||
        localStorage.getItem(`vestuli_frete_config_${storeId}`);
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
        localStorage.getItem(`vestui_cupons_${storeId}`) ||
        localStorage.getItem(`modaly_cupons_${storeId}`) ||
        localStorage.getItem(`vestuli_cupons_${storeId}`);
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

  // ── Inicia o Pix Dinâmico via Edge Function Asaas ───────────────────────────
  // Chamado quando a cliente clica "Confirmar" com Pix selecionado
  // e a loja tem Vestui Pay ativo (gateway_provider = 'asaas').
  async function handlePixDinamico(orderId: string): Promise<"asaas" | "manual"> {
    setPixAsaasStatus("gerando");
    setPixOrderId(orderId);
    try {
      const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl
        || import.meta.env["VITE_SUPABASE_URL"]
        || "";
      const fnUrl = `${supabaseUrl}/functions/v1/asaas-create-pix`;
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          orderId,
          amount: totalFinal,
          customerName: customerName.trim(),
        }),
      });
      const data = await res.json() as {
        chargeId?: string;
        pixCode?: string;
        encodedImage?: string;
        expiresAt?: string;
        error?: string;
      };

      if (!res.ok || data.error === "vestui_pay_inactive" || !data.chargeId) {
        // Vestui Pay não ativado → cai para o fluxo manual (Pix estático)
        setPixAsaasStatus("idle");
        return "manual";
      }

      setPixChargeData({
        chargeId:     data.chargeId!,
        pixCode:      data.pixCode!,
        encodedImage: data.encodedImage!,
        expiresAt:    data.expiresAt!,
      });
      const secsLeft = Math.floor(
        (new Date(data.expiresAt!).getTime() - Date.now()) / 1000
      );
      setPixCountdown(Math.max(secsLeft, 0));
      setPixAsaasStatus("aguardando");
      return "asaas";
    } catch {
      setPixAsaasStatus("idle");
      return "manual";
    }
  }

  // ── Countdown timer do Pix ───────────────────────────────────────────────────
  useEffect(() => {
    if (pixAsaasStatus !== "aguardando" || pixCountdown <= 0) return;
    const t = setInterval(() => {
      setPixCountdown((s) => {
        if (s <= 1) {
          setPixAsaasStatus("expirado");
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pixAsaasStatus, pixCountdown]);

  // ── Polling de status Pix (a cada 4 segundos) ───────────────────────────────
  useEffect(() => {
    if (pixAsaasStatus !== "aguardando" || !pixChargeData?.chargeId) return;
    const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl
      || import.meta.env["VITE_SUPABASE_URL"]
      || "";
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/asaas-charge-status?chargeId=${pixChargeData.chargeId}&storeId=${storeId}`,
        );
        const { status } = await res.json() as { status: string };
        if (status === "RECEIVED" || status === "CONFIRMED") {
          setPixAsaasStatus("confirmado");
          clearInterval(interval);
          // Limpa carrinho após confirmação automática
          clear();
          setCupomAplicado(null);
          setCodigoCupom("");
          setFreteSelecionadoId("");
        }
      } catch { /* polling falha silenciosamente */ }
    }, 4000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixAsaasStatus, pixChargeData?.chargeId]);

  async function handleCheckout() {

    if (isSubmitting) return;
    setIsSubmitting(true);

    const infoCupom = cupomAplicado
      ? { codigo: cupomAplicado.codigo, desconto: valorDesconto }
      : undefined;
    const infoFrete = freteSelecionado
      ? { label: freteSelecionado.label, valor: valorFrete }
      : undefined;

    // ── 1) Incrementa uso do cupom ──────────────────────────────────
    if (cupomAplicado) {
      try {
        const chave = `vestui_cupons_${storeId}`;
        const raw =
          localStorage.getItem(chave) ||
          localStorage.getItem(`modaly_cupons_${storeId}`) ||
          localStorage.getItem(`vestuli_cupons_${storeId}`);
        if (raw) {
          const lista = JSON.parse(raw) as Array<{ codigo: string; usos: number }>;
          const atualizado = lista.map((c) =>
            c.codigo === cupomAplicado.codigo ? { ...c, usos: c.usos + 1 } : c,
          );
          localStorage.setItem(chave, JSON.stringify(atualizado));
        }
      } catch { /* silencia */ }
    }

    // ── 2) Calcula número sequencial do pedido via Supabase RPC ────
    let numeroPedido = `#${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
    try {
      const { data: rpcNum, error: rpcErr } = await supabase.rpc("generate_order_number", {
        p_store_id: storeId,
      });
      if (!rpcErr && rpcNum) {
        numeroPedido = rpcNum;
      }
    } catch {
      /* fallback com código único garantido */
    }

    // ── 3) Persiste no Supabase (tabela orders) ──────────────────────
    const { fee: calculatedFee, net: calculatedNet } = calculateOrderNet(totalFinal, paymentMethod);

    try {
      const { data: insertedOrder, error } = await supabase.from("orders").insert({
        store_id: storeId,
        numero: numeroPedido,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        customer_address: {
          cep: customerCep.trim(),
          rua: customerRua.trim(),
          numero: customerNumero.trim(),
          bairro: customerBairro.trim(),
          complemento: customerComplemento.trim(),
        },
        items: items.map((i) => ({
          produtoId: i.id,
          nome: i.nome,
          tamanho: i.tamanho,
          cor: i.cor,
          qtd: i.quantidade,
          preco: i.preco,
        })),
        subtotal: totalPrice,
        frete_valor: valorFrete,
        frete_tipo: freteSelecionado?.label ?? null,
        desconto: valorDesconto,
        cupom: cupomAplicado?.codigo ?? null,
        total: totalFinal,
        payment_method: paymentMethod,
        payment_fee: calculatedFee,
        net_amount: calculatedNet,
        payment_status: "pendente",
        status: "novo",
        // gateway_provider, gateway_charge_id, escrow_status definidos pela migration
        // 20260912_vestui_pay_foundation.sql — tipos gerados serão atualizados após apply
      }).select("id").maybeSingle();
      if (error) throw error;

      // ── Pix Dinâmico Asaas: tenta criar cobrança automática ────────────────
      // Se a loja tem Vestui Pay ativo, o Pix dinâmico assume o controle:
      // exibe QR + timer + polling e NÃO abre WhatsApp automaticamente.
      if (paymentMethod === "pix" && insertedOrder?.id) {
        const pixMode = await handlePixDinamico(insertedOrder.id);
        if (pixMode === "asaas") {
          // Pix dinâmico ativo: a vitrine exibe QR Code + aguarda confirmação via webhook
          // NÃO segue para o fluxo WhatsApp
          setIsSubmitting(false);
          return;
        }
        // pixMode === "manual": Vestui Pay inativo → segue para Pix manual com WhatsApp
      }
    } catch (err) {
      console.error("Erro ao salvar pedido no Supabase:", err);
      // fallback: salva no localStorage para não bloquear o checkout
      try {
        const chaveOrders = `vestui_orders_${storeId}`;
        const rawOrders = localStorage.getItem(chaveOrders) || "[]";
        const existentes = JSON.parse(rawOrders) as unknown[];
        localStorage.setItem(chaveOrders, JSON.stringify([{
          id: crypto.randomUUID(),
          numero: numeroPedido,
          cliente: customerName,
          telefone: customerPhone,
          criadoEm: new Date().toISOString(),
          status: "novo",
          pagamento: paymentMethod,
          frete: valorFrete,
          desconto: valorDesconto,
          cupom: cupomAplicado?.codigo,
          itens: items.map((i) => ({
            produtoId: i.id,
            nome: i.nome,
            tamanho: i.tamanho,
            cor: i.cor,
            qtd: i.quantidade,
            preco: i.preco,
          })),
        }, ...existentes]));
      } catch { /* silencia */ }
    }

    // ── 4) Monta mensagem WhatsApp enriquecida com dados da cliente ──
    const enderecoStr = [
      customerRua, customerNumero && `nº ${customerNumero}`,
      customerBairro, customerCep && `CEP ${customerCep}`,
      customerComplemento,
    ].filter(Boolean).join(", ");

    const metodoPagamentoLabel = {
      pix: "💠 Pix",
      cartao: "💳 Cartão de Crédito",
      retirada: "🏪 Retirada na Loja",
    }[paymentMethod];

    const msgExtra = [
      `\n👤 Cliente: ${customerName}`,
      `📱 WhatsApp: ${customerPhone}`,
      enderecoStr ? `📍 Endereço: ${enderecoStr}` : null,
      `💳 Pagamento: ${metodoPagamentoLabel}`,
      `🔖 Pedido: ${numeroPedido}`,
    ].filter(Boolean).join("\n");

    const infoCupomWpp = infoCupom;
    const infoFreteWpp = infoFrete;

    if (!whatsapp) {
      try {
        const msg = formatWhatsAppMessage(storeName, items, totalFinal, infoCupomWpp, infoFreteWpp) + msgExtra;
        void navigator.clipboard?.writeText(msg);
      } catch { /* silencia */ }
      toast.info("WhatsApp da loja não configurado", {
        description: "O resumo do pedido foi copiado! Você pode encaminhar para a loja no WhatsApp.",
      });
    }

    // Monta URL manualmente para incluir dados extras na mensagem
    const baseMsgWpp = formatWhatsAppMessage(storeName, items, totalFinal, infoCupomWpp, infoFreteWpp);
    const fullMsg = baseMsgWpp + msgExtra;
    const digits = (whatsapp || "").replace(/\D/g, "");
    if (digits.length >= 8) {
      const phone = digits.startsWith("55") ? digits : `55${digits}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(fullMsg)}`, "_blank", "noopener,noreferrer");
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullMsg)}`, "_blank", "noopener,noreferrer");
    }

    // ── 5) Limpa estado ──────────────────────────────────────────────
    clear();
    setCupomAplicado(null);
    setCodigoCupom("");
    setFreteSelecionadoId("");
    resetCheckout();
    setIsSubmitting(false);
    onClose();
    toast.success(`Pedido ${numeroPedido} registrado!`, {
      description: "Sua mensagem foi aberta no WhatsApp da boutique.",
    });
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
                            const sizes = (prod?.sizes ?? {}) as Record<string, number>;
                            const maxEstoque =
                              (item.tamanho && item.tamanho in sizes
                                ? sizes[item.tamanho]
                                : prod?.totalEstoque) ??
                              item.maxQuantity ??
                              99;
                            if (item.quantidade < maxEstoque) {
                              increment(item.id, item.tamanho, item.cor);
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          disabled={(() => {
                            const prod = allProducts.find((p) => p.id === item.id);
                            const sizes = (prod?.sizes ?? {}) as Record<string, number>;
                            const maxEstoque =
                              (item.tamanho && item.tamanho in sizes
                                ? sizes[item.tamanho]
                                : prod?.totalEstoque) ??
                              item.maxQuantity ??
                              99;
                            return item.quantidade >= maxEstoque;
                          })()}
                          title={(() => {
                            const prod = allProducts.find((p) => p.id === item.id);
                            const sizes = (prod?.sizes ?? {}) as Record<string, number>;
                            const maxEstoque =
                              (item.tamanho && item.tamanho in sizes
                                ? sizes[item.tamanho]
                                : prod?.totalEstoque) ??
                              item.maxQuantity ??
                              99;
                            return item.quantidade >= maxEstoque
                              ? `Estoque máximo atingido para o tamanho ${item.tamanho} (${maxEstoque} un.)`
                              : undefined;
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
                  <span className="text-xs font-bold text-green-700">-{brl(valorDesconto)}</span>
                  <button onClick={removerCupom} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
            {/* Seletor de frete */}
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
                        {opcao.valor === 0 ? "Gratis" : brl(opcao.valor ?? 0)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Totais */}
            <div className="mb-4 space-y-1">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Subtotal</span><span>{brl(totalPrice)}</span>
              </div>
              {cupomAplicado && (
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>Desconto</span><span>-{brl(valorDesconto)}</span>
                </div>
              )}
              {freteSelecionado && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Frete ({freteSelecionado.label})</span>
                  <span>{valorFrete === 0 ? "Gratis" : `+ ${brl(valorFrete)}`}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-base font-bold text-gray-900">
                <span>Total</span><span>{brl(totalFinal)}</span>
              </div>
            </div>
            {!whatsapp && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs leading-relaxed text-amber-700">
                  Esta loja nao configurou o WhatsApp. Seu pedido sera copiado.
                </p>
              </div>
            )}
            <button
              onClick={() => setCheckoutStep("dados")}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: cor }}
            >
              <User className="h-4 w-4" />
              Continuar para dados de entrega
            </button>
            <p className="mt-2 text-center text-[11px] text-gray-400">
              Informe seus dados para finalizar o pedido
            </p>
          </div>
        )}
      </div>

      {/* Checkout Overlay: Etapa Dados */}
      {checkoutStep === "dados" && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCheckoutStep("cart")} />
          <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-display text-base font-bold text-gray-900">Dados de entrega</h3>
                <p className="text-xs text-gray-400">Etapa 1 de 2</p>
              </div>
              <button onClick={() => setCheckoutStep("cart")} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Nome completo *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" placeholder="Seu nome" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": `${cor}33` } as React.CSSProperties} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">WhatsApp *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="tel" placeholder="(99) 99999-9999" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": `${cor}33` } as React.CSSProperties} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">E-mail (opcional)</label>
                <input type="email" placeholder="seu@email.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": `${cor}33` } as React.CSSProperties} />
              </div>
              <p className="pt-1 text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" /> Endereco de entrega
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input type="text" placeholder="Rua / Av." value={customerRua} onChange={(e) => setCustomerRua(e.target.value)}
                    className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": `${cor}33` } as React.CSSProperties} />
                </div>
                <input type="text" placeholder="No" value={customerNumero} onChange={(e) => setCustomerNumero(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": `${cor}33` } as React.CSSProperties} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Bairro" value={customerBairro} onChange={(e) => setCustomerBairro(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": `${cor}33` } as React.CSSProperties} />
                <input type="text" placeholder="CEP" value={customerCep} onChange={(e) => setCustomerCep(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": `${cor}33` } as React.CSSProperties} />
              </div>
              <input type="text" placeholder="Complemento (apto, bloco...)" value={customerComplemento} onChange={(e) => setCustomerComplemento(e.target.value)}
                className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": `${cor}33` } as React.CSSProperties} />
            </div>
            <div className="px-5 pb-6">
              <button
                onClick={() => {
                  if (!customerName.trim() || !customerPhone.trim()) {
                    toast.error("Preencha nome e WhatsApp para continuar.");
                    return;
                  }
                  setCheckoutStep("pagamento");
                }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: cor }}
              >
                <CreditCard className="h-4 w-4" />
                Ir para pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Overlay: Etapa Pagamento */}
      {checkoutStep === "pagamento" && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCheckoutStep("dados")} />
          <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-display text-base font-bold text-gray-900">Forma de pagamento</h3>
                <p className="text-xs text-gray-400">Etapa 2 de 2</p>
              </div>
              <button onClick={() => setCheckoutStep("dados")} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{brl(totalPrice)}</span></div>
                {cupomAplicado && <div className="flex justify-between text-green-600"><span>Desconto</span><span>-{brl(valorDesconto)}</span></div>}
                {freteSelecionado && <div className="flex justify-between text-gray-500"><span>Frete</span><span>{valorFrete === 0 ? "Gratis" : `+ ${brl(valorFrete)}`}</span></div>}
                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>{brl(totalFinal)}</span></div>
              </div>
              <p className="text-xs font-semibold text-gray-500">Como deseja pagar?</p>
              {([
                { id: "pix" as const, label: "Pix", desc: "Taxa 0% - Direto para a loja", icon: "💠" },
                { id: "cartao" as const, label: "Cartao de Credito", desc: "Taxa operadora 3,5% aplicada", icon: "💳" },
                { id: "retirada" as const, label: "Pagar na Retirada", desc: "Pagamento no balcao da loja", icon: "🏪" },
              ] as const).map((opt) => (
                <button key={opt.id} onClick={() => setPaymentMethod(opt.id)}
                  className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all"
                  style={paymentMethod === opt.id ? { borderColor: cor, backgroundColor: `${cor}10` } : { borderColor: "#e5e7eb" }}>
                  <span className="text-xl">{opt.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                  {paymentMethod === opt.id && <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: cor }} />}
                </button>
              ))}

              {/* ── Bloco Pix: Dinâmico (Vestui Pay) ou Manual (fallback) ─── */}
              {paymentMethod === "pix" && (() => {
                // ── Estado: Gerando cobrança ─────────────────────────────────
                if (pixAsaasStatus === "gerando") {
                  return (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 flex flex-col items-center gap-3 text-xs">
                      <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                      <p className="font-semibold text-emerald-800">Gerando QR Code Pix...</p>
                      <p className="text-emerald-600 text-center">Conectando com o sistema de pagamento. Aguarde um instante.</p>
                    </div>
                  );
                }

                // ── Estado: Aguardando pagamento (QR Code dinâmico ativo) ────
                if (pixAsaasStatus === "aguardando" && pixChargeData) {
                  const mins = String(Math.floor(pixCountdown / 60)).padStart(2, "0");
                  const secs = String(pixCountdown % 60).padStart(2, "0");
                  return (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                          💠 Pix — Pagamento Automático
                        </span>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                          ⏱ {mins}:{secs}
                        </span>
                      </div>

                      {/* QR Code base64 do Asaas — sem dependência de API externa */}
                      <div className="flex flex-col items-center gap-2">
                        {pixChargeData.encodedImage ? (
                          <img
                            src={`data:image/png;base64,${pixChargeData.encodedImage}`}
                            alt="QR Code Pix"
                            width={160}
                            height={160}
                            className="rounded-xl border-2 border-emerald-200 bg-white p-2 shadow-sm"
                          />
                        ) : null}
                        <p className="text-[10px] font-semibold text-emerald-700">
                          Valor: <span className="font-bold text-emerald-900">{brl(totalFinal)}</span>
                        </p>
                      </div>

                      {/* Pix Copia e Cola */}
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-700 mb-1">Pix Copia e Cola</p>
                        <div className="flex gap-2 items-stretch">
                          <div className="flex-1 h-[52px] overflow-hidden rounded-lg border border-emerald-100 bg-white px-2 py-1.5">
                            <p className="break-all font-mono text-[9px] leading-tight text-gray-700 select-all">
                              {pixChargeData.pixCode}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard?.writeText(pixChargeData.pixCode);
                              toast.success("Pix Copia e Cola copiado! ✅", {
                                description: "Abra seu banco → Pix → Copia e Cola.",
                              });
                            }}
                            className="shrink-0 px-3 rounded-lg text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: "#00A857" }}
                          >
                            📋 Copiar
                          </button>
                        </div>
                      </div>

                      {/* Instrução */}
                      <div className="rounded-lg bg-emerald-100/60 px-3 py-2">
                        <p className="text-[10px] leading-relaxed text-emerald-800">
                          <strong>Como pagar:</strong> Escaneie o QR Code ou copie o código acima → abra o app do seu banco → escolha <em>Pix → Copia e Cola</em> → confirme. O pedido é confirmado <strong>automaticamente</strong> — sem precisar enviar comprovante! 🎉
                        </p>
                      </div>

                      {/* Polling indicator */}
                      <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Verificando pagamento automaticamente...
                      </div>
                    </div>
                  );
                }

                // ── Estado: Pagamento Confirmado ─────────────────────────────
                if (pixAsaasStatus === "confirmado") {
                  return (
                    <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-5 space-y-3 text-center">
                      <div className="flex justify-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                          <CheckCircle className="h-8 w-8 text-emerald-600" />
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-emerald-900 text-base">Pagamento confirmado! 🎉</p>
                        <p className="text-xs text-emerald-700 mt-0.5">Seu pedido foi registrado com sucesso.</p>
                      </div>
                      <div className="rounded-lg bg-white border border-emerald-200 px-3 py-2 text-xs text-left space-y-0.5">
                        <p className="text-gray-500">Valor pago:</p>
                        <p className="font-bold text-gray-900 text-base">{brl(totalFinal)}</p>
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        📦 A boutique foi notificada e já está separando seu pedido.
                      </p>
                      {whatsapp && (
                        <button
                          type="button"
                          onClick={() => {
                            const digits = whatsapp.replace(/\D/g, "");
                            const phone = digits.startsWith("55") ? digits : `55${digits}`;
                            window.open(`https://wa.me/${phone}`, "_blank", "noopener,noreferrer");
                          }}
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                          style={{ backgroundColor: "#25D366" }}
                        >
                          <MessageCircle className="h-4 w-4" /> Falar com a boutique
                        </button>
                      )}
                    </div>
                  );
                }

                // ── Estado: Expirado ──────────────────────────────────────────
                if (pixAsaasStatus === "expirado") {
                  return (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center space-y-2 text-xs">
                      <p className="font-semibold text-red-700">⏰ QR Code expirado</p>
                      <p className="text-red-600">O tempo de pagamento encerrou. Inicie um novo pedido.</p>
                      <button
                        type="button"
                        onClick={resetCheckout}
                        className="mt-1 px-4 py-2 rounded-lg text-white text-xs font-semibold"
                        style={{ backgroundColor: cor }}
                      >
                        Novo pedido
                      </button>
                    </div>
                  );
                }

                // ── Estado: idle — Pix Manual (fallback / Vestui Pay inativo) ─
                const pixKey     = vs?.chavePix ?? "";
                const pixTipo    = vs?.tipoChavePix ?? "cpf";
                const pixTitular = vs?.titularPix ?? "";
                const pixCidade  = vs?.estado ?? "Brasil";
                const pixPayload = pixKey
                  ? generatePixPayload({ key: pixKey, amount: totalFinal,
                      merchantName: pixTitular || storeName, merchantCity: pixCidade, txId: "VESTUI" })
                  : "";
                const pixQrUrl = pixPayload ? generatePixQrCodeUrl(pixPayload, 160) : "";
                const tipoLabel: Record<string, string> = {
                  cpf: "CPF", cnpj: "CNPJ", telefone: "Celular",
                  email: "E-mail", aleatoria: "Chave Aleatória",
                };
                return (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-800">💠 Pagamento via Pix</span>
                      {pixKey && (
                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {tipoLabel[pixTipo] ?? "Pix"}
                        </span>
                      )}
                    </div>
                    {pixKey ? (
                      <>
                        <div>
                          <p className="text-[10px] font-semibold text-emerald-700 mb-1">Chave Pix</p>
                          <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-emerald-100 font-mono text-gray-800">
                            <span className="truncate mr-2 font-semibold text-[12px]">{pixKey}</span>
                            <button type="button"
                              onClick={() => { void navigator.clipboard?.writeText(pixKey); toast.success("Chave Pix copiada! ✅"); }}
                              className="shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold text-white"
                              style={{ backgroundColor: cor }}>Copiar chave</button>
                          </div>
                          {pixTitular && <p className="mt-1 text-[11px] text-emerald-700">Favorecido: <span className="font-semibold">{pixTitular}</span></p>}
                        </div>
                        {pixPayload && (
                          <div className="flex gap-2">
                            <img src={pixQrUrl} alt="QR Code Pix" width={80} height={80}
                              className="rounded-lg border border-emerald-100 bg-white p-1 shrink-0" />
                            <div className="flex flex-1 flex-col justify-between">
                              <div className="h-[60px] overflow-hidden rounded-lg border border-emerald-100 bg-white px-2 py-1.5">
                                <p className="break-all font-mono text-[9px] leading-tight text-gray-700 select-all">{pixPayload}</p>
                              </div>
                              <button type="button"
                                onClick={() => { void navigator.clipboard?.writeText(pixPayload); toast.success("Pix Copia e Cola copiado! ✅"); }}
                                className="mt-1 flex h-8 w-full items-center justify-center gap-1 rounded-lg text-[11px] font-semibold text-white"
                                style={{ backgroundColor: "#00A857" }}>📋 Copiar Pix Copia e Cola</button>
                            </div>
                          </div>
                        )}
                        <div className="rounded-lg bg-emerald-100/60 px-3 py-2">
                          <p className="text-[10px] leading-relaxed text-emerald-800">
                            <strong>Como pagar:</strong> Copie a chave ou código → abra seu banco → Pix Copia e Cola → confirme → clique em <em>"Confirmar e abrir WhatsApp"</em> para enviar o comprovante à loja.
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-[11px] text-emerald-700">A chave Pix será enviada no WhatsApp da boutique após você confirmar o pedido.</p>
                    )}
                  </div>
                );
              })()}


              {paymentMethod === "cartao" && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 space-y-1 text-xs">
                  <p className="font-semibold text-blue-800">Detalhamento financeiro</p>
                  <div className="flex justify-between text-blue-700"><span>Total pago pela cliente</span><span>{brl(totalFinal)}</span></div>
                  <div className="flex justify-between text-blue-600"><span>Taxa operadora (3,5%)</span><span>- {brl(totalFinal * 0.035)}</span></div>
                  <div className="flex justify-between font-bold text-blue-900 border-t border-blue-200 pt-1"><span>Líquido para a loja</span><span>{brl(Math.max(totalFinal - totalFinal * 0.035, 0))}</span></div>
                  <p className="text-[10px] text-blue-500 pt-0.5">Taxa cobrada pela operadora de cartão, não pela Vestui.</p>
                  <div className="mt-2 rounded-lg border border-blue-200 bg-white/70 px-3 py-2">
                    <p className="text-[10px] leading-relaxed text-blue-700">
                      <strong>Como pagar:</strong> Clique em <em>"Confirmar e abrir WhatsApp"</em> → a loja enviará o link ou combinará o pagamento na maquininha.
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === "cartao" && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 space-y-1 text-xs">
                  <p className="font-semibold text-blue-800">Detalhamento financeiro</p>
                  <div className="flex justify-between text-blue-700"><span>Total pago pela cliente</span><span>{brl(totalFinal)}</span></div>
                  <div className="flex justify-between text-blue-600"><span>Taxa operadora (3,5%)</span><span>- {brl(totalFinal * 0.035)}</span></div>
                  <div className="flex justify-between font-bold text-blue-900 border-t border-blue-200 pt-1"><span>Liquido para a loja</span><span>{brl(Math.max(totalFinal - totalFinal * 0.035, 0))}</span></div>
                  <p className="text-[10px] text-blue-500 pt-0.5">Esta taxa e cobrada pela operadora de cartao, nao pela Vestui.</p>
                </div>
              )}
            </div>
            <div className="px-5 pb-6">
              <button
                onClick={() => { void handleCheckout(); }}
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "#25D366" }}
              >
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando pedido...</>
                  : <><MessageCircle className="h-4 w-4" /> Confirmar e abrir WhatsApp</>
                }
              </button>
              <p className="mt-2 text-center text-[11px] text-gray-400">
                Pedido de {customerName || "voce"} sera enviado para a boutique
              </p>
            </div>
          </div>
        </div>
      )}
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
