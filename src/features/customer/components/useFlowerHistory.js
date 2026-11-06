import { useEffect, useState } from "react";
import { App } from "antd";
import { useTranslation } from "react-i18next";
import { api } from "../../../shared/api";
import { userError } from "../../../shared/utils/userError";

const PAGE_SIZE = 12;

// Hook dữ liệu cho tab Lịch sử: tải trang đầu, xem thêm, xóa một mục, xóa tất cả.
// Component chỉ việc đọc state và gọi các hàm trả về.
export function useFlowerHistory() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true); // đang tải trang đầu
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(""); // lỗi tải trang đầu (hiện kèm nút Thử lại)
  const [deleting, setDeleting] = useState(""); // id đang xóa, hoặc "all"
  const [reloadKey, setReloadKey] = useState(0); // tăng lên để tải lại trang đầu

  // Tải trang đầu khi mở tab và mỗi lần bấm Thử lại.
  useEffect(() => {
    const controller = new AbortController();
    api.flowers
      .history({ page: 1, limit: PAGE_SIZE }, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        setItems(res.data);
        setPagination(res.pagination);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(userError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort(); // rời tab trước khi tải xong
  }, [reloadKey]);

  function retry() {
    setError("");
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await api.flowers.history({
        page: pagination.page + 1,
        limit: PAGE_SIZE,
      });
      // Nếu có lần nhận diện mới, các trang bị đẩy lệch: bỏ mục đã hiện để không trùng.
      setItems((prev) => {
        const shown = new Set(prev.map((item) => item.id));
        return [...prev, ...res.data.filter((item) => !shown.has(item.id))];
      });
      setPagination(res.pagination);
    } catch (err) {
      message.error(t(userError(err)));
    } finally {
      setLoadingMore(false);
    }
  }

  // Trả về true nếu xóa thành công.
  async function remove(id) {
    setDeleting(id);
    try {
      await api.flowers.deleteHistoryItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setPagination((prev) => prev && { ...prev, total: prev.total - 1 });
      return true;
    } catch (err) {
      message.error(t(userError(err)));
      return false;
    } finally {
      setDeleting("");
    }
  }

  async function clearAll() {
    setDeleting("all");
    try {
      await api.flowers.clearHistory();
      setItems([]);
      setPagination((prev) => prev && { ...prev, page: 1, total: 0, total_pages: 1 });
      return true;
    } catch (err) {
      message.error(t(userError(err)));
      return false;
    } finally {
      setDeleting("");
    }
  }

  const hasMore = Boolean(pagination && pagination.page < pagination.total_pages);
  const total = pagination?.total ?? items.length;

  return {
    items,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    deleting,
    retry,
    loadMore,
    remove,
    clearAll,
  };
}
