// ─── Gerador Leve de Código de Barras Code 128 (SVG Nativo) ─────────────────
// Padrão Code 128 Auto/B universal para etiquetas de roupas e produtos.
// Zero dependência externa, renderização instantânea em SVG de alta precisão.

const CODE128_PATTERNS: number[] = [
  212222, 222122, 222221, 121223, 121322, 131222, 122213, 122312, 132212, 221213,
  221312, 231212, 112232, 122132, 122231, 113222, 123122, 123221, 223211, 221132,
  221231, 213212, 223112, 312131, 311222, 321122, 321221, 312212, 322112, 322211,
  212123, 212321, 232121, 111323, 131123, 131321, 112313, 132113, 132311, 211313,
  231113, 231311, 112133, 112331, 132131, 113123, 113321, 133121, 313121, 211331,
  231131, 213113, 213311, 213131, 311123, 311321, 331121, 312113, 312311, 332111,
  314111, 221411, 431111, 111224, 111422, 121124, 121421, 141122, 141221, 112214,
  112412, 122114, 122411, 142112, 142211, 241211, 221114, 413111, 241112, 134111,
  111242, 121142, 121241, 114212, 124112, 124211, 411212, 421112, 421211, 212141,
  214121, 412121, 111143, 111341, 131141, 114113, 114311, 411113, 411311, 113141,
  114131, 311141, 411131, 211412, 211214, 211232, 233111,
];

const START_B = 104;
const STOP = 106;

export function generateCode128Svg(text: string, height = 30): string {
  const safeText = (text || "0000").replace(/[^\x20-\x7E]/g, "");
  const codes: number[] = [START_B];

  for (let i = 0; i < safeText.length; i++) {
    codes.push(safeText.charCodeAt(i) - 32);
  }

  // Checksum
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);
  codes.push(STOP);

  // Gera as barras
  let barsHtml = "";
  let x = 0;
  const barWidth = 1.3;

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (pattern === undefined) continue;
    const digits = pattern.toString().split("").map(Number);
    for (let i = 0; i < digits.length; i++) {
      const width = digits[i] * barWidth;
      if (i % 2 === 0) {
        // Barra preta
        barsHtml += `<rect x="${x.toFixed(1)}" y="0" width="${width.toFixed(1)}" height="${height}" fill="#000000" />`;
      }
      x += width;
    }
  }

  // Barra final de parada
  barsHtml += `<rect x="${x.toFixed(1)}" y="0" width="${(2 * barWidth).toFixed(1)}" height="${height}" fill="#000000" />`;
  x += 2 * barWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(x)} ${height}" width="100%" height="${height}" preserveAspectRatio="none">${barsHtml}</svg>`;
}
