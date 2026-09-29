import { useState } from "react";
import { App, Image, Input, Space, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import Button from "./ManagementButton";

export default function ProductImageInput({ value, onChange, onLoadingChange }) {
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
      onChange?.(canvas.toDataURL("image/webp", 0.8));
    } catch {
      message.error("Không đọc được ảnh. Vui lòng chọn ảnh khác.");
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
    return Upload.LIST_IGNORE;
  }
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      {value && (
        <Image
          src={value}
          alt="Ảnh sản phẩm"
          width={100}
          height={100}
          style={{ objectFit: "contain" }}
        />
      )}
      <Upload
        accept="image/jpeg,image/png,image/webp"
        showUploadList={false}
        beforeUpload={select}
        disabled={loading}
      >
        <Button icon={<UploadOutlined />} loading={loading}>
          Tải ảnh từ máy tính
        </Button>
      </Upload>
      <Input
        aria-label="Đường dẫn ảnh"
        placeholder="Hoặc nhập đường dẫn ảnh"
        value={value?.startsWith("data:") ? "" : value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </Space>
  );
}
