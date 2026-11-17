// Vẽ bó hoa bằng Canvas 2D từ ảnh PNG nền trong suốt của từng cành.
// Bố cục lấy từ PRNG có seed theo thành phần bó, nên cùng thành phần luôn ra cùng một hình.

// Tỉ lệ so với khung vẽ: bề ngang bông hoa, độ cao của bông so với điểm buộc,
// chiều dài ảnh cành ngắn nhất/dài nhất, và độ sâu phần gốc cắm vào giấy gói
const HEAD_WIDTH = 0.17;
const HEAD_TOP = 0.56;
const MIN_STEM = 0.3;
const MAX_STEM = 0.72;
const SINK = 0.13;

export function bouquetSignature(selection, style) {
  return [
    ...selection
      .filter((item) => item.stems > 0)
      .map(
        (item) =>
          `${item.product_id}|${item.variant_id}|${item.stems}|${item.headSize || 1}|${item.stem_length || ""}`,
      )
      .sort(),
    style?.wrap || "",
    style?.height || "",
  ].join(";");
}

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Cành dài hơn thì bông vươn cao hơn trong ảnh xem trước (±15% quanh chiều dài chuẩn)
export function stemLengthFactor(length, range) {
  const { min = 40, max = 70 } = range || {};
  if (!length || max === min) return 1;
  return 0.85 + ((length - min) / (max - min)) * 0.3;
}

export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Chia đều các cành trên một hình quạt; cành ở giữa cao hơn và nằm phía trước
export function layoutBouquet(selection, shape = {}) {
  const items = selection.filter((item) => item.stems > 0);
  const random = seededRandom(hashString(bouquetSignature(items, shape)));
  const stems = items
    .slice()
    .sort((a, b) =>
      `${a.product_id}|${a.variant_id}`.localeCompare(
        `${b.product_id}|${b.variant_id}`,
      ),
    )
    .flatMap((item) => Array.from({ length: item.stems }, () => item))
    .map((item) => ({ item, order: random() }))
    .sort((a, b) => a.order - b.order);
  const total = stems.length;
  // Dáng bó: "thấp" thì xòe rộng và cành ngắn lại, "cao" thì khép và vươn lên
  const spread = Math.min(1.6, (0.5 + total * 0.07) * (shape.spread || 1));
  const scale = shape.scale || 1;
  return stems
    .map(({ item }, slot) => {
      const angle =
        ((slot + 0.5) / total - 0.5) * spread +
        (random() - 0.5) * (spread / total) * 0.8;
      return {
        item,
        angle,
        // Mỗi loại hoa có chiều dài cành riêng do khách chọn (cm)
        length:
          (1.02 - Math.abs(angle) * 0.14 + random() * 0.08) *
          scale *
          stemLengthFactor(item.stem_length, shape.lengthRange),
        depth: Math.abs(angle) * 1.4 + random() * 0.4,
        shift: (random() - 0.5) * 0.05,
      };
    })
    .sort((a, b) => b.depth - a.depth);
}

function paperGradient(ctx, x0, x1, light, dark) {
  const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
  gradient.addColorStop(0, dark);
  gradient.addColorStop(0.5, light);
  gradient.addColorStop(1, dark);
  return gradient;
}

// Kiểu giấy gói: [màu sáng, màu đậm]; backend là nơi quyết định danh sách và giá
const WRAP_COLORS = {
  kraft: ["#efe4cf", "#c4a273"],
  pastel: ["#fbeaf0", "#e0b4c6"],
  mint: ["#e9f2e7", "#a9c7a8"],
  silk: ["#f6effa", "#c3a6d8"],
  mesh: ["#faf6ec", "#d6c9ab"],
};
const wrapColors = (wrap) => WRAP_COLORS[wrap] || WRAP_COLORS.kraft;

function drawBackPaper(ctx, w, h, wrap) {
  const [light, dark] = wrapColors(wrap);
  ctx.fillStyle = paperGradient(ctx, w * 0.05, w * 0.95, light, dark);
  ctx.globalAlpha = wrap === "mesh" ? 0.75 : 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.97);
  ctx.lineTo(w * 0.06, h * 0.32);
  ctx.bezierCurveTo(w * 0.25, h * 0.22, w * 0.75, h * 0.22, w * 0.94, h * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFrontPaper(ctx, w, h, wrap) {
  const [light, dark] = wrapColors(wrap);
  const tip = [w * 0.5, h * 0.985];
  ctx.globalAlpha = wrap === "mesh" ? 0.72 : 1;
  ctx.fillStyle = paperGradient(ctx, w * 0.18, w * 0.62, light, dark);
  ctx.beginPath();
  ctx.moveTo(...tip);
  ctx.lineTo(w * 0.17, h * 0.6);
  ctx.quadraticCurveTo(w * 0.36, h * 0.66, w * 0.6, h * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = paperGradient(ctx, w * 0.4, w * 0.84, dark, light);
  ctx.beginPath();
  ctx.moveTo(...tip);
  ctx.lineTo(w * 0.4, h * 0.64);
  ctx.quadraticCurveTo(w * 0.62, h * 0.67, w * 0.83, h * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  // Lưới voan có các ô kẻ mảnh cho thấy rõ chất liệu
  if (wrap === "mesh") {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(...tip);
    ctx.lineTo(w * 0.17, h * 0.6);
    ctx.lineTo(w * 0.83, h * 0.6);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = "rgba(120, 100, 60, 0.35)";
    ctx.lineWidth = Math.max(1, w / 560);
    for (let i = -8; i <= 8; i++) {
      const offset = (i * w) / 22;
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + offset, h * 0.58);
      ctx.lineTo(w * 0.5 + offset * 0.3, h);
      ctx.stroke();
    }
    for (let y = h * 0.62; y < h; y += h / 26) {
      ctx.beginPath();
      ctx.moveTo(w * 0.1, y);
      ctx.lineTo(w * 0.9, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawRibbon(ctx, w, h) {
  const x = w * 0.5;
  const y = h * 0.79;
  const s = w / 420;
  ctx.fillStyle = "#6b4a8a";
  ctx.beginPath();
  ctx.moveTo(x - 4 * s, y + 4 * s);
  ctx.lineTo(x - 22 * s, y + 46 * s);
  ctx.lineTo(x - 12 * s, y + 44 * s);
  ctx.lineTo(x, y + 6 * s);
  ctx.lineTo(x + 14 * s, y + 42 * s);
  ctx.lineTo(x + 24 * s, y + 44 * s);
  ctx.lineTo(x + 4 * s, y + 4 * s);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x - 19 * s, y, 21 * s, 10 * s, -0.3, 0, Math.PI * 2);
  ctx.ellipse(x + 19 * s, y, 21 * s, 10 * s, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4f3368";
  ctx.beginPath();
  ctx.arc(x, y, 7.5 * s, 0, Math.PI * 2);
  ctx.fill();
}

// style: { wrap, height, scale, spread } — kiểu giấy gói và dáng bó khách chọn
export function drawBouquet(canvas, selection, images, imageOf, style = {}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const placed = layoutBouquet(selection, style);
  if (!placed.length) return;

  drawBackPaper(ctx, w, h, style.wrap);
  const tieX = w * 0.5;
  const tieY = h * 0.79;
  ctx.save();
  // Gốc cành chỉ hiện trong phễu giấy, không thò ra ngoài
  ctx.beginPath();
  ctx.rect(0, 0, w, h * 0.62);
  ctx.moveTo(w * 0.17, h * 0.6);
  ctx.lineTo(w * 0.83, h * 0.6);
  ctx.lineTo(w * 0.5, h * 0.985);
  ctx.closePath();
  ctx.clip();
  ctx.shadowColor = "rgba(30, 42, 31, 0.22)";
  ctx.shadowBlur = w / 60;
  ctx.shadowOffsetY = w / 140;
  for (const stem of placed) {
    const image = images.get(imageOf(stem.item));
    if (!image) continue;
    // Ảnh mỗi loại hoa có tỉ lệ khác nhau, nên phóng theo bề ngang bông hoa rồi
    // nhân cỡ bông của loại hoa đó (admin đặt), sau cùng giới hạn chiều dài ảnh.
    const headWidth = image.headWidth || image.width;
    const headSize = Number(stem.item.headSize) || 1;
    const height = Math.min(
      h * MAX_STEM,
      Math.max(
        h * MIN_STEM,
        (image.height * w * HEAD_WIDTH * headSize) / headWidth,
      ),
    );
    const width = (height * image.width) / image.height;
    // Cành dài tới đâu thì bông cũng không vượt khỏi khung vẽ
    const top = -h * Math.min(0.74, HEAD_TOP * stem.length);
    const bottom = top + height;
    ctx.save();
    ctx.translate(tieX + stem.shift * w, tieY);
    ctx.rotate(stem.angle);
    // Ảnh cắt sát bông thì thiếu cành: kéo dài dải thân ở đáy ảnh xuống tận giấy gói
    if (bottom < h * SINK) {
      const slice = Math.max(1, image.height * 0.02);
      ctx.drawImage(
        image,
        0,
        image.height - slice,
        image.width,
        slice,
        -width / 2,
        bottom - 1,
        width,
        h * SINK - bottom + 1,
      );
    }
    ctx.drawImage(image, -width / 2, top, width, height);
    ctx.restore();
  }
  ctx.restore();
  drawFrontPaper(ctx, w, h, style.wrap);
  drawRibbon(ctx, w, h);
}

// Ảnh chụp thật thường thừa viền trong suốt: cắt sát phần có hình để cành nào cũng cùng tỉ lệ
function trimTransparent(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  let data;
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return image;
  }
  // Ảnh còn nền (4 góc đều đục) không ghép vào bó được: coi như chưa có ảnh cành
  const w = canvas.width;
  const corners = [0, w - 1, (canvas.height - 1) * w, canvas.height * w - 1];
  if (corners.every((p) => data[p * 4 + 3] > 245)) return null;
  let top = canvas.height;
  let left = canvas.width;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] < 12) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      bottom = y;
    }
  }
  if (right < 0) return image;
  // Bề ngang bông hoa: chỗ rộng nhất của phần trên cành, dùng để phóng ảnh cho đều
  let headWidth = 0;
  const headBottom = top + (bottom - top) * 0.35;
  for (let y = top; y <= headBottom; y++) {
    let first = -1;
    let last = -1;
    for (let x = left; x <= right; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] < 12) continue;
      if (first < 0) first = x;
      last = x;
    }
    if (last - first > headWidth) headWidth = last - first;
  }
  const cropped = document.createElement("canvas");
  cropped.width = right - left + 1;
  cropped.height = bottom - top + 1;
  cropped.headWidth = headWidth || cropped.width;
  cropped
    .getContext("2d")
    .drawImage(
      canvas,
      left,
      top,
      cropped.width,
      cropped.height,
      0,
      0,
      cropped.width,
      cropped.height,
    );
  return cropped;
}

const cache = new Map();
export function loadStemImage(url) {
  if (!cache.has(url)) {
    cache.set(
      url,
      new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(trimTransparent(image));
        image.onerror = () => resolve(null);
        image.src = url;
      }),
    );
  }
  return cache.get(url);
}
