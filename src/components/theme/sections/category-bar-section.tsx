import type { CategoryBarSettings, ThemeSettings } from "@/lib/theme-engine/schema";
import { produtos } from "@/data/loja";

// Derive unique categories from product data
const CATEGORIES = Array.from(new Set(produtos.map((p) => p.categoria))).sort();

interface Props {
  settings: CategoryBarSettings;
  theme: ThemeSettings;
}

export function CategoryBarSection({ settings, theme }: Props) {
  if (!settings.enabled) return null;

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
          {CATEGORIES.map((cat) => (
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
                {cat}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
