import { Button, Modal, Tag, Timeline } from "antd";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePreferences } from "../../../shared/preferences/usePreferences";
import { formatDateTime, money } from "../../../shared/utils/format";
import { orderLabels } from "../../../shared/adapters/viewAdapters";
import { orderStatusGroup } from "../../../shared/constants/shop";
import CopyCode from "../../../shared/components/CopyCode";
import PaymentPanel from "./PaymentPanel";

export default function OrderDetail({ order, onClose }) {
  const { t } = useTranslation();
  const { timeZone } = usePreferences();
  const received = ["delivered", "completed"].includes(order?.statusCode);
  return (
    <Modal
      open={!!order}
      title={t("Chi tiết đơn")}
      width={1080}
      className="order-detail-modal"
      onCancel={onClose}
      footer={<Button onClick={onClose}>{t("Đóng")}</Button>}
    >
      {order && (
        <>
          <div className="order-detail-heading">
            <Tag color={order.statusCode === "cancelled" ? "default" : "green"}>
              {t(orderStatusGroup(order.status))}
            </Tag>
            <span>{formatDateTime(order.createdAt, timeZone)}</span>
            <CopyCode value={order.code} />
          </div>
          <div className="order-detail-grid">
            <div className="order-detail-main">
              <section className="order-detail-section">
                <h3>{t("Sản phẩm")}</h3>
                <div className="order-detail-products">
                  {order.items.map((item) => (
                    <article className="order-detail-product" key={item.key}>
                      <img
                        src={item.image || "/product-placeholder.svg"}
                        alt={item.name}
                      />
                      <div>
                        <Link to={`/products/${item.id}`}>{item.name}</Link>
                        <small>
                          {[item.color, item.variantLabel]
                            .filter(Boolean)
                            .map((value) => t(value))
                            .join(" / ")}{" "}
                          · {t("Số lượng")}: {item.quantity}
                        </small>
                        <small>
                          {t("Đơn giá")}: {money(item.price)}
                        </small>
                        {received && (
                          <Link
                            className="order-review-btn"
                            to={`/products/${item.id}#reviews`}
                          >
                            {t("Viết đánh giá")}
                          </Link>
                        )}
                      </div>
                      <strong>{money(item.price * item.quantity)}</strong>
                    </article>
                  ))}
                </div>
              </section>
              <section className="order-detail-section">
                <h3>{t("Thông tin giao nhận")}</h3>
                <strong>{order.recipient.name}</strong>
                <p>{order.recipient.phone}</p>
                <p>
                  {order.delivery === "pickup"
                    ? t("Tại cửa hàng")
                    : order.recipient.address}
                </p>
                {(order.note || order.recipient.note) && (
                  <p className="order-detail-note">
                    {t("Ghi chú")}: {order.note || order.recipient.note}
                  </p>
                )}
                {order.delivery !== "pickup" && (
                  <dl className="order-detail-facts">
                    <div>
                      <dt>{t("Đơn vị vận chuyển")}</dt>
                      <dd>{order.carrier || t("Chưa có")}</dd>
                    </div>
                    <div>
                      <dt>{t("Mã vận đơn")}</dt>
                      <dd>
                        {order.tracking || t("Chưa có — chờ shop cập nhật")}
                      </dd>
                    </div>
                    {order.shippedAt && (
                      <div>
                        <dt>{t("Ngày gửi hàng")}</dt>
                        <dd>{formatDateTime(order.shippedAt, timeZone)}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </section>
              <section className="order-detail-section">
                <h3>{t("Tiến trình đơn hàng")}</h3>
                <Timeline
                  items={
                    order.history?.length
                      ? [
                          ...order.history.map((event, index) => ({
                            key: index,
                            color:
                              event.status === "cancelled" ? "gray" : "green",
                            content: (
                              <>
                                <strong>
                                  {t(
                                    orderStatusGroup(
                                      orderLabels[event.status] ||
                                        event.text ||
                                        order.status,
                                    ),
                                  )}
                                </strong>
                                {event.at && (
                                  <small>
                                    {formatDateTime(event.at, timeZone)}
                                  </small>
                                )}
                              </>
                            ),
                          })),
                          ...(orderStatusGroup(
                            orderLabels[order.history.at(-1)?.status],
                          ) !== orderStatusGroup(order.status)
                            ? [
                                {
                                  color:
                                    order.statusCode === "cancelled"
                                      ? "gray"
                                      : "green",
                                  content: t(orderStatusGroup(order.status)),
                                },
                              ]
                            : []),
                        ]
                      : [
                          {
                            content: `${t("Đã tạo đơn")}: ${formatDateTime(order.createdAt, timeZone)}`,
                          },
                          {
                            color:
                              order.statusCode === "cancelled"
                                ? "gray"
                                : "green",
                            content: t(orderStatusGroup(order.status)),
                          },
                        ]
                  }
                />
              </section>
            </div>
            <aside className="order-detail-summary">
              <section className="order-detail-section">
                <h3>{t("Thanh toán")}</h3>
                <dl className="order-detail-facts">
                  <div>
                    <dt>{t("Tiền sản phẩm")}</dt>
                    <dd>{money(order.subtotal)}</dd>
                  </div>
                  <div>
                    <dt>{t("Phí giao hàng")}</dt>
                    <dd>{money(order.shipping)}</dd>
                  </div>
                  {order.off > 0 && (
                    <div>
                      <dt>{t("Giảm giá")}</dt>
                      <dd>−{money(order.off)}</dd>
                    </div>
                  )}
                  <div className="order-detail-total">
                    <dt>{t("Tổng đơn")}</dt>
                    <dd>{money(order.total)}</dd>
                  </div>
                  <div>
                    <dt>{t("Đã thanh toán")}</dt>
                    <dd>{money(order.paid)}</dd>
                  </div>
                  {Number(order.refunded) > 0 && (
                    <div>
                      <dt>{t("Đã hoàn tiền")}</dt>
                      <dd>{money(order.refunded)}</dd>
                    </div>
                  )}
                  <div className="order-detail-balance">
                    <dt>{t("Còn phải trả")}</dt>
                    <dd>{money(order.remaining)}</dd>
                  </div>
                  {Number(order.deposit) > 0 && (
                    <>
                      <div>
                        <dt>{t("Cọc dự kiến")}</dt>
                        <dd>{money(order.deposit)}</dd>
                      </div>
                      <div>
                        <dt>{t("Trạng thái cọc")}</dt>
                        <dd>{t(order.depositStatus)}</dd>
                      </div>
                      {order.depositAt && (
                        <div>
                          <dt>{t("Thời gian cọc")}</dt>
                          <dd>{formatDateTime(order.depositAt, timeZone)}</dd>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <dt>{t("Phương thức thanh toán")}</dt>
                    <dd>
                      {t(
                        order.payment === "cod"
                          ? "Khi nhận hàng"
                          : order.payment === "card"
                            ? "Thẻ"
                            : "Chuyển khoản QR",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Trạng thái thanh toán")}</dt>
                    <dd>{t(order.paymentStatus)}</dd>
                  </div>
                </dl>
              </section>
              <div className="order-detail-payment">
                <PaymentPanel key={order.id} order={order} />
              </div>
            </aside>
          </div>
        </>
      )}
    </Modal>
  );
}
