import { useState, useRef, useEffect, useCallback } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { App, Empty, Form, Spin, Steps } from "antd";
import { useTranslation } from "react-i18next";
import { useShop } from "../../../shared/shop/useShop";
import { useShopConfig } from "../../../shared/shop/useShopConfig";
import { calculateCheckout } from "../../../shared/utils/checkout";
import { userError } from "../../../shared/utils/userError";
import { api, ApiError } from "../../../shared/api";
import { mapProductDetail } from "../../../shared/adapters/productAdapter";
import AddressModal from "../components/checkout/AddressModal";
import CheckoutSummary from "../components/checkout/CheckoutSummary";
import OrderReceipt from "../components/checkout/OrderReceipt";
import PaymentStep from "../components/checkout/PaymentStep";
import RecipientForm from "../components/checkout/RecipientForm";
import {
  findVoucher,
  forgetVoucher,
  previewVoucher,
  readSavedVoucher,
  saveVoucher,
} from "../components/checkout/voucher";

const DEPOSIT_RATES = [50, 70];

// Dòng hàng "mua ngay" từ trang sản phẩm (không đi qua giỏ hàng)
function buyNowItem(product, variant, requestedQuantity) {
  return {
    ...product,
    ...variant,
    id: product.id,
    variantId: variant.id,
    key: `${product.id}-${variant.id}`,
    variantLabel: variant.label,
    quantity: Math.max(1, Math.min(variant.stock || 1, Math.floor(Number(requestedQuantity) || 1))),
  };
}

const selectedCartItems = (cart) => cart.filter((item) => item.selected).map((item) => ({ ...item }));

export default function Checkout() {
  const { t } = useTranslation();
  const s = useShop();
  const shop = useShopConfig();
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const buyProductId = params.get("product_id");
  const buyVariantId = params.get("variant_id");
  const quantityParam = params.get("quantity");
  const receiptId = params.get("order_id");
  const receiptPaymentId = params.get("payment_id");

  // Bước 0: người nhận, bước 1: thanh toán, bước 2: kết quả
  const [step, setStep] = useState(0);
  const [items, setItems] = useState(() => (buyProductId ? [] : selectedCartItems(s.items)));
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [recipient, setRecipient] = useState(null);
  const [delivery, setDelivery] = useState("ship");
  const [payment, setPayment] = useState("qr");
  const [mode, setMode] = useState("full");
  const [coupon, setCoupon] = useState("");
  const [couponPreview, setCouponPreview] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [placed, setPlaced] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [addressForm] = Form.useForm();
  const [form] = Form.useForm();
  const submitted = useRef(false);
  const pendingOrder = useRef(null);
  // Khóa "mã|tạm tính|phí ship" của lần kiểm tra voucher gần nhất, tránh gọi API lặp
  const lastValidatedVoucherKey = useRef("");
  const restoredVoucherKey = useRef("");

  const voucherStorageKey = s.user?.id
    ? `abc-shop-checkout-voucher:${s.user.id}:${buyProductId || "cart"}:${buyVariantId || ""}`
    : null;
  const showError = useCallback(
    (error, fallback) => message.error(error instanceof ApiError ? userError(error) : t(fallback)),
    [message, t],
  );
  const updatePlaced = useCallback((order) => setPlaced((current) => ({ ...current, ...order })), []);

  // Mở lại trang kết quả từ URL (?order_id=...&payment_id=...)
  useEffect(() => {
    if (!s.user || !receiptId || placed?.id === receiptId) return;
    let active = true;
    Promise.all([
      api.orders.get(receiptId),
      receiptPaymentId ? api.payments.get(receiptPaymentId) : Promise.resolve(null),
    ])
      .then(([order, session]) => {
        if (!active) return;
        setPlaced(order.data);
        setPaymentSession(session?.data?.order_id === order.data.id ? session.data : null);
        setStep(2);
      })
      .catch((error) => {
        if (active) setReceiptError(userError(error));
      });
    return () => {
      active = false;
    };
  }, [s.user, receiptId, receiptPaymentId, placed?.id]);

  // Sổ địa chỉ; chọn sẵn địa chỉ mặc định
  useEffect(() => {
    if (!s.user) return;
    let active = true;
    api.addresses
      .list()
      .then(({ data }) => {
        if (!active) return;
        setAddresses(data);
        setAddressId(s.user.default_address_id || data.find((address) => address.is_default)?.id || data[0]?.id);
      })
      .catch((error) => {
        if (active) showError(error, "Không thể tải sổ địa chỉ");
      });
    return () => {
      active = false;
    };
  }, [s.user, showError]);

  // Mua ngay: tải sản phẩm và biến thể từ URL
  useEffect(() => {
    if (!buyProductId) return;
    let active = true;
    api.products
      .get(buyProductId)
      .then(({ data }) => {
        if (!active) return;
        const product = mapProductDetail(data);
        const variant = product.variants.find((item) => item.id === buyVariantId);
        if (!variant) {
          message.error(t("Không tìm thấy biến thể sản phẩm"));
          return;
        }
        setItems([buyNowItem(product, variant, quantityParam)]);
      })
      .catch((error) => {
        if (active) showError(error, "Không thể tải sản phẩm");
      });
    return () => {
      active = false;
    };
  }, [buyProductId, buyVariantId, quantityParam, message, t, showError]);

  // Giỏ hàng có thể tải xong sau khi trang đã mở
  useEffect(() => {
    if (!buyProductId && !items.length && s.items.length) setItems(selectedCartItems(s.items));
  }, [buyProductId, s.items, items.length]);

  useEffect(() => {
    if (!s.user || !items.length) {
      setAvailableVouchers([]);
      return;
    }
    let active = true;
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
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

  // Đặt cọc chỉ khả dụng khi mọi sản phẩm đều cho cọc với mức đó
  const allowedDepositRates = DEPOSIT_RATES.filter(
    (rate) => items.length > 0 && items.every((item) => item.deposit && rate >= Number(item.deposit_rate)),
  );
  const selectedDepositRate = mode === "deposit50" ? 50 : mode === "deposit70" ? 70 : 0;
  const depositRate = allowedDepositRates.includes(selectedDepositRate) ? selectedDepositRate / 100 : 0;
  const deposit = depositRate > 0;
  const totals = calculateCheckout(
    items,
    delivery,
    Boolean(couponPreview),
    deposit,
    payment,
    { ...shop.commerce, depositRate },
    couponPreview?.discount_amount,
  );

  // Đổi số lượng/cách giao làm thay đổi tạm tính: phải kiểm tra lại voucher
  function resetVoucherCheck() {
    lastValidatedVoucherKey.current = "";
    setCouponPreview(null);
  }

  function changeQuantity(key, value, stock) {
    if (value === null) return;
    const next = Math.max(1, Math.min(stock, Math.floor(Number(value) || 1)));
    setItems((old) => old.map((item) => (item.key === key ? { ...item, quantity: next } : item)));
    resetVoucherCheck();
  }

  const applyCoupon = useCallback(
    async (nextCode = coupon) => {
      const code = nextCode.trim();
      setCoupon(code);
      if (!code) {
        setCouponPreview(null);
        lastValidatedVoucherKey.current = "";
        forgetVoucher(voucherStorageKey);
        message.warning(t("Vui lòng nhập mã giảm giá"));
        return;
      }
      const base = calculateCheckout(items, delivery, false, false, payment, { ...shop.commerce, depositRate });
      // Hiện ngay số tiền giảm ước tính trong lúc chờ API xác nhận
      const knownVoucher = findVoucher(availableVouchers, code);
      if (knownVoucher) setCouponPreview(previewVoucher(knownVoucher, base.subtotal, base.shipping));
      lastValidatedVoucherKey.current = `${code}|${base.subtotal}|${base.shipping}`;
      setCheckingCoupon(true);
      try {
        const { data } = await api.vouchers.validate({ code, subtotal: base.subtotal, shipping_fee: base.shipping });
        const validation = data && typeof data.discount_amount !== "undefined" ? data : data?.data;
        const discountAmount = Number(validation?.discount_amount);
        if (!validation || !Number.isFinite(discountAmount)) {
          throw new ApiError("API returned an invalid voucher response", { kind: "protocol" });
        }
        setCouponPreview({ ...validation, discount_amount: discountAmount });
        saveVoucher(voucherStorageKey, code);
        message.success(t("Đã áp dụng mã giảm giá"));
      } catch (error) {
        // Lỗi mạng với voucher đã biết thì giữ số ước tính; mã bị từ chối thì bỏ
        const rejected = error instanceof ApiError && error.status >= 400 && error.status < 500;
        if (!knownVoucher || rejected) setCouponPreview(null);
        forgetVoucher(voucherStorageKey);
        showError(error, "Mã giảm giá không hợp lệ");
      } finally {
        setCheckingCoupon(false);
      }
    },
    [coupon, items, delivery, payment, shop.commerce, depositRate, voucherStorageKey, availableVouchers, message, t, showError],
  );

  // Khôi phục voucher đã chọn trước đó trong phiên (nếu vẫn còn hiệu lực)
  useEffect(() => {
    if (!voucherStorageKey || !availableVouchers.length) return;
    if (restoredVoucherKey.current === voucherStorageKey) return;
    restoredVoucherKey.current = voucherStorageKey;
    const savedCode = readSavedVoucher(voucherStorageKey);
    if (savedCode && findVoucher(availableVouchers, savedCode)) setCoupon(savedCode);
  }, [availableVouchers, voucherStorageKey]);

  // Voucher chọn từ danh sách được kiểm tra lại mỗi khi tạm tính hoặc phí ship đổi
  useEffect(() => {
    if (!coupon || !availableVouchers.length || checkingCoupon) return;
    if (!findVoucher(availableVouchers, coupon)) return;
    if (lastValidatedVoucherKey.current === `${coupon.trim()}|${totals.subtotal}|${totals.shipping}`) return;
    void applyCoupon(coupon);
  }, [availableVouchers, coupon, totals.subtotal, totals.shipping, checkingCoupon, applyCoupon]);

  if (!s.user)
    return <Navigate to={"/login?next=" + encodeURIComponent("/checkout?" + params.toString())} replace />;

  function quoteRequest() {
    return {
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
        full_address: delivery === "ship" ? recipient.address : t("Nhận tại cửa hàng"),
      },
      delivery_method: delivery === "pickup" ? "pickup" : "standard",
      ...(coupon.trim() ? { coupon_code: coupon.trim() } : {}),
      payment_method: payment === "cash" ? "cod" : payment === "card" ? "card" : "vietqr",
      payment_mode: deposit ? "deposit" : "full",
      ...(deposit ? { deposit_rate: selectedDepositRate } : {}),
      ...(recipient.note ? { note: recipient.note } : {}),
    };
  }

  // Tạo phiên thanh toán online; lỗi ở đây không làm hỏng đơn đã tạo
  async function startPayment(order) {
    try {
      const { data: session } = await api.payments.createSession(
        order.id,
        { method: payment === "card" ? "card" : "vietqr", purpose: deposit ? "deposit" : "full" },
        { idempotencyKey: crypto.randomUUID() },
      );
      setPaymentSession(session);
      return session.id;
    } catch (error) {
      showError(error, "Không thể khởi tạo phiên thanh toán");
      return undefined;
    }
  }

  async function submitOrder() {
    if (submitted.current || !recipient) return;
    if (payment === "cash" && deposit) return;
    if (items.some((item) => item.quantity < 1 || item.quantity > item.stock)) {
      message.error(t("Số lượng vượt quá tồn kho"));
      return;
    }
    submitted.current = true;
    setSubmitting(true);
    try {
      // Bấm lại với cùng dữ liệu thì dùng lại báo giá và idempotency key cũ để không tạo đơn trùng
      const request = quoteRequest();
      const signature = JSON.stringify(request);
      if (pendingOrder.current?.signature !== signature) {
        const { data: quote } = await api.checkout.quote(request);
        pendingOrder.current = { signature, quote, key: crypto.randomUUID() };
      }
      const { quote, key } = pendingOrder.current;
      const { data: order } = await api.checkout.createOrder(
        { quote_id: quote.quote_id, note: recipient.note },
        { idempotencyKey: key },
      );
      setPlaced(order);
      setStep(2);
      forgetVoucher(voucherStorageKey);

      const sessionId = payment !== "cash" ? await startPayment(order) : undefined;
      setParams({ order_id: order.id, ...(sessionId ? { payment_id: sessionId } : {}) }, { replace: true });
      s.refreshOrders().catch((error) => message.error(userError(error)));
      if (!buyProductId) {
        await s.refreshCart().catch((error) => showError(error, "Đơn đã tạo nhưng không thể làm mới giỏ hàng"));
      }
    } catch (error) {
      submitted.current = false;
      // Báo giá hết hạn hoặc tồn kho đổi: lần bấm sau phải lấy báo giá mới
      if ([400, 409].includes(error?.status)) pendingOrder.current = null;
      showError(error, "Không thể tạo đơn hàng");
    } finally {
      setSubmitting(false);
    }
  }

  function selectAddress(id) {
    setAddressId(id);
    const address = addresses.find((item) => item.id === id);
    form.setFieldsValue({ name: address.recipient_name, phone: address.recipient_phone, address: address.full_address });
  }

  function openAddressModal() {
    addressForm.resetFields();
    addressForm.setFieldsValue({ name: s.user.name, phone: s.user.phone });
    setAddingAddress(true);
  }

  function addressSaved(address) {
    setAddresses((old) => [...old, address]);
    setAddressId(address.id);
    form.setFieldsValue({ name: address.recipient_name, phone: address.recipient_phone, address: address.full_address });
    setAddingAddress(false);
  }

  function selectVoucher(code) {
    lastValidatedVoucherKey.current = "";
    setCoupon(code);
    if (!code) {
      setCouponPreview(null);
      forgetVoucher(voucherStorageKey);
    }
  }

  if (receiptId && !placed)
    return <div className="page">{receiptError ? <p role="alert">{receiptError}</p> : <Spin size="large" />}</div>;
  if (!placed && !items.length)
    return (
      <div className="page">
        <Empty description={t("Chưa chọn sản phẩm để đặt hàng")}>
          <Link to="/cart">{t("Về giỏ hàng")}</Link>
        </Empty>
      </div>
    );

  const defaultAddress = addresses.find((address) => address.id === addressId);
  return (
    <div className="page">
      <h1>{t("Đặt hàng")}</h1>
      <AddressModal
        open={addingAddress}
        form={addressForm}
        makeDefault={addresses.length === 0}
        onClose={() => setAddingAddress(false)}
        onSaved={addressSaved}
      />
      <Steps
        className="checkout-steps"
        current={step}
        items={[{ title: t("Thông tin khách hàng") }, { title: t("Thanh toán") }, { title: t("Kết quả đặt hàng") }]}
      />
      {placed ? (
        <OrderReceipt order={placed} paymentSession={paymentSession} onOrderUpdate={updatePlaced} />
      ) : (
        <div className="two-column">
          <section className="panel">
            {step === 0 ? (
              <RecipientForm
                form={form}
                initialValues={
                  recipient || {
                    name: defaultAddress?.recipient_name || s.user.name,
                    phone: defaultAddress?.recipient_phone || s.user.phone || "",
                    address: defaultAddress?.full_address || "",
                  }
                }
                addresses={addresses}
                addressId={addressId}
                delivery={delivery}
                onDeliveryChange={(value) => {
                  setDelivery(value);
                  resetVoucherCheck();
                }}
                onSelectAddress={selectAddress}
                onAddAddress={openAddressModal}
                onFinish={(values) => {
                  setRecipient(values);
                  setStep(1);
                }}
              />
            ) : (
              <PaymentStep
                recipient={recipient}
                delivery={delivery}
                depositRates={allowedDepositRates}
                mode={mode}
                deposit={deposit}
                payment={payment}
                depositDue={totals.due}
                submitting={submitting}
                onModeChange={(value) => {
                  setMode(value);
                  if (value !== "full") setPayment("qr");
                }}
                onPaymentChange={setPayment}
                onBack={() => setStep(0)}
                onSubmit={submitOrder}
              />
            )}
          </section>
          <CheckoutSummary
            step={step}
            items={items}
            totals={totals}
            onQuantityChange={changeQuantity}
            voucher={{
              vouchers: availableVouchers,
              code: coupon,
              checking: checkingCoupon,
              onSelect: selectVoucher,
              onType: (value) => {
                setCoupon(value);
                setCouponPreview(null);
              },
              onApply: () => applyCoupon(),
            }}
          />
        </div>
      )}
    </div>
  );
}
