import { useState, useMemo, useRef } from "react";
import { Printer, Download, Eye, Layers, Settings2, Sparkles, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateCode128Svg } from "@/lib/barcode";
import { brl } from "@/lib/format";

export interface LabelItem {
  id: string;
  name: string;
  color: string;
  size: string;
  price: number;
  qty: number;
  sku: string;
}

interface LabelPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName?: string;
  batchName: string;
  items: LabelItem[];
}

export function LabelPrintModal({
  open,
  onOpenChange,
  storeName = "MINHA LOJA",
  batchName,
  items,
}: LabelPrintModalProps) {
  const [format, setFormat] = useState<"pimaco_a4" | "thermal_50x30">("pimaco_a4");
  const [includeInstallments, setIncludeInstallments] = useState(true);

  // Expande os itens de acordo com a quantidade de cada um
  const expandedLabels = useMemo(() => {
    const list: {
      key: string;
      item: LabelItem;
      index: number;
      barcodeSvg: string;
    }[] = [];

    items.forEach((item) => {
      const barcodeSvg = generateCode128Svg(item.sku || "000000", 24);
      for (let i = 0; i < item.qty; i++) {
        list.push({
          key: `${item.id}-${i}`,
          item,
          index: list.length + 1,
          barcodeSvg,
        });
      }
    });

    return list;
  }, [items]);

  const totalLabels = expandedLabels.length;
  const totalSheetsA4 = Math.ceil(totalLabels / 33);

  // Dispara a impressão nativa com CSS Paged Media milimétrico
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Permita pop-ups no seu navegador para imprimir as etiquetas.");
      return;
    }

    const isA4 = format === "pimaco_a4";

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Etiquetas — ${batchName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #fff;
            color: #000;
          }

          ${
            isA4
              ? `
            /* CONFIGURAÇÃO PIMACO 6180 / 6081 (A4: 3 colunas x 11 linhas = 33 etiquetas) */
            @page {
              size: A4 portrait;
              margin: 12.7mm 4.7mm;
            }
            .sheet {
              width: 200.6mm;
              display: grid;
              grid-template-columns: repeat(3, 66.7mm);
              grid-auto-rows: 25.4mm;
              column-gap: 2.8mm;
              row-gap: 0mm;
              page-break-after: always;
            }
            .label-card {
              width: 66.7mm;
              height: 25.4mm;
              padding: 2mm 3mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
              border: 0.1mm dashed #eee; /* Guia de corte suave na tela, sai limpo no papel */
            }
          `
              : `
            /* CONFIGURAÇÃO IMPRESSORA TÉRMICA 50mm x 30mm */
            @page {
              size: 50mm 30mm;
              margin: 1.5mm;
            }
            .sheet {
              width: 47mm;
              display: block;
            }
            .label-card {
              width: 47mm;
              height: 27mm;
              padding: 1mm 2mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-after: always;
              overflow: hidden;
            }
          `
          }

          .store-header {
            font-size: 7.5pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #222;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.1;
          }

          .product-title {
            font-size: 8pt;
            font-weight: 700;
            color: #000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
          }

          .variant-tag {
            font-size: 7.5pt;
            font-weight: 800;
            color: #111;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .barcode-wrapper {
            margin: 1mm 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 6mm;
          }

          .barcode-wrapper svg {
            width: 100%;
            height: 100%;
            max-height: 7mm;
          }

          .price-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            line-height: 1;
          }

          .price-cash {
            font-size: 10.5pt;
            font-weight: 900;
            color: #000;
          }

          .price-installment {
            font-size: 6.5pt;
            font-weight: 600;
            color: #444;
          }

          @media print {
            .label-card { border: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          ${expandedLabels
            .map(({ item, barcodeSvg }) => {
              const installmentVal = (item.price * 1.08) / 3;
              return `
              <div class="label-card">
                <div class="store-header">${storeName}</div>
                <div class="product-title">${item.name}</div>
                <div class="variant-tag">
                  <span>${item.color.toUpperCase()}</span>
                  <span style="font-size: 8.5pt; background:#f0f0f0; padding: 0 4px; border-radius: 2px;">TAM: ${item.size}</span>
                </div>
                <div class="barcode-wrapper">
                  ${barcodeSvg}
                </div>
                <div class="price-row">
                  <span class="price-cash">${brl(item.price)}</span>
                  ${
                    includeInstallments
                      ? `<span class="price-installment">ou 3x de ${brl(installmentVal)}</span>`
                      : `<span style="font-size:6pt; color:#666;">REF: ${item.sku}</span>`
                  }
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 rounded-3xl">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
                <Printer className="size-5 text-primary" />
                Gerador de Etiquetas de Preço & Código de Barras
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Lote: <strong className="text-foreground">{batchName}</strong> • {totalLabels} etiquetas geradas
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="px-3 py-1 font-semibold text-xs">
              ✦ Vestui Lote
            </Badge>
          </div>
        </DialogHeader>

        {/* CONTROLES DO FORMATO */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border bg-muted/30 -mx-6 px-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Formato:</span>
            <Tabs value={format} onValueChange={(v) => setFormat(v as typeof format)}>
              <TabsList className="h-8">
                <TabsTrigger value="pimaco_a4" className="text-xs px-3">
                  📄 Folha A4 Adesiva (Pimaco 6180)
                </TabsTrigger>
                <TabsTrigger value="thermal_50x30" className="text-xs px-3">
                  🏷️ Rolo Térmico (50x30mm)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={includeInstallments}
              onChange={(e) => setIncludeInstallments(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span>Exibir parcelamento (3x no cartão)</span>
          </label>
        </div>

        {/* PRÉ-VISUALIZAÇÃO EM TEMPO REAL */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center justify-between">
            <span>Pré-visualização do resultado na folha:</span>
            {format === "pimaco_a4" && (
              <span className="text-primary font-bold">{totalSheetsA4} folha(s) A4 necessária(s)</span>
            )}
          </div>

          <div
            className={`mx-auto bg-white p-4 rounded-xl border border-border shadow-sm ${
              format === "pimaco_a4"
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl"
                : "flex flex-col gap-3 max-w-xs items-center"
            }`}
          >
            {expandedLabels.slice(0, 9).map(({ key, item, barcodeSvg }) => (
              <div
                key={key}
                className="w-full bg-card border border-dashed border-border rounded-lg p-2.5 flex flex-col justify-between text-left shadow-xs h-[105px]"
              >
                <div className="flex justify-between items-start">
                  <div className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground truncate max-w-[120px]">
                    {storeName}
                  </div>
                  <span className="text-[9px] font-bold bg-muted px-1.5 py-0.2 rounded text-foreground">
                    {item.size}
                  </span>
                </div>

                <div className="text-[11px] font-bold text-foreground truncate mt-0.5">
                  {item.name}
                </div>

                <div className="text-[9px] font-medium text-muted-foreground">
                  Cor: <span className="text-foreground font-semibold">{item.color}</span>
                </div>

                <div
                  className="w-full my-1 flex justify-center h-5 overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                />

                <div className="flex justify-between items-end pt-1 border-t border-hairline">
                  <span className="text-xs font-black text-foreground">{brl(item.price)}</span>
                  {includeInstallments && (
                    <span className="text-[8px] text-muted-foreground">
                      ou 3x {brl((item.price * 1.08) / 3)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalLabels > 9 && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              + {totalLabels - 9} outras etiquetas prontas para impressão...
            </p>
          )}
        </div>

        {/* RODAPÉ COM AÇÕES */}
        <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
            Voltar
          </Button>

          <Button
            onClick={handlePrint}
            className="rounded-full px-6 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow cursor-pointer gap-2"
          >
            <Printer className="size-4" />
            Imprimir {totalLabels} Etiquetas Agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
