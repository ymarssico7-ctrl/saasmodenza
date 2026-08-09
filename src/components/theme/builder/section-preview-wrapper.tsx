import { useState } from "react";
import { Eye, EyeOff, MousePointerClick, Trash2 } from "lucide-react";
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
  const isActive = isSelected || isHovered;

  if (!isEditing) return <>{children}</>;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      style={{ cursor: "pointer" }}
    >
      {/* ── Borda de Seleção ────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 20,
          pointerEvents: "none",
          border: isSelected
            ? "2px solid #6366f1"
            : isHovered
              ? "2px solid rgba(99,102,241,0.5)"
              : "2px solid transparent",
          boxShadow: isSelected
            ? "inset 0 0 0 1px rgba(99,102,241,0.15)"
            : "none",
          transition: "border-color 180ms ease, box-shadow 180ms ease",
          borderRadius: 2,
        }}
      />

      {/* ── Badge Flutuante (hover ou selecionado) ──────────────────────────── */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            gap: 6,
            // glassmorphism
            background: isSelected
              ? "rgba(99, 102, 241, 0.92)"
              : "rgba(99, 102, 241, 0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.03em",
            padding: "4px 10px 4px 7px",
            userSelect: "none",
            borderRadius: "0 0 8px 0",
            boxShadow: "0 2px 12px rgba(99,102,241,0.35)",
            pointerEvents: isSelected ? "auto" : "none",
          }}
        >
          {/* Ícone */}
          <MousePointerClick style={{ width: 12, height: 12, opacity: 0.85 }} />

          {/* Label da seção */}
          <span>{label}</span>

          {/* Botões de ação — só quando selecionado */}
          {isSelected && (
            <span
              style={{ display: "flex", gap: 3, marginLeft: 4 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Toggle visibilidade */}
              <button
                type="button"
                title={section.visible ? "Ocultar seção" : "Mostrar seção"}
                onClick={onToggleVisible}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 5,
                  color: "#fff",
                  padding: "3px 5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 10,
                  fontWeight: 500,
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.32)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.2)")
                }
              >
                {section.visible ? (
                  <Eye style={{ width: 12, height: 12 }} />
                ) : (
                  <EyeOff style={{ width: 12, height: 12 }} />
                )}
                <span>{section.visible ? "Ocultar" : "Mostrar"}</span>
              </button>

              {/* Deletar seção */}
              <button
                type="button"
                title="Excluir seção"
                onClick={onDelete}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 5,
                  color: "#fff",
                  padding: "3px 5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 10,
                  fontWeight: 500,
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(239, 68, 68, 0.5)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.15)")
                }
              >
                <Trash2 style={{ width: 12, height: 12 }} />
                <span>Excluir</span>
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Conteúdo da Seção ────────────────────────────────────────────────── */}
      <div style={{ opacity: !section.visible ? 0.45 : 1, transition: "opacity 200ms" }}>
        {children}
      </div>
    </div>
  );
}
