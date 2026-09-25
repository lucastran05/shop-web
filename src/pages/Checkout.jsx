import { shopConfig } from "../constants/shop";
import { calculateCheckout } from "../utils/checkout";
import { useState, useRef } from "react";
import { Navigate, Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Radio,
  Button,
  Alert,
  Empty,
  Steps,
  App,
  Select,
} from "antd";
import { useShop } from "../hooks/useShop";
import { money } from "../utils/format";
export default function Checkout() {
  const s = useShop(),
    [params] = useSearchParams(),
    navigate = useNavigate(),
    { message } = App.useApp();
  const [delivery, setDelivery] = useState("ship"),
    [payment, setPayment] = useState("cash"),
    [mode, setMode] = useState("full"),
    [coupon, setCoupon] = useState(""),
    [discount, setDiscount] = useState(false);
  const submitted = useRef(false);
  const [form] = Form.useForm();
  const defaultAddress = s.user?.addresses?.find(
    (a) => a.id === s.user.defaultAddressId,
  );
  const buy = params.get("buy"),
    items = s.items.filter((x) => (buy ? x.key === buy : x.selected)),
    canDeposit = items.length > 0 && items.every((p) => p.deposit),
    deposit = mode === "deposit" && canDeposit;
  const { subtotal, shipping, off, total, due } = calculateCheckout(
    items,
    delivery,
    discount,
    deposit,
    payment,
  );
  if (!s.user)
    return (
      <Navigate
        to={
          "/login?next=" +
          encodeURIComponent("/checkout" + (buy ? "?buy=" + buy : ""))
        }
        replace
      />
    );
  if (!items.length)
    return (
      <div className="page">
        <Empty description="Chưa chọn sản phẩm để đặt hàng">
          <Link to="/cart">Về giỏ hàng</Link>
        </Empty>
      </div>
    );
  function submit(values) {
    if (submitted.current) return;
    submitted.current = true;
    const order = {
      id: "ABC-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      owner: s.user.email,
      createdAt: new Date().toISOString(),
      items,
      subtotal,
      shipping,
      off,
      total,
      deposit: deposit ? due : 0,
      depositRate: deposit ? shopConfig.commerce.depositRate : 0,
      depositStatus: deposit ? "Chờ xác nhận" : "Không đặt cọc",
      depositAt: null,
      due,
      paid: 0,
      remaining: total,
      payment,
      delivery,
      status: "Chờ xác nhận",
      paymentStatus:
        payment === "cash"
          ? "Thanh toán khi nhận hàng"
          : "Chờ xác nhận thanh toán (demo)",
      recipient: values,
    };
    s.setOrders((old) => [order, ...old]);
    s.setCart((old) => old.filter((x) => !items.some((p) => p.key === x.key)));
    s.notify("Đơn " + order.id + " đã được tạo và đang chờ xác nhận.");
    message.success("Đã tạo đơn hàng demo");
    navigate("/orders");
  }
  return (
    <div className="page">
      <h1>Hoàn tất lựa chọn của bạn</h1>
      <Steps
        className="checkout-steps"
        current={1}
        items={[
          { title: "Giỏ hàng" },
          { title: "Thông tin đặt hàng" },
          { title: "Chờ xác nhận" },
        ]}
      />
      <Alert
        type="warning"
        showIcon
        title="Đặt hàng mô phỏng — không phát sinh thanh toán thật"
        description="QR và thẻ chỉ mô phỏng lựa chọn phương thức. Không nhập thông tin thẻ hoặc chuyển tiền. Tiền đã trả vẫn bằng 0 cho đến khi backend xác nhận."
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{
          name: defaultAddress?.name || s.user.name,
          phone: defaultAddress?.phone || s.user.phone,
          address: defaultAddress?.address || s.user.address,
        }}
      >
        <div className="two-column">
          <section className="panel">
            <h2>Thông tin nhận hàng</h2>
            {!!s.user.addresses?.length && (
              <Form.Item label="Chọn địa chỉ đã lưu">
                <Select
                  aria-label="Chọn địa chỉ đã lưu"
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
              label="Họ và tên"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Nhập tên người nhận",
                },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[
                { required: true, message: "Nhập số điện thoại" },
                {
                  pattern: /^(0|\+84)[0-9]{9}$/,
                  message: "Nhập số điện thoại Việt Nam hợp lệ",
                },
              ]}
            >
              <Input />
            </Form.Item>
            <h3>Phương thức giao hàng</h3>
            <Radio.Group
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              options={[
                { value: "ship", label: "Giao tận nơi" },
                { value: "pickup", label: "Nhận tại cửa hàng" },
              ]}
            />
            {delivery === "ship" && (
              <Form.Item
                name="address"
                label="Địa chỉ nhận hàng"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "Nhập số nhà, đường, phường/xã, tỉnh/thành",
                  },
                ]}
              >
                <Input.TextArea rows={2} />
              </Form.Item>
            )}
            <Form.Item name="note" label="Yêu cầu bổ sung">
              <Input.TextArea maxLength={500} showCount rows={2} />
            </Form.Item>
            <h3>Hình thức thanh toán</h3>
            <Radio.Group
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                if (e.target.value === "deposit") setPayment("qr");
              }}
              options={[
                { value: "full", label: "Toàn bộ giá trị đơn" },
                {
                  value: "deposit",
                  label: `Đặt cọc ${shopConfig.commerce.depositRate * 100}%`,
                  disabled: !canDeposit,
                },
              ]}
            />
            {!canDeposit && (
              <p className="muted">
                Đặt cọc chỉ áp dụng khi mọi sản phẩm trong đơn đều hỗ trợ.
              </p>
            )}
            <h3>Phương thức thanh toán</h3>
            <Radio.Group
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              options={[
                { value: "cash", label: "Khi nhận hàng", disabled: deposit },
                { value: "qr", label: "QR (demo)" },
                { value: "card", label: "Thẻ (demo)" },
              ]}
            />
          </section>
          <aside className="panel summary">
            <h2>Đơn hàng của bạn</h2>
            {items.map((p) => (
              <div className="mini-product" key={p.key}>
                <img src={p.image} alt="" />
                <div>
                  {p.name}
                  <small>
                    {p.color} / {p.variantLabel} × {p.quantity}
                  </small>
                </div>
                <b>{money(p.price * p.quantity)}</b>
              </div>
            ))}
            <div className="coupon">
              <Input
                aria-label="Mã giảm giá"
                placeholder={"Mã giảm giá: " + shopConfig.commerce.coupon.code}
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value);
                  setDiscount(false);
                }}
              />
              <Button
                onClick={() => {
                  const valid =
                    coupon.trim().toUpperCase() ===
                    shopConfig.commerce.coupon.code;
                  setDiscount(valid);
                  message[valid ? "success" : "error"](
                    valid
                      ? `Giảm ${shopConfig.commerce.coupon.rate * 100}%, tối đa ${money(shopConfig.commerce.coupon.maxDiscount)}`
                      : "Mã giảm giá không hợp lệ",
                  );
                }}
              >
                Áp dụng
              </Button>
            </div>
            <p>
              <span>Tạm tính</span>
              <b>{money(subtotal)}</b>
            </p>
            <p>
              <span>Phí giao hàng</span>
              <b>{money(shipping)}</b>
            </p>
            <p>
              <span>Giảm giá</span>
              <b>−{money(off)}</b>
            </p>
            <hr />
            <p className="total">
              <span>Tổng cộng</span>
              <b>{money(total)}</b>
            </p>
            <p>
              <span>
                {deposit
                  ? `Cọc dự kiến (${shopConfig.commerce.depositRate * 100}%)`
                  : "Cần trả trước"}
              </span>
              <b>{money(due)}</b>
            </p>
            <p>
              <span>Còn lại sau khi trả trước</span>
              <b>{money(total - due)}</b>
            </p>
            <Button htmlType="submit" block size="large" type="primary">
              Xác nhận đặt hàng demo
            </Button>
            <p className="muted">Đơn được lưu trên trình duyệt này.</p>
          </aside>
        </div>
      </Form>
    </div>
  );
}
