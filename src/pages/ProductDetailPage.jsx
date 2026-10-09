import { useTranslation } from "react-i18next";
import ExpandableText from "../components/ExpandableText";
import ProductReviews from "../components/ProductReviews";
import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
} from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
import { products } from "../services/productService";
import { money } from "../utils/format";
import { useShop } from "../hooks/useShop";
import { shopConfig } from "../constants/shop";
import ProductCard from "../components/ProductCard";
function ProductView({ p }) {
  const { t } = useTranslation();
  const [variantId, setVariantId] = useState(p.variants[0].id),
    [qty, setQty] = useState(1),
    [picture, setPicture] = useState(0);
  const v = p.variants.find((v) => v.id === variantId),
    { add } = useShop(),
    { message } = App.useApp(),
    navigate = useNavigate();
  function buy(now) {
    if (!v.stock) return;
    if (now) {
      navigate(
        "/checkout?" +
          new URLSearchParams({
            buy: `${p.id}-${v.id}`,
            quantity: String(qty),
          }),
      );
    } else if (add(p, v.id, qty)) message.success(t("Đã thêm vào giỏ hàng"));
  }
  return (
    <div className="page">
      <Breadcrumb
        items={[
          { title: <Link to="/">{t("Trang chủ")}</Link> },
          { title: t(p.category) },
          { title: p.name },
        ]}
      />
      <div className="detail-grid panel">
        <div className="detail-image">
          <Image src={p.images[picture]} alt={p.name} />
          <div className="thumbnails">
            {p.images.map((image, i) => (
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
          <h1>{p.name}</h1>
          <div className="detail-price">
            {money(v.price)} {v.oldPrice && <del>{money(v.oldPrice)}</del>}
          </div>
          <ExpandableText text={p.description} />
          <Tag color={v.stock ? "success" : "default"}>
            {v.stock
              ? t("Còn {{count}} sản phẩm", { count: v.stock })
              : t("Tạm hết hàng")}
          </Tag>
          {p.deposit && (
            <Tag color="blue">
              {t("Hỗ trợ đặt cọc {{percent}}%", {
                percent: shopConfig.commerce.depositRate * 100,
              })}
            </Tag>
          )}
          <h4>{t("Phân loại sản phẩm")}</h4>
          <Radio.Group
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
              setQty(1);
            }}
            options={p.variants.map((v) => ({
              value: v.id,
              label: t(v.label) + (v.color ? " · " + t(v.color) : ""),
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
              disabled={!v.stock}
              onClick={() => buy(false)}
            >
              {t("Thêm vào giỏ")}
            </Button>
            <Button
              size="large"
              type="primary"
              disabled={!v.stock}
              onClick={() => buy(true)}
            >
              {t("Mua ngay")}
            </Button>
          </div>
          <h3>{t("Thông tin sản phẩm")}</h3>
          <Descriptions
            bordered
            size="small"
            column={1}
            items={[
              ...p.attributes.map((a, i) => ({
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
        {products
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
  const { id } = useParams(),
    p = products.find((x) => x.id === Number(id));
  return p ? (
    <ProductView key={p.id} p={p} />
  ) : (
    <Result
      status="404"
      title={t("Không tìm thấy sản phẩm")}
      extra={<Link to="/">{t("Về trang chủ")}</Link>}
    />
  );
}
