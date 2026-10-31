import {
  AimOutlined,
  ArrowUpOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { getShopMap } from "../../../shared/utils/shopMap";

export default function ShopMap({ contact }) {
  const { t } = useTranslation();
  const { embedUrl, openUrl } = getShopMap(contact);
  return (
    <div className="shop-map">
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={t("Vị trí cửa hàng")}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="shop-map-empty">
          <EnvironmentOutlined aria-hidden="true" />
          <p>{t("Bản đồ đang được cập nhật")}</p>
        </div>
      )}
      {openUrl && (
        <a
          className="shop-map-link"
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <AimOutlined aria-hidden="true" />
          {t("Xem địa chỉ trên Google Maps")}
          <ArrowUpOutlined rotate={45} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
