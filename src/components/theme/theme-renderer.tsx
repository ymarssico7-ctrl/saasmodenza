import { useEffect } from "react";
import type { ThemeConfig, Section } from "@/lib/theme-engine/schema";
import { RADIUS_MAP, FONT_URLS } from "@/lib/theme-engine/defaults";
import { HeroSection } from "./sections/hero-section";
import { CategoryBarSection } from "./sections/category-bar-section";
import { ProductGridSection } from "./sections/product-grid-section";
import { ImageTextSplitSection } from "./sections/image-text-split-section";
import { FeaturesSection } from "./sections/features-section";

interface Props {
  theme: ThemeConfig;
  /** Optional: highlight a specific section (builder mode). */
  highlightId?: string | null;
  onSectionClick?: (id: string) => void;
}

function injectFont(fontUrl: string) {
  if (!fontUrl || document.querySelector(`link[href="${fontUrl}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = fontUrl;
  document.head.appendChild(link);
}

export function ThemeRenderer({ theme, highlightId, onSectionClick }: Props) {
  const { settings, sections, order } = theme;

  // Inject Google Fonts
  useEffect(() => {
    const displayUrl = FONT_URLS[settings.fontDisplay];
    const bodyUrl = FONT_URLS[settings.fontBody];
    if (displayUrl) injectFont(displayUrl);
    if (bodyUrl) injectFont(bodyUrl);
  }, [settings.fontDisplay, settings.fontBody]);

  // Build ordered, visible sections
  const orderedSections = order
    .map((id) => sections.find((s) => s.id === id))
    .filter((s): s is Section => s != null && s.visible);

  const cssVars = {
    "--t-bg": settings.colorBackground,
    "--t-fg": settings.colorForeground,
    "--t-primary": settings.colorPrimary,
    "--t-canvas": settings.colorCanvas,
    "--t-border": settings.colorBorder,
    "--t-font-display": `'${settings.fontDisplay}', serif`,
    "--t-font-body": `'${settings.fontBody}', sans-serif`,
    "--t-radius": RADIUS_MAP[settings.borderRadius] ?? "0px",
  } as React.CSSProperties;

  return (
    <div style={{ ...cssVars, background: settings.colorBackground }}>
      {/* Announcement / Free Shipping Banner */}
      {settings.freeShippingBannerEnabled && settings.freeShippingBanner && (
        <div
          className="py-2 text-center text-[11px] uppercase tracking-[0.18em]"
          style={{
            background: settings.colorForeground,
            color: settings.colorBackground,
            fontFamily: `'${settings.fontBody}', sans-serif`,
          }}
        >
          {settings.freeShippingBanner}
        </div>
      )}

      {/* Sections */}
      {orderedSections.map((section) => {
        const isHighlighted = highlightId === section.id;
        return (
          <div
            key={section.id}
            onClick={() => onSectionClick?.(section.id)}
            className={`relative transition-all duration-200 ${
              onSectionClick ? "cursor-pointer" : ""
            } ${isHighlighted ? "outline outline-2 outline-offset-[-2px] outline-blue-500 z-10" : ""}`}
          >
            {isHighlighted && (
              <div className="absolute inset-x-0 top-0 z-20 bg-blue-500 py-0.5 text-center text-[10px] font-semibold uppercase tracking-widest text-white">
                Seção Selecionada
              </div>
            )}
            <SectionSwitch section={section} theme={settings} />
          </div>
        );
      })}

      {/* Minimal Footer */}
      <footer
        className="border-t py-8 text-center text-xs"
        style={{
          borderColor: settings.colorBorder,
          color: `${settings.colorForeground}60`,
          background: settings.colorBackground,
          fontFamily: `'${settings.fontBody}', sans-serif`,
        }}
      >
        © {new Date().getFullYear()} {settings.storeName} · Feito com Modaly
      </footer>
    </div>
  );
}

function SectionSwitch({ section, theme }: { section: Section; theme: import("@/lib/theme-engine/schema").ThemeSettings }) {
  switch (section.type) {
    case "hero":
      return <HeroSection settings={section.settings} theme={theme} />;
    case "category_bar":
      return <CategoryBarSection settings={section.settings} theme={theme} />;
    case "product_grid":
      return <ProductGridSection settings={section.settings} theme={theme} />;
    case "image_text_split":
      return <ImageTextSplitSection settings={section.settings} theme={theme} />;
    case "features":
      return <FeaturesSection settings={section.settings} theme={theme} />;
    case "announcement":
      return (
        <div
          className="py-2 text-center text-[11px] uppercase tracking-[0.18em]"
          style={{ background: section.settings.backgroundColor, color: "#fff" }}
        >
          {section.settings.text}
        </div>
      );
    default:
      return null;
  }
}
