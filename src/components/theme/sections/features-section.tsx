import type { FeaturesSettings, ThemeSettings } from "@/lib/theme-engine/schema";

interface Props {
  settings: FeaturesSettings;
  theme: ThemeSettings;
}

export function FeaturesSection({ settings, theme }: Props) {
  return (
    <section
      className="py-12 md:py-16"
      style={{ background: theme.colorBackground, borderTop: `1px solid ${theme.colorBorder}` }}
    >
      <div className="mx-auto max-w-7xl px-5">
        <ul
          className="grid gap-8 sm:grid-cols-2 md:grid-cols-3"
          style={{ fontFamily: `'${theme.fontBody}', sans-serif` }}
        >
          {settings.items.map((item, i) => (
            <li key={i} className="border-t pt-5" style={{ borderColor: theme.colorBorder }}>
              <h3
                className="text-sm uppercase tracking-[0.12em]"
                style={{ color: theme.colorForeground }}
              >
                {item.title}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: `${theme.colorForeground}70` }}
              >
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
