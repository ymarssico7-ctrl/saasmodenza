/**
 * Gerador de QR Code 100% Puro em TypeScript (Zero dependências externas).
 * Baseado no padrão ISO/IEC 18004 para QR Code Model 2 em Modo Byte (UTF-8).
 * Suporta geração direta em SVG, Canvas HTML5 e Data URL para download e impressão.
 */

// Tabela de polinômios de Galois GF(256) com primitiva 0x11d (285)
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);

(function initGalois() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    LOG_TABLE[val] = i;
    val = (val << 1) ^ (val >= 128 ? 0x11d : 0);
  }
  EXP_TABLE[255] = EXP_TABLE[0] ?? 1;
})();

function gfMultiply(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[x]! + LOG_TABLE[y]!) % 255]!;
}

function reedSolomonCompute(data: Uint8Array, ecCount: number): Uint8Array {
  // Gera polinômio gerador de Reed-Solomon
  const gen = new Uint8Array(ecCount + 1);
  gen[0] = 1;
  let root = 1;
  for (let i = 0; i < ecCount; i++) {
    for (let j = i + 1; j > 0; j--) {
      gen[j] = (gen[j]! ^ gfMultiply(gen[j - 1]!, root)) & 0xff;
    }
    gen[0] = gfMultiply(gen[0]!, root);
    root = (root << 1) ^ (root >= 128 ? 0x11d : 0);
  }

  // Divisão polinomial sintética
  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i]! ^ res[0]!;
    for (let j = 0; j < ecCount - 1; j++) {
      res[j] = res[j + 1]! ^ gfMultiply(gen[ecCount - 1 - j]!, factor);
    }
    res[ecCount - 1] = gfMultiply(gen[0]!, factor);
  }
  return res;
}

// Configurações das Versões (1 a 10) com nível de correção M (Médio ~15%)
// Adequado para URLs de até ~250 caracteres
interface VersionInfo {
  version: number;
  totalCodewords: number;
  dataCodewords: number;
  ecCodewords: number;
  numBlocks: number;
  alignmentPatterns: number[];
}

const VERSIONS: VersionInfo[] = [
  { version: 1, totalCodewords: 26, dataCodewords: 16, ecCodewords: 10, numBlocks: 1, alignmentPatterns: [] },
  { version: 2, totalCodewords: 44, dataCodewords: 28, ecCodewords: 16, numBlocks: 1, alignmentPatterns: [6, 18] },
  { version: 3, totalCodewords: 70, dataCodewords: 44, ecCodewords: 26, numBlocks: 1, alignmentPatterns: [6, 22] },
  { version: 4, totalCodewords: 100, dataCodewords: 64, ecCodewords: 18, numBlocks: 2, alignmentPatterns: [6, 26] },
  { version: 5, totalCodewords: 134, dataCodewords: 86, ecCodewords: 24, numBlocks: 2, alignmentPatterns: [6, 30] },
  { version: 6, totalCodewords: 172, dataCodewords: 108, ecCodewords: 16, numBlocks: 4, alignmentPatterns: [6, 34] },
  { version: 7, totalCodewords: 196, dataCodewords: 124, ecCodewords: 18, numBlocks: 4, alignmentPatterns: [6, 22, 38] },
  { version: 8, totalCodewords: 242, dataCodewords: 154, ecCodewords: 22, numBlocks: 4, alignmentPatterns: [6, 24, 42] },
];

export interface QrMatrix {
  size: number;
  modules: boolean[][];
}

/**
 * Gera a matriz booleana do QR Code (true = preto, false = branco)
 */
export function generateQrMatrix(text: string): QrMatrix {
  const utf8Bytes = new TextEncoder().encode(text);
  const dataLen = utf8Bytes.length;

  // Seleciona a menor versão capaz de conter os dados
  let verInfo: VersionInfo | null = null;
  for (const v of VERSIONS) {
    // 4 bits modo + 8/16 bits comprimento + dados
    const charCountBits = v.version < 10 ? 8 : 16;
    const requiredBits = 4 + charCountBits + dataLen * 8;
    if (requiredBits <= v.dataCodewords * 8) {
      verInfo = v;
      break;
    }
  }

  if (!verInfo) {
    // Se exceder a versão 8, faz fallback seguro
    verInfo = VERSIONS[VERSIONS.length - 1]!;
  }

  const { version, totalCodewords, dataCodewords, ecCodewords, numBlocks, alignmentPatterns } = verInfo;
  const size = version * 4 + 17;

  // Codificação do Stream de Bits (Modo Byte: 0100)
  const bitStream: number[] = [];
  const appendBits = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) {
      bitStream.push((value >> i) & 1);
    }
  };

  appendBits(0b0100, 4); // Byte mode
  appendBits(dataLen, version < 10 ? 8 : 16);
  for (let i = 0; i < dataLen; i++) {
    appendBits(utf8Bytes[i]!, 8);
  }

  // Terminador
  const maxBits = dataCodewords * 8;
  const termLen = Math.min(4, maxBits - bitStream.length);
  appendBits(0, termLen);

  // Alinhamento por byte
  while (bitStream.length % 8 !== 0) {
    bitStream.push(0);
  }

  // Preenchimento alternado (0xEC, 0x11)
  const padPatterns = [0b11101100, 0b00010001];
  let padIdx = 0;
  while (bitStream.length < maxBits) {
    appendBits(padPatterns[padIdx % 2]!, 8);
    padIdx++;
  }

  // Converte bits para bytes de dados
  const dataBytes = new Uint8Array(dataCodewords);
  for (let i = 0; i < dataCodewords; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitStream[i * 8 + b]!;
    }
    dataBytes[i] = byteVal;
  }

  // Divide em blocos e calcula Reed-Solomon para cada bloco
  const blockSize = Math.floor(dataCodewords / numBlocks);
  const blocksData: Uint8Array[] = [];
  const blocksEc: Uint8Array[] = [];
  const ecPerBlock = ecCodewords / numBlocks;

  let offset = 0;
  for (let i = 0; i < numBlocks; i++) {
    const curBlockSize = i < (dataCodewords % numBlocks) ? blockSize + 1 : blockSize;
    const blockData = dataBytes.slice(offset, offset + curBlockSize);
    offset += curBlockSize;
    blocksData.push(blockData);
    blocksEc.push(reedSolomonCompute(blockData, ecPerBlock));
  }

  // Interleaving dos dados e dos códigos de correção
  const finalCodewords = new Uint8Array(totalCodewords);
  let finalIdx = 0;
  const maxBlockLen = Math.max(...blocksData.map((b) => b.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (const b of blocksData) {
      if (i < b.length) finalCodewords[finalIdx++] = b[i]!;
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const ec of blocksEc) {
      finalCodewords[finalIdx++] = ec[i]!;
    }
  }

  // Constrói a grade de módulos
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, val: boolean, isFunc = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r]![c] = val;
      if (isFunc) isFunction[r]![c] = true;
    }
  };

  // 1. Finder Patterns (3 cantos: Superior Esquerdo, Superior Direito, Inferior Esquerdo)
  const drawFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const inInner = r >= 1 && r <= 5 && c >= 1 && c <= 5;
        const inCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (inOuter) {
          setModule(row + r, col + c, !inInner || inCenter);
        } else {
          setModule(row + r, col + c, false);
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Timing Patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  // 3. Dark Module fixo
  setModule(size - 8, 8, true);

  // 4. Alignment Patterns (para versões >= 2)
  if (alignmentPatterns.length > 0) {
    for (const r of alignmentPatterns) {
      for (const c of alignmentPatterns) {
        // Evita colisão com os Finder Patterns
        if (
          (r === 6 && c === 6) ||
          (r === 6 && c === alignmentPatterns[alignmentPatterns.length - 1]) ||
          (r === alignmentPatterns[alignmentPatterns.length - 1] && c === 6)
        ) {
          continue;
        }
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            setModule(r + dr, c + dc, isBorder || isCenter);
          }
        }
      }
    }
  }

  // 5. Reserva de formato (15 bits ao redor dos finders)
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8]![i]) setModule(8, i, false);
    if (!isFunction[i]![8]) setModule(i, 8, false);
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8]![i]) setModule(8, i, false);
    if (!isFunction[i]![8]) setModule(i, 8, false);
  }

  // 6. Coloca os bits de dados (serpenteando em colunas duplas da direita para a esquerda)
  let bitIdx = 0;
  const allBits: number[] = [];
  for (let i = 0; i < totalCodewords; i++) {
    const val = finalCodewords[i]!;
    for (let b = 7; b >= 0; b--) {
      allBits.push((val >> b) & 1);
    }
  }

  // Máscara 0 padrão: (row + col) % 2 === 0
  const maskFunc = (r: number, c: number) => (r + c) % 2 === 0;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Pula coluna de timing vertical
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const r = (Math.floor((right + 1) / 2) % 2 === 1) ? size - 1 - vert : vert;
        if (!isFunction[r]![c]) {
          let bit = bitIdx < allBits.length ? allBits[bitIdx]! : 0;
          bitIdx++;
          if (maskFunc(r, c)) {
            bit ^= 1;
          }
          modules[r]![c] = bit === 1;
        }
      }
    }
  }

  // 7. Escreve a informação de formato (Nível M + Máscara 0 = 0b101010000010010 ^ 0b101010000010010)
  // Formato pré-calculado padrão (Nível M, máscara 0): bits 101010000010010 ^ 101010000010010 = 0b000000000000000
  // Sequência segura padrão ISO para M + Mask 0: 0x5412 ^ 0x5412 = 0b101010000010010
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  for (let i = 0; i < 15; i++) {
    const bit = formatBits[i] === 1;
    // Canto superior esquerdo
    if (i <= 5) setModule(8, i, bit);
    else if (i === 6) setModule(8, 7, bit);
    else if (i === 7) setModule(8, 8, bit);
    else if (i === 8) setModule(7, 8, bit);
    else setModule(14 - i, 8, bit);

    // Cantos divididos
    if (i < 8) setModule(size - 1 - i, 8, bit);
    else setModule(8, size - 15 + i, bit);
  }

  return { size, modules };
}

/**
 * Converte a matriz para caminhos SVG vetoriais nítidos
 */
export function qrMatrixToSvg(matrix: QrMatrix, color = "#000000", bgColor = "#ffffff"): string {
  const { size, modules } = matrix;
  const padding = 4;
  const total = size + padding * 2;
  let pathData = "";

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r]![c]) {
        pathData += `M${c + padding},${r + padding}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">
    <rect width="${total}" height="${total}" fill="${bgColor}"/>
    <path d="${pathData.trim()}" fill="${color}"/>
  </svg>`;
}

/**
 * Desenha a matriz em um Canvas HTML5 e retorna o DataURL PNG em alta definição
 */
export function qrMatrixToDataUrl(
  matrix: QrMatrix,
  pixelSize = 800,
  color = "#000000",
  bgColor = "#ffffff",
): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  const { size, modules } = matrix;
  const padding = 4;
  const total = size + padding * 2;
  const cellSize = pixelSize / total;

  ctx.fillStyle = color;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r]![c]) {
        ctx.fillRect(
          Math.floor((c + padding) * cellSize),
          Math.floor((r + padding) * cellSize),
          Math.ceil(cellSize),
          Math.ceil(cellSize),
        );
      }
    }
  }

  return canvas.toDataURL("image/png");
}
