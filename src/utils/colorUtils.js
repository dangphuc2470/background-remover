export {
  isChromaticSource,
  defaultHueRange,
  defaultLightnessRange,
  defaultCompactHueRange,
  symmetricLightnessRange,
  lightnessToleranceToDelta,
  sourceLightnessCenter,
  pixelMatchFactor,
} from './perceptualMatch.js';

const NAMED_COLORS = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  orange: [255, 165, 0],
  pink: [255, 192, 203],
  purple: [128, 0, 128],
  transparent: [255, 255, 255],
};

export function parseColor(input) {
  if (!input || typeof input !== 'string') return [255, 255, 255];

  const trimmed = input.trim().toLowerCase();

  if (NAMED_COLORS[trimmed]) {
    return [...NAMED_COLORS[trimmed]];
  }

  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }

  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return [
      Math.min(255, parseInt(rgbMatch[1], 10)),
      Math.min(255, parseInt(rgbMatch[2], 10)),
      Math.min(255, parseInt(rgbMatch[3], 10)),
    ];
  }

  return [255, 255, 255];
}

export function getPixelColor(imageData, x, y) {
  if (!imageData?.data || x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
    return null;
  }
  try {
    const i = (y * imageData.width + x) * 4;
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    if (r === undefined || g === undefined || b === undefined) return null;
    return [r, g, b];
  } catch {
    return null;
  }
}

export function getPixelColorFromCanvas(canvas, x, y) {
  if (!canvas || x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return null;
  try {
    const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(x, y, 1, 1).data;
    return [data[0], data[1], data[2]];
  } catch {
    return null;
  }
}

export function getPixelColorFromImageDataOrCanvas(imageData, canvas, x, y) {
  return getPixelColor(imageData, x, y) ?? getPixelColorFromCanvas(canvas, x, y);
}

export function canvasCoordsFromEvent(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height || !canvas.width || !canvas.height) {
    return { x: 0, y: 0 };
  }
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: Math.floor((clientX - rect.left) * scaleX),
    y: Math.floor((clientY - rect.top) * scaleY),
  };
}

export function rgbToHex([r, g, b]) {
  const clamp = (v) => Math.max(0, Math.min(255, Number(v) || 0));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function isBackgroundPixel(r, g, b, bgR, bgG, bgB, maxDist) {
  return colorDistance(r, g, b, bgR, bgG, bgB) <= maxDist;
}

export function toleranceToMaxDistance(percent) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (clamped / 100) * 441.67;
}

export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = h / 360;

  const hue2rgb = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  return [
    Math.round(hue2rgb(hk + 1 / 3) * 255),
    Math.round(hue2rgb(hk) * 255),
    Math.round(hue2rgb(hk - 1 / 3) * 255),
  ];
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildGradientFromSamples(sampleAtPercent) {
  const stops = [];
  for (let i = 0; i <= 24; i++) {
    const pct = Math.round((i / 24) * 100);
    stops.push(`${rgbToHex(sampleAtPercent(pct))} ${pct}%`);
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

export function buildLightnessGradient([r, g, b]) {
  const [h, s] = rgbToHsl(r, g, b);
  return buildGradientFromSamples((pct) => hslToRgb(h, s, pct));
}

export function buildSaturationGradient([r, g, b]) {
  const [h, , l] = rgbToHsl(r, g, b);
  return buildGradientFromSamples((pct) => hslToRgb(h, pct, l));
}

/** Cầu vồng 7 sắc quanh màu nguồn — đỏ, cam, vàng, lục, lam, chàm, tím. */
export function buildRainbowGradient([r, g, b]) {
  const [h, s, l] = rgbToHsl(r, g, b);
  const sat = Math.max(s, 72);
  const light = clamp(l, 38, 62);
  return buildGradientFromSamples((pct) => hslToRgb(hueOnRainbowBar(h, pct), sat, light));
}

function hueOnRainbowBar(sourceHue, pct) {
  return (sourceHue + (pct - 50) * 3.6 + 360) % 360;
}

export function buildRgbSpreadGradient([r, g, b]) {
  const [h, , l] = rgbToHsl(r, g, b);
  return buildGradientFromSamples((pct) => {
    if (pct <= 50) {
      const t = pct / 50;
      const gray = hslToRgb(h, 0, l);
      return [
        Math.round(gray[0] + (r - gray[0]) * t),
        Math.round(gray[1] + (g - gray[1]) * t),
        Math.round(gray[2] + (b - gray[2]) * t),
      ];
    }
    const t = (pct - 50) / 50;
    return [
      clamp(Math.round(r + (255 - r) * t * 0.35), 0, 255),
      clamp(Math.round(g + (255 - g) * t * 0.35), 0, 255),
      clamp(Math.round(b + (255 - b) * t * 0.35), 0, 255),
    ];
  });
}

export function sampleSimilarityColor([r, g, b], percent) {
  const [h, s, l] = rgbToHsl(r, g, b);
  const t = percent / 100;
  const dl = (t - 0.5) * 70;
  const ds = -t * 25;
  return hslToRgb(h, clamp(s + ds, 0, 100), clamp(l + dl, 0, 100));
}

export function buildSimilarityGradient(sourceRgb) {
  const stops = [];
  for (let i = 0; i <= 24; i++) {
    const pct = Math.round((i / 24) * 100);
    stops.push(`${rgbToHex(sampleSimilarityColor(sourceRgb, pct))} ${pct}%`);
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export function imageToImageData(img, maxDimension = 1536) {
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export function cloneImageData(imageData) {
  try {
    return new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
  } catch {
    throw new Error('Image buffer unavailable');
  }
}

/** Bản nhỏ gửi worker — giảm copy + xử lý, preview upscale khi vẽ. */
export function cloneImageDataForWorker(imageData, maxDimension = 1024) {
  if (!imageData?.data) {
    throw new Error('Invalid image data');
  }

  const { width, height } = imageData;
  const maxSide = Math.max(width, height);

  try {
    if (maxSide <= maxDimension) {
      return {
        imageData: new ImageData(new Uint8ClampedArray(imageData.data), width, height),
        displayWidth: width,
        displayHeight: height,
      };
    }
  } catch {
    // Buffer detached — fall through to canvas redraw path
  }

  const scale = maxDimension / maxSide;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const src = document.createElement('canvas');
  src.width = width;
  src.height = height;
  try {
    src.getContext('2d').putImageData(imageData, 0, 0);
  } catch {
    throw new Error('Image buffer unavailable');
  }
  ctx.drawImage(src, 0, 0, w, h);

  return {
    imageData: ctx.getImageData(0, 0, w, h),
    displayWidth: width,
    displayHeight: height,
  };
}

/** Vẽ ImageData lên canvas — upscale nếu kích thước khác. */
export function drawImageDataToCanvas(canvas, imageData, targetWidth, targetHeight) {
  if (!canvas || !imageData?.data) return;

  const tw = targetWidth ?? imageData.width;
  const th = targetHeight ?? imageData.height;

  try {
    if (canvas.width !== tw) canvas.width = tw;
    if (canvas.height !== th) canvas.height = th;

    const ctx = canvas.getContext('2d');
    if (imageData.width === tw && imageData.height === th) {
      ctx.putImageData(imageData, 0, 0);
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, tw, th);

    const src = document.createElement('canvas');
    src.width = imageData.width;
    src.height = imageData.height;
    src.getContext('2d').putImageData(imageData, 0, 0);
    ctx.drawImage(src, 0, 0, tw, th);
  } catch {
    // Image buffer may be detached after worker transfer — skip draw
  }
}

export function getCanvasImageData(canvas) {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
  return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
}

export function imageDataToBlob(imageData, type = 'image/png') {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, 0.95);
  });
}

export function imageDataToDataUrl(imageData, type = 'image/png') {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL(type);
}

export async function copyImageToClipboard(imageData) {
  const blob = await imageDataToBlob(imageData, 'image/png');
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ]);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
export const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg';

export function isAcceptedImage(file) {
  return ACCEPTED_TYPES.includes(file.type) ||
    /\.(png|jpe?g)$/i.test(file.name);
}
