import { useShopConfig } from "../hooks/useShopConfig";
import { useSearchParams } from "react-router-dom";
import { categoryList } from "../constants/categories";
import {
  Button,
  Input,
  Select,
  Checkbox,
  Slider,
  Empty,
  Pagination,
  Tag,
} from "antd";
import { ArrowRightOutlined, ShoppingOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  categories,
  maxCatalogPrice,
  products,
} from "../services/productService";
import { matchesProduct } from "../utils/search";
import { money } from "../utils/format";
import ProductCard from "../components/ProductCard";
export default function Catalog() {
  const { t } = useTranslation(),
    shopConfig = useShopConfig(),
    [params, setParams] = useSearchParams();
  const q = params.get("q") || "",
    search = params.get("search") || "",
    category = params.get("category") || "",
    featured = params.get("featured") === "true";
  const [price, setPrice] = useState(maxCatalogPrice),
    [stock, setStock] = useState(false),
    [sort, setSort] = useState("popular"),
    [pageSize, setPageSize] = useState(6),
    [pageState, setPage] = useState({ query: params.toString(), value: 1 });
  function changePage(value) {
    setPage({ query: params.toString(), value });
  }
  function update(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setPage({ query: next.toString(), value: 1 });
    setParams(next);
  }
  const list = products
    .filter(
      (p) =>
        (!category || category === "Tất cả" || p.category === category) &&
        matchesProduct(p, q) &&
        matchesProduct(p, search, true) &&
        p.price <= price &&
        (!stock || p.stock > 0) &&
        (!featured || p.featured),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : Number(b.featured || false) - Number(a.featured || false),
    );
  const page = Math.min(
    pageState.query === params.toString() ? pageState.value : 1,
    Math.max(1, Math.ceil(list.length / pageSize)),
  );
  const featuredCategories = categoryList.filter((c) => c.featured);
  function selectCategory(name) {
    const next = new URLSearchParams();
    next.set("category", name);
    setPrice(maxCatalogPrice);
    setStock(false);
    setSort("popular");
    setPage({ query: next.toString(), value: 1 });
    setParams(next);
  }
  return (
    <>
      <section className="hero">
        <div>
          <Tag color="blue">{shopConfig.name}</Tag>
          <h1>{t("Chào mừng đến với {{name}}", { name: shopConfig.name })}</h1>
          <p>
            {t("Tìm kiếm sản phẩm, lựa chọn phân loại và đặt hàng trực tuyến.")}
          </p>
        </div>
        <ShoppingOutlined className="hero-icon" />
      </section>
      {featuredCategories.length > 0 && (
        <section className="featured-categories">
          <h2>{t("Danh mục nổi bật")}</h2>
          <p>{t("Khám phá sản phẩm theo danh mục.")}</p>
          <div className="featured-categories-grid">
            {featuredCategories.map((c) => (
              <button
                type="button"
                key={c.id}
                className={
                  "featured-category-card" +
                  (category === c.name ? " is-selected" : "")
                }
                aria-pressed={category === c.name}
                onClick={() => selectCategory(c.name)}
              >
                <span>
                  <strong>{t(c.name)}</strong>
                  <small>
                    {t("{{count}} sản phẩm", {
                      count: products.filter((p) => p.category === c.name)
                        .length,
                    })}
                  </small>
                </span>
                <ArrowRightOutlined aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="collection" id="collection">
        <div className="section-heading">
          <div>
            <h2>{t("Tất cả sản phẩm")}</h2>
            {search && (
              <p>
                {t("Kết quả tìm kiếm cho: {{query}}", { query: search })}{" "}
                <Button type="link" onClick={() => update("search", "")}>
                  {t("Xóa tìm kiếm")}
                </Button>
              </p>
            )}
          </div>
        </div>
        <div className="catalog-layout">
          <aside className="filters">
            <h3>{t("Danh mục")}</h3>
            {["", ...categories].map((c) => (
              <button
                className={category === c ? "category selected" : "category"}
                key={c || "all"}
                onClick={() => update("category", c)}
              >
                <span>{c ? t(c) : t("Tất cả")}</span>
                <span>
                  {c
                    ? products.filter((p) => p.category === c).length
                    : products.length}
                </span>
              </button>
            ))}
            <hr />
            <h3>{t("Khoảng giá")}</h3>
            <Slider
              aria-label={t("Giá tối đa")}
              min={0}
              max={maxCatalogPrice}
              step={1000}
              value={price}
              onChange={(v) => {
                setPrice(v);
                changePage(1);
              }}
            />
            <p className="price-range">
              {money(0)}
              <span>{money(price)}</span>
            </p>
            <hr />
            <h3>{t("Lựa chọn khác")}</h3>
            <Checkbox
              checked={stock}
              onChange={(e) => {
                setStock(e.target.checked);
                changePage(1);
              }}
            >
              {t("Còn hàng")}
            </Checkbox>
            <br />
            <Checkbox
              checked={featured}
              onChange={(e) =>
                update("featured", e.target.checked ? "true" : "")
              }
            >
              {t("Sản phẩm nổi bật")}
            </Checkbox>
            <Button
              type="link"
              onClick={() => {
                setParams({});
                setPrice(maxCatalogPrice);
                setStock(false);
                setSort("popular");
                setPage({ query: "", value: 1 });
              }}
            >
              {t("Xóa bộ lọc")}
            </Button>
          </aside>
          <div>
            <div className="catalog-toolbar">
              <span>{t("{{count}} sản phẩm", { count: list.length })}</span>
              <Input.Search
                aria-label={t("Tìm trong danh sách sản phẩm")}
                placeholder={t("Tìm theo tên sản phẩm…")}
                value={q}
                onChange={(e) => update("q", e.target.value)}
                style={{ maxWidth: 250 }}
              />
              <Select
                aria-label={t("Sắp xếp sản phẩm")}
                value={sort}
                onChange={(v) => {
                  setSort(v);
                  changePage(1);
                }}
                options={[
                  { value: "popular", label: t("Nổi bật nhất") },
                  { value: "low", label: t("Giá tăng dần") },
                  { value: "high", label: t("Giá giảm dần") },
                ]}
              />
            </div>
            {list.length ? (
              <div className="product-grid">
                {list.slice((page - 1) * pageSize, page * pageSize).map((p) => (
                  <ProductCard key={p.id} p={p} />
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
                  setPageSize(size);
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
