import { useState } from "react";
import { Alert, Button, Popconfirm } from "antd";
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  flowerDisplayName,
  scoreLevel,
} from "../../../shared/utils/flowerNames";
import FlowerMatch from "./FlowerMatch";
import FlowerIcon from "./FlowerIcon";
import FlowerHistoryImage from "./FlowerHistoryImage";
import { useFlowerHistory } from "./useFlowerHistory";
import "./FlowerHistory.css";

// Tab Lịch sử trong popup nhận diện.
//   FlowerHistory    chọn hiển thị: đang tải / lỗi / trống / lưới ảnh / chi tiết
//   HistoryGrid      lưới ảnh, nhóm theo ngày
//   HistoryDetail    một lần nhận diện: ảnh gốc + kết quả + các loài gần giống
// Dữ liệu và các thao tác gọi API nằm trong hook useFlowerHistory.

const toPercent = (score) => `${(score * 100).toFixed(1)}%`;
const localeOf = (lang) => (lang === "en" ? "en-US" : "vi-VN");

// Số ngày lịch giữa thời điểm value và hôm nay (0 = hôm nay, 1 = hôm qua).
function daysAgo(value) {
  const startOfDay = (date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((startOfDay(new Date()) - startOfDay(new Date(value))) / 86400000);
}

// Gom các mục (đã sắp mới nhất trước) thành nhóm theo nhãn ngày, giữ nguyên thứ tự.
function groupByDay(items, labelOf) {
  const groups = [];
  for (const item of items) {
    const label = labelOf(item.createdAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

export default function FlowerHistory({ onIdentify }) {
  const history = useFlowerHistory();
  const [selected, setSelected] = useState(null); // mục đang xem chi tiết

  async function removeItem(id) {
    const removed = await history.remove(id);
    if (removed && selected?.id === id) setSelected(null);
  }

  async function clearAll() {
    if (await history.clearAll()) setSelected(null);
  }

  if (selected)
    return (
      <HistoryDetail
        item={selected}
        deleting={history.deleting === selected.id}
        onBack={() => setSelected(null)}
        onDelete={() => removeItem(selected.id)}
      />
    );
  if (history.loading) return <HistorySkeleton />;
  if (history.error) return <HistoryError message={history.error} onRetry={history.retry} />;
  if (!history.items.length) return <HistoryEmpty onIdentify={onIdentify} />;

  return (
    <HistoryGrid
      history={history}
      onOpen={setSelected}
      onDelete={removeItem}
      onClearAll={clearAll}
    />
  );
}

// Nút xóa có hộp xác nhận, dùng cho cả ô trong lưới và trang chi tiết.
function ConfirmDelete({ onConfirm, children }) {
  const { t } = useTranslation();
  return (
    <Popconfirm
      title={t("Xóa lần nhận diện này?")}
      okText={t("Xóa")}
      cancelText={t("Hủy")}
      okButtonProps={{ danger: true }}
      onConfirm={onConfirm}
    >
      {children}
    </Popconfirm>
  );
}

function HistoryGrid({ history, onOpen, onDelete, onClearAll }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const locale = localeOf(lang);

  // Nhãn nhóm: "Hôm nay", "Hôm qua", còn lại là thứ và ngày.
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
  const formatTime = (value) =>
    new Date(value).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flower-history">
      <div className="fh-head">
        <p>{t("Đã lưu {{count}} lần nhận diện", { count: history.total })}</p>
        <Popconfirm
          title={t("Xóa toàn bộ lịch sử nhận diện?")}
          okText={t("Xóa tất cả")}
          cancelText={t("Hủy")}
          okButtonProps={{ danger: true }}
          onConfirm={onClearAll}
        >
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            loading={history.deleting === "all"}
          >
            {t("Xóa tất cả")}
          </Button>
        </Popconfirm>
      </div>

      {groupByDay(history.items, dayLabel).map((group) => (
        <section className="fh-group" key={group.label}>
          <h4>{group.label}</h4>
          <ul className="fh-grid">
            {group.items.map((item) => (
              <li key={item.id} className="fh-tile">
                <button type="button" className="fh-tile-open" onClick={() => onOpen(item)}>
                  <FlowerHistoryImage
                    id={item.id}
                    hasImage={item.hasImage}
                    alt=""
                    className="fh-tile-photo"
                  />
                  <span className={`fh-tile-score is-${scoreLevel(item.score)}`}>
                    {toPercent(item.score)}
                  </span>
                  <span className="fh-tile-body">
                    <strong>{flowerDisplayName(item, lang)}</strong>
                    <i>{item.scientificName}</i>
                    <small>{formatTime(item.createdAt)}</small>
                  </span>
                </button>
                <ConfirmDelete onConfirm={() => onDelete(item.id)}>
                  <Button
                    shape="circle"
                    size="small"
                    className="fh-tile-delete"
                    icon={<DeleteOutlined />}
                    aria-label={t("Xóa khỏi lịch sử")}
                    loading={history.deleting === item.id}
                  />
                </ConfirmDelete>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {history.hasMore && (
        <div className="fh-more">
          <Button onClick={history.loadMore} loading={history.loadingMore}>
            {t("Xem thêm")}
          </Button>
        </div>
      )}
    </div>
  );
}

function HistoryDetail({ item, deleting, onBack, onDelete }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const similar = item.candidates.slice(1); // phần tử đầu chính là loài đang xem
  const takenAt = new Date(item.createdAt).toLocaleString(localeOf(lang), {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="fh-detail">
      <div className="fh-detail-bar">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>
          {t("Lịch sử")}
        </Button>
        <span className="fh-detail-time">
          <ClockCircleOutlined /> {takenAt}
        </span>
      </div>

      <div className="fh-detail-grid">
        <FlowerHistoryImage
          id={item.id}
          hasImage={item.hasImage}
          alt={t("Ảnh hoa đã nhận diện")}
          className="fh-detail-photo"
          fit="contain"
        />
        <div className="fh-detail-info">
          <FlowerMatch candidate={item} />

          {similar.length > 0 && (
            <section className="fh-similar">
              <h4>{t("Các loài gần giống")}</h4>
              <ul>
                {similar.map((other) => {
                  const name = flowerDisplayName(other, lang);
                  return (
                    <li key={other.scientificName}>
                      <span className="fh-similar-name">
                        <strong>{name}</strong>
                        {name !== other.scientificName && <i>{other.scientificName}</i>}
                      </span>
                      <span
                        className={`fh-similar-bar is-${scoreLevel(other.score)}`}
                        aria-hidden="true"
                      >
                        <span style={{ width: `${Math.max(other.score * 100, 3)}%` }} />
                      </span>
                      <span className="fh-similar-score">{toPercent(other.score)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <div className="fh-detail-actions">
            <ConfirmDelete onConfirm={onDelete}>
              <Button type="text" danger icon={<DeleteOutlined />} loading={deleting}>
                {t("Xóa khỏi lịch sử")}
              </Button>
            </ConfirmDelete>
          </div>
        </div>
      </div>
    </div>
  );
}

// Các ô xám nhấp nháy trong lúc tải trang đầu.
function HistorySkeleton() {
  return (
    <div className="fh-grid" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="fh-skeleton" />
      ))}
    </div>
  );
}

function HistoryError({ message, onRetry }) {
  const { t } = useTranslation();
  return (
    <Alert
      type="error"
      showIcon
      title={t(message)}
      action={<Button onClick={onRetry}>{t("Thử lại")}</Button>}
    />
  );
}

function HistoryEmpty({ onIdentify }) {
  const { t } = useTranslation();
  return (
    <div className="fh-empty">
      <span className="fh-empty-icon">
        <HistoryOutlined />
      </span>
      <h3>{t("Bạn chưa nhận diện loài hoa nào")}</h3>
      <p>
        {t("Mỗi lần nhận diện, ảnh và kết quả sẽ được lưu tại đây để bạn xem lại.")}
      </p>
      <Button type="primary" icon={<FlowerIcon />} onClick={onIdentify}>
        {t("Nhận diện hoa")}
      </Button>
    </div>
  );
}
