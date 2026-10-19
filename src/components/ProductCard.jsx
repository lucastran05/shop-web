import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, Tag, Empty } from "antd";
import { PushpinOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { money } from "../utils/format";
export default function ProductCard({ p }) {
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
              <Empty description={t("Chưa có ảnh sản phẩm")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
            <div className="product-tags">
              {!p.stock ? (
                <Tag>{t("Hết hàng")}</Tag>
              ) : p.featured ? (
                <Tag color="blue" icon={<PushpinOutlined />}>
                  {t("Nổi bật")}
                </Tag>
              ) : null}
            </div>
          </div>
        }
      >
        <div className="product-meta">{t(p.category)}</div>
        <h3>{p.name}</h3>
        <div className="product-price">
          <strong>{money(p.price)}</strong>
          {p.oldPrice && <del>{money(p.oldPrice)}</del>}
        </div>
        <span className="card-link">
          {t("Xem chi tiết")}
          <ArrowRightOutlined />
        </span>
      </Card>
    </Link>
  );
}
