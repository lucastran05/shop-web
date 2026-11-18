// Tách nền ảnh hoa chụp trên phông trơn (trắng, xám, màu, cả nền ô caro "giả trong suốt").
// Màu nền lấy từ viền ảnh, loang từ mép vào trong, sau đó làm sạch và làm mềm viền.
// Làm việc trên { data, width, height } (giống ImageData) để dùng được cả trong trình duyệt lẫn Node.

const distance = (data, i, [r, g, b]) => {
  const dr = data[i] - r;
  const dg = data[i + 1] - g;
  const db = data[i + 2] - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

// Gom màu ở dải viền 4px thành vài nhóm; bỏ nhóm quá ít để chi tiết chạm mép không bị coi là nền
export function borderPalette({ data, width, height }) {
  const clusters = [];
  const step = Math.max(1, Math.floor((width + height) / 400));
  let samples = 0;
  const add = (x, y) => {
    const i = (y * width + x) * 4;
    if (data[i + 3] < 16) return;
    samples++;
    const found = clusters.find((c) => distance(data, i, c.color) < 22);
    if (found) {
      found.count++;
      for (let k = 0; k < 3; k++) found.sum[k] += data[i + k];
      found.color = found.sum.map((s) => s / found.count);
    } else {
      clusters.push({
        color: [data[i], data[i + 1], data[i + 2]],
        sum: [data[i], data[i + 1], data[i + 2]],
        count: 1,
      });
    }
  };
  for (let d = 0; d < 4; d++) {
    for (let x = 0; x < width; x += step) {
      add(x, d);
      add(x, height - 1 - d);
    }
    for (let y = 0; y < height; y += step) {
      add(d, y);
      add(width - 1 - d, y);
    }
  }
  return clusters
    .filter((c) => c.count >= samples * 0.04)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((c) => c.color);
}

// Nền ô caro vẽ sẵn: hai màu sáng trung tính khác nhau rõ rệt chiếm gần hết viền
export function looksLikeFakeChecker(palette) {
  const light = palette.filter(
    ([r, g, b]) =>
      Math.min(r, g, b) > 170 && Math.max(r, g, b) - Math.min(r, g, b) < 18,
  );
  return light.length >= 2 && Math.abs(light[0][0] - light[1][0]) > 12;
}

// Gán nhãn vùng liên thông cho các pixel thỏa `inside`, gọi `onRegion(pixels)` cho từng vùng
function eachRegion(width, height, inside, onRegion) {
  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || !inside(start)) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    const region = [];
    while (top) {
      const p = stack[--top];
      region.push(p);
      const x = p % width;
      const neighbors = [
        p - width,
        p + width,
        x > 0 ? p - 1 : -1,
        x < width - 1 ? p + 1 : -1,
      ];
      for (const n of neighbors) {
        if (n < 0 || n >= width * height || seen[n] || !inside(n)) continue;
        seen[n] = 1;
        stack[top++] = n;
      }
    }
    onRegion(region);
  }
}

function boxBlur(mask, width, height, radius) {
  if (radius < 1) return mask;
  const tmp = new Float32Array(mask.length);
  const out = new Float32Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k;
        if (xx < 0 || xx >= width) continue;
        sum += mask[y * width + xx];
        n++;
      }
      tmp[y * width + x] = sum / n;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= height) continue;
        sum += tmp[yy * width + x];
        n++;
      }
      out[y * width + x] = sum / n;
    }
  }
  return out;
}

/**
 * Trả về mặt nạ alpha (Uint8ClampedArray, 0 = nền, 255 = giữ lại).
 * tolerance: độ lệch màu tối đa so với màu nền; shrink: số px thu viền để bỏ quầng sáng;
 * softness: bán kính làm mềm viền; fillHoles: xóa cả nền bị kẹp giữa cánh, lá, thân.
 */
// Nền ô caro vẽ sẵn chỉ gồm trắng và xám trung tính (cả màu pha giữa hai ô do ảnh nén).
// Điểm ảnh có màu (cánh hồng nhạt, lá xanh sáng) không bao giờ bị coi là nền.
function checkerDistance(image, [first, second]) {
  const { data, width, height } = image;
  const axis = second.map((v, k) => v - first[k]);
  const axisLength = Math.max(
    1,
    axis.reduce((sum, v) => sum + v * v, 0),
  );
  const dist = new Float32Array(width * height);
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    if (data[i + 3] < 16) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 14) {
      dist[p] = 999;
      continue;
    }
    let t = 0;
    for (let k = 0; k < 3; k++) t += (data[i + k] - first[k]) * axis[k];
    t = Math.max(0, Math.min(1, t / axisLength));
    dist[p] = distance(
      data,
      i,
      first.map((v, k) => v + axis[k] * t),
    );
  }
  return dist;
}

export function computeMask(
  image,
  { tolerance = 40, shrink = 1, softness = 1, fillHoles = true, palette } = {},
) {
  const { data, width, height } = image;
  const size = width * height;
  const colors = palette || borderPalette(image);
  // Nền ô caro giả: chỉ xóa màu trắng/xám trung tính nên cánh hoa nhạt màu không bị xóa nhầm
  const checker = looksLikeFakeChecker(colors)
    ? checkerDistance(image, colors)
    : null;
  if (checker) tolerance *= 0.6;
  const dist = checker || new Float32Array(size);
  for (let p = 0; !checker && p < size; p++) {
    const i = p * 4;
    let best = data[i + 3] < 16 ? 0 : 999;
    for (const c of colors) best = Math.min(best, distance(data, i, c));
    dist[p] = best;
  }

  // Loang nền từ mép ảnh; cho đi xa hơn một chút qua vùng chuyển màu từ từ (bóng đổ, nền gradient)
  const background = new Uint8Array(size);
  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;
  const seed = (p) => {
    if (!background[p] && dist[p] < tolerance) {
      background[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const neighbors = [
      p - width,
      p + width,
      x > 0 ? p - 1 : -1,
      x < width - 1 ? p + 1 : -1,
    ];
    for (const n of neighbors) {
      if (n < 0 || n >= size || background[n]) continue;
      const near = dist[n] < tolerance;
      const dr = data[n * 4] - data[p * 4];
      const dg = data[n * 4 + 1] - data[p * 4 + 1];
      const db = data[n * 4 + 2] - data[p * 4 + 2];
      const smooth =
        dist[n] < tolerance * 1.6 &&
        dr * dr + dg * dg + db * db < (tolerance * 0.3) ** 2;
      if (near || smooth) {
        background[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  if (fillHoles) {
    const minHole = size * 0.00012;
    eachRegion(
      width,
      height,
      (p) => !background[p] && dist[p] < tolerance * 0.8,
      (region) => {
        if (region.length >= minHole) for (const p of region) background[p] = 1;
      },
    );
  }
  // Bỏ các đốm nhỏ còn sót trên nền
  const minSpeck = size * 0.0004;
  eachRegion(
    width,
    height,
    (p) => !background[p],
    (region) => {
      if (region.length < minSpeck) for (const p of region) background[p] = 1;
    },
  );

  let mask = new Float32Array(size);
  for (let p = 0; p < size; p++) mask[p] = background[p] ? 0 : 1;
  for (let s = 0; s < shrink; s++) {
    const next = mask.slice();
    for (let p = 0; p < size; p++) {
      if (!mask[p]) continue;
      const x = p % width;
      if (
        (x > 0 && !mask[p - 1]) ||
        (x < width - 1 && !mask[p + 1]) ||
        (p >= width && !mask[p - width]) ||
        (p + width < size && !mask[p + width])
      )
        next[p] = 0;
    }
    mask = next;
  }
  mask = boxBlur(mask, width, height, Math.round(softness));
  const alpha = new Uint8ClampedArray(size);
  for (let p = 0; p < size; p++) alpha[p] = Math.round(mask[p] * 255);
  return { alpha, palette: colors };
}

// Ghép mặt nạ vào ảnh. Điểm ảnh ở viền (bán trong suốt) lấy màu của điểm đục gần nhất bên trong,
// nên viền không bị quầng màu nền cũng không bị sẫm lại.
export function applyMask(image, alpha, palette, edits) {
  const { data, width, height } = image;
  const size = width * height;
  const out = new Uint8ClampedArray(data.length);
  const finalAlpha = new Uint8ClampedArray(size);
  for (let p = 0; p < size; p++) {
    let a = alpha[p];
    if (edits?.[p] > 0) a = 255;
    else if (edits?.[p] < 0) a = 0;
    finalAlpha[p] = Math.round((a * data[p * 4 + 3]) / 255);
  }
  const reach = 5;
  for (let p = 0; p < size; p++) {
    const i = p * 4;
    const a = finalAlpha[p];
    out[i + 3] = a;
    let source = i;
    if (a > 0 && a < 250) {
      const x0 = p % width;
      const y0 = (p - x0) / width;
      let best = Infinity;
      for (let dy = -reach; dy <= reach; dy++) {
        const y = y0 + dy;
        if (y < 0 || y >= height) continue;
        for (let dx = -reach; dx <= reach; dx++) {
          const x = x0 + dx;
          const d = dx * dx + dy * dy;
          if (
            x < 0 ||
            x >= width ||
            d >= best ||
            finalAlpha[y * width + x] < 250
          )
            continue;
          best = d;
          source = (y * width + x) * 4;
        }
      }
    }
    out[i] = data[source];
    out[i + 1] = data[source + 1];
    out[i + 2] = data[source + 2];
  }
  return { data: out, width, height };
}

// Khung bao phần còn hình (alpha > 0), thêm lề nhỏ; dùng để cắt sát ảnh khi xuất
export function contentBounds({ data, width, height }, padding = 4) {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 8) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      bottom = y;
    }
  }
  if (right < 0) return null;
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  return {
    x: left,
    y: top,
    width: Math.min(width, right + padding + 1) - left,
    height: Math.min(height, bottom + padding + 1) - top,
  };
}
