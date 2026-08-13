import type { ProductGridSettings, ThemeSettings } from "@/lib/theme-engine/schema";
import { produtos, type Produto } from "@/data/loja";
import { brl } from "@/lib/format";

interface Props {
  settings: ProductGridSettings;
  theme: ThemeSettings;
}

function getProducts(settings: ProductGridSettings): Produto[] {
  let pool = [...produtos].filter((p) => p.ativo);
  if (settings.source === "featured") pool = pool.filter((p) => p.destaque);
  if (settings.source === "newest")
    pool = pool.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  return pool.slice(0, settings.count);
}

const COL_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
};

export function ProductGridSection({ settings, theme }: Props) {
  const items = getProducts(settings);

  return (
    <section
      className="py-12 md:py-16"
      style={{ background: theme.colorBackground, fontFamily: `'${theme.fontBody}', sans-serif` }}
    >
      <div className="mx-auto max-w-7xl px-5">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            {settings.kicker && (
              <p
                className="text-[11px] uppercase tracking-[0.2em]"
                style={{ color: `${theme.colorForeground}80` }}
              >
                {settings.kicker}
              </p>
            )}
            <h2
              className="mt-1.5 text-2xl font-normal md:text-3xl"
              style={{
                color: theme.colorForeground,
                fontFamily: `'${theme.fontDisplay}', serif`,
              }}
            >
              {settings.title}
            </h2>
          </div>
          {settings.showViewAll && (
            <span
              className="shrink-0 text-[12px] uppercase tracking-[0.12em] cursor-pointer pb-0.5 border-b"
              style={{ color: theme.colorForeground, borderColor: theme.colorForeground }}
            >
              Ver tudo
            </span>
          )}
        </div>

        {/* Product Grid */}
        <div
          className={`mt-8 grid gap-x-4 gap-y-8 ${COL_CLASS[settings.columns] ?? "grid-cols-2 md:grid-cols-4"}`}
        >
          {items.length === 0 ? (
            <p
              className="col-span-full py-12 text-center text-sm"
              style={{ color: `${theme.colorForeground}60` }}
            >
              Nenhum produto ativo encontrado.
            </p>
          ) : (
            items.map((product) => (
              <ProductThemeCard key={product.id} product={product} theme={theme} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ProductThemeCard({ product, theme }: { product: Produto; theme: ThemeSettings }) {
  const hasPromo = product.precoPromocional != null;

  return (
    <article className="group cursor-pointer">
      <div className="relative overflow-hidden" style={{ background: theme.colorCanvas }}>
        <img
          src={product.imagem}
          alt={product.nome}
          className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {hasPromo && (
          <span
            className="absolute left-2.5 top-2.5 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em]"
            style={{
              background: theme.colorBackground,
              color: theme.colorForeground,
              borderRadius: "var(--t-radius, 0px)",
            }}
          >
            Promoção
          </span>
        )}
        {product.estoque === 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.15em]"
            style={{ background: `${theme.colorForeground}40`, color: theme.colorBackground }}
          >
            Esgotado
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="truncate text-[0.9rem]" style={{ color: theme.colorForeground }}>
          {product.nome}
        </h3>
        <p className="mt-1 text-xs" style={{ color: `${theme.colorForeground}70` }}>
          {product.categoria}
        </p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[0.9rem]" style={{ color: theme.colorForeground }}>
            {brl(hasPromo ? (product.precoPromocional ?? product.preco) : product.preco)}
          </span>
          {hasPromo && (
            <span className="text-xs line-through" style={{ color: `${theme.colorForeground}55` }}>
              {brl(product.preco)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
