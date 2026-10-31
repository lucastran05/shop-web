import { usePreferences } from "../../../shared/preferences/usePreferences";
import { formatDateTime } from "../../../shared/utils/format";
import { useTranslation } from "react-i18next";
import {
  orderStatuses,
  orderStatusGroup,
  canCancelOrder,
} from "../../../shared/constants/shop";
import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  Tabs,
  Empty,
  Tag,
  Button,
  Modal,
  Pagination,
  Spin,
  Tooltip,
} from "antd";
import {
  ShoppingOutlined,
  ArrowRightOutlined,
  EyeOutlined,
  CloseCircleOutlined,
  StarOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  TruckOutlined,
  CheckCircleOutlined,
  UndoOutlined,
  CalendarOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useShop } from "../../../shared/shop/useShop";
import { money } from "../../../shared/utils/format";
import OrderDetail from "../components/OrderDetail";
import CopyCode from "../../../shared/components/CopyCode";
import { api } from "../../../shared/api";
import { App } from "antd";
import { userError } from "../../../shared/utils/userError";
import RequestError from "../../../shared/components/RequestError";

const statusAppearance = {
  "Chờ thanh toán": { icon: <WalletOutlined />, color: "orange" },
  "Chờ xác nhận": { icon: <ClockCircleOutlined />, color: "gold" },
  "Đang chuẩn bị hàng": { icon: <InboxOutlined />, color: "cyan" },
  "Đang giao hàng": { icon: <TruckOutlined />, color: "blue" },
  "Đã hoàn thành": { icon: <CheckCircleOutlined />, color: "green" },
  "Đã hủy": { icon: <CloseCircleOutlined />, color: "default" },
  "Hoàn hàng / Hoàn tiền": { icon: <UndoOutlined />, color: "purple" },
};
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
  return (
    <div className="page orders-page">
      <div className="orders-heading">
        <h1>{t("Đơn mua của bạn")}</h1>
        <Button href="/#collection" icon={<ArrowRightOutlined />}>
          {t("Tiếp tục mua sắm")}
        </Button>
      </div>
      <Tabs
        activeKey={tab}
        onChange={(value) => {
          setTab(value);
          setPage(1);
        }}
        items={[
          {
            key: "all",
            icon: <ShoppingOutlined />,
            label: (
              <span className="orders-tab-label">
                {t("Tất cả")} <span>{all.length}</span>
              </span>
            ),
          },
          ...orderStatuses.map((v) => ({
            key: v,
            icon: statusAppearance[v]?.icon,
            label: (
              <span className="orders-tab-label">
                {t(v)}{" "}
                <span>
                  {all.filter((o) => orderStatusGroup(o.status) === v).length}
                </span>
              </span>
            ),
          })),
        ]}
      />
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
        <div className="orders-loading" role="status">
          <Spin size="large" />
          <p>{t("Đang tải…")}</p>
        </div>
      ) : orders.length ? (
        orders.slice((currentPage - 1) * 5, currentPage * 5).map((o) => (
          <section className="order-card" key={o.id}>
            <div className="order-head">
              <div className="order-code">
                <InboxOutlined aria-hidden="true" />
                <strong title={o.code}>{o.code}</strong>
                <CopyCode value={o.code} />
              </div>
              <Tag {...statusAppearance[orderStatusGroup(o.status)]}>
                {t(orderStatusGroup(o.status))}
              </Tag>
            </div>
            <div className="order-date">
              <CalendarOutlined aria-hidden="true" />
              {formatDateTime(o.createdAt, timeZone)}
            </div>
            {o.items.map((p) => {
              const isDelivered = [
                "completed",
                "delivered",
                "Đã hoàn thành",
                "Giao thành công",
              ].includes(o.statusCode || o.status);
              return (
                <div className="order-product" key={p.key}>
                  <img
                    src={p.image || "/product-placeholder.svg"}
                    alt={p.name}
                  />
                  <div className="order-product-info">
                    <Link to={"/products/" + p.id}>{p.name}</Link>
                    <small>
                      {[p.color, p.variantLabel]
                        .filter(Boolean)
                        .map((value) => t(value))
                        .join(" / ")}{" "}
                      · {t("Số lượng")}: {p.quantity}
                    </small>
                  </div>
                  <b>{money(p.price * p.quantity)}</b>
                  {isDelivered && (
                    <Tooltip title={t("Đánh giá")}>
                      <Link
                        to={"/products/" + p.id + "#reviews"}
                        className="order-action-link"
                        aria-label={t("Đánh giá") + ": " + p.name}
                      >
                        <StarOutlined />
                      </Link>
                    </Tooltip>
                  )}
                </div>
              );
            })}
            <div className="order-bottom">
              <div className="order-card-total">
                <span>{t("Tổng tiền")}</span>
                <strong>{money(o.total)}</strong>
              </div>
              <Tooltip title={t("Xem chi tiết")}>
                <Button
                  className="order-action"
                  type="text"
                  icon={<EyeOutlined />}
                  aria-label={t("Xem chi tiết")}
                  onClick={() => setDetail(o)}
                />
              </Tooltip>
              {(o.allowed_actions?.includes("cancel") || canCancelOrder(o)) && (
                <Tooltip title={t("Hủy đơn")}>
                  <Button
                    className="order-action"
                    type="text"
                    icon={<CloseCircleOutlined />}
                    aria-label={t("Hủy đơn")}
                    danger
                    onClick={() => setCancel(o)}
                  />
                </Tooltip>
              )}
            </div>
          </section>
        ))
      ) : !loadError ? (
        <Empty description={t("Chưa có đơn hàng trong mục này")}>
          <Link to="/">{t("Tiếp tục mua sắm")}</Link>
        </Empty>
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
