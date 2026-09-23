import type { CategoryBarSettings, ThemeSettings } from "@/lib/theme-engine/schema";
import type { ShowcaseProduct } from "@/lib/showcase-store";
import { DEFAULT_STORE_CATEGORIES, getCategoryLabel } from "@/lib/categories";

interface Props {
  settings: CategoryBarSettings;
  theme: ThemeSettings;
  products?: ShowcaseProduct[];
}

export function CategoryBarSection({ settings, theme, products = [] }: Props) {
  if (!settings.enabled) return null;

  // Derive unique categories from real inventory data
  const rawCategories = Array.from(new Set(products.map((p) => p.category))).sort();

  return (
    <section
      className="border-b py-4"
      style={{ borderColor: theme.colorBorder, background: theme.colorBackground }}
    >
      <div className="mx-auto max-w-7xl px-5">
        <ul className="flex gap-2 overflow-x-auto pb-1">
          <li className="shrink-0">
            <span
              className="flex h-9 items-center px-4 text-[12px] uppercase tracking-[0.1em] border transition-colors cursor-pointer"
              style={{
                borderColor: theme.colorForeground,
                color: theme.colorForeground,
                borderRadius: "var(--t-radius, 0px)",
                fontFamily: `'${theme.fontBody}', sans-serif`,
              }}
            >
              Todos
            </span>
          </li>
          {rawCategories.map((cat) => (
            <li key={cat} className="shrink-0">
              <span
                className="flex h-9 items-center px-4 text-[12px] uppercase tracking-[0.1em] border transition-colors cursor-pointer"
                style={{
                  borderColor: theme.colorBorder,
                  color: theme.colorForeground,
                  borderRadius: "var(--t-radius, 0px)",
                  fontFamily: `'${theme.fontBody}', sans-serif`,
                }}
              >
                {getCategoryLabel(DEFAULT_STORE_CATEGORIES, cat)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
