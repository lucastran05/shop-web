import { useEffect, useState } from "react";
import { App } from "antd";
import { useTranslation } from "react-i18next";
import { api } from "../../../shared/api";
import { userError } from "../../../shared/utils/userError";

export const PAGE_SIZE = 8;

// Hook dữ liệu cho tab Lịch sử: tải theo trang, chuyển trang, xóa một mục, xóa tất cả.
// Component chỉ việc đọc state và gọi các hàm trả về.
export function useFlowerHistory() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1); // trang đang xem
  const [loading, setLoading] = useState(true); // đang tải lần đầu
  const [paging, setPaging] = useState(false); // đang chuyển trang
  const [error, setError] = useState(""); // lỗi tải (hiện kèm nút Thử lại)
  const [deleting, setDeleting] = useState(""); // id đang xóa, hoặc "all"
  const [reloadKey, setReloadKey] = useState(0); // tăng lên để tải lại trang hiện tại

  // Tải trang hiện tại khi mở tab, khi đổi trang và khi cần tải lại.
  useEffect(() => {
    const controller = new AbortController();
    api.flowers
      .history({ page, limit: PAGE_SIZE }, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        // Trang hiện tại đã trống (vừa xóa mục cuối) thì lùi về trang trước.
        if (!res.data.length && page > 1) {
          setPage((value) => Math.min(value - 1, res.pagination.total_pages || 1));
          return;
        }
        setItems(res.data);
        setPagination(res.pagination);
        setError("");
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(userError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setPaging(false);
        }
      });
    return () => controller.abort(); // rời tab hoặc đổi trang trước khi tải xong
  }, [page, reloadKey]);

  function retry() {
    setError("");
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  function goToPage(next) {
    if (next === page) return;
    setPaging(true);
    setPage(next);
  }

  // Trả về true nếu xóa thành công. Tải lại trang để lấp chỗ trống.
  async function remove(id) {
    setDeleting(id);
    try {
      await api.flowers.deleteHistoryItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setPagination((prev) => prev && { ...prev, total: prev.total - 1 });
      setReloadKey((key) => key + 1);
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
      setPage(1);
      setPagination((prev) => prev && { ...prev, page: 1, total: 0, total_pages: 1 });
      return true;
    } catch (err) {
      message.error(t(userError(err)));
      return false;
    } finally {
      setDeleting("");
    }
  }

  const total = pagination?.total ?? items.length;

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    loading,
    paging,
    error,
    deleting,
    retry,
    goToPage,
    remove,
    clearAll,
  };
}
