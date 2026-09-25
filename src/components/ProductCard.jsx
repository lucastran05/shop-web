import { Link } from "react-router-dom";
import { Card, Tag } from "antd";
import { PushpinOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { money } from "../utils/format";
export default function ProductCard({ p }) {
  return (
    <Link to={"/products/" + p.id} className="product-card">
      <Card
        hoverable
        cover={
          <div className="product-image">
            <img src={p.image} alt={p.name} loading="lazy" />
            <div className="product-tags">
              {!p.stock ? (
                <Tag>Hết hàng</Tag>
              ) : p.featured ? (
                <Tag color="blue" icon={<PushpinOutlined />}>
                  Nổi bật
                </Tag>
              ) : null}
            </div>
          </div>
        }
      >
        <div className="product-meta">{p.category}</div>
        <h3>{p.name}</h3>
        <div className="product-price">
          <strong>{money(p.price)}</strong>
          {p.oldPrice && <del>{money(p.oldPrice)}</del>}
        </div>
        <span className="card-link">
          Xem chi tiết <ArrowRightOutlined />
        </span>
      </Card>
    </Link>
  );
}
