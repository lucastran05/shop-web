import { useShopConfig } from "../../../shared/shop/useShopConfig";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Select,
  Checkbox,
  InputNumber,
  Empty,
  Pagination,
  Alert,
  Divider,
} from "antd";
import { ArrowRightOutlined, FilterOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShop } from "../../../shared/shop/useShop";
import {
  getCatalogFilters,
  filterCatalogProducts,
  MAX_FILTER_PRICE,
} from "../../../shared/utils/search";
import ProductCard from "../components/ProductCard";
import FeaturedProducts from "../components/FeaturedProducts";
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
  const page = Math.min(
    pageState.query === params.toString() ? pageState.value : 1,
    Math.max(1, Math.ceil(list.length / pageSize)),
  );
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="hero-brand">{shopConfig.name}</span>
          <h1>{t("Khám phá lựa chọn dành cho bạn")}</h1>
          <p>
            {t("Tìm kiếm sản phẩm, lựa chọn phân loại và đặt hàng trực tuyến.")}
          </p>
          <Button type="primary" size="large" href="#collection">
            {t("Khám phá sản phẩm")}
            <ArrowRightOutlined />
          </Button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <img src="/logo/logo.svg" alt="" width="812" height="729" />
        </div>
      </section>
      <FeaturedProducts />
      <section className="collection" id="collection">
        <div className="section-heading">
          <div>
            <h2>{t("Tất cả sản phẩm")}</h2>
            {search && (
              <p>
                {t("Kết quả tìm kiếm cho: {{query}}", { query: search })}{" "}
                <Button type="link" onClick={() => update({ search: "" })}>
                  {t("Xóa tìm kiếm")}
                </Button>
              </p>
            )}
          </div>
        </div>
        <div className="catalog-layout">
          <aside className="filters">
            <div className="filter-heading">
              <h3>
                <FilterOutlined aria-hidden="true" /> {t("Bộ lọc")}
              </h3>
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
            <h3>{t("Danh mục")}</h3>
            {["", ...categories.map((item) => item.name)].map((c) => (
              <button
                className={category === c ? "category selected" : "category"}
                key={c || "all"}
                aria-pressed={category === c}
                onClick={() => update({ category: c })}
              >
                <span>{c ? t(c) : t("Tất cả")}</span>
                <span>
                  {c
                    ? categoryProducts.filter((p) => p.category === c).length
                    : categoryProducts.length}
                </span>
              </button>
            ))}
            <Divider style={{ margin: "22px 0" }} />
            <h3>{t("Khoảng giá")}</h3>
            <div className="price-inputs">
              <label>
                <span>{t("Giá từ")}</span>
                <InputNumber
                  aria-label={t("Giá từ")}
                  min={0}
                  max={price[1]}
                  precision={0}
                  addonAfter="₫"
                  placeholder="0"
                  value={params.has("min_price") ? price[0] : null}
                  onChange={(v) => {
                    update({ min_price: v }, true);
                  }}
                />
              </label>
              <label>
                <span>{t("Giá đến")}</span>
                <InputNumber
                  aria-label={t("Giá đến")}
                  min={price[0]}
                  max={MAX_FILTER_PRICE}
                  precision={0}
                  addonAfter="₫"
                  placeholder={t("Không giới hạn")}
                  value={params.has("max_price") ? price[1] : null}
                  onChange={(v) => {
                    update({ max_price: v }, true);
                  }}
                />
              </label>
            </div>
            <Divider style={{ margin: "22px 0" }} />
            <h3>{t("Lựa chọn khác")}</h3>
            <Checkbox
              checked={stock}
              onChange={(e) =>
                update({ in_stock: e.target.checked ? "true" : null })
              }
            >
              {t("Còn hàng")}
            </Checkbox>
            <br />
            <Checkbox
              checked={featured}
              onChange={(e) =>
                update({ featured: e.target.checked ? "true" : null })
              }
            >
              {t("Sản phẩm nổi bật")}
            </Checkbox>
          </aside>
          <div>
            <div className="catalog-toolbar">
              <span>{t("{{count}} sản phẩm", { count: list.length })}</span>
              <Select
                aria-label={t("Sắp xếp sản phẩm")}
                value={sort}
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
            {catalogLoading ? (
              <p>{t("Đang tải danh sách sản phẩm…")}</p>
            ) : catalogError ? (
              <Alert
                type="error"
                showIcon
                message={t("Không thể tải danh sách sản phẩm")}
              />
            ) : list.length ? (
              <div className="product-grid">
                {list.slice((page - 1) * pageSize, page * pageSize).map((p) => (
                  <ProductCard key={p.id} p={p} showFeatured={false} />
                ))}
              </div>
            ) : (
              <Empty description={t("Không tìm thấy sản phẩm phù hợp")} />
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
                } else changePage(value);
              }}
              hideOnSinglePage
              showSizeChanger={list.length > 6}
              pageSizeOptions={[6, 12, 24]}
            />
          </div>
        </div>
      </section>
    </>
  );
}
