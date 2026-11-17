import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { money } from "../../../shared/utils/format";

// Hero trang chủ dạng "tiêu bản": danh sách sản phẩm nổi bật bên trái,
// rê chuột / focus / bấm vào tên nào thì ảnh trong khung vòm đổi theo.
export default function HomeHero({ shopName, description, products }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const picks = products.slice(0, 5);
  const current = picks[active] || picks[0];

  return (
    <section className="bt-hero">
      <div className="bt-hero-copy">
        <h1>{t(description) || shopName}</h1>
        <p className="bt-hero-lede">
          {t(
            "Chọn một mẫu bên dưới để xem trước, hoặc cuộn xuống để xem toàn bộ cửa hàng.",
          )}
        </p>
        {picks.length > 0 && (
          <ul className="bt-specimen-list" aria-label={t("Sản phẩm nổi bật")}>
            {picks.map((p, i) => (
              <li key={p.id}>
                <Link
                  to={"/products/" + p.id}
                  className={i === active ? "is-active" : undefined}
                  aria-current={i === active ? "true" : undefined}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                >
                  <span className="bt-specimen-name">{p.name}</span>
                  <span className="bt-specimen-cat">{t(p.category)}</span>
                  <span className="bt-specimen-price">{money(p.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <a className="bt-hero-jump" href="#collection">
          {t("Xem tất cả sản phẩm")}
        </a>
      </div>

      <figure className="bt-plate" aria-hidden={!current}>
        <div className="bt-plate-arch">
          {picks.map((p, i) => (
            <img
              key={p.id}
              src={p.image}
              alt=""
              className={
                (i === active ? "is-shown" : "") +
                (p.sold_by_stem ? " is-stem" : "")
              }
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
          {!picks.length && (
            <img
              className="is-shown bt-plate-logo"
              src="/logo/logo.svg"
              alt=""
            />
          )}
        </div>
        {current && (
          <figcaption key={current.id} className="bt-plate-label">
            <span>{t(current.category)}</span>
            <strong>{current.name}</strong>
            <em>
              {current.oldPrice > current.price && (
                <del>{money(current.oldPrice)}</del>
              )}{" "}
              {money(current.price)}
            </em>
          </figcaption>
        )}
      </figure>
    </section>
  );
}
