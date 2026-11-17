import { userError } from "../../../shared/utils/userError";
import { useState } from "react";
import { App, Image, Space, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import Button from "./ManagementButton";
import { api } from "../../../shared/api";
import {
  applyMask,
  borderPalette,
  computeMask,
  contentBounds,
  looksLikeFakeChecker,
} from "../utils/backgroundRemoval";

// Ảnh "PNG trong suốt" tải trên mạng thường có ô caro vẽ sẵn thay vì nền trong suốt thật:
// xóa nền đó và cắt sát hình ngay trên canvas trước khi tải lên
function removeFakeChecker(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const palette = borderPalette(image);
  if (!looksLikeFakeChecker(palette)) return false;
  const { alpha } = computeMask(image, { palette });
  const result = applyMask(image, alpha, palette);
  const bounds = contentBounds(result);
  if (!bounds) return false;
  ctx.putImageData(
    new ImageData(result.data, result.width, result.height),
    0,
    0,
  );
  const cropped = ctx.getImageData(
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
  );
  canvas.width = bounds.width;
  canvas.height = bounds.height;
  ctx.putImageData(cropped, 0, 0);
  return true;
}

export default function ProductImageInput({
  value,
  onChange,
  onLoadingChange,
  compact = false,
}) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  async function select(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      message.error("Chọn ảnh JPG, PNG hoặc WebP");
      return Upload.LIST_IGNORE;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error("Ảnh không được vượt quá 10 MB");
      return Upload.LIST_IGNORE;
    }
    setLoading(true);
    onLoadingChange?.(true);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext("2d")
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const cleaned = removeFakeChecker(canvas);
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result ? resolve(result) : reject(new Error("Không đọc được ảnh.")),
          "image/webp",
          0.8,
        ),
      );
      const imageFile = new File(
        [blob],
        `${file.name.replace(/\.[^.]+$/, "") || "product-image"}.webp`,
        { type: "image/webp" },
      );
      const { data } = await api.adminProducts.upload({
        files: [imageFile],
        purpose: "product",
      });
      const uploadedImage = data[0];
      if (!uploadedImage?.url)
        throw new Error("Backend không trả về URL ảnh sản phẩm.");
      onChange?.(uploadedImage.url);
      message.success(
        cleaned
          ? "Đã tải ảnh và tự xóa nền ô caro vẽ sẵn trong ảnh"
          : "Đã tải ảnh sản phẩm",
      );
    } catch (error) {
      message.error(
        userError(error) || "Không tải được ảnh. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
    return Upload.LIST_IGNORE;
  }
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Image
        src={value || "/product-placeholder.svg"}
        alt="Ảnh sản phẩm"
        width={100}
        height={100}
        style={{ objectFit: "contain" }}
      />
      <Upload
        accept="image/jpeg,image/png,image/webp"
        showUploadList={false}
        beforeUpload={select}
        disabled={loading}
      >
        <Button icon={<UploadOutlined />} loading={loading}>
          {compact ? "Tải ảnh" : "Tải ảnh từ máy tính"}
        </Button>
      </Upload>
      {value && value !== "/product-placeholder.svg" && (
        <Button type="text" disabled={loading} onClick={() => onChange?.("")}>
          {compact ? "Ảnh mặc định" : "Dùng ảnh mặc định"}
        </Button>
      )}
    </Space>
  );
}
