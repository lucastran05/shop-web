import { useEffect, useState } from "react";
import { api } from "../../../shared/api";
import FlowerIcon from "./FlowerIcon";

// Hiện ảnh riêng tư của một lần nhận diện.
// Thẻ <img> không tự gửi Bearer token, nên tải ảnh bằng API (kèm token) dạng Blob
// rồi hiển thị qua object URL. Chưa có ảnh hoặc đang tải thì hiện icon bông hoa.
export default function FlowerHistoryImage({ id, hasImage, alt, className, fit }) {
  const [state, setState] = useState({ id: null, url: "", failed: false });

  useEffect(() => {
    if (!hasImage) return;
    const controller = new AbortController();
    let url = "";
    api.flowers
      .historyImage(id, { signal: controller.signal })
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setState({ id, url, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ id, url: "", failed: true });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url); // giải phóng bộ nhớ của ảnh cũ
    };
  }, [id, hasImage]);

  // Khi đổi sang id khác, bỏ qua URL của ảnh cũ trong lúc ảnh mới đang tải.
  const current = state.id === id ? state : { url: "", failed: false };
  const loading = hasImage && !current.url && !current.failed;
  return (
    <span
      className={`fh-photo ${loading ? "is-loading" : ""} ${className || ""}`}
    >
      {current.url ? (
        <img src={current.url} alt={alt} style={fit ? { objectFit: fit } : undefined} />
      ) : (
        <FlowerIcon className="fh-photo-placeholder" aria-hidden="true" />
      )}
    </span>
  );
}
