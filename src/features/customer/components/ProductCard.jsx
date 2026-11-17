import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { money } from "../../../shared/utils/format";

function cardBadge(p, t, showFeatured) {
  if (p.visibility === "coming_soon")
    return { text: t("Coming soon"), tone: "soon" };
  if (p.visibility === "private")
    return { text: t("Thành viên"), tone: "member" };
  if (!p.stock) return { text: t("Hết hàng"), tone: "out" };
  if (showFeatured && p.featured) return { text: t("Nổi bật"), tone: "pick" };
  return null;
}

export default function ProductCard({ p, showFeatured = true, onClick }) {
  const { t } = useTranslation();
  const badge = cardBadge(p, t, showFeatured);
  const onSale = p.oldPrice > p.price;
  return (
    <Link
      to={"/products/" + p.id}
      className={"bt-card" + (!p.stock ? " is-out" : "")}
      onClick={onClick}
    >
      <div className="bt-card-arch">
        {p.image ? (
          <img src={p.image} alt={p.name} loading="lazy" />
        ) : (
          <span className="bt-card-noimg">{t("Chưa có ảnh sản phẩm")}</span>
        )}
        {badge && (
          <span className={"bt-badge bt-badge-" + badge.tone}>
            {badge.text}
          </span>
        )}
      </div>
      <div className="bt-card-body">
        <span className="bt-card-cat">{t(p.category)}</span>
        <h3 title={p.name}>{p.name}</h3>
        <div className="bt-card-price">
          <strong className={onSale ? "is-sale" : undefined}>
            {money(p.price)}
          </strong>
          {onSale && <del title={t("Giá gốc")}>{money(p.oldPrice)}</del>}
        </div>
      </div>
    </Link>
  );
}
