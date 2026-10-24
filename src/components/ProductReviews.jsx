import { useEffect, useState, useMemo } from "react";
import { api } from "../services/api";
import { userError } from "../utils/userError";
import { Rate, Form, Input, Button, Empty, Pagination, App, Image, Alert, Tag } from "antd";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useShop } from "../hooks/useShop";
import { usePreferences } from "../hooks/usePreferences";
import { formatDateTime } from "../utils/format";

export default function ProductReviews({ productId }) {
  const { t } = useTranslation(),
    s = useShop(),
    { timeZone } = usePreferences(),
    { message } = App.useApp(),
    [form] = Form.useForm(),
    [page, setPage] = useState(1),
    [images, setImages] = useState([]),
    [loadingImages, setLoadingImages] = useState(false),
    [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    average_rating: 0,
    review_count: 0,
  });
  const [total, setTotal] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [apiEligibility, setApiEligibility] = useState(null);

  // Lấy danh sách đánh giá của sản phẩm (công khai cho tất cả mọi người)
  useEffect(() => {
    let active = true;
    setReviews([]);
    setSummary({ average_rating: 0, review_count: 0 });
    setTotal(0);
    api.reviews
      .list(productId, { page, limit: 5 })
      .then((response) => {
        if (!active) return;
        setReviews(
          response.data.map((item) => ({
            ...item,
            name: item.author?.name || "",
            createdAt: item.created_at,
            images: (item.images || []).map((image) => image.url),
          })),
        );
        setSummary(response.summary);
        setTotal(response.pagination.total);
        if (response.user_eligibility) {
          setApiEligibility(response.user_eligibility);
        }
      })
      .catch((error) => {
        if (active) message.error(t(userError(error)));
      });
    return () => {
      active = false;
    };
  }, [productId, page, refresh, message, t]);

  // Kiểm tra quyền đánh giá riêng qua API nếu đã đăng nhập và chưa có user_eligibility
  useEffect(() => {
    let active = true;
    if (!s.user) {
      setApiEligibility(null);
      return;
    }
    api.reviews
      .checkEligibility(productId)
      .then((res) => {
        if (active && res.data) {
          setApiEligibility(res.data);
        }
      })
      .catch(() => {
        // Nếu API lỗi, fallback vào danh sách đơn hàng s.orders
      });
    return () => {
      active = false;
    };
  }, [productId, s.user, refresh]);

  // Kiểm tra lịch sử đơn hàng của người dùng trong hệ thống
  const { hasPurchased, hasCompletedOrder, hasInTransitOrder } = useMemo(() => {
    if (!s.user || !s.orders || !s.orders.length) {
      return { hasPurchased: false, hasCompletedOrder: false, hasInTransitOrder: false };
    }
    const userOrdersForProduct = s.orders.filter((o) =>
      o.items?.some((item) => String(item.id) === String(productId))
    );

    const completed = userOrdersForProduct.some((o) =>
      ["completed", "delivered", "Đã hoàn thành", "Giao thành công"].includes(
        o.statusCode || o.status
      )
    );

    const inTransit = userOrdersForProduct.some((o) =>
      [
        "pending",
        "confirmed",
        "processing",
        "shipping",
        "shipped",
        "Chờ xác nhận",
        "Đã xác nhận",
        "Đã cọc",
        "Đang chuẩn bị hàng",
        "Đã đóng gói",
        "Đang giao hàng",
      ].includes(o.statusCode || o.status)
    );

    return {
      hasPurchased: userOrdersForProduct.length > 0,
      hasCompletedOrder: completed,
      hasInTransitOrder: inTransit,
    };
  }, [s.user, s.orders, productId]);

  // Khách hàng đủ điều kiện viết đánh giá:
  // API xác nhận can_review = true, HOẶC đã có đơn hàng ở trạng thái hoàn thành / nhận hàng thành công
  const canWriteReview = Boolean(
    s.user && (apiEligibility?.can_review || hasCompletedOrder)
  );

  async function chooseImages(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (images.length + files.length > 3) {
      message.error(t("Tối đa 3 ảnh, mỗi ảnh không quá 2 MB"));
      return;
    }
    setLoadingImages(true);
    try {
      const { data } = await api.reviews.upload({ files, purpose: "review" });
      setImages((old) => [...old, ...data]);
    } catch (error) {
      message.error(t(userError(error)));
    } finally {
      setLoadingImages(false);
    }
  }

  const average = summary.average_rating;

  async function submit(values) {
    if (!s.user || loadingImages || submitting) return;
    setSubmitting(true);
    try {
      await api.reviews.create(productId, {
        rating: values.rating,
        content: values.content.trim(),
        image_ids: images.map((image) => image.id),
      });
      message.success(t("Gửi đánh giá thành công! Cảm ơn bạn."));
      setImages([]);
      form.resetFields();
      setPage(1);
      setRefresh((value) => value + 1);
    } catch (error) {
      message.error(error.message || t(userError(error)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel reviews" id="reviews">
      <h2>{t("Đánh giá sản phẩm")}</h2>
      <div className="rating-summary">
        <strong>{average.toFixed(1)} / 5</strong>
        <Rate disabled allowHalf value={Math.round(average * 2) / 2} />
        <span>{t("{{count}} đánh giá", { count: summary.review_count })}</span>
      </div>

      {/* Khu vực viết đánh giá: chỉ khách hàng đã mua và nhận hàng thành công mới viết được */}
      <div className="review-action-area" style={{ marginBottom: 24 }}>
        {!s.user ? (
          <div className="review-permission-box not-logged-in">
            <Alert
              type="info"
              showIcon
              message={t("Đánh giá sản phẩm")}
              description={
                <span>
                  <Link
                    to={
                      "/login?next=" +
                      encodeURIComponent("/products/" + productId)
                    }
                  >
                    {t("Đăng nhập để đánh giá")}
                  </Link>
                  {" — "}
                  {t(
                    "Chỉ khách hàng đã mua và nhận hàng thành công mới có thể gửi nhận xét."
                  )}
                </span>
              }
            />
          </div>
        ) : canWriteReview ? (
          <div className="review-form-wrapper">
            <div style={{ marginBottom: 16 }}>
              <Tag color="success">
                ✓ {t("Bạn đã mua và nhận hàng thành công sản phẩm này")}
              </Tag>
            </div>
            <Form
              form={form}
              layout="vertical"
              onFinish={submit}
              className="review-form"
            >
              <Form.Item
                name="rating"
                label={t("Số sao")}
                rules={[
                  {
                    required: true,
                    message: t("Vui lòng chọn từ 1 đến 5 sao"),
                  },
                  {
                    type: "number",
                    min: 1,
                    max: 5,
                    message: t("Vui lòng chọn từ 1 đến 5 sao"),
                  },
                ]}
              >
                <Rate aria-label={t("Số sao")} />
              </Form.Item>
              <Form.Item
                name="content"
                label={t("Nhận xét")}
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: t("Vui lòng nhập nhận xét"),
                  },
                ]}
              >
                <Input.TextArea
                  maxLength={1000}
                  showCount
                  rows={3}
                  placeholder={t("Chia sẻ cảm nhận của bạn về sản phẩm...")}
                />
              </Form.Item>
              <Form.Item label={t("Ảnh đánh giá (không bắt buộc)")}>
                <input
                  type="file"
                  aria-label={t("Ảnh đánh giá (không bắt buộc)")}
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={loadingImages || images.length >= 3}
                  onChange={chooseImages}
                />
                <p>{t("Tối đa 3 ảnh, mỗi ảnh không quá 2 MB")}</p>
                <div className="review-images">
                  {images.map((image, i) => (
                    <div key={image.id}>
                      <Image
                        src={image.url}
                        width={80}
                        height={80}
                        alt={t("Ảnh đánh giá")}
                      />
                      <Button
                        danger
                        type="link"
                        onClick={() =>
                          setImages((old) =>
                            old.filter((_, index) => index !== i)
                          )
                        }
                      >
                        {t("Xóa ảnh")}
                      </Button>
                    </div>
                  ))}
                </div>
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting || loadingImages}
                disabled={loadingImages}
              >
                {t("Gửi đánh giá")}
              </Button>
            </Form>
          </div>
        ) : ((hasPurchased && hasInTransitOrder) || apiEligibility?.reason === "not_delivered") ? (
          <div className="review-permission-box pending-delivery">
            <Alert
              type="info"
              showIcon
              message={t("Chưa thể đánh giá sản phẩm")}
              description={
                <div>
                  <p style={{ margin: "4px 0 8px" }}>
                    {t(
                      "Đơn hàng của bạn đang được giao hoặc xử lý. Bạn chỉ có thể đánh giá sau khi đã nhận hàng thành công."
                    )}
                  </p>
                  <Link to="/orders">{t("Kiểm tra đơn hàng của bạn")}</Link>
                </div>
              }
            />
          </div>
        ) : (
          <div className="review-permission-box not-purchased">
            <Alert
              type="warning"
              showIcon
              message={t("Chưa thể đánh giá sản phẩm")}
              description={t(
                "Chỉ những khách hàng đã mua sản phẩm này và nhận hàng thành công mới có thể gửi đánh giá."
              )}
            />
          </div>
        )}
      </div>

      {/* Danh sách đánh giá của những người khác (luôn hiển thị khi xem sản phẩm) */}
      <div className="reviews-list">
        <h3>{t("Đánh giá từ khách hàng")}</h3>
        {reviews.length ? (
          reviews.map((r) => (
            <article className="review-item" key={r.id}>
              <div className="review-author-line">
                <strong>{r.name}</strong>
                <Tag color="cyan" style={{ marginLeft: 8 }}>
                  ✓ {t("Đã mua hàng")}
                </Tag>
              </div>
              <Rate disabled value={r.rating} />
              <time dateTime={r.createdAt}>
                {formatDateTime(r.createdAt, timeZone)}
              </time>
              <p>{r.content}</p>
              <Image.PreviewGroup>
                <div className="review-images">
                  {(r.images || []).map((src, i) => (
                    <Image
                      key={i}
                      src={src}
                      width={100}
                      height={100}
                      alt={t("Ảnh đánh giá")}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            </article>
          ))
        ) : (
          <Empty description={t("Chưa có đánh giá")} />
        )}
        <Pagination
          current={page}
          pageSize={5}
          total={total}
          onChange={setPage}
          hideOnSinglePage
          showSizeChanger={false}
        />
      </div>
    </section>
  );
}
