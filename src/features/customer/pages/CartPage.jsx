import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, Checkbox, App } from "antd";
import { useShop } from "../../../shared/shop/useShop";
import { useShopConfig } from "../../../shared/shop/useShopConfig";
import { money } from "../../../shared/utils/format";
import { userError } from "../../../shared/utils/userError";
import QtyStepper from "../components/QtyStepper";
import BouquetComponents from "../components/BouquetComponents";

export default function Cart() {
  const { t } = useTranslation();
  const { items, setCart, user } = useShop(),
    { commerce } = useShopConfig(),
    navigate = useNavigate(),
    { message } = App.useApp();
  const selected = items.filter((x) => x.selected),
    total = selected.reduce((n, p) => n + p.price * p.quantity, 0),
    pieces = selected.reduce((n, p) => n + p.quantity, 0);
  const saveCart = (update) =>
    setCart(update).catch((error) => message.error(t(userError(error))));
  const patch = (key, data) =>
    saveCart((old) => old.map((x) => (x.key === key ? { ...x, ...data } : x)));
  // Bó hoa tự tạo không có trang sản phẩm: mở trang tự tạo và liệt kê từng loại cành
  const isBouquet = (p) => p.itemType === "custom_bouquet";
  const lineHref = (p) =>
    isBouquet(p) ? "/custom-bouquet" : "/products/" + p.id;
  const lineName = (p) => (isBouquet(p) ? t(p.name) : p.name);
  if (!user) return <Navigate to="/login?next=/cart" replace />;

  const freeFrom = commerce?.freeShippingFrom || 0;
  const missing = Math.max(0, freeFrom - total);
  const progress = freeFrom ? Math.min(1, total / freeFrom) : 1;

  return (
    <div className="page bt-cart-page">
      <header className="bt-page-head">
        <h1>{t("Giỏ hàng của bạn")}</h1>
        {items.length > 0 && (
          <p>{t("{{count}} sản phẩm", { count: items.length })}</p>
        )}
      </header>
      {!items.length ? (
        <div className="bt-empty-state">
          <div className="bt-empty-arch" aria-hidden="true">
            <img src="/logo/logo.svg" alt="" />
          </div>
          <h2>{t("Giỏ hàng đang trống")}</h2>
          <p>{t("Thêm vài bó hoa hoặc chậu cây, chúng sẽ chờ bạn ở đây.")}</p>
          <Button type="primary" size="large" onClick={() => navigate("/")}>
            {t("Khám phá sản phẩm")}
          </Button>
        </div>
      ) : (
        <div className="bt-checkout-grid">
          <section className="bt-lines" aria-label={t("Sản phẩm trong giỏ")}>
            <div className="bt-lines-head">
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
            </div>
            {items.map((p) => (
              <article
                className={"bt-line" + (p.selected ? "" : " is-off")}
                key={p.key}
              >
                <Checkbox
                  aria-label={t("Chọn {{name}}", { name: lineName(p) })}
                  checked={p.selected}
                  onChange={(e) => patch(p.key, { selected: e.target.checked })}
                />
                <Link
                  to={lineHref(p)}
                  className={"bt-line-img" + (isBouquet(p) ? " is-stem" : "")}
                >
                  <img src={p.image} alt={lineName(p)} />
                </Link>
                <div className="bt-line-info">
                  <Link to={lineHref(p)}>
                    <h3>{lineName(p)}</h3>
                  </Link>
                  {isBouquet(p) ? (
                    <BouquetComponents
                      components={p.components}
                      style={p.style}
                    />
                  ) : (
                    <p>
                      {[t(p.variantLabel), t(p.color)]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {isBouquet(p) && !p.available && (
                    <p className="bt-line-warn">
                      {t("Một số hoa trong bó đã hết hoặc ngừng bán")}
                    </p>
                  )}
                  <span className="bt-line-unit">{money(p.price)}</span>
                </div>
                <QtyStepper
                  size="small"
                  label={t("Số lượng {{name}}", { name: lineName(p) })}
                  value={p.quantity}
                  min={1}
                  max={p.stock}
                  onChange={(v) => patch(p.key, { quantity: v })}
                />
                <strong className="bt-line-total">
                  {money(p.price * p.quantity)}
                </strong>
                <button
                  type="button"
                  className="bt-line-remove"
                  aria-label={t("Xóa {{name}}", { name: lineName(p) })}
                  onClick={() =>
                    saveCart((old) => old.filter((x) => x.key !== p.key))
                  }
                >
                  {t("Bỏ")}
                </button>
              </article>
            ))}
          </section>

          <aside className="bt-ticket" aria-label={t("Tóm tắt đơn hàng")}>
            <h2>{t("Tóm tắt đơn hàng")}</h2>
            {freeFrom > 0 && (
              <div className="bt-ship-meter">
                <p>
                  {missing > 0
                    ? t("Mua thêm {{amount}} để được miễn phí giao hàng", {
                        amount: money(missing),
                      })
                    : t("Đơn này được miễn phí giao hàng")}
                </p>
                <div
                  className="bt-ship-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                  aria-label={t("Tiến độ miễn phí giao hàng")}
                >
                  <span style={{ transform: `scaleX(${progress})` }} />
                </div>
              </div>
            )}
            <dl className="bt-sum">
              <div>
                <dt>{t("Tạm tính ({{count}} sản phẩm)", { count: pieces })}</dt>
                <dd>{money(total)}</dd>
              </div>
              <div className="is-note">
                <dt>{t("Phí vận chuyển được tính ở bước đặt hàng.")}</dt>
              </div>
              <div className="is-total">
                <dt>{t("Tạm tính")}</dt>
                <dd key={total}>{money(total)}</dd>
              </div>
            </dl>
            <Button
              block
              type="primary"
              size="large"
              disabled={!selected.length}
              onClick={() => navigate("/checkout")}
            >
              {t("Tiến hành đặt hàng")}
            </Button>
            {!selected.length && (
              <p className="bt-hint">{t("Hãy chọn sản phẩm cần thanh toán")}</p>
            )}
            <Link className="bt-back" to="/">
              {t("Tiếp tục mua sắm")}
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
