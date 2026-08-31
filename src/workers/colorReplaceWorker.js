import { pixelMatchFactorFromPixelHsl } from '../utils/perceptualMatch.js';

function rgbToHsl(r, g, b) {
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

function hslToRgb(h, s, l) {
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function processImage(imageData, options) {
  const {
    sourceColor,
    targetColor,
    hueRange,
    lightnessRange,
    matchTone,
    previewMask,
  } = options;

  const [srcR, srcG, srcB] = sourceColor;
  const [srcH, srcS, srcL] = rgbToHsl(srcR, srcG, srcB);
  const data = imageData.data;

  let targetH = 0;
  let targetS = 0;
  let targetR = targetColor[0];
  let targetG = targetColor[1];
  let targetB = targetColor[2];
  let satScale = 0;
  let satBlend = 0;

  if (matchTone) {
    [targetH, targetS] = rgbToHsl(targetR, targetG, targetB);
    satScale = targetS / 100;
    satBlend = targetS * 0.35;
  }

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    const [h1, s1, l1] = rgbToHsl(r, g, b);
    const factor = pixelMatchFactorFromPixelHsl(h1, s1, l1, srcH, srcS, srcL, hueRange, lightnessRange);

    if (factor <= 0) continue;

    const blend = factor >= 0.22 ? Math.max(factor, 0.94) : factor;

    if (previewMask) {
      if (blend >= 0.05) {
        data[i] = 255;
        data[i + 1] = 170;
        data[i + 2] = 60;
        data[i + 3] = Math.round(255 * blend);
      }
      continue;
    }

    let nr;
    let ng;
    let nb;
    if (matchTone) {
      const newS = clamp(s1 * satScale + satBlend, 0, 100);
      [nr, ng, nb] = hslToRgb(targetH, newS, l1);
    } else {
      nr = targetR;
      ng = targetG;
      nb = targetB;
    }

    data[i] = Math.round(r + (nr - r) * blend);
    data[i + 1] = Math.round(g + (ng - g) * blend);
    data[i + 2] = Math.round(b + (nb - b) * blend);
    data[i + 3] = a;
  }

  return imageData;
}

self.onmessage = (e) => {
  const { imageData, options, id } = e.data;
  try {
    const result = processImage(imageData, options);
    self.postMessage({ id, result, error: null }, [result.data.buffer]);
  } catch (err) {
    self.postMessage({ id, result: null, error: err.message });
  }
};
