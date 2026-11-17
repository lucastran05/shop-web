import { useTranslation } from "react-i18next";
import { money } from "../../../shared/utils/format";

// Danh sách cành và kiểu gói của một bó tự tạo, giá lấy đúng theo backend trả về
export default function BouquetComponents({ components = [], style }) {
  const { t } = useTranslation();
  if (!components.length) return null;
  return (
    <ul className="bt-bq-parts" aria-label={t("Thành phần bó hoa")}>
      {components.map((component) => (
        <li
          key={`${component.product_id}|${component.variant_id}`}
          className={component.is_available === false ? "is-off" : undefined}
        >
          <span>
            {t("{{count}} cành", { count: component.stems })}{" "}
            {[component.product_name, t(component.color)]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <small>
            {t("{{price}} / cành", { price: money(component.unit_price) })}
            {component.stem_length
              ? " · " + t("{{length}} cm", { length: component.stem_length })
              : ""}
          </small>
        </li>
      ))}
      {style?.wrap_name && (
        <li className="is-style">
          <span>
            {t("Giấy gói")}: {t(style.wrap_name)}
            {style.height_name ? ` · ${t(style.height_name)}` : ""}
          </span>
          <small>
            {style.wrap_price > 0 ? money(style.wrap_price) : t("Miễn phí")}
          </small>
        </li>
      )}
    </ul>
  );
}
