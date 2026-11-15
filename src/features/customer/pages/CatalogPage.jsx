import { useShopConfig } from "../../../shared/shop/useShopConfig";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Select,
  Checkbox,
  InputNumber,
  Pagination,
  Alert,
  Badge,
} from "antd";
import { SlidersOutlined } from "@ant-design/icons";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShop } from "../../../shared/shop/useShop";
import {
  getCatalogFilters,
  filterCatalogProducts,
  MAX_FILTER_PRICE,
} from "../../../shared/utils/search";
import ProductCard from "../components/ProductCard";
import HomeHero from "../components/HomeHero";
import { usePreferences } from "../../../shared/preferences/usePreferences";
export default function Catalog() {
  const { t } = useTranslation(),
    { products, categories, catalogLoading, catalogError, user } = useShop(),
    shopConfig = useShopConfig(),
    [params, setParams] = useSearchParams();
  const { catalogPreferences, setCatalogPreferences } = usePreferences();
  const filters = getCatalogFilters(params, catalogPreferences.defaultSort);
  const { query: search, category, price, stock, featured, sort } = filters;
  const pageSize = catalogPreferences.pageSize;
  const [pageState, setPage] = useState({ query: params.toString(), value: 1 });
  function changePage(value) {
    setPage({ query: params.toString(), value });
  }
  function update(values, replace = false) {
    const next = new URLSearchParams(params);
    next.delete("q");
    if (search) next.set("search", search);
    for (const [key, value] of Object.entries(values)) {
      if (value !== "" && value !== null) next.set(key, String(value));
      else next.delete(key);
    }
    setPage({ query: next.toString(), value: 1 });
    setParams(next, { replace });
  }
  const categoryProducts = filterCatalogProducts(
    products,
    {
      ...filters,
      category: "",
    },
    user,
  );
  const list = categoryProducts.filter(
    (p) => !category || category === "Tất cả" || p.category === category,
  );
  const hasFilters =
    category ||
    price[0] > 0 ||
    price[1] < MAX_FILTER_PRICE ||
    stock ||
    featured ||
    sort !== catalogPreferences.defaultSort;
  const extraFilterCount =
    (price[0] > 0 ? 1 : 0) +
    (price[1] < MAX_FILTER_PRICE ? 1 : 0) +
    (stock ? 1 : 0) +
    (featured ? 1 : 0);
  const [moreOpen, setMoreOpen] = useState(extraFilterCount > 0);
  const tabsRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const strip = tabsRef.current;
    const el = strip?.querySelector('[aria-pressed="true"]');
    if (!el) return;
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    // Chỉ cuộn ngang dải tab, không kéo cả trang.
    if (el.offsetLeft < strip.scrollLeft)
      strip.scrollTo({ left: el.offsetLeft - 16, behavior: "smooth" });
    else if (
      el.offsetLeft + el.offsetWidth >
      strip.scrollLeft + strip.clientWidth
    )
      strip.scrollTo({
        left: el.offsetLeft + el.offsetWidth - strip.clientWidth + 16,
        behavior: "smooth",
      });
  }, [category, categories.length, t]);
  const visible = products.filter(
    (p) => p.visibility !== "hidden" && (p.visibility !== "private" || user),
  );
  const picks = visible.filter((p) => p.featured);
  const heroProducts = picks.length ? picks : visible;
  const page = Math.min(
    pageState.query === params.toString() ? pageState.value : 1,
    Math.max(1, Math.ceil(list.length / pageSize)),
  );
  const categoryOptions = ["", ...categories.map((item) => item.name)];
  return (
    <>
      <HomeHero
        shopName={shopConfig.name}
        description={shopConfig.description}
        products={heroProducts}
      />
      <section className="bt-collection" id="collection">
        <header className="bt-collection-head">
          <h2>{t("Tất cả sản phẩm")}</h2>
          <p className="bt-count">
            {t("{{count}} sản phẩm", { count: list.length })}
          </p>
          {search && (
            <p className="bt-search-note">
              {t("Kết quả tìm kiếm cho: {{query}}", { query: search })}{" "}
              <Button type="link" onClick={() => update({ search: "" })}>
                {t("Xóa tìm kiếm")}
              </Button>
            </p>
          )}
        </header>

        <div className="bt-toolbar">
          <div
            className="bt-tabs"
            ref={tabsRef}
            role="group"
            aria-label={t("Danh mục")}
            style={{
              "--ind-left": indicator.left + "px",
              "--ind-width": indicator.width + "px",
            }}
          >
            {categoryOptions.map((c) => (
              <button
                type="button"
                key={c || "all"}
                aria-pressed={category === c}
                onClick={() => update({ category: c })}
              >
                {c ? t(c) : t("Tất cả")}
                <sup>
                  {c
                    ? categoryProducts.filter((p) => p.category === c).length
                    : categoryProducts.length}
                </sup>
              </button>
            ))}
            <span className="bt-tabs-indicator" aria-hidden="true" />
          </div>
          <div className="bt-toolbar-actions">
            <Badge count={extraFilterCount} size="small" color="#6b4a8a">
              <Button
                icon={<SlidersOutlined />}
                aria-expanded={moreOpen}
                aria-controls="bt-more-filters"
                onClick={() => setMoreOpen((v) => !v)}
              >
                {t("Bộ lọc")}
              </Button>
            </Badge>
            <Select
              aria-label={t("Sắp xếp sản phẩm")}
              value={sort}
              popupMatchSelectWidth={false}
              onChange={(v) =>
                update({
                  sort: v === catalogPreferences.defaultSort ? null : v,
                })
              }
              options={[
                { value: "popular", label: t("Nổi bật nhất") },
                { value: "low", label: t("Giá tăng dần") },
                { value: "high", label: t("Giá giảm dần") },
              ]}
            />
          </div>
        </div>

        <div
          id="bt-more-filters"
          className={"bt-more" + (moreOpen ? " is-open" : "")}
          inert={!moreOpen ? true : undefined}
        >
          <div className="bt-more-inner">
            <div className="bt-field" role="group" aria-labelledby="bt-f-price">
              <span className="bt-field-label" id="bt-f-price">
                {t("Khoảng giá")}
              </span>
              <div className="bt-price">
                <InputNumber
                  aria-label={t("Giá từ")}
                  min={0}
                  max={price[1]}
                  precision={0}
                  suffix="₫"
                  placeholder={t("Giá từ")}
                  value={params.has("min_price") ? price[0] : null}
                  onChange={(v) => update({ min_price: v }, true)}
                />
                <span aria-hidden="true">–</span>
                <InputNumber
                  aria-label={t("Giá đến")}
                  min={price[0]}
                  max={MAX_FILTER_PRICE}
                  precision={0}
                  suffix="₫"
                  placeholder={t("Không giới hạn")}
                  value={params.has("max_price") ? price[1] : null}
                  onChange={(v) => update({ max_price: v }, true)}
                />
              </div>
            </div>
            <div className="bt-field" role="group" aria-labelledby="bt-f-other">
              <span className="bt-field-label" id="bt-f-other">
                {t("Lựa chọn khác")}
              </span>
              <Checkbox
                checked={stock}
                onChange={(e) =>
                  update({ in_stock: e.target.checked ? "true" : null })
                }
              >
                {t("Còn hàng")}
              </Checkbox>
              <Checkbox
                checked={featured}
                onChange={(e) =>
                  update({ featured: e.target.checked ? "true" : null })
                }
              >
                {t("Sản phẩm nổi bật")}
              </Checkbox>
            </div>
            <Button
              type="link"
              disabled={!hasFilters}
              onClick={() =>
                update({
                  category: null,
                  min_price: null,
                  max_price: null,
                  in_stock: null,
                  featured: null,
                  sort: null,
                })
              }
            >
              {t("Xóa bộ lọc")}
            </Button>
          </div>
        </div>

        {catalogLoading ? (
          <p className="bt-state">{t("Đang tải danh sách sản phẩm…")}</p>
        ) : catalogError ? (
          <Alert
            type="error"
            showIcon
            title={t("Không thể tải danh sách sản phẩm")}
          />
        ) : list.length ? (
          <div className="product-grid bt-grid" key={category + "|" + page}>
            {list.slice((page - 1) * pageSize, page * pageSize).map((p) => (
              <ProductCard key={p.id} p={p} showFeatured={false} />
            ))}
          </div>
        ) : (
          <div className="bt-empty">
            <p>{t("Không tìm thấy sản phẩm phù hợp")}</p>
            {hasFilters && (
              <Button
                onClick={() =>
                  update({
                    category: null,
                    min_price: null,
                    max_price: null,
                    in_stock: null,
                    featured: null,
                    sort: null,
                  })
                }
              >
                {t("Xóa bộ lọc")}
              </Button>
            )}
          </div>
        )}
        <Pagination
          className="pagination"
          current={page}
          pageSize={pageSize}
          total={list.length}
          onChange={(value, size) => {
            if (size !== pageSize) {
              setCatalogPreferences({
                ...catalogPreferences,
                pageSize: size,
              });
              changePage(1);
            } else {
              changePage(value);
              document
                .getElementById("collection")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          hideOnSinglePage
          showSizeChanger={list.length > 6}
          pageSizeOptions={[6, 12, 24]}
        />
      </section>
    </>
  );
}
