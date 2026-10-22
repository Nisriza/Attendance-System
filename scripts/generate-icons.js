import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePng(width, height, isMaskable = false) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  const cx = width / 2;
  const cy = height / 2;
  const r = (width * 0.42);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // AcademiTrack branding: Dark Blue background #173B70 (23, 59, 112)
      // Rounded icon center or clock/check motif
      let rVal = 23;
      let gVal = 59;
      let bVal = 112;
      let aVal = 255;

      if (dist < r) {
        // Inside central emblem
        if (dist > r - 12 && dist <= r) {
          // Emblem border (Accent Blue / White ring)
          rVal = 59; gVal = 130; bVal = 246; // #3b82f6
        } else {
          // Emblem inner: royal blue #1d4ed8 (29, 78, 216)
          rVal = 29; gVal = 78; bVal = 216;

          // Clock hands / pin symbol simplified
          // Center dot
          if (dist < width * 0.05) {
            rVal = 255; gVal = 255; bVal = 255;
          }
          // Hour hand (pointing up)
          else if (Math.abs(dx) <= width * 0.03 && dy < 0 && dy > -r * 0.55) {
            rVal = 255; gVal = 255; bVal = 255;
          }
          // Minute hand (pointing right)
          else if (Math.abs(dy) <= width * 0.03 && dx > 0 && dx < r * 0.65) {
            rVal = 255; gVal = 255; bVal = 255;
          }
        }
      } else if (!isMaskable) {
        // Rounded corners for normal icon
        const cornerR = width * 0.22;
        const inCornerX = x < cornerR ? cornerR - x : (x > width - cornerR ? x - (width - cornerR) : 0);
        const inCornerY = y < cornerR ? cornerR - y : (y > height - cornerR ? y - (height - cornerR) : 0);
        if (inCornerX > 0 && inCornerY > 0 && Math.sqrt(inCornerX * inCornerX + inCornerY * inCornerY) > cornerR) {
          aVal = 0; // Transparent outside rounded squircle
        }
      }

      raw[offset++] = rVal;
      raw[offset++] = gVal;
      raw[offset++] = bVal;
      raw[offset++] = aVal;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idatData = zlib.deflateSync(raw);

  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', idatData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

// Generate files
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));

// SVG Brand Icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="128" fill="#173B70"/>
  <circle cx="256" cy="256" r="180" stroke="#3B82F6" stroke-width="24" fill="#1D4ED8"/>
  <circle cx="256" cy="256" r="24" fill="#FFFFFF"/>
  <line x1="256" y1="256" x2="256" y2="140" stroke="#FFFFFF" stroke-width="20" stroke-linecap="round"/>
  <line x1="256" y1="256" x2="350" y2="256" stroke="#FFFFFF" stroke-width="20" stroke-linecap="round"/>
  <path d="M256 90 L268 114 L294 118 L275 136 L280 162 L256 150 L232 162 L237 136 L218 118 L244 114 Z" fill="#60A5FA"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);

console.log('Successfully generated all PWA icons in /public');
