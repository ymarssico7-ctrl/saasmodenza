import { useState } from "react";
import { Eye, EyeOff, MousePointerClick, Trash2, Edit3 } from "lucide-react";
import type { Section } from "@/lib/theme-engine/schema";

const SECTION_LABELS: Record<string, string> = {
  hero: "Banner Principal",
  category_bar: "Barra de Categorias",
  product_grid: "Grade de Produtos",
  image_text_split: "Imagem & Texto",
  features: "Diferenciais",
  announcement: "Faixa de Anúncio",
  testimonials: "Depoimentos de Clientes",
  faq: "Perguntas Frequentes",
  promotional_banner: "Banner Promocional",
  instagram_feed: "Feed do Instagram",
  newsletter: "Newsletter & Desconto",
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
      className="relative group/section"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClickCapture={(e) => {
        // Previne navegação acidental em links e botões do template durante a edição
        const target = e.target as HTMLElement;
        if (target.closest("a") || target.closest("button:not([data-builder-action])")) {
          e.preventDefault();
        }
      }}
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
          boxShadow: isSelected ? "inset 0 0 0 1px rgba(99,102,241,0.15)" : "none",
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
            background: isSelected ? "rgba(99, 102, 241, 0.95)" : "rgba(99, 102, 241, 0.8)",
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
            pointerEvents: "auto",
          }}
        >
          {/* Ícone */}
          <MousePointerClick style={{ width: 12, height: 12, opacity: 0.85 }} />

          {/* Label da seção */}
          <span>{label}</span>

          {/* Botões de ação rápidos */}
          <span
            style={{ display: "flex", gap: 3, marginLeft: 4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão de edição direta */}
            <button
              type="button"
              data-builder-action="true"
              title="Editar seção no painel lateral"
              onClick={onSelect}
              style={{
                background: "rgba(255,255,255,0.25)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 5,
                color: "#fff",
                padding: "3px 6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 10,
                fontWeight: 600,
                transition: "background 120ms",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.4)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.25)")
              }
            >
              <Edit3 style={{ width: 11, height: 11 }} />
              <span>Editar</span>
            </button>

            {/* Toggle visibilidade */}
            <button
              type="button"
              data-builder-action="true"
              title={section.visible ? "Ocultar seção na loja" : "Mostrar seção na loja"}
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
              data-builder-action="true"
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
                  "rgba(239, 68, 68, 0.6)")
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
        </div>
      )}

      {/* ── Tarja informativa se a seção estiver oculta ── */}
      {!section.visible && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.95)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <EyeOff style={{ width: 13, height: 13 }} />
            <span>Seção Oculta na Loja — Visível apenas no editor</span>
          </div>
          <button
            type="button"
            data-builder-action="true"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisible();
            }}
            style={{
              background: "#fff",
              color: "#b45309",
              border: "none",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reexibir
          </button>
        </div>
      )}

      {/* ── Conteúdo da Seção ────────────────────────────────────────────────── */}
      <div style={{ opacity: !section.visible ? 0.45 : 1, transition: "opacity 200ms" }}>
        {children}
      </div>
    </div>
  );
}
