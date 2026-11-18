import { usePreferences } from "../../../shared/preferences/usePreferences";
import { formatDateTime } from "../../../shared/utils/format";
import { useTranslation } from "react-i18next";
import {
  orderStatuses,
  orderStatusGroup,
  canCancelOrder,
} from "../../../shared/constants/shop";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button, Modal, Pagination, Spin } from "antd";
import { useShop } from "../../../shared/shop/useShop";
import { money } from "../../../shared/utils/format";
import OrderDetail from "../components/OrderDetail";
import { progressSteps, statusTone } from "../components/orderStatus";
import CopyCode from "../../../shared/components/CopyCode";
import { api } from "../../../shared/api";
import { App } from "antd";
import { userError } from "../../../shared/utils/userError";
import RequestError from "../../../shared/components/RequestError";

export default function Orders() {
  const { t } = useTranslation();
  const { timeZone } = usePreferences();
  const { message } = App.useApp();
  const s = useShop(),
    [tab, setTab] = useState("all"),
    [selectedDetail, setDetail] = useState(null),
    [cancel, setCancel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [page, setPage] = useState(1);
  const refreshOrders = s.refreshOrders;
  const tabsRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const strip = tabsRef.current;
    const el = strip?.querySelector('[aria-pressed="true"]');
    if (!el) return;
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    if (
      el.offsetLeft < strip.scrollLeft ||
      el.offsetLeft + el.offsetWidth > strip.scrollLeft + strip.clientWidth
    )
      strip.scrollTo({ left: el.offsetLeft - 16, behavior: "smooth" });
  }, [tab, loading, t]);
  const userId = s.user?.id;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    refreshOrders()
      .then(() => {
        if (active) setLoadError(null);
      })
      .catch((error) => {
        if (active) setLoadError(error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, refreshOrders, attempt]);
  const detail =
    selectedDetail && s.orders.find((o) => o.id === selectedDetail.id);
  if (!s.user) return <Navigate to="/login?next=/orders" replace />;
  const all = s.orders.filter((o) => o.owner === s.user.email),
    orders = all.filter((o) => {
      if (tab === "all") return true;
      return orderStatusGroup(o.status) === tab;
    });
  const currentPage = Math.min(page, Math.max(1, Math.ceil(orders.length / 5)));
  async function cancelOrder() {
    if (cancelling) return;
    setCancelling(true);
    try {
      await api.orders.cancel(cancel.id, {
        reason: "Khách hàng yêu cầu hủy đơn",
      });
      setCancel(null);
      await s.refreshOrders().catch(setLoadError);
    } catch (error) {
      message.error(t(userError(error)));
    } finally {
      setCancelling(false);
    }
  }
  const tabs = [
    { key: "all", label: t("Tất cả"), count: all.length },
    ...orderStatuses.map((v) => ({
      key: v,
      label: t(v),
      count: all.filter((o) => orderStatusGroup(o.status) === v).length,
    })),
  ];
  return (
    <div className="page orders-page bt-orders">
      <header className="bt-page-head">
        <h1>{t("Đơn mua của bạn")}</h1>
        <Link className="bt-head-link" to="/#collection">
          {t("Tiếp tục mua sắm")}
        </Link>
      </header>
      <div
        className="bt-tabs bt-orders-tabs"
        ref={tabsRef}
        role="group"
        aria-label={t("Lọc theo trạng thái")}
        style={{
          "--ind-left": indicator.left + "px",
          "--ind-width": indicator.width + "px",
        }}
      >
        {tabs.map((item) => (
          <button
            type="button"
            key={item.key}
            aria-pressed={tab === item.key}
            onClick={() => {
              setTab(item.key);
              setPage(1);
            }}
          >
            {item.label}
            <sup>{item.count}</sup>
          </button>
        ))}
        <span className="bt-tabs-indicator" aria-hidden="true" />
      </div>
      {loadError && !loading && (
        <RequestError
          error={loadError}
          onRetry={() => {
            setLoading(true);
            setAttempt((value) => value + 1);
          }}
        />
      )}
      {loading ? (
        <div className="bt-state" role="status">
          <Spin size="large" />
          <p>{t("Đang tải…")}</p>
        </div>
      ) : orders.length ? (
        <div className="bt-order-list" key={tab + currentPage}>
          {orders.slice((currentPage - 1) * 5, currentPage * 5).map((o) => {
            const group = orderStatusGroup(o.status);
            const step = progressSteps.indexOf(group);
            const isDelivered = [
              "completed",
              "delivered",
              "Đã hoàn thành",
              "Giao thành công",
            ].includes(o.statusCode || o.status);
            const canCancel =
              o.allowed_actions?.includes("cancel") || canCancelOrder(o);
            return (
              <article className="bt-order" key={o.id}>
                <header className="bt-order-head">
                  <div className="bt-order-id">
                    <span className="bt-order-code">
                      <strong title={o.code}>{o.code}</strong>
                      <CopyCode value={o.code} />
                    </span>
                    <time dateTime={o.createdAt}>
                      {formatDateTime(o.createdAt, timeZone)}
                    </time>
                  </div>
                  <span
                    className="bt-status"
                    style={{ "--tone": statusTone[group] || "#56604f" }}
                  >
                    {t(group)}
                  </span>
                </header>
                {(step >= 0 || group === "Chờ thanh toán") && (
                  <ol
                    className="bt-track"
                    aria-label={t("Tiến trình đơn hàng")}
                  >
                    {progressSteps.map((name, i) => (
                      <li
                        key={name}
                        className={
                          i < step
                            ? "is-done"
                            : i === step
                              ? "is-current"
                              : undefined
                        }
                      >
                        <span>{t(name)}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <ul className="bt-order-items">
                  {o.items.map((p) => (
                    <li key={p.key}>
                      <img src={p.image || "/product-placeholder.svg"} alt="" />
                      <div>
                        {p.id ? (
                          <Link to={"/products/" + p.id}>{p.name}</Link>
                        ) : (
                          <strong>{t(p.name)}</strong>
                        )}
                        <small>
                          {[p.variantLabel, p.color]
                            .filter(Boolean)
                            .map((value) => t(value))
                            .join(", ")}{" "}
                          × {p.quantity}
                        </small>
                      </div>
                      <b>{money(p.price * p.quantity)}</b>
                      {isDelivered && p.id && (
                        <Link
                          to={"/products/" + p.id + "#reviews"}
                          className="bt-text-link"
                          aria-label={t("Đánh giá") + ": " + p.name}
                        >
                          {t("Đánh giá")}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
                <footer className="bt-order-foot">
                  <div className="bt-order-total">
                    <span>{t("Tổng tiền")}</span>
                    <strong>{money(o.total)}</strong>
                  </div>
                  <div className="bt-order-actions">
                    {canCancel && (
                      <Button danger type="text" onClick={() => setCancel(o)}>
                        {t("Hủy đơn")}
                      </Button>
                    )}
                    <Button onClick={() => setDetail(o)}>
                      {t("Xem chi tiết")}
                    </Button>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      ) : !loadError ? (
        <div className="bt-empty-state">
          <div className="bt-empty-arch" aria-hidden="true">
            <img src="/logo/logo.svg" alt="" />
          </div>
          <h2>{t("Chưa có đơn hàng trong mục này")}</h2>
          <Link to="/">
            <Button type="primary" size="large">
              {t("Tiếp tục mua sắm")}
            </Button>
          </Link>
        </div>
      ) : null}
      {!loading && (
        <Pagination
          className="pagination"
          current={currentPage}
          pageSize={5}
          total={orders.length}
          onChange={setPage}
          showSizeChanger={false}
          hideOnSinglePage
        />
      )}
      <OrderDetail
        order={detail}
        onClose={() => setDetail(null)}
        onCancel={(o) => {
          setDetail(null);
          setCancel(o);
        }}
      />
      <Modal
        open={!!cancel}
        title={t("Hủy đơn hàng?")}
        onCancel={() => setCancel(null)}
        onOk={cancelOrder}
        okText={t("Xác nhận hủy")}
        cancelText={t("Giữ đơn")}
        okButtonProps={{ danger: true }}
        confirmLoading={cancelling}
        cancelButtonProps={{ disabled: cancelling }}
        closable={!cancelling}
        maskClosable={!cancelling}
        keyboard={!cancelling}
      >
        <p>{t("Bạn có chắc chắn muốn hủy đơn hàng này không?")}</p>
      </Modal>
    </div>
  );
}
