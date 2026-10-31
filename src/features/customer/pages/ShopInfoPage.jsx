import { Button } from "antd";
import {
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useShopConfig } from "../../../shared/shop/useShopConfig";
import ShopMap from "../components/ShopMap";
export default function ShopInfo() {
  const { t } = useTranslation(),
    shop = useShopConfig(),
    c = shop.contact;
  return (
    <div className="page shop-info-page">
      <section className="shop-info-hero">
        <div>
          <span className="hero-brand">{t("Thông tin")}</span>
          <h1>{shop.name}</h1>
          <p>{t(shop.description)}</p>
          {c.socialLinks.length > 0 && (
            <div className="shop-links">
              {c.socialLinks.map((l) => (
                <Button
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  icon={<LinkOutlined />}
                >
                  {l.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        <img src="/logo/logo.svg" alt="" width="160" height="144" />
      </section>
      <div className="shop-info-grid">
        <section className="shop-contact-panel">
          <h2>{t("Liên hệ")}</h2>
          <p className="muted">
            {t("Kết nối với cửa hàng theo cách thuận tiện cho bạn.")}
          </p>
          <div className="shop-contact-list">
            <div>
              <EnvironmentOutlined aria-hidden="true" />
              <dl>
                <dt>{t("Địa chỉ")}</dt>
                <dd>{c.address || t("Đang cập nhật")}</dd>
              </dl>
            </div>
            <div>
              <PhoneOutlined aria-hidden="true" />
              <dl>
                <dt>{t("Điện thoại")}</dt>
                <dd>
                  {c.phone ? (
                    <a href={"tel:" + c.phone}>{c.phone}</a>
                  ) : (
                    t("Đang cập nhật")
                  )}
                </dd>
              </dl>
            </div>
            <div>
              <MailOutlined aria-hidden="true" />
              <dl>
                <dt>{t("Email")}</dt>
                <dd>
                  {c.email ? (
                    <a href={"mailto:" + c.email}>{c.email}</a>
                  ) : (
                    t("Đang cập nhật")
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </section>
        <section
          className="shop-location-panel"
          aria-label={t("Vị trí cửa hàng")}
        >
          <h2>
            <EnvironmentOutlined aria-hidden="true" /> {t("Vị trí cửa hàng")}
          </h2>
          <ShopMap contact={c} />
        </section>
      </div>
    </div>
  );
}
