import { useState, useRef } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import {
  Form,
  Input,
  InputNumber,
  Radio,
  Button,
  Alert,
  Empty,
  Steps,
  App,
  Select,
  Result,
} from "antd";
import { useTranslation } from "react-i18next";
import { useShop } from "../hooks/useShop";
import { useShopConfig } from "../hooks/useShopConfig";
import { money } from "../utils/format";
import { calculateCheckout } from "../utils/checkout";
export default function Checkout() {
  const { t } = useTranslation(),
    s = useShop(),
    shop = useShopConfig(),
    [params] = useSearchParams(),
    { message } = App.useApp();
  const [step, setStep] = useState(0),
    [recipient, setRecipient] = useState(null),
    [placed, setPlaced] = useState(null),
    [delivery, setDelivery] = useState("ship"),
    [payment, setPayment] = useState("cash"),
    [mode, setMode] = useState("full"),
    [coupon, setCoupon] = useState(""),
    [discount, setDiscount] = useState(false),
    [form] = Form.useForm(),
    submitted = useRef(false);
  const buy = params.get("buy"),
    items = s.items.filter((x) => (buy ? x.key === buy : x.selected)),
    defaultAddress = s.user?.addresses?.find(
      (a) => a.id === s.user.defaultAddressId,
    ),
    canDeposit = !!items.length && items.every((p) => p.deposit),
    deposit = mode === "deposit" && canDeposit;
  const totals = calculateCheckout(
      items,
      delivery,
      discount,
      deposit,
      payment,
      shop.commerce,
    ),
    { subtotal, shipping, off, total, due } = totals;
  if (!s.user)
    return (
      <Navigate
        to={
          "/login?next=" +
          encodeURIComponent(
            "/checkout" + (buy ? "?buy=" + encodeURIComponent(buy) : ""),
          )
        }
        replace
      />
    );
  function quantity(key, value, stock) {
    if (value === null) return;
    const next = Math.max(1, Math.min(stock, Math.floor(Number(value) || 1)));
    s.setCart((old) =>
      old.map((x) => (x.key === key ? { ...x, quantity: next } : x)),
    );
  }
  function submitOrder() {
    if (submitted.current || !recipient) return;
    if (items.some((p) => p.quantity < 1 || p.quantity > p.stock)) {
      message.error(t("Số lượng vượt quá tồn kho"));
      return;
    }
    submitted.current = true;
    const order = {
      id: "ABC-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      owner: s.user.email,
      createdAt: new Date().toISOString(),
      items,
      ...totals,
      deposit: deposit ? due : 0,
      depositRate: deposit ? shop.commerce.depositRate : 0,
      depositStatus: deposit ? "Chờ xác nhận" : "Không đặt cọc",
      depositAt: null,
      paid: 0,
      remaining: total,
      payment,
      delivery,
      status: "Chờ xác nhận",
      paymentStatus:
        payment === "cash"
          ? "Thanh toán khi nhận hàng"
          : "Chờ xác nhận thanh toán (demo)",
      recipient,
    };
    s.setOrders((old) => [order, ...old]);
    s.setCart((old) => old.filter((x) => !items.some((p) => p.key === x.key)));
    s.notify("Đơn {{id}} đã được tạo và đang chờ xác nhận.", { id: order.id });
    setPlaced(order);
    setStep(2);
  }
  if (!placed && !items.length)
    return (
      <div className="page">
        <Empty description={t("Chưa chọn sản phẩm để đặt hàng")}>
          <Link to="/cart">{t("Về giỏ hàng")}</Link>
        </Empty>
      </div>
    );
  return (
    <div className="page">
      <h1>{t("Đặt hàng")}</h1>
      <Steps
        className="checkout-steps"
        current={step}
        items={[
          { title: t("Thông tin khách hàng") },
          { title: t("Thanh toán") },
          { title: t("Kết quả đặt hàng") },
        ]}
      />
      {placed ? (
        <Result
          status="success"
          title={t("Đã tạo đơn hàng demo")}
          subTitle={t("Mã đơn: {{id}}", { id: placed.id })}
          extra={
            <Link to="/orders">
              <Button type="primary">{t("Xem đơn hàng")}</Button>
            </Link>
          }
        >
          <p>
            {t("Tổng cộng")}: <strong>{money(placed.total)}</strong>
          </p>
          <p>
            {t("Đã thanh toán")}: {money(placed.paid)}
          </p>
          <Alert type="info" showIcon title={t(placed.paymentStatus)} />
        </Result>
      ) : (
        <>
          <Alert
            type="warning"
            showIcon
            title={t("Đặt hàng mô phỏng — không phát sinh thanh toán thật")}
            description={t(
              "QR và thẻ chưa kết nối cổng thanh toán. Không nhập thông tin thẻ hoặc chuyển tiền.",
            )}
          />
          <div className="two-column">
            <section className="panel">
              {step === 0 ? (
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={
                    recipient || {
                      name: defaultAddress?.name || s.user.name,
                      phone: defaultAddress?.phone || s.user.phone,
                      address: defaultAddress?.address || s.user.address,
                    }
                  }
                  onFinish={(values) => {
                    setRecipient(values);
                    setStep(1);
                  }}
                >
                  <h2>{t("Thông tin nhận hàng")}</h2>
                  {!!s.user.addresses?.length && (
                    <Form.Item label={t("Chọn địa chỉ đã lưu")}>
                      <Select
                        aria-label={t("Chọn địa chỉ đã lưu")}
                        defaultValue={s.user.defaultAddressId}
                        options={s.user.addresses.map((a) => ({
                          value: a.id,
                          label: a.name + " — " + a.address,
                        }))}
                        onChange={(id) => {
                          const a = s.user.addresses.find((a) => a.id === id);
                          form.setFieldsValue({
                            name: a.name,
                            phone: a.phone,
                            address: a.address,
                          });
                        }}
                      />
                    </Form.Item>
                  )}
                  <Form.Item
                    name="name"
                    label={t("Họ và tên")}
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: t("Nhập tên người nhận"),
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="phone"
                    label={t("Số điện thoại")}
                    rules={[
                      { required: true, message: t("Nhập số điện thoại") },
                      {
                        pattern: /^(0|\+84)[0-9]{9}$/,
                        message: t("Nhập số điện thoại Việt Nam hợp lệ"),
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                  <h3>{t("Phương thức giao hàng")}</h3>
                  <Radio.Group
                    value={delivery}
                    onChange={(e) => setDelivery(e.target.value)}
                    options={[
                      { value: "ship", label: t("Giao tận nơi") },
                      { value: "pickup", label: t("Nhận tại cửa hàng") },
                    ]}
                  />
                  {delivery === "ship" && (
                    <Form.Item
                      name="address"
                      label={t("Địa chỉ nhận hàng")}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: t("Nhập địa chỉ đầy đủ"),
                        },
                      ]}
                    >
                      <Input.TextArea rows={2} />
                    </Form.Item>
                  )}
                  <Form.Item name="note" label={t("Yêu cầu bổ sung")}>
                    <Input.TextArea rows={2} maxLength={500} showCount />
                  </Form.Item>
                  <Button type="primary" htmlType="submit">
                    {t("Tiếp tục thanh toán")}
                  </Button>
                </Form>
              ) : (
                <>
                  <h2>{t("Kiểm tra thông tin")}</h2>
                  <p>
                    {recipient.name} · {recipient.phone}
                  </p>
                  <p>
                    {delivery === "ship"
                      ? recipient.address
                      : t("Nhận tại cửa hàng")}
                  </p>
                  {recipient.note && <p>{recipient.note}</p>}
                  <h3>{t("Hình thức thanh toán")}</h3>
                  <Radio.Group
                    value={mode}
                    onChange={(e) => {
                      setMode(e.target.value);
                      if (e.target.value === "deposit") setPayment("qr");
                    }}
                    options={[
                      { value: "full", label: t("Toàn bộ giá trị đơn") },
                      {
                        value: "deposit",
                        label: t("Đặt cọc {{percent}}%", {
                          percent: shop.commerce.depositRate * 100,
                        }),
                        disabled: !canDeposit,
                      },
                    ]}
                  />
                  {!canDeposit && (
                    <p className="muted">
                      {t(
                        "Đặt cọc chỉ áp dụng khi mọi sản phẩm trong đơn đều hỗ trợ.",
                      )}
                    </p>
                  )}
                  <h3>{t("Phương thức thanh toán")}</h3>
                  <Radio.Group
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                    options={[
                      {
                        value: "cash",
                        label: t("Khi nhận hàng"),
                        disabled: deposit,
                      },
                      { value: "qr", label: t("QR (demo)") },
                      { value: "card", label: t("Thẻ (demo)") },
                    ]}
                  />
                  <div className="buy-actions">
                    <Button onClick={() => setStep(0)}>{t("Quay lại")}</Button>
                    <Button type="primary" onClick={submitOrder}>
                      {t("Xác nhận đặt hàng demo")}
                    </Button>
                  </div>
                </>
              )}
            </section>
            <aside className="panel summary">
              <h2>{t("Đơn hàng của bạn")}</h2>
              {items.map((p) => (
                <div className="mini-product" key={p.key}>
                  <img src={p.image} alt="" />
                  <div>
                    <span className="product-name">{p.name}</span>
                    <small>
                      {t(p.color)} / {t(p.variantLabel)}
                    </small>
                    <InputNumber
                      aria-label={t("Số lượng {{name}}", { name: p.name })}
                      precision={0}
                      min={1}
                      max={p.stock}
                      value={p.quantity}
                      disabled={!p.stock}
                      onChange={(value) => quantity(p.key, value, p.stock)}
                    />
                  </div>
                  <b>{money(p.price * p.quantity)}</b>
                </div>
              ))}
              <div className="coupon">
                <Input
                  aria-label={t("Mã giảm giá")}
                  placeholder={shop.commerce.coupon.code}
                  value={coupon}
                  onChange={(e) => {
                    setCoupon(e.target.value);
                    setDiscount(false);
                  }}
                />
                <Button
                  onClick={() => {
                    const valid =
                      coupon.trim().toUpperCase() === shop.commerce.coupon.code;
                    setDiscount(valid);
                    message[valid ? "success" : "error"](
                      t(
                        valid
                          ? "Đã áp dụng mã giảm giá"
                          : "Mã giảm giá không hợp lệ",
                      ),
                    );
                  }}
                >
                  {t("Áp dụng")}
                </Button>
              </div>
              <p>
                <span>{t("Tạm tính")}</span>
                <b>{money(subtotal)}</b>
              </p>
              <p>
                <span>{t("Phí giao hàng")}</span>
                <b>{money(shipping)}</b>
              </p>
              <p>
                <span>{t("Giảm giá")}</span>
                <b>−{money(off)}</b>
              </p>
              <hr />
              <p className="total">
                <span>{t("Tổng cộng")}</span>
                <b>{money(total)}</b>
              </p>
              {step === 1 && (
                <>
                  <p>
                    <span>
                      {deposit ? t("Cọc dự kiến") : t("Cần trả trước")}
                    </span>
                    <b>{money(due)}</b>
                  </p>
                  <p>
                    <span>{t("Còn lại sau khi trả trước")}</span>
                    <b>{money(total - due)}</b>
                  </p>
                </>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
