import { Descriptions, Button, Empty } from "antd";
import { useTranslation } from "react-i18next";
import { useShopConfig } from "../hooks/useShopConfig";
export default function ShopInfo() {
  const { t } = useTranslation(),
    shop = useShopConfig(),
    c = shop.contact;
  return (
    <div className="page">
      <h1>{t("Thông tin shop")}</h1>
      <section className="panel">
        <h2>{shop.name}</h2>
        <p>{t(shop.description)}</p>
        <Descriptions
          column={1}
          bordered
          items={[
            {
              key: "address",
              label: t("Địa chỉ"),
              children: c.address || t("Đang cập nhật"),
            },
            {
              key: "phone",
              label: t("Điện thoại"),
              children: c.phone ? (
                <a href={"tel:" + c.phone}>{c.phone}</a>
              ) : (
                t("Đang cập nhật")
              ),
            },
            {
              key: "email",
              label: "Email",
              children: c.email ? (
                <a href={"mailto:" + c.email}>{c.email}</a>
              ) : (
                t("Đang cập nhật")
              ),
            },
          ]}
        />
        <div className="shop-links">
          {c.mapUrl && (
            <Button href={c.mapUrl} target="_blank" rel="noreferrer">
              {t("Xem địa chỉ trên Google Maps")}
            </Button>
          )}
          {c.socialLinks.map((l) => (
            <Button key={l.url} href={l.url} target="_blank" rel="noreferrer">
              {l.label}
            </Button>
          ))}
        </div>
        {!c.mapUrl && !c.socialLinks.length && (
          <Empty description={t("Liên kết và bản đồ đang được cập nhật")} />
        )}
      </section>
    </div>
  );
}
