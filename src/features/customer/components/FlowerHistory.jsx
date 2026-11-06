import { useEffect, useState } from "react";
import { Alert, App, Button, Popconfirm } from "antd";
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { api } from "../../../shared/api";
import { userError } from "../../../shared/utils/userError";
import {
  flowerDisplayName,
  scoreLevel,
} from "../../../shared/utils/flowerNames";
import FlowerMatch from "./FlowerMatch";
import FlowerIcon from "./FlowerIcon";
import FlowerHistoryImage from "./FlowerHistoryImage";
import "./FlowerHistory.css";

const PAGE_SIZE = 12;

// Calendar-day distance between a date and today (0 = today, 1 = yesterday).
function daysAgo(value) {
  const date = new Date(value);
  const today = new Date();
  const start = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(today) - start(date)) / 86400000);
}

// Saved identifications of the signed-in user: list, detail, delete one, delete all.
export default function FlowerHistory({ onIdentify }) {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const lang = i18n.resolvedLanguage;
  const locale = lang === "en" ? "en-US" : "vi-VN";
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState("");

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
    return () => controller.abort();
  }, [reload]);

  function retry() {
    setError("");
    setLoading(true);
    setReload((value) => value + 1);
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await api.flowers.history({
        page: pagination.page + 1,
        limit: PAGE_SIZE,
      });
      // Skip ids already shown in case new entries shifted the pages.
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...res.data.filter((item) => !seen.has(item.id))];
      });
      setPagination(res.pagination);
    } catch (err) {
      message.error(t(userError(err)));
    } finally {
      setLoadingMore(false);
    }
  }

  async function remove(id) {
    setDeleting(id);
    try {
      await api.flowers.deleteHistoryItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setPagination((prev) => prev && { ...prev, total: prev.total - 1 });
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      message.error(t(userError(err)));
    } finally {
      setDeleting("");
    }
  }

  async function clearAll() {
    setDeleting("all");
    try {
      await api.flowers.clearHistory();
      setItems([]);
      setPagination(
        (prev) => prev && { ...prev, page: 1, total: 0, total_pages: 1 },
      );
      setSelected(null);
    } catch (err) {
      message.error(t(userError(err)));
    } finally {
      setDeleting("");
    }
  }

  const formatTime = (value) =>
    new Date(value).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  const formatFull = (value) =>
    new Date(value).toLocaleString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  // Day headings: "Hôm nay", "Hôm qua", otherwise weekday and date.
  function dayLabel(value) {
    const diff = daysAgo(value);
    if (diff === 0) return t("Hôm nay");
    if (diff === 1) return t("Hôm qua");
    return new Date(value).toLocaleDateString(locale, {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  // Items arrive newest first, so consecutive grouping keeps the order.
  const groups = [];
  for (const item of items) {
    const label = dayLabel(item.createdAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  const confirmDelete = (id, button) => (
    <Popconfirm
      title={t("Xóa lần nhận diện này?")}
      okText={t("Xóa")}
      cancelText={t("Hủy")}
      okButtonProps={{ danger: true }}
      onConfirm={() => remove(id)}
    >
      {button}
    </Popconfirm>
  );

  if (selected) {
    const others = selected.candidates.slice(1);
    return (
      <div className="fh-detail">
        <div className="fh-detail-bar">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => setSelected(null)}
          >
            {t("Lịch sử")}
          </Button>
          <span className="fh-detail-time">
            <ClockCircleOutlined /> {formatFull(selected.createdAt)}
          </span>
        </div>
        <div className="fh-detail-grid">
          <FlowerHistoryImage
            id={selected.id}
            hasImage={selected.hasImage}
            alt={t("Ảnh hoa đã nhận diện")}
            className="fh-detail-photo"
            fit="contain"
          />
          <div className="fh-detail-info">
            <FlowerMatch candidate={selected} />
            {others.length > 0 && (
              <section className="fh-similar">
                <h4>{t("Các loài gần giống")}</h4>
                <ul>
                  {others.map((item) => {
                    const name = flowerDisplayName(item, lang);
                    return (
                      <li key={item.scientificName}>
                        <span className="fh-similar-name">
                          <strong>{name}</strong>
                          {name !== item.scientificName && (
                            <i>{item.scientificName}</i>
                          )}
                        </span>
                        <span
                          className={`fh-similar-bar is-${scoreLevel(item.score)}`}
                          aria-hidden="true"
                        >
                          <span
                            style={{ width: `${Math.max(item.score * 100, 3)}%` }}
                          />
                        </span>
                        <span className="fh-similar-score">
                          {(item.score * 100).toFixed(1)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            <div className="fh-detail-actions">
              {confirmDelete(
                selected.id,
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleting === selected.id}
                >
                  {t("Xóa khỏi lịch sử")}
                </Button>,
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="fh-grid" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="fh-skeleton" />
        ))}
      </div>
    );

  if (error)
    return (
      <Alert
        type="error"
        showIcon
        title={t(error)}
        action={<Button onClick={retry}>{t("Thử lại")}</Button>}
      />
    );

  if (!items.length)
    return (
      <div className="fh-empty">
        <span className="fh-empty-icon">
          <HistoryOutlined />
        </span>
        <h3>{t("Bạn chưa nhận diện loài hoa nào")}</h3>
        <p>
          {t(
            "Mỗi lần nhận diện, ảnh và kết quả sẽ được lưu tại đây để bạn xem lại.",
          )}
        </p>
        <Button type="primary" icon={<FlowerIcon />} onClick={onIdentify}>
          {t("Nhận diện hoa")}
        </Button>
      </div>
    );

  return (
    <div className="flower-history">
      <div className="fh-head">
        <p>
          {t("Đã lưu {{count}} lần nhận diện", {
            count: pagination?.total ?? items.length,
          })}
        </p>
        <Popconfirm
          title={t("Xóa toàn bộ lịch sử nhận diện?")}
          okText={t("Xóa tất cả")}
          cancelText={t("Hủy")}
          okButtonProps={{ danger: true }}
          onConfirm={clearAll}
        >
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            loading={deleting === "all"}
          >
            {t("Xóa tất cả")}
          </Button>
        </Popconfirm>
      </div>
      {groups.map((group) => (
        <section className="fh-group" key={group.label}>
          <h4>{group.label}</h4>
          <ul className="fh-grid">
            {group.items.map((item) => {
              const name = flowerDisplayName(item, lang);
              return (
                <li key={item.id} className="fh-tile">
                  <button
                    type="button"
                    className="fh-tile-open"
                    onClick={() => setSelected(item)}
                  >
                    <FlowerHistoryImage
                      id={item.id}
                      hasImage={item.hasImage}
                      alt=""
                      className="fh-tile-photo"
                    />
                    <span
                      className={`fh-tile-score is-${scoreLevel(item.score)}`}
                    >
                      {(item.score * 100).toFixed(1)}%
                    </span>
                    <span className="fh-tile-body">
                      <strong>{name}</strong>
                      <i>{item.scientificName}</i>
                      <small>{formatTime(item.createdAt)}</small>
                    </span>
                  </button>
                  {confirmDelete(
                    item.id,
                    <Button
                      shape="circle"
                      size="small"
                      className="fh-tile-delete"
                      icon={<DeleteOutlined />}
                      aria-label={t("Xóa khỏi lịch sử")}
                      loading={deleting === item.id}
                    />,
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {pagination && pagination.page < pagination.total_pages && (
        <div className="fh-more">
          <Button onClick={loadMore} loading={loadingMore}>
            {t("Xem thêm")}
          </Button>
        </div>
      )}
    </div>
  );
}
