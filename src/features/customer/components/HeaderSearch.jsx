import { useState } from "react";
import { AutoComplete, Input, Button, Modal, Tooltip } from "antd";
import { CameraOutlined } from "@ant-design/icons";
import FlowerIdentifier from "./FlowerIdentifier";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useShop } from "../../../shared/shop/useShop";
import { matchesProduct } from "../../../shared/utils/search";
import { money } from "../../../shared/utils/format";
export default function HeaderSearch() {
  const { t } = useTranslation(),
    { products, user } = useShop(),
    navigate = useNavigate(),
    location = useLocation(),
    [params] = useSearchParams();
  const [value, setValue] = useState(
    params.get("search") || params.get("q") || "",
  );
  const [identifyOpen, setIdentifyOpen] = useState(
    params.get("identify") === "flower",
  );
  function closeIdentify() {
    setIdentifyOpen(false);
    if (params.get("identify") === "flower") {
      const next = new URLSearchParams(params);
      next.delete("identify");
      navigate(
        { pathname: location.pathname, search: next.toString() },
        { replace: true },
      );
    }
  }
  const results = value.trim()
    ? products.filter(
        (p) =>
          p.visibility !== "hidden" &&
          (p.visibility !== "private" || user) &&
          matchesProduct(p, value, true),
      )
    : [];
  function search() {
    const next = new URLSearchParams(
      location.pathname === "/" ? params : undefined,
    );
    next.delete("q");
    if (value.trim()) next.set("search", value.trim());
    else next.delete("search");
    navigate("/" + (next.size ? "?" + next.toString() : ""));
  }
  const options = results.slice(0, 6).map((p) => ({
    value: "product-" + p.id,
    label: (
      <div className="search-option">
        <img src={p.image} alt="" />
        <span>
          <strong>{p.name}</strong>
          <small>{money(p.price)}</small>
        </span>
      </div>
    ),
  }));
  if (value.trim() && !results.length)
    options.push({
      value: "no-result",
      disabled: true,
      label: t("Không tìm thấy sản phẩm phù hợp"),
    });
  if (value.trim())
    options.push({ value: "all-results", label: t("Xem tất cả kết quả") });
  return (
    <>
      <AutoComplete
        open={identifyOpen ? false : undefined}
        className="header-search"
        value={value}
        options={options}
        onChange={(v, option) => {
          if (!option?.label) setValue(v);
        }}
        onSelect={(v) => {
          if (v === "all-results") search();
          else navigate("/products/" + v.replace("product-", ""));
        }}
        popupMatchSelectWidth={360}
        notFoundContent={t("Không tìm thấy sản phẩm phù hợp")}
      >
        <Input.Search
          aria-label={t("Tìm kiếm toàn bộ sản phẩm")}
          placeholder={t("Tìm theo tên hoặc mô tả…")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onSearch={search}
          suffix={
            <Tooltip
              open={identifyOpen ? false : undefined}
              title={t("Nhận diện hoa bằng ảnh")}
            >
              <Button
                className="flower-camera-trigger"
                type="text"
                icon={<CameraOutlined />}
                aria-label={t("Nhận diện hoa bằng ảnh")}
                aria-haspopup="dialog"
                onClick={(event) => {
                  event.stopPropagation();
                  setIdentifyOpen(true);
                }}
              />
            </Tooltip>
          }
          allowClear
        />
      </AutoComplete>
      <Modal
        className="flower-identify-modal"
        title={
          <div className="flower-modal-heading">
            <span>{t("TÌM HOA BẰNG HÌNH ẢNH")}</span>
            <h2>{t("Nhận diện hoa")}</h2>
          </div>
        }
        open={identifyOpen}
        onCancel={closeIdentify}
        footer={null}
        width={960}
        centered
        destroyOnHidden
      >
        {identifyOpen && <FlowerIdentifier />}
      </Modal>
    </>
  );
}
