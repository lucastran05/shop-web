import { useEffect, useState } from "react";
import { PictureOutlined, CloseOutlined } from "@ant-design/icons";
import { api } from "../../../shared/api";
import { userError } from "../../../shared/utils/userError";
import {
  Rate,
  Form,
  Input,
  Button,
  Empty,
  Pagination,
  App,
  Image,
  Upload,
} from "antd";
import { useTranslation } from "react-i18next";
import { useShop } from "../../../shared/shop/useShop";
import { usePreferences } from "../../../shared/preferences/usePreferences";
import { formatDateTime } from "../../../shared/utils/format";

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
    setApiEligibility(null);
    api.reviews
      .checkEligibility(productId)
      .then((res) => {
        if (active && res.data) {
          setApiEligibility(res.data);
        }
      })
      .catch(() => {
        if (active) setApiEligibility(null);
      });
    return () => {
      active = false;
    };
  }, [productId, s.user, refresh]);

  // Chỉ hiện form khi backend xác nhận đã mua và nhận hàng thành công.
  const canWriteReview = Boolean(s.user && apiEligibility?.can_review === true);

  async function handleUpload(file) {
    if (images.length >= 3) {
      message.error(t("Tối đa 3 ảnh, mỗi ảnh không quá 2 MB"));
      return Upload.LIST_IGNORE;
    }
    if (
      file.size > 2 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      message.error(t("Tối đa 3 ảnh, mỗi ảnh không quá 2 MB"));
      return Upload.LIST_IGNORE;
    }
    setLoadingImages(true);
    try {
      const { data } = await api.reviews.upload({
        files: [file],
        purpose: "review",
      });
      setImages((old) => [...old, ...data]);
    } catch (error) {
      message.error(t(userError(error)));
    } finally {
      setLoadingImages(false);
    }
    return Upload.LIST_IGNORE;
  }

  const average = summary.average_rating;

  async function submit(values) {
    if (!s.user || !canWriteReview || loadingImages || submitting) return;
    setSubmitting(true);
    try {
      await api.reviews.create(productId, {
        rating: values.rating,
        content: values.content.trim(),
        image_ids: images.map((image) => image.id),
      });
      message.success(t("Gửi đánh giá thành công! Cảm ơn bạn."));
      // Mỗi sản phẩm chỉ đánh giá một lần: ẩn form ngay, không chờ tải lại
      setApiEligibility({
        can_review: false,
        reason: "already_reviewed",
        message: "",
      });
      setImages([]);
      form.resetFields();
      setPage(1);
      setRefresh((value) => value + 1);
    } catch (error) {
      const reason = error?.payload?.reason;
      if (
        ["already_reviewed", "not_purchased", "not_delivered"].includes(reason)
      )
        setApiEligibility({
          can_review: false,
          reason,
          message: error.message,
        });
      message.error(error.message || t(userError(error)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel reviews" id="reviews">
      <h2>{t("Đánh giá sản phẩm")}</h2>
      <div className="rating-summary">
        <strong>
          {average.toFixed(1)} <small>/ 5</small>
        </strong>
        <Rate disabled allowHalf value={Math.round(average * 2) / 2} />
        <span>{t("{{count}} đánh giá", { count: summary.review_count })}</span>
      </div>

      {/* Khu vực viết đánh giá: chỉ khách hàng đã mua và nhận hàng thành công mới viết được */}
      <div className="review-action-area" style={{ marginBottom: 24 }}>
        {!s.user ? (
          <></>
        ) : canWriteReview ? (
          <div className="review-form-wrapper">
            <Form
              form={form}
              layout="vertical"
              onFinish={submit}
              className="review-form"
            >
              <Form.Item
                name="rating"
                className="review-rating-field"
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
                  rows={3}
                  placeholder={t("Chia sẻ cảm nhận của bạn về sản phẩm...")}
                />
              </Form.Item>
              <div className="review-images">
                {images.map((image, i) => (
                  <div key={image.id}>
                    <Image
                      src={image.url}
                      width={64}
                      height={64}
                      alt={t("Ảnh đánh giá")}
                    />
                    <Button
                      danger
                      type="text"
                      size="small"
                      shape="circle"
                      icon={<CloseOutlined />}
                      aria-label={t("Xóa ảnh")}
                      onClick={() =>
                        setImages((old) =>
                          old.filter((_, index) => index !== i),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="review-form-footer">
                <div className="review-upload-area">
                  <Upload
                    accept="image/jpeg,image/png,image/webp"
                    showUploadList={false}
                    beforeUpload={handleUpload}
                    disabled={loadingImages || images.length >= 3}
                  >
                    <Button
                      icon={<PictureOutlined aria-hidden="true" />}
                      aria-label={t("Thêm ảnh")}
                      loading={loadingImages}
                      disabled={images.length >= 3}
                    >
                      {t("Thêm ảnh")}
                    </Button>
                  </Upload>
                  <small>{t("Tối đa 3 ảnh, mỗi ảnh không quá 2 MB")}</small>
                </div>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting || loadingImages}
                  disabled={loadingImages}
                >
                  {t("Gửi đánh giá")}
                </Button>
              </div>
            </Form>
          </div>
        ) : apiEligibility ? (
          <ReviewNotice reason={apiEligibility.reason} />
        ) : null}
      </div>

      {/* Danh sách đánh giá của những người khác (luôn hiển thị khi xem sản phẩm) */}
      <div className="reviews-list">
        {reviews.length ? (
          reviews.map((r) => (
            <article className="review-item" key={r.id}>
              <div className="review-author-line">
                <strong>{r.name}</strong>
                {s.user &&
                  (r.id === apiEligibility?.review_id ||
                    r.author?.id === s.user.id) && (
                    <span className="review-mine">{t("Đánh giá của bạn")}</span>
                  )}
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

// Lý do chưa viết được đánh giá, theo kết quả kiểm tra của backend
function ReviewNotice({ reason }) {
  const { t } = useTranslation();
  const text = {
    already_reviewed: t(
      "Bạn đã đánh giá sản phẩm này. Mỗi sản phẩm chỉ được đánh giá một lần.",
    ),
    not_delivered: t(
      "Đơn hàng của bạn đang được xử lý. Bạn có thể đánh giá sau khi nhận hàng.",
    ),
    not_purchased: t(
      "Chỉ khách đã mua và nhận hàng mới viết được đánh giá cho sản phẩm này.",
    ),
  }[reason];
  if (!text) return null;
  return (
    <p className={"review-notice is-" + reason} role="status">
      {text}
    </p>
  );
}
