import { usePreferences } from "../../../shared/preferences/usePreferences";
import { formatDateTime } from "../../../shared/utils/format";
import { useTranslation } from "react-i18next";
import {
  orderStatuses,
  orderStatusGroup,
} from "../../../shared/constants/shop";
import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Tabs, Empty, Tag, Button, Modal, Pagination, Spin } from "antd";
import { useShop } from "../../../shared/shop/useShop";
import { money } from "../../../shared/utils/format";
import OrderDetail from "../components/OrderDetail";
import CopyCode from "../../../shared/components/CopyCode";
import { api } from "../../../shared/api";
import { App } from "antd";
import { userError } from "../../../shared/utils/userError";
export default function Orders() {
  const { t } = useTranslation();
  const { timeZone } = usePreferences();
  const { message } = App.useApp();
  const s = useShop(),
    [tab, setTab] = useState("all"),
    [selectedDetail, setDetail] = useState(null),
    [cancel, setCancel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const refreshOrders = s.refreshOrders;
  const userId = s.user?.id;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    refreshOrders()
      .catch((error) => message.error(t(userError(error))))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, refreshOrders, message, t]);
  const detail =
    selectedDetail && s.orders.find((o) => o.id === selectedDetail.id);
  if (!s.user) return <Navigate to="/login?next=/orders" replace />;
  const all = s.orders.filter((o) => o.owner === s.user.email),
    orders = all.filter(
      (o) => tab === "all" || orderStatusGroup(o.status) === tab,
    );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(orders.length / 5)));
  async function cancelOrder() {
    try {
      await api.orders.cancel(cancel.id, {
        reason: "Khách hàng yêu cầu hủy đơn",
      });
      await s.refreshOrders();
      setCancel(null);
    } catch (error) {
      message.error(t(userError(error)));
    }
  }
  return (
    <div className="page">
      <h1>{t("Đơn mua của bạn")}</h1>
      <Tabs
        activeKey={tab}
        onChange={(value) => {
          setTab(value);
          setPage(1);
        }}
        items={["all", ...orderStatuses].map((v) => ({
          key: v,
          label: v === "all" ? t("Tất cả") + " (" + all.length + ")" : t(v),
        }))}
      />
      {loading ? (
        <Spin />
      ) : orders.length ? (
        orders.slice((currentPage - 1) * 5, currentPage * 5).map((o) => (
          <section className="panel order" key={o.id}>
            <div className="order-head">
              <strong>
                {t("Đơn hàng")} <CopyCode value={o.code} />
              </strong>
              <span>{formatDateTime(o.createdAt, timeZone)}</span>
              <Tag color={o.status === "Đã hủy" ? "default" : "orange"}>
                {t(orderStatusGroup(o.status))}
              </Tag>
            </div>
            {o.items.map((p) => {
              const isDelivered = [
                "completed",
                "delivered",
                "Đã hoàn thành",
                "Giao thành công",
              ].includes(o.statusCode || o.status);
              return (
                <div className="mini-product" key={p.key}>
                  <img src={p.image} alt={p.name} />
                  <div>
                    <Link to={"/products/" + p.id}>{p.name}</Link>
                    <small>
                      {t(p.color)} / {t(p.variantLabel)} × {p.quantity}
                    </small>
                  </div>
                  <b>{money(p.price * p.quantity)}</b>
                  {isDelivered && (
                    <Link
                      to={"/products/" + p.id + "#reviews"}
                      className="order-review-btn"
                      style={{
                        marginLeft: 12,
                        fontSize: "13px",
                        whiteSpace: "nowrap",
                        color: "#468432",
                      }}
                    >
                      ⭐ {t("Đánh giá")}
                    </Link>
                  )}
                </div>
              );
            })}
            <div className="order-bottom">
              <strong>
                {t("Tổng tiền")}: {money(o.total)}
              </strong>
              <Button onClick={() => setDetail(o)}>{t("Xem chi tiết")}</Button>
              {o.allowed_actions?.includes("cancel") && (
                <Button danger onClick={() => setCancel(o)}>
                  {t("Hủy đơn")}
                </Button>
              )}
            </div>
          </section>
        ))
      ) : (
        <Empty description={t("Chưa có đơn hàng trong mục này")}>
          <Link to="/">{t("Tiếp tục mua sắm")}</Link>
        </Empty>
      )}
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
      <OrderDetail order={detail} onClose={() => setDetail(null)} />
      <Modal
        open={!!cancel}
        title={t("Hủy đơn hàng?")}
        onCancel={() => setCancel(null)}
        onOk={cancelOrder}
        okText={t("Xác nhận hủy")}
        cancelText={t("Giữ đơn")}
        okButtonProps={{ danger: true }}
      >
        <p>{t("Chỉ có thể hủy khi shop chưa xác nhận đơn.")}</p>
      </Modal>
    </div>
  );
}
