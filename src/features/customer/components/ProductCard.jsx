import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, Tag, Empty, Typography } from "antd";
import { PushpinOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { money } from "../../../shared/utils/format";
export default function ProductCard({ p, showFeatured = true }) {
  const { t } = useTranslation();
  return (
    <Link to={"/products/" + p.id} className="product-card">
      <Card
        hoverable
        cover={
          <div className="product-image">
            {p.image ? (
              <img src={p.image} alt={p.name} loading="lazy" />
            ) : (
              <Empty
                description={t("Chưa có ảnh sản phẩm")}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
            <div className="product-tags">
              {!p.stock ? (
                <Tag className="product-badge sold-out">{t("Hết hàng")}</Tag>
              ) : showFeatured && p.featured ? (
                <Tag className="product-badge" icon={<PushpinOutlined />}>
                  {t("Nổi bật")}
                </Tag>
              ) : null}
            </div>
          </div>
        }
      >
        <div className="product-meta">{t(p.category)}</div>
        <h3 title={p.name}>{p.name}</h3>
        <div className="product-price">
          <strong>{money(p.price)}</strong>
          {p.oldPrice > p.price && (
            <Typography.Text delete type="secondary" title={t("Giá gốc")}>
              {money(p.oldPrice)}
            </Typography.Text>
          )}
        </div>
        <div className="product-card-footer">
          <span className="card-link">
            {t("Xem chi tiết")}
            <ArrowRightOutlined />
          </span>
        </div>
      </Card>
    </Link>
  );
}
