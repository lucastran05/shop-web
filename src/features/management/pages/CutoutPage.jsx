import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  App,
  Empty,
  Segmented,
  Select,
  Slider,
  Space,
  Switch,
  Upload,
} from "antd";
import {
  ClearOutlined,
  DownloadOutlined,
  InboxOutlined,
  SaveOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import Button from "../components/ManagementButton";
import { api } from "../../../shared/api";
import { userError } from "../../../shared/utils/userError";
import { useManagement } from "../hooks/useManagement";
import {
  applyMask,
  computeMask,
  contentBounds,
  looksLikeFakeChecker,
} from "../utils/backgroundRemoval";
import "../styles/cutout.css";

const MAX_SIDE = 1400;
const DEFAULTS = { tolerance: 40, shrink: 1, softness: 1, fillHoles: true };
const BACKDROPS = [
  { value: "checker", label: "Ô caro" },
  { value: "white", label: "Trắng" },
  { value: "paper", label: "Kem" },
  { value: "dark", label: "Tối" },
];

async function readImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function toPngBlob(image) {
  const bounds = contentBounds(image);
  if (!bounds) return Promise.resolve(null);
  const full = document.createElement("canvas");
  full.width = image.width;
  full.height = image.height;
  full
    .getContext("2d")
    .putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  const cropped = document.createElement("canvas");
  cropped.width = bounds.width;
  cropped.height = bounds.height;
  cropped
    .getContext("2d")
    .drawImage(
      full,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      bounds.width,
      bounds.height,
    );
  return new Promise((resolve) => cropped.toBlob(resolve, "image/png"));
}

async function loadStemProducts() {
  const { data } = await api.products.list({ sold_by_stem: true, limit: 100 });
  const details = await Promise.all(
    data.map((item) => api.products.get(item.id)),
  );
  return details.map(({ data: product }) => product);
}

export default function CutoutPage() {
  const { message } = App.useApp();
  const management = useManagement();
  const [source, setSource] = useState(null);
  const [options, setOptions] = useState(DEFAULTS);
  const [mask, setMask] = useState(null);
  const [view, setView] = useState("result");
  const [backdrop, setBackdrop] = useState("checker");
  const [tool, setTool] = useState("none");
  const [brush, setBrush] = useState(24);
  const [editVersion, setEditVersion] = useState(0);
  const [products, setProducts] = useState([]);
  const [target, setTarget] = useState({
    productId: null,
    variantId: null,
  });
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef(null);
  const editsRef = useRef(null);
  const historyRef = useRef([]);
  const resultRef = useRef(null);
  const paintingRef = useRef(false);

  useEffect(() => {
    loadStemProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!source) return;
    const timer = setTimeout(
      () => setMask(computeMask(source.image, options)),
      120,
    );
    return () => clearTimeout(timer);
  }, [source, options]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    canvas.width = source.image.width;
    canvas.height = source.image.height;
    const ctx = canvas.getContext("2d");
    if (view === "original" || !mask) {
      ctx.putImageData(source.image, 0, 0);
      return;
    }
    const result = applyMask(
      source.image,
      mask.alpha,
      mask.palette,
      editsRef.current,
    );
    resultRef.current = result;
    ctx.putImageData(
      new ImageData(result.data, result.width, result.height),
      0,
      0,
    );
  }, [source, mask, view, editVersion]);

  const fakeChecker = useMemo(
    () => mask && looksLikeFakeChecker(mask.palette),
    [mask],
  );
  const product = products.find((p) => p.id === target.productId);

  async function open(file) {
    try {
      const image = await readImage(file);
      editsRef.current = new Int8Array(image.width * image.height);
      historyRef.current = [];
      setSource({ image, name: file.name.replace(/\.[^.]+$/, "") });
      setView("result");
    } catch {
      message.error(
        "Không đọc được ảnh này, hãy thử ảnh JPG, PNG hoặc WebP khác.",
      );
    }
    return Upload.LIST_IGNORE;
  }

  function paint(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const cx = (event.clientX - rect.left) * scale;
    const cy = (event.clientY - rect.top) * scale;
    const r = brush * scale;
    const value = tool === "erase" ? -1 : 1;
    const { width, height } = source.image;
    const edits = editsRef.current;
    for (
      let y = Math.max(0, Math.floor(cy - r));
      y <= Math.min(height - 1, cy + r);
      y++
    ) {
      for (
        let x = Math.max(0, Math.floor(cx - r));
        x <= Math.min(width - 1, cx + r);
        x++
      ) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r)
          edits[y * width + x] = value;
      }
    }
    setEditVersion((n) => n + 1);
  }

  const pointer = {
    onPointerDown(event) {
      if (tool === "none" || view !== "result") return;
      historyRef.current = [
        ...historyRef.current.slice(-9),
        editsRef.current.slice(),
      ];
      paintingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      paint(event);
    },
    onPointerMove(event) {
      if (paintingRef.current) paint(event);
    },
    onPointerUp() {
      paintingRef.current = false;
    },
  };

  function undo() {
    const previous = historyRef.current.pop();
    if (!previous) return;
    editsRef.current = previous;
    setEditVersion((n) => n + 1);
  }

  function resetAll() {
    editsRef.current = new Int8Array(source.image.width * source.image.height);
    historyRef.current = [];
    setOptions(DEFAULTS);
    setEditVersion((n) => n + 1);
  }

  async function download() {
    const blob = await toPngBlob(resultRef.current);
    if (!blob)
      return message.warning("Ảnh sau khi tách không còn phần nào để lưu.");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${target.variantId || source.name}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function save() {
    setSaving(true);
    try {
      const blob = await toPngBlob(resultRef.current);
      if (!blob) throw new Error("empty");
      const file = new File([blob], `${target.variantId}.png`, {
        type: "image/png",
      });
      const { data } = await api.adminProducts.upload({
        files: [file],
        purpose: "product",
      });
      const url = data[0]?.url;
      const { data: latest } = await api.products.get(target.productId);
      const oldImage = latest.variants.find(
        (v) => v.id === target.variantId,
      )?.image;
      // Một ảnh cho mỗi màu: thẻ sản phẩm, trang quản trị và bó xem trước đều dùng ảnh này
      const variants = latest.variants.map((variant) =>
        variant.id === target.variantId
          ? {
              ...variant,
              image: url,
              stem_image: url,
              stem_image_source: "upload",
            }
          : variant,
      );
      const images = latest.images.map((image) =>
        oldImage && image.url === oldImage ? { ...image, url } : image,
      );
      await api.adminProducts.update(target.productId, {
        variants,
        images,
        ...(oldImage && latest.images[0]?.url === oldImage
          ? { image: url }
          : {}),
      });
      setProducts((old) =>
        old.map((p) =>
          p.id === latest.id ? { ...latest, variants, images } : p,
        ),
      );
      await management.loadProducts?.();
      message.success("Đã lưu ảnh cho màu hoa này trên toàn bộ cửa hàng.");
    } catch (error) {
      message.error(
        error.message === "empty"
          ? "Ảnh sau khi tách không còn phần nào để lưu."
          : userError(error),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mg-cutout">
      <section className="mg-cutout-panel">
        <Upload.Dragger
          accept="image/png,image/jpeg,image/webp"
          showUploadList={false}
          beforeUpload={open}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Kéo thả hoặc bấm để chọn ảnh hoa</p>
          <p className="ant-upload-hint">
            JPG, PNG, WebP. Ảnh chụp trên nền trơn cho kết quả tốt nhất.
          </p>
        </Upload.Dragger>

        <div className="mg-cutout-group">
          <h3>Tách nền</h3>
          <label>
            Độ nhạy màu nền <b>{options.tolerance}</b>
            <Slider
              min={5}
              max={120}
              value={options.tolerance}
              disabled={!source}
              onChange={(tolerance) => setOptions((o) => ({ ...o, tolerance }))}
            />
          </label>
          <label>
            Thu viền <b>{options.shrink}px</b>
            <Slider
              min={0}
              max={4}
              value={options.shrink}
              disabled={!source}
              onChange={(shrink) => setOptions((o) => ({ ...o, shrink }))}
            />
          </label>
          <label>
            Làm mềm viền <b>{options.softness}px</b>
            <Slider
              min={0}
              max={4}
              value={options.softness}
              disabled={!source}
              onChange={(softness) => setOptions((o) => ({ ...o, softness }))}
            />
          </label>
          <label className="mg-cutout-switch">
            <Switch
              size="small"
              checked={options.fillHoles}
              disabled={!source}
              onChange={(fillHoles) => setOptions((o) => ({ ...o, fillHoles }))}
            />
            Xóa nền kẹp giữa cánh, lá và thân
          </label>
        </div>

        <div className="mg-cutout-group">
          <h3>Chỉnh tay</h3>
          <Segmented
            block
            disabled={!source}
            value={tool}
            onChange={setTool}
            options={[
              { value: "none", label: "Xem" },
              { value: "erase", label: "Xóa thêm" },
              { value: "keep", label: "Giữ lại" },
            ]}
          />
          <label>
            Cỡ cọ <b>{brush}px</b>
            <Slider
              min={4}
              max={80}
              value={brush}
              disabled={!source}
              onChange={setBrush}
            />
          </label>
          <Space wrap>
            <Button icon={<UndoOutlined />} disabled={!source} onClick={undo}>
              Hoàn tác
            </Button>
            <Button
              icon={<ClearOutlined />}
              disabled={!source}
              onClick={resetAll}
            >
              Làm lại từ đầu
            </Button>
          </Space>
        </div>

        <div className="mg-cutout-group">
          <h3>Lưu ảnh</h3>
          <Select
            placeholder="Chọn hoa bán theo cành"
            value={target.productId}
            options={products.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(productId) =>
              setTarget((t) => ({ ...t, productId, variantId: null }))
            }
          />
          <Select
            placeholder="Chọn màu"
            value={target.variantId}
            disabled={!product}
            options={(product?.variants || []).map((v) => ({
              value: v.id,
              label: `${v.color || v.label}${v.stem_image_source === "upload" ? " (đã có ảnh tải lên)" : ""}`,
            }))}
            onChange={(variantId) => setTarget((t) => ({ ...t, variantId }))}
          />
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={!mask || !target.variantId}
            loading={saving}
            onClick={save}
          >
            Lưu cho màu hoa này
          </Button>
          <Button
            icon={<DownloadOutlined />}
            disabled={!mask}
            onClick={download}
          >
            Tải PNG về máy
          </Button>
        </div>
      </section>

      <section className="mg-cutout-preview">
        <div className="mg-cutout-bar">
          <Segmented
            value={view}
            disabled={!source}
            onChange={setView}
            options={[
              { value: "result", label: "Đã tách nền" },
              { value: "original", label: "Ảnh gốc" },
            ]}
          />
          <Segmented
            value={backdrop}
            onChange={setBackdrop}
            options={BACKDROPS}
          />
        </div>
        {fakeChecker && view === "result" && (
          <Alert
            showIcon
            type="info"
            title="Ảnh có nền ô caro vẽ sẵn (không phải nền trong suốt thật). Công cụ đã nhận ra và xóa nền này."
          />
        )}
        <div
          className={`mg-cutout-stage is-${backdrop}${tool !== "none" && view === "result" ? " is-painting" : ""}`}
        >
          {source ? (
            <canvas ref={canvasRef} {...pointer} />
          ) : (
            <Empty description="Chọn một ảnh hoa để bắt đầu" />
          )}
        </div>
        {source && (
          <p className="mg-cutout-hint">
            Mẹo: tăng độ nhạy nếu còn sót nền, giảm nếu cánh hoa bị ăn mất. Hoa
            trắng trên nền trắng nên tắt “Xóa nền kẹp giữa” rồi dùng cọ “Giữ
            lại”.
          </p>
        )}
      </section>
    </div>
  );
}
