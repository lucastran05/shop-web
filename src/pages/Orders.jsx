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
  Timeline,
  Alert,
} from "antd";
import { useShop } from "../hooks/useShop";
import { money } from "../utils/format";
export default function Orders() {
  const s = useShop(),
    [tab, setTab] = useState("all"),
    [detail, setDetail] = useState(null),
    [cancel, setCancel] = useState(null);
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
    s.notify("Đơn " + cancel.id + " đã hủy.");
    setCancel(null);
  }
  return (
    <div className="page">
      <h1>Đơn mua của bạn</h1>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={["all", ...orderStatuses].map((v) => ({
          key: v,
          label: v === "all" ? "Tất cả (" + all.length + ")" : v,
        }))}
      />
      {orders.length ? (
        orders.map((o) => (
          <section className="panel order" key={o.id}>
            <div className="order-head">
              <strong>{o.id}</strong>
              <span>{new Date(o.createdAt).toLocaleString("vi-VN")}</span>
              <Tag color={o.status === "Đã hủy" ? "default" : "orange"}>
                {o.status}
              </Tag>
            </div>
            {o.items.map((p) => (
              <div className="mini-product" key={p.key}>
                <img src={p.image} alt={p.name} />
                <div>
                  <Link to={"/products/" + p.id}>{p.name}</Link>
                  <small>
                    {p.color} / {p.variantLabel} × {p.quantity}
                  </small>
                </div>
                <b>{money(p.price * p.quantity)}</b>
              </div>
            ))}
            <div className="order-bottom">
              <strong>Tổng tiền: {money(o.total)}</strong>
              <Button onClick={() => setDetail(o)}>Xem chi tiết</Button>
              {o.status === "Chờ xác nhận" && (
                <Button danger onClick={() => setCancel(o)}>
                  Hủy đơn
                </Button>
              )}
            </div>
          </section>
        ))
      ) : (
        <Empty description="Chưa có đơn hàng trong mục này">
          <Link to="/">Tiếp tục mua sắm</Link>
        </Empty>
      )}
      <Modal
        open={!!detail}
        title={"Chi tiết đơn " + (detail?.id || "")}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>Đóng</Button>}
      >
        {detail && (
          <>
            <Descriptions
              column={1}
              items={[
                {
                  key: "name",
                  label: "Người nhận",
                  children: detail.recipient.name,
                },
                {
                  key: "phone",
                  label: "Điện thoại",
                  children: detail.recipient.phone,
                },
                {
                  key: "address",
                  label: "Nhận hàng",
                  children:
                    detail.delivery === "pickup"
                      ? "Tại cửa hàng"
                      : detail.recipient.address,
                },
                {
                  key: "note",
                  label: "Ghi chú",
                  children: detail.recipient.note || "Không có",
                },
                {
                  key: "shipping",
                  label: "Phí giao hàng",
                  children: money(detail.shipping),
                },
                {
                  key: "discount",
                  label: "Giảm giá",
                  children: money(detail.off),
                },
                {
                  key: "total",
                  label: "Tổng đơn",
                  children: money(detail.total),
                },
                {
                  key: "deposit",
                  label: "Cọc dự kiến",
                  children: money(detail.deposit),
                },
                {
                  key: "deposit-status",
                  label: "Trạng thái cọc",
                  children: detail.depositStatus || "Không đặt cọc",
                },
                {
                  key: "deposit-time",
                  label: "Thời gian cọc",
                  children: detail.depositAt
                    ? new Date(detail.depositAt).toLocaleString("vi-VN")
                    : "Chưa có giao dịch",
                },
                {
                  key: "carrier",
                  label: "Đơn vị vận chuyển",
                  children: detail.carrier || "Chưa có",
                },
                {
                  key: "sent-at",
                  label: "Ngày gửi hàng",
                  children: detail.shippedAt
                    ? new Date(detail.shippedAt).toLocaleString("vi-VN")
                    : "Chưa gửi",
                },
                {
                  key: "paid",
                  label: "Đã thanh toán",
                  children: money(detail.paid),
                },
                {
                  key: "remaining",
                  label: "Còn phải trả",
                  children: money(detail.remaining),
                },
                {
                  key: "payment",
                  label: "Thanh toán",
                  children: detail.paymentStatus,
                },
                {
                  key: "tracking",
                  label: "Mã vận đơn",
                  children: detail.tracking || "Chưa có — chờ shop cập nhật",
                },
              ]}
            />
            <Timeline
              items={[
                {
                  content:
                    "Đã tạo đơn: " +
                    new Date(detail.createdAt).toLocaleString("vi-VN"),
                },
                {
                  content: detail.status,
                  color: detail.status === "Đã hủy" ? "gray" : "green",
                },
              ]}
            />
          </>
        )}
      </Modal>
      <Modal
        open={!!cancel}
        title="Hủy đơn hàng?"
        onCancel={() => setCancel(null)}
        onOk={cancelOrder}
        okText="Xác nhận hủy"
        cancelText="Giữ đơn"
        okButtonProps={{ danger: true }}
      >
        <p>Chỉ có thể hủy khi shop chưa xác nhận đơn.</p>
        <Alert
          type="info"
          title="Đây là đơn demo, chưa có giao dịch tiền thật hay hoàn tiền tự động."
        />
      </Modal>
    </div>
  );
}
