import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Spin } from "antd";
import { LeftOutlined, RightOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { api } from "../../../shared/api";
import { mapProductSummary } from "../../../shared/adapters/productAdapter";
import {
  shouldLoadFeatured,
  appendFeaturedProducts,
} from "../../../shared/utils/featuredProducts";
import { userError } from "../../../shared/utils/userError";
import { useShop } from "../../../shared/shop/useShop";
import ProductCard from "./ProductCard";

export default function FeaturedProducts() {
  const { t } = useTranslation();
  const { user } = useShop();
  const rowRef = useRef(null);
  const pending = useRef(true);
  const nextScroll = useRef(null);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [position, setPosition] = useState({ start: true, end: true });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api.products
      .featured(page, { signal: controller.signal })
      .then((response) => {
        if (!active) return;
        setProducts((old) =>
          appendFeaturedProducts(old, response.data.map(mapProductSummary)),
        );
        setHasMore(
          response.data.length > 0 && page < response.pagination.total_pages,
        );
        setError(null);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) {
          pending.current = false;
          setLoading(false);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [page, attempt]);

  const syncPosition = useCallback(() => {
    const row = rowRef.current;
    if (row)
      setPosition({
        start: row.scrollLeft <= 1,
        end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 1,
      });
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    syncPosition();
    const observer = new ResizeObserver(syncPosition);
    observer.observe(row);
    return () => observer.disconnect();
  }, [products.length, syncPosition]);

  useEffect(() => {
    if (loading || nextScroll.current === null || !rowRef.current) return;
    rowRef.current.scrollTo({ left: nextScroll.current, behavior: "smooth" });
    nextScroll.current = null;
  }, [loading]);

  function retry() {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setAttempt((value) => value + 1);
  }

  function next() {
    const row = rowRef.current;
    if (!row || pending.current) return;
    const target = row.scrollLeft + row.clientWidth;
    if (error) {
      nextScroll.current = target;
      retry();
    } else if (
      hasMore &&
      shouldLoadFeatured(row, row.firstElementChild?.clientWidth || 0)
    ) {
      pending.current = true;
      nextScroll.current = target;
      setLoading(true);
      setPage((value) => value + 1);
    } else {
      row.scrollTo({ left: target, behavior: "smooth" });
    }
  }

  const visibleProducts = products.filter(
    (p) => p.visibility !== "hidden" && (p.visibility !== "private" || user),
  );

  if (!loading && !error && !visibleProducts.length) return null;
  return (
    <section
      className="collection featured-products"
      aria-label={t("Sản phẩm nổi bật")}
    >
      <div className="section-heading">
        <h2>{t("Sản phẩm nổi bật")}</h2>
      </div>
      {visibleProducts.length > 0 ? (
        <div className="featured-carousel" aria-busy={loading}>
          <Button
            className="featured-arrow"
            shape="circle"
            icon={<LeftOutlined />}
            aria-label={t("Sản phẩm trước")}
            disabled={position.start}
            onClick={() =>
              rowRef.current?.scrollBy({
                left: -rowRef.current.clientWidth,
                behavior: "smooth",
              })
            }
          />
          <div
            className="featured-product-row"
            ref={rowRef}
            onScroll={syncPosition}
          >
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} p={product} />
            ))}
          </div>
          <Button
            className="featured-arrow"
            shape="circle"
            icon={<RightOutlined />}
            aria-label={t("Sản phẩm tiếp theo")}
            loading={loading}
            disabled={!hasMore && position.end && !error}
            onClick={next}
          />
        </div>
      ) : loading ? (
        <div className="featured-loading" role="status">
          <Spin />
          <p>{t("Đang tải…")}</p>
        </div>
      ) : null}
      {error && !loading && (
        <Alert
          type="warning"
          showIcon
          title={t(userError(error))}
          action={
            <Button icon={<ReloadOutlined />} onClick={retry}>
              {t("Thử lại")}
            </Button>
          }
        />
      )}
    </section>
  );
}
