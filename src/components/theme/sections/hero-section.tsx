import type { HeroSettings, ThemeSettings } from "@/lib/theme-engine/schema";

interface Props {
  settings: HeroSettings;
  theme: ThemeSettings;
}

export function HeroSection({ settings, theme }: Props) {
  const overlayAlpha = Math.round((settings.overlayOpacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");

  return (
    <section className="relative" style={{ fontFamily: `'${theme.fontBody}', sans-serif` }}>
      <div
        className="h-[72svh] w-full bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${settings.imageUrl})`,
          backgroundPosition: settings.imagePosition,
        }}
      />
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: `${theme.colorForeground}${overlayAlpha}` }}
      />
      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-10 md:px-12 md:pb-16">
        {settings.subheading && (
          <p
            className="text-[11px] uppercase tracking-[0.22em]"
            style={{
              color: `${theme.colorBackground}cc`,
              fontFamily: `'${theme.fontBody}', sans-serif`,
            }}
          >
            {settings.subheading}
          </p>
        )}
        <h1
          className="mt-3 text-4xl font-normal leading-[1.08] md:text-6xl"
          style={{
            color: theme.colorBackground,
            fontFamily: `'${theme.fontDisplay}', serif`,
            whiteSpace: "pre-line",
          }}
        >
          {settings.heading}
        </h1>
        {settings.buttonText && (
          <div className="mt-7">
            <button
              className="h-12 px-8 text-sm uppercase tracking-[0.14em] transition-opacity hover:opacity-85"
              style={{
                background: theme.colorBackground,
                color: theme.colorForeground,
                borderRadius: "var(--t-radius, 0px)",
                fontFamily: `'${theme.fontBody}', sans-serif`,
              }}
            >
              {settings.buttonText}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
