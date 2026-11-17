import { userError } from "../../../shared/utils/userError";
import { useTranslation } from "react-i18next";
import ExpandableText from "../../../shared/components/ExpandableText";
import ProductReviews from "../components/ProductReviews";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Breadcrumb, Button, App, Result, Image, Empty, Spin } from "antd";
import { ShoppingOutlined } from "@ant-design/icons";
import QtyStepper from "../components/QtyStepper";
import { flyToCart } from "../components/flyToCart";
import { money } from "../../../shared/utils/format";
import { useShop } from "../../../shared/shop/useShop";
import ProductCard from "../components/ProductCard";
import { api, ApiError } from "../../../shared/api";
import { mapProductDetail } from "../../../shared/adapters/productAdapter";
function ProductView({ p, relatedProducts }) {
  const { t } = useTranslation();
  const { hash } = useLocation();
  useLayoutEffect(() => {
    if (hash === "#reviews") {
      document
        .getElementById("reviews")
        ?.scrollIntoView({ block: "start", behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [p.id, hash]);
  const [variantId, setVariantId] = useState(p.variants[0]?.id),
    [qty, setQty] = useState(1),
    [picture, setPicture] = useState(0);
  const v = p.variants.find((v) => v.id === variantId) || p.variants[0],
    { add, user } = useShop(),
    { message } = App.useApp(),
    navigate = useNavigate();
  const pictures = [...new Set([v.image, ...p.images])];
  const buyRef = useRef(null);
  const stageRef = useRef(null);
  const [barVisible, setBarVisible] = useState(false);
  useEffect(() => {
    // Hiện thanh mua khi khối nút mua chính đã cuộn khuất phía trên
    const update = () => {
      const box = buyRef.current?.getBoundingClientRect();
      setBarVisible(Boolean(box && box.bottom < 0));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (p.visibility === "hidden") {
    return (
      <div className="page product-detail-page">
        <Result
          status="404"
          title={t("Sản phẩm không khả dụng")}
          subTitle={t("Sản phẩm này hiện đang tạm ẩn.")}
          extra={
            <Link to="/">
              <Button type="primary">{t("Về trang chủ")}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (p.visibility === "private" && !user) {
    return (
      <div className="page product-detail-page">
        <Result
          status="403"
          title={t("Sản phẩm dành cho thành viên")}
          subTitle={t(
            "Vui lòng đăng nhập để xem thông tin và mua sản phẩm này.",
          )}
          extra={
            <Link to={"/login?next=" + encodeURIComponent("/products/" + p.id)}>
              <Button type="primary">{t("Đăng nhập")}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  async function buy(now) {
    if (!v.stock || p.visibility === "coming_soon") return;
    if (!user && !now) {
      message.info(t("Vui lòng đăng nhập để thêm vào giỏ hàng"));
      navigate("/login?next=" + encodeURIComponent("/products/" + p.id));
      return;
    }
    if (now) {
      navigate(
        "/checkout?" +
          new URLSearchParams({
            product_id: p.id,
            variant_id: v.id,
            quantity: String(qty),
          }),
      );
    } else {
      try {
        await add(p, v.id, qty);
        flyToCart(stageRef.current?.querySelector("img"));
        message.success(t("Đã thêm vào giỏ hàng"));
      } catch (error) {
        message.error(userError(error));
      }
    }
  }
  const unavailable = !v.stock || p.visibility === "coming_soon";
  const lowStock = v.stock > 0 && v.stock <= 5;
  const facts = [
    // Chỉ hiện thuộc tính có nhãn; thuộc tính nội bộ như visibility không có nhãn
    ...p.attributes
      .filter((a) => a.label)
      .map((a) => ({ label: t(a.label), value: t(a.value) })),
    ...(v.color ? [{ label: t("Màu sắc"), value: t(v.color) }] : []),
  ];
  const actions = (compact) => (
    <>
      <Button
        size={compact ? "middle" : "large"}
        icon={<ShoppingOutlined aria-hidden="true" />}
        disabled={unavailable}
        onClick={() => buy(false)}
      >
        {p.visibility === "coming_soon" ? t("Coming soon") : t("Thêm vào giỏ")}
      </Button>
      <Button
        size={compact ? "middle" : "large"}
        type="primary"
        disabled={unavailable}
        onClick={() => buy(true)}
      >
        {p.visibility === "coming_soon" ? t("Sắp ra mắt") : t("Mua ngay")}
      </Button>
    </>
  );
  return (
    <div className="page product-detail-page">
      <Breadcrumb
        className="product-breadcrumb"
        items={[
          { title: <Link to="/">{t("Trang chủ")}</Link> },
          {
            title: (
              <Link
                className="breadcrumb-label breadcrumb-category"
                title={t(p.category)}
                to={"/?category=" + encodeURIComponent(p.category)}
              >
                {t(p.category)}
              </Link>
            ),
          },
          {
            title: (
              <span className="breadcrumb-label" title={p.name}>
                {p.name}
              </span>
            ),
          },
        ]}
      />
      <div className="bt-pd">
        <div className="bt-pd-gallery">
          {pictures.length > 1 && (
            <div
              className={"bt-pd-thumbs" + (p.sold_by_stem ? " is-stem" : "")}
              aria-label={t("Ảnh sản phẩm")}
            >
              {pictures.map((image, i) => (
                <button
                  type="button"
                  key={image}
                  aria-label={t("Xem ảnh {{number}}", { number: i + 1 })}
                  aria-pressed={picture === i}
                  onClick={() => setPicture(i)}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          )}
          <div
            className={"bt-zoom" + (p.sold_by_stem ? " is-stem" : "")}
            ref={stageRef}
          >
            {pictures[picture] ? (
              <Image
                key={pictures[picture]}
                classNames={{ popup: { root: "product-image-preview" } }}
                src={pictures[picture]}
                alt={`${p.name} · ${v.label}`}
                fallback="/product-placeholder.svg"
              />
            ) : (
              <Empty description={t("Chưa có ảnh sản phẩm")} />
            )}
          </div>
        </div>

        <div className="bt-pd-info">
          <div className="bt-pd-flags">
            <Link
              className="bt-detail-cat"
              to={"/?category=" + encodeURIComponent(p.category)}
            >
              {t(p.category)}
            </Link>
            {p.visibility === "coming_soon" && (
              <span className="bt-flag">{t("Coming soon")}</span>
            )}
            {p.visibility === "private" && (
              <span className="bt-flag is-member">
                {t("Dành cho thành viên")}
              </span>
            )}
          </div>
          <h1>{p.name}</h1>
          <div className="bt-pd-price" aria-live="polite">
            <strong key={v.id}>{money(v.price)}</strong>
            {v.oldPrice > v.price && (
              <>
                <del title={t("Giá gốc")}>{money(v.oldPrice)}</del>
                <span className="bt-save">
                  {t("Tiết kiệm {{amount}}", {
                    amount: money(v.oldPrice - v.price),
                  })}
                </span>
              </>
            )}
          </div>
          <div className="bt-pd-desc">
            <ExpandableText text={p.description} />
          </div>

          <div className="bt-pd-block">
            <div className="bt-pd-label">
              <span>{t("Phân loại sản phẩm")}</span>
              <span
                className={
                  "bt-stock" +
                  (!v.stock ? " is-out" : lowStock ? " is-low" : "")
                }
              >
                {!v.stock
                  ? t("Tạm hết hàng")
                  : lowStock
                    ? t("Chỉ còn {{count}} sản phẩm", { count: v.stock })
                    : t("Còn {{count}} sản phẩm", { count: v.stock })}
              </span>
            </div>
            <div
              className="bt-variants"
              role="radiogroup"
              aria-label={t("Phân loại sản phẩm")}
            >
              {p.variants.map((item) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={item.id === v.id}
                  key={item.id}
                  className={!item.stock ? "is-out" : undefined}
                  onClick={() => {
                    setVariantId(item.id);
                    setPicture(0);
                    setQty(1);
                  }}
                >
                  <img src={item.image} alt="" />
                  <span className="bt-variant-text">
                    <b>{t(item.label)}</b>
                    {item.color && <small>{t(item.color)}</small>}
                  </span>
                  <span className="bt-variant-price">{money(item.price)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bt-pd-buy" ref={buyRef}>
            <QtyStepper
              value={qty}
              min={1}
              max={Math.max(v.stock, 1)}
              disabled={!v.stock}
              onChange={setQty}
            />
            {actions(false)}
          </div>
          {qty > 1 && !unavailable && (
            <p className="bt-pd-line">
              {t("Thành tiền")}: <b>{money(v.price * qty)}</b>
            </p>
          )}

          {facts.length > 0 && (
            <section
              className="bt-specimen"
              aria-label={t("Thông tin sản phẩm")}
            >
              <h2>{t("Thông tin sản phẩm")}</h2>
              <dl>
                {facts.map((fact, i) => (
                  <div key={i}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      <ProductReviews productId={p.id} />
      <h2 className="bt-related-title">{t("Có thể bạn cũng thích")}</h2>
      <div className="product-grid related">
        {relatedProducts
          .filter((x) => x.id !== p.id)
          .slice(0, 3)
          .map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
      </div>

      <div
        className={"bt-buybar" + (barVisible ? " is-visible" : "")}
        aria-hidden={!barVisible}
        inert={!barVisible ? true : undefined}
      >
        <img src={v.image} alt="" />
        <div className="bt-buybar-text">
          <strong>{p.name}</strong>
          <span>
            {t(v.label)} · {money(v.price)}
            {qty > 1 && " × " + qty}
          </span>
        </div>
        <div className="bt-buybar-actions">{actions(true)}</div>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { products: relatedProducts } = useShop();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    api.products
      .get(id)
      .then(({ data }) => {
        if (active) setProduct(mapProductDetail(data));
      })
      .catch((cause) => {
        if (!active) return;
        setProduct(null);
        setError(
          cause instanceof ApiError
            ? userError(cause)
            : t("Không thể tải chi tiết sản phẩm"),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, t]);
  if (loading) return <Spin className="page" />;
  return product ? (
    <ProductView
      key={product.id}
      p={product}
      relatedProducts={relatedProducts}
    />
  ) : (
    <Result
      status="404"
      title={error || t("Không tìm thấy sản phẩm")}
      extra={<Link to="/">{t("Về trang chủ")}</Link>}
    />
  );
}
