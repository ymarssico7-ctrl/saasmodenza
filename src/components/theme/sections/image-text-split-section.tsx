import type { ImageTextSplitSettings, ThemeSettings } from "@/lib/theme-engine/schema";

interface Props {
  settings: ImageTextSplitSettings;
  theme: ThemeSettings;
}

const BG_MAP: Record<string, string> = {
  background: "colorBackground",
  canvas: "colorCanvas",
  foreground: "colorForeground",
};

const TEXT_MAP: Record<string, string> = {
  background: "colorForeground",
  canvas: "colorForeground",
  foreground: "colorBackground",
};

export function ImageTextSplitSection({ settings, theme }: Props) {
  const bgColor = theme[BG_MAP[settings.backgroundColor] as keyof ThemeSettings] as string;
  const textColor = theme[TEXT_MAP[settings.backgroundColor] as keyof ThemeSettings] as string;
  const isRight = settings.imagePosition === "right";

  return (
    <section style={{ background: bgColor }}>
      <div className={`grid md:grid-cols-2`}>
        {/* Text panel */}
        <div
          className={`flex flex-col justify-center px-6 py-14 md:px-14 md:py-20 ${
            isRight ? "order-1" : "order-2"
          }`}
        >
          {settings.kicker && (
            <p
              className="text-[11px] uppercase tracking-[0.22em]"
              style={{ color: `${textColor}80`, fontFamily: `'${theme.fontBody}', sans-serif` }}
            >
              {settings.kicker}
            </p>
          )}
          <h2
            className="mt-3 max-w-sm text-2xl font-normal leading-[1.1] md:text-[2rem]"
            style={{
              color: textColor,
              fontFamily: `'${theme.fontDisplay}', serif`,
            }}
          >
            {settings.heading}
          </h2>
          {settings.body && (
            <p
              className="mt-5 max-w-sm text-sm leading-relaxed"
              style={{
                color: `${textColor}90`,
                fontFamily: `'${theme.fontBody}', sans-serif`,
              }}
            >
              {settings.body}
            </p>
          )}
          {settings.buttonText && (
            <button
              className="mt-8 inline-flex h-11 w-fit items-center gap-2 border px-7 text-sm uppercase tracking-[0.14em] transition-colors"
              style={{
                borderColor: textColor,
                color: textColor,
                borderRadius: "var(--t-radius, 0px)",
                fontFamily: `'${theme.fontBody}', sans-serif`,
              }}
            >
              {settings.buttonText}
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Image panel */}
        <div className={isRight ? "order-2" : "order-1"}>
          <img
            src={settings.imageUrl}
            alt={settings.imageAlt}
            className="h-full min-h-[340px] w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
