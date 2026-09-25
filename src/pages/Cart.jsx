import { Link, useNavigate } from "react-router-dom";
import { Button, Checkbox, InputNumber, Empty, App } from "antd";
import { DeleteOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { useShop } from "../hooks/useShop";
import { money } from "../utils/format";
export default function Cart() {
  const { items, setCart } = useShop(),
    navigate = useNavigate(),
    { message } = App.useApp();
  const selected = items.filter((x) => x.selected),
    total = selected.reduce((n, p) => n + p.price * p.quantity, 0);
  const patch = (key, data) =>
    setCart((old) => old.map((x) => (x.key === key ? { ...x, ...data } : x)));
  return (
    <div className="page">
      <h1>
        Giỏ hàng của bạn<span className="muted"> ({items.length})</span>
      </h1>
      {!items.length ? (
        <Empty description="Giỏ hàng đang trống">
          <Button type="primary" onClick={() => navigate("/")}>
            Khám phá sản phẩm
          </Button>
        </Empty>
      ) : (
        <div className="two-column">
          <section className="panel">
            <Checkbox
              indeterminate={
                !!selected.length && selected.length < items.length
              }
              checked={selected.length === items.length}
              onChange={(e) =>
                setCart((old) =>
                  old.map((x) => ({ ...x, selected: e.target.checked })),
                )
              }
            >
              Chọn tất cả
            </Checkbox>
            {items.map((p) => (
              <div className="cart-row" key={p.key}>
                <Checkbox
                  aria-label={"Chọn " + p.name}
                  checked={p.selected}
                  onChange={(e) => patch(p.key, { selected: e.target.checked })}
                />
                <Link to={"/products/" + p.id}>
                  <img src={p.image} alt={p.name} />
                </Link>
                <div className="cart-info">
                  <Link to={"/products/" + p.id}>
                    <h3>{p.name}</h3>
                  </Link>
                  <p>
                    {p.color} / Phân loại: {p.variantLabel}
                  </p>
                  <strong>{money(p.price)}</strong>
                </div>
                <InputNumber
                  aria-label={"Số lượng " + p.name}
                  min={1}
                  max={p.stock}
                  value={p.quantity}
                  onChange={(v) => patch(p.key, { quantity: v || 1 })}
                />
                <Button
                  aria-label={"Xóa " + p.name}
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    setCart((old) => old.filter((x) => x.key !== p.key))
                  }
                />
              </div>
            ))}
          </section>
          <aside className="panel summary">
            <h2>Tóm tắt đơn hàng</h2>
            <p>
              <span>Tạm tính ({selected.length} sản phẩm)</span>
              <b>{money(total)}</b>
            </p>
            <p className="muted">
              Phí vận chuyển và mã giảm giá được tính ở bước đặt hàng.
            </p>
            <hr />
            <p className="total">
              <span>Tạm tính</span>
              <strong>{money(total)}</strong>
            </p>
            <Button
              block
              type="primary"
              size="large"
              onClick={() => {
                if (!selected.length)
                  message.warning("Hãy chọn sản phẩm cần thanh toán");
                else navigate("/checkout");
              }}
            >
              Tiến hành đặt hàng <ArrowRightOutlined />
            </Button>
            <Link className="back-link" to="/">
              Tiếp tục mua sắm
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
