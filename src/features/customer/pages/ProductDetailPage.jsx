import { userError } from "../../../shared/utils/userError";
import { useTranslation } from "react-i18next";
import ExpandableText from "../../../shared/components/ExpandableText";
import ProductReviews from "../components/ProductReviews";
import { useEffect, useLayoutEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  Radio,
  InputNumber,
  Button,
  Tag,
  Descriptions,
  App,
  Result,
  Image,
  Empty,
  Spin,
  Typography,
} from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
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
        message.success(t("Đã thêm vào giỏ hàng"));
      } catch (error) {
        message.error(userError(error));
      }
    }
  }
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
      <div className="detail-grid panel">
        <div className="detail-image">
          {pictures[picture] ? (
            <Image
              classNames={{ popup: { root: "product-image-preview" } }}
              src={pictures[picture]}
              alt={`${p.name} · ${v.label}`}
              fallback="/product-placeholder.svg"
            />
          ) : (
            <Empty description={t("Chưa có ảnh sản phẩm")} />
          )}
          <div className="thumbnails">
            {pictures.map((image, i) => (
              <button
                key={image}
                aria-label={t("Xem ảnh {{number}}", { number: i + 1 })}
                aria-pressed={picture === i}
                className={picture === i ? "selected" : ""}
                onClick={() => setPicture(i)}
              >
                <img src={image} alt={p.name + " · " + (i + 1)} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <Tag>{t(p.category)}</Tag>
          {p.visibility === "coming_soon" && (
            <Tag color="orange">{t("Coming soon")}</Tag>
          )}
          {p.visibility === "private" && (
            <Tag color="blue">{t("Dành cho thành viên")}</Tag>
          )}
          <h1>{p.name}</h1>
          <div className="detail-price">
            <strong>{money(v.price)}</strong>
            {v.oldPrice > v.price && (
              <Typography.Text delete type="secondary" title={t("Giá gốc")}>
                {money(v.oldPrice)}
              </Typography.Text>
            )}
          </div>
          <ExpandableText text={p.description} />
          <Tag color={v.stock ? "success" : "default"}>
            {v.stock
              ? t("Còn {{count}} sản phẩm", { count: v.stock })
              : t("Tạm hết hàng")}
          </Tag>

          <h4>{t("Phân loại sản phẩm")}</h4>
          <Radio.Group
            className="variant-options"
            aria-label={t("Phân loại sản phẩm")}
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
              setPicture(0);
              setQty(1);
            }}
            options={p.variants.map((v) => ({
              value: v.id,
              label: (
                <span className="variant-option">
                  <img src={v.image} alt="" />
                  <span>
                    {t(v.label) + (v.color ? " · " + t(v.color) : "")}
                  </span>
                </span>
              ),
            }))}
            optionType="button"
          />
          <h4>{t("Số lượng")}</h4>
          <InputNumber
            aria-label={t("Số lượng")}
            min={1}
            max={Math.max(v.stock, 1)}
            value={qty}
            onChange={(n) => setQty(n || 1)}
            disabled={!v.stock}
          />
          <div className="buy-actions">
            <Button
              size="large"
              icon={<ShoppingCartOutlined aria-hidden="true" />}
              aria-label={t("Thêm vào giỏ")}
              disabled={!v.stock || p.visibility === "coming_soon"}
              onClick={() => buy(false)}
            >
              {p.visibility === "coming_soon"
                ? t("Coming soon")
                : t("Thêm vào giỏ")}
            </Button>
            <Button
              size="large"
              type="primary"
              disabled={!v.stock || p.visibility === "coming_soon"}
              onClick={() => buy(true)}
            >
              {p.visibility === "coming_soon" ? t("Sắp ra mắt") : t("Mua ngay")}
            </Button>
          </div>
          <h3>{t("Thông tin sản phẩm")}</h3>
          <Descriptions
            bordered
            size="small"
            column={1}
            items={[
              // Chỉ hiện thuộc tính có nhãn; thuộc tính nội bộ như visibility không có nhãn
              ...p.attributes.filter((a) => a.label).map((a, i) => ({
                key: i,
                label: t(a.label),
                children: t(a.value),
              })),
              ...(v.color
                ? [{ key: "color", label: t("Màu sắc"), children: t(v.color) }]
                : []),
            ]}
          />
        </div>
      </div>
      <ProductReviews productId={p.id} />
      <h2>{t("Sản phẩm khác")}</h2>
      <div className="product-grid related">
        {relatedProducts
          .filter((x) => x.id !== p.id)
          .slice(0, 3)
          .map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
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
