import { useShopConfig } from "../../../shared/shop/useShopConfig";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Input,
  Select,
  Checkbox,
  Slider,
  InputNumber,
  Empty,
  Pagination,
  Tag,
  Alert,
} from "antd";
import {
  LeftOutlined,
  RightOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShop } from "../../../shared/shop/useShop";
import { matchesProduct } from "../../../shared/utils/search";
import { money } from "../../../shared/utils/format";
import ProductCard from "../components/ProductCard";
export default function Catalog() {
  const { t } = useTranslation(),
    { products, categories, catalogLoading, catalogError } = useShop(),
    shopConfig = useShopConfig(),
    [params, setParams] = useSearchParams();
  const featuredRow = useRef(null);
  const featuredProducts = products.filter((product) => product.featured);
  const q = params.get("q") || "",
    search = params.get("search") || "",
    category = params.get("category") || "",
    featured = params.get("featured") === "true";
  const maxCatalogPrice = Math.max(1, ...products.map((p) => p.price)),
    [price, setPrice] = useState([0, 1]),
    [stock, setStock] = useState(false),
    [sort, setSort] = useState("popular"),
    [pageSize, setPageSize] = useState(6),
    [pageState, setPage] = useState({ query: params.toString(), value: 1 });
  useEffect(() => {
    setPrice((current) => (current[1] === 1 ? [0, maxCatalogPrice] : current));
  }, [maxCatalogPrice]);
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
        p.price >= price[0] &&
        p.price <= price[1] &&
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
  return (
    <>
      <section className="hero">
        <div>
          <Tag color="#468432">{shopConfig.name}</Tag>
          <h1>{t("Chào mừng đến với {{name}}", { name: shopConfig.name })}</h1>
          <p>
            {t("Tìm kiếm sản phẩm, lựa chọn phân loại và đặt hàng trực tuyến.")}
          </p>
        </div>
        <ShoppingOutlined className="hero-icon" />
      </section>
      {featuredProducts.length > 0 && (
        <section
          className="collection featured-products"
          aria-label={t("Sản phẩm nổi bật")}
        >
          <div className="section-heading">
            <h2>{t("Sản phẩm nổi bật")}</h2>
            <div className="featured-controls">
              <Button
                icon={<LeftOutlined />}
                aria-label={t("Sản phẩm trước")}
                onClick={() =>
                  featuredRow.current?.scrollBy({
                    left: -featuredRow.current.clientWidth,
                    behavior: "smooth",
                  })
                }
              />
              <Button
                icon={<RightOutlined />}
                aria-label={t("Sản phẩm tiếp theo")}
                onClick={() =>
                  featuredRow.current?.scrollBy({
                    left: featuredRow.current.clientWidth,
                    behavior: "smooth",
                  })
                }
              />
            </div>
          </div>
          <div className="featured-product-row" ref={featuredRow}>
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} p={product} />
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
            {["", ...categories.map((item) => item.name)].map((c) => (
              <button
                className={category === c ? "category selected" : "category"}
                key={c || "all"}
                onClick={() => update("category", c)}
              >
                <span>{c ? t(c) : t("Tất cả")}</span>
                <span>
                  {c
                    ? (categories.find((item) => item.name === c)
                        ?.product_count ?? 0)
                    : products.length}
                </span>
              </button>
            ))}
            <hr />
            <h3>{t("Khoảng giá")}</h3>
            <Slider
              range
              aria-label={t("Khoảng giá")}
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
              {money(price[0])}
              <span>{money(price[1])}</span>
            </p>
            <div className="price-inputs">
              <InputNumber
                aria-label={t("Giá từ")}
                min={0}
                max={price[1]}
                precision={0}
                value={price[0]}
                onChange={(v) => {
                  if (v !== null) {
                    setPrice([Math.min(v, price[1]), price[1]]);
                    changePage(1);
                  }
                }}
              />
              <span>–</span>
              <InputNumber
                aria-label={t("Giá đến")}
                min={price[0]}
                max={maxCatalogPrice}
                precision={0}
                value={price[1]}
                onChange={(v) => {
                  if (v !== null) {
                    setPrice([price[0], Math.max(v, price[0])]);
                    changePage(1);
                  }
                }}
              />
            </div>
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
                setPrice([0, maxCatalogPrice]);
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
