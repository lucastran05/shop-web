import { usePreferences } from "../hooks/usePreferences";
import { formatDateTime } from "../utils/format";
import { useTranslation } from "react-i18next";
import { orderStatuses } from "../constants/shop";
import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  Tabs,
  Empty,
  Tag,
  Button,
  Modal,
  Descriptions,
  Table,
  Timeline,
} from "antd";
import { useShop } from "../hooks/useShop";
import { money } from "../utils/format";
import PaymentPanel from "../components/PaymentPanel";
export default function Orders() {
  const { t } = useTranslation();
  const { timeZone } = usePreferences();
  const s = useShop(),
    [tab, setTab] = useState("all"),
    [selectedDetail, setDetail] = useState(null),
    [cancel, setCancel] = useState(null);
  const detail =
    selectedDetail && s.orders.find((o) => o.id === selectedDetail.id);
  if (!s.user) return <Navigate to="/login?next=/orders" replace />;
  const all = s.orders.filter((o) => o.owner === s.user.email),
    orders = all.filter((o) => tab === "all" || o.status === tab);
  function cancelOrder() {
    s.setOrders((old) =>
      old.map((o) =>
        o.id === cancel.id && o.status === "Chờ xác nhận"
          ? {
              ...o,
              status: "Đã hủy",
              depositStatus: o.deposit ? "Hủy cọc" : o.depositStatus,
            }
          : o,
      ),
    );
    s.notify("Đơn {{id}} đã hủy.", { id: cancel.id });
    setCancel(null);
  }
  return (
    <div className="page">
      <h1>{t("Đơn mua của bạn")}</h1>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={["all", ...orderStatuses].map((v) => ({
          key: v,
          label: v === "all" ? t("Tất cả") + " (" + all.length + ")" : t(v),
        }))}
      />
      {orders.length ? (
        orders.map((o) => (
          <section className="panel order" key={o.id}>
            <div className="order-head">
              <strong>{o.id}</strong>
              <span>{formatDateTime(o.createdAt, timeZone)}</span>
              <Tag color={o.status === "Đã hủy" ? "default" : "orange"}>
                {t(o.status)}
              </Tag>
            </div>
            {o.items.map((p) => (
              <div className="mini-product" key={p.key}>
                <img src={p.image} alt={p.name} />
                <div>
                  <Link to={"/products/" + p.id}>{p.name}</Link>
                  <small>
                    {t(p.color)} / {t(p.variantLabel)} × {p.quantity}
                  </small>
                </div>
                <b>{money(p.price * p.quantity)}</b>
              </div>
            ))}
            <div className="order-bottom">
              <strong>
                {t("Tổng tiền")}: {money(o.total)}
              </strong>
              <Button onClick={() => setDetail(o)}>{t("Xem chi tiết")}</Button>
              {o.status === "Chờ xác nhận" && (
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
      <Modal
        width={900}
        open={!!detail}
        title={t("Chi tiết đơn {{id}}", { id: detail?.id || "" })}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>{t("Đóng")}</Button>}
      >
        {detail && (
          <>
            {detail.paymentExpiresAt && <PaymentPanel order={detail} />}
            <Table
              rowKey="key"
              bordered
              pagination={false}
              dataSource={detail.items}
              scroll={{ x: 600 }}
              columns={[
                { title: t("Sản phẩm"), dataIndex: "name" },
                {
                  title: t("Phân loại"),
                  render: (_, p) => `${t(p.color)} / ${t(p.variantLabel)}`,
                },
                { title: t("Đơn giá"), dataIndex: "price", render: money },
                { title: t("Số lượng"), dataIndex: "quantity" },
                {
                  title: t("Thành tiền"),
                  render: (_, p) => money(p.price * p.quantity),
                },
              ]}
            />
            <Descriptions
              bordered
              column={1}
              items={[
                {
                  key: "name",
                  label: t("Người nhận"),
                  children: detail.recipient.name,
                },
                {
                  key: "phone",
                  label: t("Điện thoại"),
                  children: detail.recipient.phone,
                },
                {
                  key: "address",
                  label: t("Nhận hàng"),
                  children:
                    detail.delivery === "pickup"
                      ? t("Tại cửa hàng")
                      : detail.recipient.address,
                },
                {
                  key: "note",
                  label: t("Ghi chú"),
                  children: detail.recipient.note || t("Không có"),
                },
                {
                  key: "shipping",
                  label: t("Phí giao hàng"),
                  children: money(detail.shipping),
                },
                {
                  key: "discount",
                  label: t("Giảm giá"),
                  children: money(detail.off),
                },
                {
                  key: "total",
                  label: t("Tổng đơn"),
                  children: money(detail.total),
                },
                {
                  key: "deposit",
                  label: t("Cọc dự kiến"),
                  children: money(detail.deposit),
                },
                {
                  key: "deposit-status",
                  label: t("Trạng thái cọc"),
                  children: t(detail.depositStatus || "Không đặt cọc"),
                },
                {
                  key: "deposit-time",
                  label: t("Thời gian cọc"),
                  children: detail.depositAt
                    ? formatDateTime(detail.depositAt, timeZone)
                    : t("Chưa có giao dịch"),
                },
                {
                  key: "carrier",
                  label: t("Đơn vị vận chuyển"),
                  children: detail.carrier || t("Chưa có"),
                },
                {
                  key: "sent-at",
                  label: t("Ngày gửi hàng"),
                  children: detail.shippedAt
                    ? formatDateTime(detail.shippedAt, timeZone)
                    : t("Chưa gửi"),
                },
                {
                  key: "paid",
                  label: t("Đã thanh toán"),
                  children: money(detail.paid),
                },
                {
                  key: "remaining",
                  label: t("Còn phải trả"),
                  children: money(detail.remaining),
                },
                {
                  key: "payment",
                  label: t("Thanh toán"),
                  children: t(detail.paymentStatus),
                },
                {
                  key: "tracking",
                  label: t("Mã vận đơn"),
                  children: detail.tracking || t("Chưa có — chờ shop cập nhật"),
                },
              ]}
            />
            <Timeline
              items={[
                {
                  content:
                    t("Đã tạo đơn") +
                    ": " +
                    formatDateTime(detail.createdAt, timeZone),
                },
                {
                  content: t(detail.status),
                  color: detail.status === "Đã hủy" ? "gray" : "green",
                },
              ]}
            />
          </>
        )}
      </Modal>
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
