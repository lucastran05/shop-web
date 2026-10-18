import { useState, useRef, useEffect } from "react";
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
import AddressFields from "../components/AddressFields";
import PaymentPanel from "../components/PaymentPanel";
import { Modal } from "antd";
import { api, ApiError } from "../services/api";
import { mapProductDetail } from "../services/productAdapter";
export default function Checkout() {
  const { t } = useTranslation(),
    s = useShop(),
    shop = useShopConfig(),
    [params] = useSearchParams(),
    { message } = App.useApp();
  const [step, setStep] = useState(0),
    [addresses, setAddresses] = useState([]),
    [recipient, setRecipient] = useState(null),
    [placed, setPlaced] = useState(null),
    [paymentSession, setPaymentSession] = useState(null),
    [submitting, setSubmitting] = useState(false),
    [delivery, setDelivery] = useState("ship"),
    [payment, setPayment] = useState("qr"),
    [mode, setMode] = useState("full"),
    [coupon, setCoupon] = useState(""),
    [addingAddress, setAddingAddress] = useState(false),
    [addressId, setAddressId] = useState(null),
    [addressForm] = Form.useForm(),
    [form] = Form.useForm(),
    submitted = useRef(false),
    orderIdempotencyKey = useRef(null);
  const buyProductId = params.get("product_id");
  const buyVariantId = params.get("variant_id");
  const quantityParam = params.get("quantity");
  useEffect(() => {
    if (!s.user) return;
    let active = true;
    api.addresses
      .list()
      .then(({ data }) => {
        if (!active) return;
        setAddresses(data);
        setAddressId(
          s.user.default_address_id ||
            data.find((address) => address.is_default)?.id ||
            data[0]?.id,
        );
      })
      .catch((error) => {
        if (active)
          message.error(
            error instanceof ApiError
              ? error.message
              : t("Không thể tải sổ địa chỉ"),
          );
      });
    return () => {
      active = false;
    };
  }, [s.user, message, t]);
  const [items, setItems] = useState(() => {
    return buyProductId
      ? []
      : s.items.filter((item) => item.selected).map((item) => ({ ...item }));
  });
  useEffect(() => {
    if (buyProductId) {
      let active = true;
      api.products
        .get(buyProductId)
        .then(({ data }) => {
          if (!active) return;
          const product = mapProductDetail(data);
          const variant = product.variants.find(
            (item) => item.id === buyVariantId,
          );
          if (!variant) {
            message.error(t("Không tìm thấy biến thể sản phẩm"));
            return;
          }
          setItems([
            {
              ...product,
              ...variant,
              id: product.id,
              variantId: variant.id,
              key: `${product.id}-${variant.id}`,
              variantLabel: variant.label,
              quantity: Math.max(
                1,
                Math.min(
                  variant.stock || 1,
                  Math.floor(Number(quantityParam) || 1),
                ),
              ),
            },
          ]);
        })
        .catch((error) => {
          if (active)
            message.error(
              error instanceof ApiError
                ? error.message
                : t("Không thể tải sản phẩm"),
            );
        });
      return () => {
        active = false;
      };
    }
  }, [buyProductId, buyVariantId, quantityParam, message, t]);
  useEffect(() => {
    if (!buyProductId && !items.length && s.items.length)
      setItems(s.items.filter((item) => item.selected).map((item) => ({ ...item })));
  }, [buyProductId, s.items, items.length]);
  const defaultAddress = addresses.find((a) => a.id === addressId);
  const currentOrder = placed;
  const depositRate =
    mode === "deposit50" ? 0.5 : mode === "deposit70" ? 0.7 : 0;
  const deposit = depositRate > 0;
  const totals = calculateCheckout(
      items,
      delivery,
      false,
      deposit,
      payment,
      {
        ...shop.commerce,
        depositRate,
      },
    ),
    { subtotal, shipping, off, total, due } = totals;
  if (!s.user)
    return (
      <Navigate
        to={
          "/login?next=" + encodeURIComponent("/checkout?" + params.toString())
        }
        replace
      />
    );
  function quantity(key, value, stock) {
    if (value === null) return;
    const next = Math.max(1, Math.min(stock, Math.floor(Number(value) || 1)));
    setItems((old) =>
      old.map((x) => (x.key === key ? { ...x, quantity: next } : x)),
    );
  }
  async function submitOrder() {
    if (submitted.current || !recipient) return;
    if (payment === "cash" && (delivery !== "pickup" || deposit)) return;
    if (items.some((p) => p.quantity < 1 || p.quantity > p.stock)) {
      message.error(t("Số lượng vượt quá tồn kho"));
      return;
    }
    submitted.current = true;
    setSubmitting(true);
    if (!orderIdempotencyKey.current)
      orderIdempotencyKey.current = crypto.randomUUID();
    try {
      const { data: quote } = await api.checkout.quote({
        ...(buyProductId
          ? {
              items: items.map((item) => ({
                product_id: item.id,
                variant_id: item.variantId,
                quantity: item.quantity,
              })),
            }
          : { cart_item_ids: items.map((item) => item.key) }),
        ...(delivery === "ship" && addressId ? { address_id: addressId } : {}),
        recipient: {
          name: recipient.name,
          phone: recipient.phone,
          full_address:
            delivery === "ship" ? recipient.address : t("Nhận tại cửa hàng"),
        },
        delivery_method: delivery === "pickup" ? "pickup" : "standard",
        ...(coupon.trim() ? { coupon_code: coupon.trim() } : {}),
        payment_method:
          payment === "cash" ? "cod" : payment === "card" ? "card" : "vietqr",
        payment_mode: deposit ? "deposit" : "full",
        ...(deposit ? { deposit_rate: depositRate } : {}),
        ...(recipient.note ? { note: recipient.note } : {}),
      });
      const { data: order } = await api.checkout.createOrder(
        { quote_id: quote.quote_id, note: recipient.note },
        { idempotencyKey: orderIdempotencyKey.current },
      );
      setPlaced(order);
      setStep(2);
      if (payment !== "cash") {
        try {
          const { data: session } = await api.payments.createSession(
            order.id,
            {
              method: payment === "card" ? "card" : "vietqr",
              purpose: deposit ? "deposit" : "full",
            },
            { idempotencyKey: crypto.randomUUID() },
          );
          setPaymentSession(session);
        } catch (error) {
          message.error(
            error instanceof ApiError
              ? error.message
              : t("Không thể khởi tạo phiên thanh toán"),
          );
        }
      }
      if (!buyProductId) {
        try {
          await s.refreshCart();
        } catch (error) {
          message.error(
            error instanceof ApiError
              ? error.message
              : t("Đơn đã tạo nhưng không thể làm mới giỏ hàng"),
          );
        }
      }
    } catch (error) {
      submitted.current = false;
      message.error(
        error instanceof ApiError
          ? error.message
          : t("Không thể tạo đơn hàng"),
      );
    } finally {
      setSubmitting(false);
    }
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
      <Modal
        open={addingAddress}
        title={t("Thêm địa chỉ")}
        onCancel={() => setAddingAddress(false)}
        onOk={() => addressForm.submit()}
        okText={t("Lưu địa chỉ")}
        cancelText={t("Đóng")}
      >
        <Form
          form={addressForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              const { data } = await api.addresses.create({
                ...values,
                is_default: addresses.length === 0,
              });
              setAddresses((old) => [...old, data]);
              setAddressId(data.id);
              form.setFieldsValue({
                name: data.recipient_name,
                phone: data.recipient_phone,
                address: data.full_address,
              });
              setAddingAddress(false);
              message.success(t("Đã lưu địa chỉ"));
            } catch (error) {
              if (error instanceof ApiError) message.error(error.message);
              else throw error;
            }
          }}
        >
          <Form.Item
            name="name"
            label={t("Tên người nhận")}
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
            label={t("Điện thoại người nhận")}
            rules={[
              { required: true, message: t("Nhập số điện thoại") },
              {
                pattern: /^(0|\+84)[0-9]{9}$/,
                message: t("Số điện thoại chưa hợp lệ"),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <AddressFields form={addressForm} />
        </Form>
      </Modal>
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
          status={currentOrder.status === "cancelled" ? "warning" : "success"}
          title={t(
            currentOrder.status === "cancelled"
              ? "Đơn hàng đã hủy"
              : "Đơn hàng đã được tạo",
          )}
          subTitle={t("Mã đơn: {{id}}", { id: placed.code })}
          extra={
            <Link to="/orders">
              <Button type="primary">{t("Xem đơn hàng")}</Button>
            </Link>
          }
        >
          <p>
            {t("Tổng cộng")}: <strong>{money(placed.total_amount)}</strong>
          </p>
          <p>
            {t("Đã thanh toán")}: {money(currentOrder.paid_amount)}
          </p>
          <PaymentPanel
            key={paymentSession?.id || placed.id}
            order={currentOrder}
            paymentSession={paymentSession}
          />
        </Result>
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            title={t("Đơn hàng được xác nhận qua hệ thống")}
            description={t("Giá và phương thức thanh toán sẽ được xác nhận từ máy chủ.")}
          />
          <div className="two-column">
            <section className="panel">
              {step === 0 ? (
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={
                    recipient || {
                      name: defaultAddress?.recipient_name || s.user.name,
                      phone:
                        defaultAddress?.recipient_phone || s.user.phone || "",
                      address: defaultAddress?.full_address || "",
                    }
                  }
                  onFinish={(values) => {
                    setRecipient(values);
                    setStep(1);
                  }}
                >
                  <h2>{t("Thông tin nhận hàng")}</h2>
                  {delivery === "ship" && (
                    <Form.Item label={t("Chọn địa chỉ đã lưu")}>
                      <Select
                        aria-label={t("Chọn địa chỉ đã lưu")}
                        value={addressId}
                        options={[
                          ...addresses.map((a) => ({
                            value: a.id,
                            label: a.recipient_name + " — " + a.full_address,
                          })),
                          { value: "__add__", label: t("Thêm địa chỉ") },
                        ]}
                        onChange={(id) => {
                          if (id === "__add__") {
                            addressForm.resetFields();
                            addressForm.setFieldsValue({
                              name: s.user.name,
                              phone: s.user.phone,
                            });
                            setAddingAddress(true);
                            return;
                          }
                          setAddressId(id);
                          const a = addresses.find((a) => a.id === id);
                          form.setFieldsValue({
                            name: a.recipient_name,
                            phone: a.recipient_phone,
                            address: a.full_address,
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
                    onChange={(e) => {
                      setDelivery(e.target.value);
                      if (e.target.value === "ship" && payment === "cash")
                        setPayment("qr");
                    }}
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
                      <Input.TextArea rows={2} readOnly />
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
                      if (e.target.value !== "full") setPayment("qr");
                    }}
                    options={[
                      {
                        value: "deposit50",
                        label: t("Đặt cọc {{percent}}%", { percent: 50 }),
                      },
                      {
                        value: "deposit70",
                        label: t("Đặt cọc {{percent}}%", { percent: 70 }),
                      },
                      { value: "full", label: t("Thanh toán toàn bộ") },
                    ]}
                  />
                  <h3>{t("Phương thức thanh toán")}</h3>
                  <Radio.Group
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                    options={[
                      {
                        value: "cash",
                        label: t("Khi nhận hàng"),
                        disabled: deposit || delivery !== "pickup",
                      },
                      { value: "qr", label: t("Chuyển khoản QR") },
                      { value: "card", label: t("Thẻ") },
                    ]}
                  />
                  {deposit && (
                    <p>
                      {t("Cọc dự kiến")}: <strong>{money(due)}</strong>
                    </p>
                  )}
                  <div className="buy-actions">
                    <Button onClick={() => setStep(0)}>{t("Quay lại")}</Button>
                    <Button
                      type="primary"
                      onClick={submitOrder}
                      loading={submitting}
                    >
                      {t("Xác nhận đặt hàng")}
                    </Button>
                  </div>
                </>
              )}
            </section>
            <aside className="panel summary">
              <h2>{t("Đơn hàng của bạn")}</h2>
              {step === 0 &&
                items.map((p) => (
                  <div className="mini-product" key={p.key}>
                    <img src={p.image} alt="" />
                    <div>
                      <span className="product-name">{p.name}</span>
                      <small>
                        {t(p.color)} / {t(p.variantLabel)}
                      </small>
                      <small>
                        {t("Đơn giá")}: {money(p.price)}
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
              {step === 0 && (
                <div className="coupon">
                  <Input
                    aria-label={t("Mã giảm giá")}
                    placeholder={t("Nhập mã giảm giá")}
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      message.info(
                        t("Mã giảm giá sẽ được máy chủ xác thực khi đặt hàng"),
                      );
                    }}
                  >
                    {t("Áp dụng")}
                  </Button>
                </div>
              )}
              <p>
                <span>{t("Tổng tiền hàng")}</span>
                <b>{money(subtotal)}</b>
              </p>
              <p>
                <span>{t("Giảm giá")}</span>
                <b>−{money(off)}</b>
              </p>
              <p>
                <span>{t("Phí giao hàng")}</span>
                <b>{money(shipping)}</b>
              </p>
              <hr />
              <p className="total">
                <span>{t("Số tiền phải thanh toán")}</span>
                <b>{money(total)}</b>
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
