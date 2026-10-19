import { useEffect, useState } from "react";
import { api } from "../services/api";
import { userError } from "../utils/userError";
import { Rate, Form, Input, Button, Empty, Pagination, App, Image } from "antd";
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
    [loadingImages, setLoadingImages] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    average_rating: 0,
    review_count: 0,
  });
  const [total, setTotal] = useState(0);
  const [refresh, setRefresh] = useState(0);
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
            images: item.images.map((image) => image.url),
          })),
        );
        setSummary(response.summary);
        setTotal(response.pagination.total);
      })
      .catch((error) => {
        if (active) message.error(t(userError(error)));
      });
    return () => {
      active = false;
    };
  }, [productId, page, refresh, message, t]);
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
    if (!s.user || loadingImages) return;
    setLoadingImages(true);
    try {
      await api.reviews.create(productId, {
        rating: values.rating,
        content: values.content.trim(),
        image_ids: images.map((image) => image.id),
      });
      setImages([]);
      form.resetFields();
      setPage(1);
      setRefresh((value) => value + 1);
    } catch (error) {
      message.error(t(userError(error)));
    } finally {
      setLoadingImages(false);
    }
  }
  return (
    <section className="panel reviews">
      <h2>{t("Đánh giá sản phẩm")}</h2>
      <div className="rating-summary">
        <strong>{average.toFixed(1)} / 5</strong>
        <Rate disabled allowHalf value={Math.round(average * 2) / 2} />
        <span>{t("{{count}} đánh giá", { count: summary.review_count })}</span>
      </div>
      {s.user ? (
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
              { required: true, message: t("Vui lòng chọn từ 1 đến 5 sao") },
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
            <Input.TextArea maxLength={1000} showCount rows={3} />
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
                      setImages((old) => old.filter((_, index) => index !== i))
                    }
                  >
                    {t("Xóa ảnh")}
                  </Button>
                </div>
              ))}
            </div>
          </Form.Item>
          <Button type="primary" htmlType="submit" disabled={loadingImages}>
            {t("Gửi đánh giá")}
          </Button>
        </Form>
      ) : (
        <p className="review-form">
          <Link
            to={"/login?next=" + encodeURIComponent("/products/" + productId)}
          >
            {t("Đăng nhập để đánh giá")}
          </Link>
        </p>
      )}
      {reviews.length ? (
        reviews.map((r) => (
          <article className="review-item" key={r.id}>
            <strong>{r.name}</strong>
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
    </section>
  );
}
