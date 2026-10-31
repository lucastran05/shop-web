import { useState } from "react";
import { AutoComplete, Input } from "antd";
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
    <AutoComplete
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
        allowClear
      />
    </AutoComplete>
  );
}
