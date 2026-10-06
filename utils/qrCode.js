/**
 * Zero-dependency, lightweight QR Code Generator (Versions 1-10, ECC Level M)
 * ISO/IEC 18004 compliant byte-mode matrix generator.
 *
 * No external npm packages required. Produces a 2D bit matrix that can be
 * rendered to HTML5 Canvas, SVG, or downloaded as a PNG.
 */

// Galois Field GF(256) tables with primitive polynomial 0x11d
const EXP = new Uint8Array(256);
const LOG = new Uint8Array(256);

for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}
EXP[255] = EXP[0];

function gmult(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[(LOG[a] + LOG[b]) % 255];
}

function polyMul(p1, p2) {
  const res = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      res[i + j] ^= gmult(p1[i], p2[j]);
    }
  }
  return res;
}

function getGenPoly(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    poly = polyMul(poly, new Uint8Array([1, EXP[i]]));
  }
  return poly;
}

function calcEC(dataBlock, ecCount) {
  const gen = getGenPoly(ecCount);
  const msg = new Uint8Array(dataBlock.length + ecCount);
  msg.set(dataBlock, 0);
  for (let i = 0; i < dataBlock.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gmult(gen[j], coef);
      }
    }
  }
  return Array.from(msg.slice(dataBlock.length));
}

// QR Specs for Error Correction Level M (Versions 1 to 10)
// Supports up to 216 data codewords (~214 byte URLs)
const SPECS_M = [
  null,
  { v: 1, size: 21, totalCw: 26, dataCw: 16, ecCw: 10, b1: 1, b2: 0, d1: 16, d2: 0, align: [] },
  { v: 2, size: 25, totalCw: 44, dataCw: 28, ecCw: 16, b1: 1, b2: 0, d1: 28, d2: 0, align: [6, 18] },
  { v: 3, size: 29, totalCw: 70, dataCw: 44, ecCw: 26, b1: 1, b2: 0, d1: 44, d2: 0, align: [6, 22] },
  { v: 4, size: 33, totalCw: 100, dataCw: 64, ecCw: 18, b1: 2, b2: 0, d1: 32, d2: 0, align: [6, 26] },
  { v: 5, size: 37, totalCw: 134, dataCw: 86, ecCw: 24, b1: 2, b2: 0, d1: 43, d2: 0, align: [6, 30] },
  { v: 6, size: 41, totalCw: 172, dataCw: 108, ecCw: 16, b1: 4, b2: 0, d1: 27, d2: 0, align: [6, 34] },
  { v: 7, size: 45, totalCw: 196, dataCw: 124, ecCw: 18, b1: 2, b2: 2, d1: 31, d2: 32, align: [6, 22, 38] },
  { v: 8, size: 49, totalCw: 242, dataCw: 154, ecCw: 22, b1: 2, b2: 2, d1: 38, d2: 39, align: [6, 24, 42] },
  { v: 9, size: 53, totalCw: 292, dataCw: 182, ecCw: 22, b1: 3, b2: 2, d1: 36, d2: 37, align: [6, 26, 46] },
  { v: 10, size: 57, totalCw: 346, dataCw: 216, ecCw: 26, b1: 4, b2: 1, d1: 43, d2: 44, align: [6, 28, 50] },
];

// Level M BCH (15,5) format info code masked with 0x5412 (Level M indicator: 00)
const FORMAT_INFO_M = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ca, 0x4f97, 0x4aa0
];

/**
 * Generate a 2D QR matrix for any text/URL
 * @param {string} text - URL or text to encode
 * @returns {{ size: number, matrix: number[][], version: number }}
 */
export function generateQRMatrix(text) {
  // UTF-8 encode
  const utf8 = unescape(encodeURIComponent(text));
  const dataBytes = [];
  for (let i = 0; i < utf8.length; i++) dataBytes.push(utf8.charCodeAt(i));

  let spec = null;
  for (let v = 1; v <= 10; v++) {
    if (dataBytes.length <= SPECS_M[v].dataCw - 2) {
      spec = SPECS_M[v];
      break;
    }
  }
  if (!spec) {
    throw new Error("Text exceeds maximum capacity for compact QR code");
  }

  const bits = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  }

  // 1. Header: Byte mode indicator (0100) + character count
  pushBits(4, 4);
  pushBits(dataBytes.length, spec.v >= 10 ? 16 : 8);
  for (const b of dataBytes) pushBits(b, 8);

  // 2. Terminator + padding
  const totalDataBits = spec.dataCw * 8;
  const termLen = Math.min(4, totalDataBits - bits.length);
  pushBits(0, termLen);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCodewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    dataCodewords.push(byte);
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataCodewords.length < spec.dataCw) {
    dataCodewords.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  // 3. Divide into blocks and compute Reed-Solomon EC
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (let i = 0; i < spec.b1; i++) {
    const block = dataCodewords.slice(offset, offset + spec.d1);
    offset += spec.d1;
    dataBlocks.push(block);
    ecBlocks.push(calcEC(block, spec.ecCw));
  }
  for (let i = 0; i < spec.b2; i++) {
    const block = dataCodewords.slice(offset, offset + spec.d2);
    offset += spec.d2;
    dataBlocks.push(block);
    ecBlocks.push(calcEC(block, spec.ecCw));
  }

  // 4. Interleave data codewords, then EC codewords
  const finalCodewords = [];
  const maxDataLen = Math.max(spec.d1, spec.d2 || 0);
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < dataBlocks.length; b++) {
      if (i < dataBlocks[b].length) finalCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < spec.ecCw; i++) {
    for (let b = 0; b < ecBlocks.length; b++) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  const finalBits = [];
  for (const byte of finalCodewords) {
    for (let i = 7; i >= 0; i--) finalBits.push((byte >>> i) & 1);
  }

  // 5. Assemble Matrix
  const N = spec.size;
  const matrix = Array.from({ length: N }, () => new Array(N).fill(null));
  const isFunction = Array.from({ length: N }, () => new Array(N).fill(false));

  function setModule(r, c, val) {
    matrix[r][c] = val;
    isFunction[r][c] = true;
  }

  // Finder patterns (3 corners)
  function drawFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const qr = row + r;
        const qc = col + c;
        if (qr >= 0 && qr < N && qc >= 0 && qc < N) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = (r === 0 || r === 6 || c === 0 || c === 6);
            const isCenter = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setModule(qr, qc, isBorder || isCenter ? 1 : 0);
          } else {
            setModule(qr, qc, 0); // white separator
          }
        }
      }
    }
  }
  drawFinder(0, 0);
  drawFinder(0, N - 7);
  drawFinder(N - 7, 0);

  // Alignment patterns
  for (const r of spec.align) {
    for (const c of spec.align) {
      if (isFunction[r][c]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isBlack = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setModule(r + dr, c + dc, isBlack ? 1 : 0);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < N - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0 ? 1 : 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0 ? 1 : 0);
  }

  // Dark module
  setModule(4 * spec.v + 9, 8, 1);

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunction[8][N - 1 - i] = true;
    isFunction[N - 1 - i][8] = true;
  }

  // 6. Zig-zag data placement
  let bitIdx = 0;
  let dir = -1;
  let c = N - 1;
  while (c > 0) {
    if (c === 6) c--; // skip timing column
    const rStart = dir === -1 ? N - 1 : 0;
    const rEnd = dir === -1 ? -1 : N;
    for (let r = rStart; r !== rEnd; r += dir) {
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const col = c - colOffset;
        if (!isFunction[r][col]) {
          const bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
          matrix[r][col] = bit;
        }
      }
    }
    dir = -dir;
    c -= 2;
  }

  // 7. Optimal Mask Evaluation (Masks 0 to 7)
  const MASK_FNS = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  function evaluatePenalty(grid) {
    let penalty = 0;
    for (let r = 0; r < N; r++) {
      let count = 0, last = -1;
      for (let col = 0; col < N; col++) {
        const val = grid[r][col];
        if (val === last) {
          count++;
          if (count === 5) penalty += 3;
          else if (count > 5) penalty += 1;
        } else {
          last = val;
          count = 1;
        }
      }
    }
    for (let col = 0; col < N; col++) {
      let count = 0, last = -1;
      for (let r = 0; r < N; r++) {
        const val = grid[r][col];
        if (val === last) {
          count++;
          if (count === 5) penalty += 3;
          else if (count > 5) penalty += 1;
        } else {
          last = val;
          count = 1;
        }
      }
    }
    return penalty;
  }

  let bestGrid = null;
  let minPenalty = Infinity;

  for (let m = 0; m < 8; m++) {
    const grid = matrix.map((row, r) =>
      row.map((val, col) => {
        if (isFunction[r][col]) return val;
        return MASK_FNS[m](r, col) ? (val ^ 1) : val;
      })
    );

    const formatBits = FORMAT_INFO_M[m];
    for (let i = 0; i < 6; i++) grid[8][i] = (formatBits >>> (14 - i)) & 1;
    grid[8][7] = (formatBits >>> 8) & 1;
    grid[8][8] = (formatBits >>> 7) & 1;
    grid[7][8] = (formatBits >>> 6) & 1;
    for (let i = 0; i < 6; i++) grid[5 - i][8] = (formatBits >>> (5 - i)) & 1;

    for (let i = 0; i < 7; i++) grid[N - 1 - i][8] = (formatBits >>> i) & 1;
    for (let i = 0; i < 8; i++) grid[8][N - 8 + i] = (formatBits >>> (7 + i)) & 1;

    const penalty = evaluatePenalty(grid);
    if (penalty < minPenalty) {
      minPenalty = penalty;
      bestGrid = grid;
    }
  }

  return { size: N, matrix: bestGrid, version: spec.v };
}

/**
 * Render a QR Code onto an HTML5 Canvas
 */
export function renderQRToCanvas(canvas, text, options = {}) {
  if (!canvas || !text) return;
  const {
    size = 260,
    margin = 3,
    darkColor = "#0f172a",
    lightColor = "#ffffff",
  } = options;

  const { matrix, size: moduleCount } = generateQRMatrix(text);
  const totalModules = moduleCount + margin * 2;
  const moduleSize = Math.max(1, Math.floor(size / totalModules));
  const actualSize = moduleSize * totalModules;

  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;
  canvas.width = actualSize * dpr;
  canvas.height = actualSize * dpr;
  canvas.style.width = `${actualSize}px`;
  canvas.style.height = `${actualSize}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, actualSize, actualSize);

  // Modules
  ctx.fillStyle = darkColor;
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(
          (c + margin) * moduleSize,
          (r + margin) * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    }
  }

  ctx.restore();
}

/**
 * Download a QR Code as a PNG image file
 */
export function downloadQRCode(text, filename = "spinwheel-qr.png", size = 480) {
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  renderQRToCanvas(canvas, text, { size, margin: 4 });

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
