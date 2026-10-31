import { userError } from "../../../shared/utils/userError";
import { useState, useRef, useEffect, useCallback } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import {
  Form,
  Input,
  InputNumber,
  Radio,
  Button,
  Empty,
  Steps,
  App,
  Select,
  Spin,
  Tag,
  Modal,
  Divider,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CreditCardOutlined,
  QrcodeOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useShop } from "../../../shared/shop/useShop";
import { useShopConfig } from "../../../shared/shop/useShopConfig";
import { money } from "../../../shared/utils/format";
import { calculateCheckout } from "../../../shared/utils/checkout";
import AddressFields from "../../../shared/components/AddressFields";
import PaymentPanel from "../components/PaymentPanel";
import CopyCode from "../../../shared/components/CopyCode";
import { api, ApiError } from "../../../shared/api";
import { mapProductDetail } from "../../../shared/adapters/productAdapter";

function buildVoucherPreview(voucher, subtotal, shipping) {
  let discount = 0;
  if (voucher.discount_type === "percentage")
    discount = (subtotal * Number(voucher.discount_value)) / 100;
  else if (voucher.discount_type === "fixed")
    discount = Number(voucher.discount_value);
  else if (voucher.discount_type === "free_shipping") discount = shipping;
  if (
    voucher.max_discount_amount !== null &&
    voucher.max_discount_amount !== undefined
  )
    discount = Math.min(discount, Number(voucher.max_discount_amount));
  return {
    id: voucher.id,
    code: voucher.code,
    name: voucher.name,
    discount_type: voucher.discount_type,
    discount_amount: Math.max(
      0,
      Math.min(Math.round(discount), subtotal + shipping),
    ),
  };
}

export default function Checkout() {
  const { t } = useTranslation(),
    s = useShop(),
    shop = useShopConfig(),
    [params, setParams] = useSearchParams(),
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
    [availableVouchers, setAvailableVouchers] = useState([]),
    [couponPreview, setCouponPreview] = useState(null),
    [checkingCoupon, setCheckingCoupon] = useState(false),
    [addingAddress, setAddingAddress] = useState(false),
    [addressId, setAddressId] = useState(null),
    [addressForm] = Form.useForm(),
    [form] = Form.useForm(),
    submitted = useRef(false),
    pendingOrder = useRef(null),
    lastValidatedVoucherKey = useRef(""),
    restoredVoucherKey = useRef("");
  const buyProductId = params.get("product_id");
  const receiptId = params.get("order_id");
  const receiptPaymentId = params.get("payment_id");
  const [receiptError, setReceiptError] = useState("");
  const updatePlaced = useCallback(
    (order) => setPlaced((current) => ({ ...current, ...order })),
    [],
  );
  useEffect(() => {
    if (!s.user || !receiptId || placed?.id === receiptId) return;
    let active = true;
    Promise.all([
      api.orders.get(receiptId),
      receiptPaymentId
        ? api.payments.get(receiptPaymentId)
        : Promise.resolve(null),
    ])
      .then(([order, session]) => {
        if (!active) return;
        setPlaced(order.data);
        setPaymentSession(
          session?.data?.order_id === order.data.id ? session.data : null,
        );
        setStep(2);
      })
      .catch((error) => {
        if (active) setReceiptError(userError(error));
      });
    return () => {
      active = false;
    };
  }, [s.user, receiptId, receiptPaymentId, placed?.id]);
  const buyVariantId = params.get("variant_id");
  const quantityParam = params.get("quantity");
  const voucherStorageKey = s.user?.id
    ? `abc-shop-checkout-voucher:${s.user.id}:${buyProductId || "cart"}:${buyVariantId || ""}`
    : null;
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
              ? userError(error)
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
                ? userError(error)
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
      setItems(
        s.items.filter((item) => item.selected).map((item) => ({ ...item })),
      );
  }, [buyProductId, s.items, items.length]);
  useEffect(() => {
    if (!s.user || !items.length) {
      setAvailableVouchers([]);
      return;
    }
    let active = true;
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    api.vouchers
      .available({ subtotal })
      .then(({ data }) => {
        if (active) setAvailableVouchers(data);
      })
      .catch(() => {
        if (active) setAvailableVouchers([]);
      });
    return () => {
      active = false;
    };
  }, [s.user, items]);
  const defaultAddress = addresses.find((a) => a.id === addressId);
  const currentOrder = placed;
  const cancelled = placed?.status === "cancelled";
  const allowedDepositRates = [50, 70].filter(
    (rate) =>
      items.length > 0 &&
      items.every((item) => item.deposit && rate >= Number(item.deposit_rate)),
  );
  const selectedDepositRate =
    mode === "deposit50" ? 50 : mode === "deposit70" ? 70 : 0;
  const depositRate = allowedDepositRates.includes(selectedDepositRate)
    ? selectedDepositRate / 100
    : 0;
  const deposit = depositRate > 0;
  const totals = calculateCheckout(
      items,
      delivery,
      Boolean(couponPreview),
      deposit,
      payment,
      { ...shop.commerce, depositRate },
      couponPreview?.discount_amount,
    ),
    { subtotal, shipping, off, total, due } = totals;
  function quantity(key, value, stock) {
    if (value === null) return;
    const next = Math.max(1, Math.min(stock, Math.floor(Number(value) || 1)));
    setItems((old) =>
      old.map((x) => (x.key === key ? { ...x, quantity: next } : x)),
    );
    lastValidatedVoucherKey.current = "";
    setCouponPreview(null);
  }
  const applyCoupon = useCallback(
    async (nextCode = coupon) => {
      const code = nextCode.trim();
      setCoupon(code);
      if (!code) {
        setCouponPreview(null);
        lastValidatedVoucherKey.current = "";
        if (voucherStorageKey) {
          try {
            sessionStorage.removeItem(voucherStorageKey);
          } catch {}
        }
        message.warning(t("Vui lòng nhập mã giảm giá"));
        return;
      }
      const baseTotals = calculateCheckout(
        items,
        delivery,
        false,
        false,
        payment,
        {
          ...shop.commerce,
          depositRate,
        },
      );
      const selectedVoucher = availableVouchers.find(
        (voucher) => voucher.code.trim().toUpperCase() === code.toUpperCase(),
      );
      if (selectedVoucher) {
        setCouponPreview(
          buildVoucherPreview(
            selectedVoucher,
            baseTotals.subtotal,
            baseTotals.shipping,
          ),
        );
      }
      lastValidatedVoucherKey.current = `${code}|${baseTotals.subtotal}|${baseTotals.shipping}`;
      setCheckingCoupon(true);
      try {
        const { data } = await api.vouchers.validate({
          code,
          subtotal: baseTotals.subtotal,
          shipping_fee: baseTotals.shipping,
        });
        const validation =
          data && typeof data.discount_amount !== "undefined"
            ? data
            : data?.data;
        const discountAmount = Number(validation?.discount_amount);
        if (!validation || !Number.isFinite(discountAmount)) {
          throw new ApiError("API returned an invalid voucher response", {
            kind: "protocol",
          });
        }
        setCouponPreview({ ...validation, discount_amount: discountAmount });
        if (voucherStorageKey) {
          try {
            sessionStorage.setItem(voucherStorageKey, code);
          } catch {}
        }
        message.success(t("Đã áp dụng mã giảm giá"));
      } catch (error) {
        if (
          !selectedVoucher ||
          (error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500)
        ) {
          setCouponPreview(null);
        }
        if (voucherStorageKey) {
          try {
            sessionStorage.removeItem(voucherStorageKey);
          } catch {}
        }
        message.error(
          error instanceof ApiError
            ? userError(error)
            : t("Mã giảm giá không hợp lệ"),
        );
      } finally {
        setCheckingCoupon(false);
      }
    },
    [
      coupon,
      items,
      delivery,
      payment,
      shop.commerce,
      depositRate,
      voucherStorageKey,
      availableVouchers,
      message,
      t,
    ],
  );
  useEffect(() => {
    if (!voucherStorageKey || !availableVouchers.length) return;
    if (restoredVoucherKey.current === voucherStorageKey) return;
    let savedCode = "";
    try {
      savedCode = sessionStorage.getItem(voucherStorageKey)?.trim() || "";
    } catch {
      restoredVoucherKey.current = voucherStorageKey;
      return;
    }
    restoredVoucherKey.current = voucherStorageKey;
    if (
      savedCode &&
      availableVouchers.some(
        (voucher) =>
          voucher.code.trim().toUpperCase() === savedCode.toUpperCase(),
      )
    ) {
      setCoupon(savedCode);
    }
  }, [availableVouchers, voucherStorageKey]);
  useEffect(() => {
    if (!coupon || !availableVouchers.length || checkingCoupon) return;
    const selected = availableVouchers.find(
      (voucher) =>
        voucher.code.trim().toUpperCase() === coupon.trim().toUpperCase(),
    );
    if (!selected) return;
    const validationKey = `${coupon.trim()}|${subtotal}|${shipping}`;
    if (lastValidatedVoucherKey.current === validationKey) return;
    void applyCoupon(coupon);
  }, [
    availableVouchers,
    coupon,
    subtotal,
    shipping,
    checkingCoupon,
    applyCoupon,
  ]);
  if (!s.user)
    return (
      <Navigate
        to={
          "/login?next=" + encodeURIComponent("/checkout?" + params.toString())
        }
        replace
      />
    );
  async function submitOrder() {
    if (submitted.current || !recipient) return;
    if (payment === "cash" && deposit) return;
    if (items.some((p) => p.quantity < 1 || p.quantity > p.stock)) {
      message.error(t("Số lượng vượt quá tồn kho"));
      return;
    }
    submitted.current = true;
    setSubmitting(true);
    try {
      const quoteRequest = {
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
        ...(deposit ? { deposit_rate: selectedDepositRate } : {}),
        ...(recipient.note ? { note: recipient.note } : {}),
      };
      const signature = JSON.stringify(quoteRequest);
      if (pendingOrder.current?.signature !== signature) {
        const { data: quote } = await api.checkout.quote(quoteRequest);
        pendingOrder.current = { signature, quote, key: crypto.randomUUID() };
      }
      const { quote, key } = pendingOrder.current;
      const { data: order } = await api.checkout.createOrder(
        { quote_id: quote.quote_id, note: recipient.note },
        { idempotencyKey: key },
      );
      setPlaced(order);
      setStep(2);
      let createdSessionId;
      if (voucherStorageKey) {
        try {
          sessionStorage.removeItem(voucherStorageKey);
        } catch {}
      }
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
          createdSessionId = session.id;
        } catch (error) {
          message.error(
            error instanceof ApiError
              ? userError(error)
              : t("Không thể khởi tạo phiên thanh toán"),
          );
        }
      }
      setParams(
        {
          order_id: order.id,
          ...(createdSessionId ? { payment_id: createdSessionId } : {}),
        },
        { replace: true },
      );
      s.refreshOrders().catch((error) => message.error(userError(error)));
      if (!buyProductId) {
        try {
          await s.refreshCart();
        } catch (error) {
          message.error(
            error instanceof ApiError
              ? userError(error)
              : t("Đơn đã tạo nhưng không thể làm mới giỏ hàng"),
          );
        }
      }
    } catch (error) {
      submitted.current = false;
      if ([400, 409].includes(error?.status)) pendingOrder.current = null;
      message.error(
        error instanceof ApiError
          ? userError(error)
          : t("Không thể tạo đơn hàng"),
      );
    } finally {
      setSubmitting(false);
    }
  }
  if (receiptId && !placed)
    return (
      <div className="page">
        {receiptError ? (
          <p role="alert">{receiptError}</p>
        ) : (
          <Spin size="large" />
        )}
      </div>
    );
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
                recipient_name: values.name,
                recipient_phone: values.phone,
                province_code: values.province_code,
                ward_code: values.ward_code,
                street_address: values.street_address,
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
              message.error(userError(error));
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
        <section className="order-receipt panel">
          <div className="receipt-heading">
            {cancelled ? (
              <CloseCircleOutlined
                className="receipt-success-icon"
                style={{ color: "#cf1322" }}
              />
            ) : (
              <CheckCircleOutlined className="receipt-success-icon" />
            )}
            <div>
              <Tag
                color={
                  cancelled
                    ? "default"
                    : currentOrder.payment_status === "paid"
                      ? "success"
                      : "blue"
                }
              >
                {t(
                  cancelled
                    ? "Đơn hàng đã hủy"
                    : currentOrder.payment_status === "paid"
                      ? "Đã thanh toán"
                      : "Đặt hàng thành công",
                )}
              </Tag>
              <h2>
                {t(
                  currentOrder.status === "cancelled"
                    ? "Đơn hàng đã hủy"
                    : "Đơn hàng đã được tạo",
                )}
              </h2>
              <p>
                {t("Mã đơn")} <CopyCode value={placed.code} />
              </p>
            </div>
          </div>
          <div className="receipt-totals">
            <div>
              <span>{t("Tổng cộng")}</span>
              <strong>{money(currentOrder.total_amount)}</strong>
            </div>
            <div>
              <span>{t("Đã thanh toán")}</span>
              <strong>{money(currentOrder.paid_amount)}</strong>
            </div>
            <div>
              <span>{t("Còn phải trả")}</span>
              <strong>{money(currentOrder.remaining_amount)}</strong>
            </div>
          </div>
          <PaymentPanel
            key={paymentSession?.id || placed.id}
            order={currentOrder}
            paymentSession={paymentSession}
            onOrderUpdate={updatePlaced}
          />
          <div className="receipt-actions">
            <Link to="/orders">
              <Button type="primary">{t("Xem đơn hàng")}</Button>
            </Link>
            <Link to="/">
              <Button>{t("Tiếp tục mua sắm")}</Button>
            </Link>
          </div>
        </section>
      ) : (
        <>
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
                      lastValidatedVoucherKey.current = "";
                      setDelivery(e.target.value);
                      setCouponPreview(null);
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
                      <Input.TextArea
                        rows={2}
                        maxLength={250}
                        placeholder={t("Nhập số nhà, tên đường, tòa nhà…")}
                      />
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
                  {allowedDepositRates.length > 0 && (
                    <>
                      <h3>{t("Hình thức thanh toán")}</h3>
                      <Radio.Group
                        className="payment-amount-options"
                        value={deposit ? mode : "full"}
                        onChange={(e) => {
                          setMode(e.target.value);
                          if (e.target.value !== "full") setPayment("qr");
                        }}
                        options={[
                          ...allowedDepositRates.map((percent) => ({
                            value: `deposit${percent}`,
                            label: t("Đặt cọc {{percent}}%", { percent }),
                          })),
                          { value: "full", label: t("Thanh toán toàn bộ") },
                        ]}
                      />
                    </>
                  )}
                  <h3>{t("Phương thức thanh toán")}</h3>
                  <Radio.Group
                    className="payment-method-options"
                    value={payment}
                    onChange={(e) => setPayment(e.target.value)}
                  >
                    <Radio value="cash" disabled={deposit}>
                      <WalletOutlined />
                      <span>
                        <strong>{t("Khi nhận hàng")}</strong>
                        <small>{t("Trả tiền khi nhận đủ sản phẩm")}</small>
                      </span>
                    </Radio>
                    <Radio value="qr">
                      <QrcodeOutlined />
                      <span>
                        <strong>{t("Chuyển khoản QR")}</strong>
                        <small>{t("Quét mã bằng ứng dụng ngân hàng")}</small>
                      </span>
                    </Radio>
                    <Radio value="card">
                      <CreditCardOutlined />
                      <span>
                        <strong>{t("Thẻ")}</strong>
                        <small>{t("Thanh toán qua cổng ngân hàng")}</small>
                      </span>
                    </Radio>
                  </Radio.Group>
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
                <>
                  {availableVouchers.length > 0 ? (
                    <Select
                      aria-label={t("Voucher đang hoạt động")}
                      showSearch
                      allowClear
                      style={{ width: "100%", marginBottom: 8 }}
                      placeholder={t("Chọn voucher đang hoạt động")}
                      value={coupon || undefined}
                      optionFilterProp="label"
                      options={availableVouchers.map((voucher) => ({
                        value: voucher.code,
                        label:
                          voucher.discount_type === "percentage"
                            ? `${voucher.code} — Giảm ${voucher.discount_value}%`
                            : voucher.discount_type === "fixed"
                              ? `${voucher.code} — Giảm ${money(voucher.discount_value)}`
                              : `${voucher.code} — Miễn phí vận chuyển`,
                      }))}
                      onChange={(value) => {
                        lastValidatedVoucherKey.current = "";
                        if (value) setCoupon(value);
                        else {
                          setCoupon("");
                          setCouponPreview(null);
                          if (voucherStorageKey) {
                            try {
                              sessionStorage.removeItem(voucherStorageKey);
                            } catch {}
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="coupon">
                      <Input
                        aria-label={t("Mã giảm giá")}
                        placeholder={t("Nhập mã giảm giá")}
                        value={coupon}
                        onChange={(e) => {
                          setCoupon(e.target.value);
                          setCouponPreview(null);
                        }}
                      />
                      <Button
                        onClick={() => applyCoupon()}
                        loading={checkingCoupon}
                      >
                        {t("Áp dụng")}
                      </Button>
                    </div>
                  )}
                </>
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
              <Divider style={{ margin: "22px 0" }} />
              <p className="total">
                <span>{t("Tổng cộng")}</span>
                <b>{money(total)}</b>
              </p>
              {step === 1 && (
                <>
                  <p>
                    <span>{t("Thanh toán ngay")}</span>
                    <b>{money(due)}</b>
                  </p>
                  {total > due && (
                    <p>
                      <span>{t("Thanh toán khi nhận hàng")}</span>
                      <b>{money(total - due)}</b>
                    </p>
                  )}
                </>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
