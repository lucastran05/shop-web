import { Button, Modal, Timeline } from "antd";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePreferences } from "../../../shared/preferences/usePreferences";
import { formatDateTime, money } from "../../../shared/utils/format";
import { orderLabels } from "../../../shared/adapters/viewAdapters";
import {
  orderStatusGroup,
  canCancelOrder,
} from "../../../shared/constants/shop";
import CopyCode from "../../../shared/components/CopyCode";
import PaymentPanel from "./PaymentPanel";
import BouquetComponents from "./BouquetComponents";
import { progressSteps, statusTone } from "./orderStatus";

export default function OrderDetail({ order, onClose, onCancel }) {
  const { t } = useTranslation();
  const { timeZone } = usePreferences();
  const received = ["delivered", "completed"].includes(order?.statusCode);
  const cancellable = canCancelOrder(order);
  const group = order ? orderStatusGroup(order.status) : "";
  const step = progressSteps.indexOf(group);
  return (
    <Modal
      open={!!order}
      title={
        order ? (
          <div className="od-title">
            <small>{t("Chi tiết đơn")}</small>
            <span className="od-code">
              <strong>{order.code}</strong>
              <CopyCode value={order.code} />
            </span>
            <span className="od-meta">
              <span
                className="bt-status"
                style={{ "--tone": statusTone[group] || "#56604f" }}
              >
                {t(group)}
              </span>
              <time dateTime={order.createdAt}>
                {t("Đặt lúc")} {formatDateTime(order.createdAt, timeZone)}
              </time>
            </span>
          </div>
        ) : (
          t("Chi tiết đơn")
        )
      }
      width={1080}
      className="order-detail-modal"
      rootClassName="bt-od"
      onCancel={onClose}
      footer={
        <div className="od-footer">
          <div>
            {cancellable && onCancel && (
              <Button danger type="text" onClick={() => onCancel(order)}>
                {t("Hủy đơn")}
              </Button>
            )}
          </div>
          <Button onClick={onClose}>{t("Đóng")}</Button>
        </div>
      }
    >
      {order && (
        <>
          {step >= 0 || group === "Chờ thanh toán" ? (
            <ol
              className="bt-track od-track"
              aria-label={t("Tiến trình đơn hàng")}
            >
              {progressSteps.map((name, i) => (
                <li
                  key={name}
                  className={
                    i < step ? "is-done" : i === step ? "is-current" : undefined
                  }
                >
                  <span>{t(name)}</span>
                </li>
              ))}
            </ol>
          ) : null}
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
                        {item.id ? (
                          <Link to={`/products/${item.id}`}>{item.name}</Link>
                        ) : (
                          <strong>{t(item.name)}</strong>
                        )}
                        {item.item_type === "custom_bouquet" ? (
                          <BouquetComponents
                            components={item.components}
                            style={item.style}
                          />
                        ) : (
                          <small>
                            {[item.variantLabel, item.color]
                              .filter(Boolean)
                              .map((value) => t(value))
                              .join(", ")}
                          </small>
                        )}
                        <small>
                          {money(item.price)} × {item.quantity}
                        </small>
                        {received && item.id && (
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
                <div className="od-address">
                  <strong>{order.recipient.name}</strong>
                  <span>{order.recipient.phone}</span>
                  <span>
                    {order.delivery === "pickup"
                      ? t("Tại cửa hàng")
                      : order.recipient.address}
                  </span>
                </div>
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
              <section className="order-detail-section od-ticket">
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
