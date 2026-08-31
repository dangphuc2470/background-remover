/** Thuật toán xóa nền gốc — so khoảng cách RGB + tolerance slider. */

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function toleranceToMaxDistance(percent) {
  const t = Math.max(0, Math.min(100, percent));
  return (t / 100) * 441.67;
}

function matchFactor(r, g, b, bgR, bgG, bgB, maxDist) {
  const dist = colorDistance(r, g, b, bgR, bgG, bgB);
  if (dist >= maxDist) return 0;
  return 1 - dist / maxDist;
}

function isBackgroundPixel(r, g, b, bgR, bgG, bgB, maxDist) {
  return matchFactor(r, g, b, bgR, bgG, bgB, maxDist) > 0;
}

function floodFillOuter(data, width, height, bgR, bgG, bgB, maxDist) {
  const visited = new Uint8Array(width * height);
  const queue = [];

  const tryAdd = (x, y) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    const pi = idx * 4;
    if (!isBackgroundPixel(data[pi], data[pi + 1], data[pi + 2], bgR, bgG, bgB, maxDist)) return;
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x++) {
    tryAdd(x, 0);
    tryAdd(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryAdd(0, y);
    tryAdd(width - 1, y);
  }

  while (queue.length > 0) {
    const idx = queue.pop();
    const x = idx % width;
    const y = (idx - x) / width;

    if (x > 0) tryAdd(x - 1, y);
    if (x < width - 1) tryAdd(x + 1, y);
    if (y > 0) tryAdd(x, y - 1);
    if (y < height - 1) tryAdd(x, y + 1);
  }

  return visited;
}

function smoothAlphaChannel(data, width, height, thickness) {
  const alpha = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    alpha[i] = data[i * 4 + 3];
  }

  const radius = Math.max(1, Math.round(thickness));
  const smoothed = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            sum += alpha[ny * width + nx];
            count++;
          }
        }
      }
      smoothed[y * width + x] = sum / count;
    }
  }

  for (let i = 0; i < width * height; i++) {
    const origAlpha = alpha[i];
    if (origAlpha > 0 && origAlpha < 255) {
      data[i * 4 + 3] = Math.round(smoothed[i]);
    } else if (origAlpha === 255) {
      const x = i % width;
      const y = (i - x) / width;
      let hasTransparentNeighbor = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && alpha[ny * width + nx] < 255) {
            hasTransparentNeighbor = true;
          }
        }
      }
      if (hasTransparentNeighbor) {
        data[i * 4 + 3] = Math.round(smoothed[i]);
      }
    }
  }
}

function processImage(imageData, options) {
  const {
    bgColor,
    tolerance,
    deleteOuterOnly,
    smoothEdge,
    smoothThickness,
    previewMask,
  } = options;
  const [bgR, bgG, bgB] = bgColor;
  const maxDist = toleranceToMaxDistance(tolerance ?? 20);

  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const data = result.data;
  const { width, height } = result;

  let removeMask;
  if (deleteOuterOnly) {
    removeMask = floodFillOuter(data, width, height, bgR, bgG, bgB, maxDist);
  }

  for (let i = 0; i < width * height; i++) {
    const pi = i * 4;
    const factor = matchFactor(data[pi], data[pi + 1], data[pi + 2], bgR, bgG, bgB, maxDist);

    let shouldRemove = factor > 0;
    if (deleteOuterOnly) {
      shouldRemove = removeMask[i] === 1 && factor > 0;
    }

    if (previewMask) {
      if (shouldRemove && factor >= 0.05) {
        data[pi] = 255;
        data[pi + 1] = 80;
        data[pi + 2] = 80;
        data[pi + 3] = 255;
      } else {
        data[pi] = 80;
        data[pi + 1] = 200;
        data[pi + 2] = 120;
        data[pi + 3] = 255;
      }
    } else if (shouldRemove) {
      data[pi + 3] = Math.round(255 * (1 - factor));
    }
  }

  if (smoothEdge && !previewMask) {
    smoothAlphaChannel(data, width, height, smoothThickness);
  }

  return result;
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
