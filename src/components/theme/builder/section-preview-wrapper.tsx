import { useState } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import type { Section } from "@/lib/theme-engine/schema";

const SECTION_LABELS: Record<string, string> = {
  hero: "Banner Principal",
  category_bar: "Barra de Categorias",
  product_grid: "Grade de Produtos",
  image_text_split: "Imagem & Texto",
  features: "Diferenciais",
  announcement: "Faixa de Anúncio",
};

interface SectionPreviewWrapperProps {
  section: Section;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export function SectionPreviewWrapper({
  section,
  isSelected,
  isEditing,
  onSelect,
  onToggleVisible,
  onDelete,
  children,
}: SectionPreviewWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);
  const label = SECTION_LABELS[section.type] ?? section.type;

  if (!isEditing) return <>{children}</>;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      style={{ cursor: "pointer" }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 20,
          pointerEvents: "none",
          border: isSelected
            ? "2px solid #3b82f6"
            : isHovered
              ? "2px solid rgba(59,130,246,0.55)"
              : "2px solid transparent",
          transition: "border-color 150ms ease",
          borderRadius: 2,
        }}
      />

      {(isSelected || isHovered) && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: isSelected ? "#3b82f6" : "rgba(59,130,246,0.85)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.04em",
            padding: "3px 8px",
            userSelect: "none",
            pointerEvents: isSelected ? "auto" : "none",
          }}
        >
          {String.fromCodePoint(0x270F)} {label}
          {isSelected && (
            <span
              style={{ display: "flex", gap: 2, marginLeft: 6 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                title={section.visible ? "Ocultar" : "Mostrar"}
                onClick={onToggleVisible}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: 3,
                  color: "#fff",
                  padding: "2px 4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {section.visible ? (
                  <Eye style={{ width: 12, height: 12 }} />
                ) : (
                  <EyeOff style={{ width: 12, height: 12 }} />
                )}
              </button>
              <button
                title="Excluir seção"
                onClick={onDelete}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: 3,
                  color: "#fff",
                  padding: "2px 4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Trash2 style={{ width: 12, height: 12 }} />
              </button>
            </span>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
