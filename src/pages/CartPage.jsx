import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, Checkbox, InputNumber, Empty, App } from "antd";
import { DeleteOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { useShop } from "../hooks/useShop";
import { money } from "../utils/format";
import { userError } from "../utils/userError";
export default function Cart() {
  const { t } = useTranslation();
  const { items, setCart, user } = useShop(),
    navigate = useNavigate(),
    { message } = App.useApp();
  const selected = items.filter((x) => x.selected),
    total = selected.reduce((n, p) => n + p.price * p.quantity, 0);
  const saveCart = (update) =>
    setCart(update).catch((error) => message.error(t(userError(error))));
  const patch = (key, data) =>
    saveCart((old) => old.map((x) => (x.key === key ? { ...x, ...data } : x)));
  if (!user) return <Navigate to="/login?next=/cart" replace />;
  return (
    <div className="page">
      <h1>
        {t("Giỏ hàng của bạn")}
        <span className="muted"> ({items.length})</span>
      </h1>
      {!items.length ? (
        <Empty description={t("Giỏ hàng đang trống")}>
          <Button type="primary" onClick={() => navigate("/")}>
            {t("Khám phá sản phẩm")}
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
                saveCart((old) =>
                  old.map((x) => ({ ...x, selected: e.target.checked })),
                )
              }
            >
              {t("Chọn tất cả")}
            </Checkbox>
            {items.map((p) => (
              <div className="cart-row" key={p.key}>
                <Checkbox
                  aria-label={t("Chọn {{name}}", { name: p.name })}
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
                    {t(p.color)} / {t("Phân loại")}: {t(p.variantLabel)}
                  </p>
                  <strong>{money(p.price)}</strong>
                </div>
                <InputNumber
                  aria-label={t("Số lượng {{name}}", { name: p.name })}
                  min={1}
                  max={p.stock}
                  value={p.quantity}
                  onChange={(v) => patch(p.key, { quantity: v || 1 })}
                />
                <Button
                  aria-label={t("Xóa {{name}}", { name: p.name })}
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    saveCart((old) => old.filter((x) => x.key !== p.key))
                  }
                />
              </div>
            ))}
          </section>
          <aside className="panel summary">
            <h2>{t("Tóm tắt đơn hàng")}</h2>
            <p>
              <span>
                {t("Tạm tính ({{count}} sản phẩm)", { count: selected.length })}
              </span>
              <b>{money(total)}</b>
            </p>
            <p className="muted">
              {t("Phí vận chuyển được tính ở bước đặt hàng.")}
            </p>
            <hr />
            <p className="total">
              <span>{t("Tạm tính")}</span>
              <strong>{money(total)}</strong>
            </p>
            <Button
              block
              type="primary"
              size="large"
              onClick={() => {
                if (!selected.length)
                  message.warning(t("Hãy chọn sản phẩm cần thanh toán"));
                else navigate("/checkout");
              }}
            >
              {t("Tiến hành đặt hàng")}
              <ArrowRightOutlined />
            </Button>
            <Link className="back-link" to="/">
              {t("Tiếp tục mua sắm")}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
