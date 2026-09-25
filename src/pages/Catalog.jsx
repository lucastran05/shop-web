import { shopConfig } from "../constants/shop";
import { useSearchParams } from "react-router-dom";
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
import {
  categories,
  maxCatalogPrice,
  products,
} from "../services/productService";
import { money } from "../utils/format";
import ProductCard from "../components/ProductCard";
export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "",
    category = params.get("category") || "Tất cả",
    featured = params.get("featured") === "true";
  const [price, setPrice] = useState(maxCatalogPrice),
    [stock, setStock] = useState(false),
    [sort, setSort] = useState("popular"),
    [pageState, setPage] = useState({ query: params.toString(), value: 1 });
  const page = pageState.query === params.toString() ? pageState.value : 1;
  function changePage(value) {
    setPage({ query: params.toString(), value });
  }
  function update(key, value) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setParams(next);
    changePage(1);
  }
  const list = products
    .filter(
      (p) =>
        (category === "Tất cả" || p.category === category) &&
        p.name.toLocaleLowerCase("vi").includes(q.toLocaleLowerCase("vi")) &&
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
  return (
    <>
      <section className="hero">
        <div>
          <Tag color="blue">{shopConfig.name}</Tag>
          <h1>Chào mừng đến với {shopConfig.name}</h1>
          <p>Tìm kiếm sản phẩm, lựa chọn phân loại và đặt hàng trực tuyến.</p>
          <Button type="primary" size="large" href="#collection">
            Xem sản phẩm <ArrowRightOutlined />
          </Button>
        </div>
        <ShoppingOutlined className="hero-icon" />
      </section>
      <section className="collection" id="collection">
        <div className="section-heading">
          <div>
            <h2>Tất cả sản phẩm</h2>
            <p>Lựa chọn sản phẩm phù hợp với nhu cầu của bạn.</p>
          </div>
        </div>
        <div className="catalog-layout">
          <aside className="filters">
            <h3>Danh mục</h3>
            {["Tất cả", ...categories].map((c) => (
              <button
                className={category === c ? "category selected" : "category"}
                key={c}
                onClick={() => update("category", c)}
              >
                <span>{c}</span>
                <span>
                  {c === "Tất cả"
                    ? products.length
                    : products.filter((p) => p.category === c).length}
                </span>
              </button>
            ))}
            <hr />
            <h3>Khoảng giá</h3>
            <Slider
              aria-label="Giá tối đa"
              min={0}
              max={maxCatalogPrice}
              step={10000}
              value={price}
              onChange={(v) => {
                setPrice(v);
                changePage(1);
              }}
            />
            <p className="price-range">
              0đ <span>{money(price)}</span>
            </p>
            <hr />
            <h3>Lựa chọn khác</h3>
            <Checkbox
              checked={stock}
              onChange={(e) => {
                setStock(e.target.checked);
                changePage(1);
              }}
            >
              Còn hàng
            </Checkbox>
            <br />
            <Checkbox
              checked={featured}
              onChange={(e) =>
                update("featured", e.target.checked ? "true" : "")
              }
            >
              Sản phẩm nổi bật
            </Checkbox>
            <Button
              type="link"
              onClick={() => {
                setParams({});
                setPrice(maxCatalogPrice);
                setStock(false);
                setSort("popular");
                changePage(1);
              }}
            >
              Xóa bộ lọc
            </Button>
          </aside>
          <div>
            <div className="catalog-toolbar">
              <span>
                <b>{list.length}</b> sản phẩm
              </span>
              <Input.Search
                aria-label="Tìm trong danh sách sản phẩm"
                placeholder="Tìm sản phẩm…"
                value={q}
                onChange={(e) => update("q", e.target.value)}
                style={{ maxWidth: 250 }}
              />
              <Select
                aria-label="Sắp xếp sản phẩm"
                value={sort}
                onChange={setSort}
                options={[
                  { value: "popular", label: "Nổi bật nhất" },
                  { value: "low", label: "Giá tăng dần" },
                  { value: "high", label: "Giá giảm dần" },
                ]}
              />
            </div>
            {list.length ? (
              <div className="product-grid">
                {list.slice((page - 1) * 6, page * 6).map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <Empty description="Không tìm thấy sản phẩm phù hợp" />
            )}
            <Pagination
              className="pagination"
              current={page}
              pageSize={6}
              total={list.length}
              onChange={changePage}
              hideOnSinglePage
            />
          </div>
        </div>
      </section>
    </>
  );
}
