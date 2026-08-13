import type { ProductGridSettings, ThemeSettings } from "@/lib/theme-engine/schema";
import type { ShowcaseProduct } from "@/lib/showcase-store";
import { brl } from "@/lib/format";

interface Props {
  settings: ProductGridSettings;
  theme: ThemeSettings;
  products?: ShowcaseProduct[];
}

function getProducts(settings: ProductGridSettings, all: ShowcaseProduct[]): ShowcaseProduct[] {
  let pool = all.filter((p) => p.showcase.ativo);
  if (settings.source === "featured") pool = pool.filter((p) => p.showcase.destaque);
  if (settings.source === "newest")
    pool = pool.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  return pool.slice(0, settings.count);
}

const COL_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
};

export function ProductGridSection({ settings, theme, products = [] }: Props) {
  const items = getProducts(settings, products);

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

function ProductThemeCard({ product, theme }: { product: ShowcaseProduct; theme: ThemeSettings }) {
  const hasPromo = product.emPromocao && product.showcase.precoPromocional != null;
  const foto =
    product.fotoEfetiva ??
    `https://placehold.co/400x520/f5f5f5/999?text=${encodeURIComponent(product.name)}`;

  return (
    <article className="group cursor-pointer">
      <div className="relative overflow-hidden" style={{ background: theme.colorCanvas }}>
        <img
          src={foto}
          alt={product.name}
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
        {product.totalEstoque === 0 && (
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
          {product.name}
        </h3>
        <p className="mt-1 text-xs" style={{ color: `${theme.colorForeground}70` }}>
          {product.category}
        </p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[0.9rem]" style={{ color: theme.colorForeground }}>
            {brl(product.precoEfetivo)}
          </span>
          {hasPromo && (
            <span className="text-xs line-through" style={{ color: `${theme.colorForeground}55` }}>
              {brl(product.sale_price)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
