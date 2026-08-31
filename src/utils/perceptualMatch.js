export const CHROMATIC_THRESHOLD = 15;

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

function hueDistance(h1, h2) {
  const d = Math.abs(h1 - h2);
  return Math.min(d, 360 - d);
}

function signedHueDelta(h1, h2) {
  let d = h1 - h2;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function hueToleranceToDegrees(hueTolerance) {
  const t = Math.max(0, Math.min(100, hueTolerance));
  return (t / 100) * 40 + 8;
}

export function lightnessToleranceToDelta(lightnessTolerance) {
  const t = Math.max(0, Math.min(100, lightnessTolerance));
  return (t / 100) * 35 + 5;
}

export function defaultHueRange(hueTolerance = 15) {
  const halfPct = hueToleranceToDegrees(hueTolerance) / 3.6;
  return {
    center: 50,
    start: Math.max(0, 50 - halfPct),
    end: Math.min(100, 50 + halfPct),
  };
}

export function defaultLightnessRange(sourceColor, lightnessTolerance = 20) {
  const [, , l] = rgbToHsl(sourceColor[0], sourceColor[1], sourceColor[2]);
  const half = lightnessToleranceToDelta(lightnessTolerance);
  return {
    center: l,
    start: Math.max(0, l - half),
    end: Math.min(100, l + half),
  };
}

export function symmetricLightnessRange(sourceColor, lightnessTolerance) {
  return defaultLightnessRange(sourceColor, lightnessTolerance);
}

function rangeFactor(value, min, max) {
  if (value < min || value > max) return 0;
  const span = Math.max(max - min, 0.001);
  const feather = span * 0.08;
  if (value <= min + feather) return (value - min) / feather;
  if (value >= max - feather) return (max - value) / feather;
  return 1;
}

/** Pixel biên khử răng cưa — bão hòa thấp nhưng cùng sắc vẫn được tính. */
function saturationGate(s1, s2, hueFactor) {
  if (s1 >= CHROMATIC_THRESHOLD) return 1;
  if (s2 < CHROMATIC_THRESHOLD) return 1;
  if (hueFactor <= 0) return 0;
  return Math.max(0.72, s1 / CHROMATIC_THRESHOLD);
}

/** 0 = không match, 1 = match hoàn toàn. Dải bất đối xứng theo % trên thanh. */
export function pixelMatchFactor(r, g, b, bgR, bgG, bgB, hueRange, lightnessRange) {
  const [h2, s2, l2] = rgbToHsl(bgR, bgG, bgB);
  return pixelMatchFactorFromSourceHsl(r, g, b, h2, s2, l2, hueRange, lightnessRange);
}

export function pixelMatchFactorFromSourceHsl(r, g, b, h2, s2, l2, hueRange, lightnessRange) {
  const [h1, s1, l1] = rgbToHsl(r, g, b);

  const lightStart = lightnessRange?.start ?? 0;
  const lightEnd = lightnessRange?.end ?? 100;
  const lightFactor = rangeFactor(l1, lightStart, lightEnd);

  if (s2 >= CHROMATIC_THRESHOLD) {
    const delta = signedHueDelta(h1, h2);
    const minDelta = ((hueRange?.start ?? 0) - 50) * 3.6;
    const maxDelta = ((hueRange?.end ?? 100) - 50) * 3.6;
    const hueFactor = rangeFactor(delta, minDelta, maxDelta);
    const satGate = saturationGate(s1, s2, hueFactor);
    return Math.min(hueFactor, lightFactor) * satGate;
  }

  if (s1 >= CHROMATIC_THRESHOLD) return 0;
  return lightFactor;
}

/** Dùng khi đã có HSL pixel — tránh gọi rgbToHsl lặp lại. */
export function pixelMatchFactorFromPixelHsl(h1, s1, l1, h2, s2, l2, hueRange, lightnessRange) {
  const lightStart = lightnessRange?.start ?? 0;
  const lightEnd = lightnessRange?.end ?? 100;
  const lightFactor = rangeFactor(l1, lightStart, lightEnd);

  if (s2 >= CHROMATIC_THRESHOLD) {
    const delta = signedHueDelta(h1, h2);
    const minDelta = ((hueRange?.start ?? 0) - 50) * 3.6;
    const maxDelta = ((hueRange?.end ?? 100) - 50) * 3.6;
    const hueFactor = rangeFactor(delta, minDelta, maxDelta);
    const satGate = saturationGate(s1, s2, hueFactor);
    return Math.min(hueFactor, lightFactor) * satGate;
  }

  if (s1 >= CHROMATIC_THRESHOLD) return 0;
  return lightFactor;
}

export function isChromaticSource(sourceColor) {
  const [, s] = rgbToHsl(sourceColor[0], sourceColor[1], sourceColor[2]);
  return s >= CHROMATIC_THRESHOLD;
}

export function sourceLightnessCenter(sourceColor) {
  const [, , l] = rgbToHsl(sourceColor[0], sourceColor[1], sourceColor[2]);
  return l;
}

/** Chế độ nhanh xóa nền — so khoảng cách RGB, không HSL. */
export function rgbMatchFactor(r, g, b, bgR, bgG, bgB, maxDist) {
  const dr = r - bgR;
  const dg = g - bgG;
  const db = b - bgB;
  const distSq = dr * dr + dg * dg + db * db;
  const maxDistSq = maxDist * maxDist;
  if (distSq >= maxDistSq) return 0;

  // Tránh xóa nhầm vật thể tối khi nền cũng tối — phải gần cả độ sáng
  const lum = r + g + b;
  const bgLum = bgR + bgG + bgB;
  if (Math.abs(lum - bgLum) > maxDist * 1.8) return 0;

  const dist = Math.sqrt(distSq);
  const feather = Math.max(maxDist * 0.1, 4);
  if (dist <= maxDist - feather) return 1;
  return (maxDist - dist) / feather;
}

export function compactMatchFactor(r, g, b, bgR, bgG, bgB, maxDist, hueRange) {
  const rgbFactor = rgbMatchFactor(r, g, b, bgR, bgG, bgB, maxDist);
  if (rgbFactor <= 0) return 0;

  const [, s2] = rgbToHsl(bgR, bgG, bgB);
  if (s2 < CHROMATIC_THRESHOLD) return rgbFactor;

  const hueFactor = pixelMatchFactor(r, g, b, bgR, bgG, bgB, hueRange, { start: 0, end: 100 });
  if (hueFactor <= 0) return 0;
  return Math.min(rgbFactor, hueFactor);
}

/** Narrow hue band for default (non-advanced) mode. */
export function defaultCompactHueRange(hueTolerance = 5) {
  return defaultHueRange(hueTolerance);
}

export function toleranceToMaxDistance(percent) {
  const t = Math.max(0, Math.min(100, percent));
  return (t / 100) * 380 + 8;
}
