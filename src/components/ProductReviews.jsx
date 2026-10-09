import { shopConfig } from "../constants/shop";
import { useState } from "react";
import {
  Rate,
  Form,
  Input,
  Button,
  Empty,
  Alert,
  Pagination,
  App,
  Image,
} from "antd";
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
  async function chooseImages(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (images.length + files.length > 3) {
      message.error(t("Tối đa 3 ảnh, mỗi ảnh không quá 2 MB"));
      return;
    }
    setLoadingImages(true);
    try {
      const converted = await Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              if (
                !["image/jpeg", "image/png", "image/webp"].includes(
                  file.type,
                ) ||
                file.size > 2 * 1024 * 1024
              ) {
                reject(new Error());
                return;
              }
              const url = URL.createObjectURL(file),
                img = new window.Image();
              img.onload = () => {
                try {
                  const scale = Math.min(
                    1,
                    800 / Math.max(img.width, img.height),
                  );
                  const canvas = document.createElement("canvas");
                  canvas.width = Math.max(1, Math.round(img.width * scale));
                  canvas.height = Math.max(1, Math.round(img.height * scale));
                  const ctx = canvas.getContext("2d");
                  ctx.fillStyle = "white";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  const data = canvas.toDataURL("image/jpeg", 0.7);
                  if (data.length > 500000) reject(new Error());
                  else resolve(data);
                } catch (error) {
                  reject(error);
                } finally {
                  URL.revokeObjectURL(url);
                }
              };
              img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error());
              };
              img.src = url;
            }),
        ),
      );
      setImages((old) => [...old, ...converted]);
    } catch {
      message.error(
        t("Không đọc được ảnh. Chọn JPG, PNG hoặc WebP tối đa 2 MB."),
      );
    } finally {
      setLoadingImages(false);
    }
  }
  const reviews = s.reviews.filter((r) => r.productId === productId),
    average = reviews.length
      ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
      : 0;
  function submit(values) {
    if (!s.user || loadingImages) return;
    const review = {
      id: crypto.randomUUID(),
      productId,
      owner: s.user.email,
      name: s.user.name,
      rating: values.rating,
      content: values.content.trim(),
      images,
      createdAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(
        `${shopConfig.storagePrefix}-reviews`,
        JSON.stringify([review, ...s.reviews]),
      );
    } catch {
      message.error(t("Không đủ dung lượng lưu đánh giá. Hãy giảm số ảnh."));
      return;
    }
    s.setReviews((old) => [review, ...old]);
    setImages([]);
    form.resetFields();
    setPage(1);
    message.success(t("Đã lưu đánh giá demo"));
  }
  return (
    <section className="panel reviews">
      <h2>{t("Đánh giá sản phẩm")}</h2>
      <div className="rating-summary">
        <strong>{average.toFixed(1)} / 5</strong>
        <Rate disabled allowHalf value={Math.round(average * 2) / 2} />
        <span>{t("{{count}} đánh giá", { count: reviews.length })}</span>
      </div>
      <Alert
        type="info"
        showIcon
        title={t("Đánh giá demo chỉ lưu trên trình duyệt này")}
      />
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
              {images.map((src, i) => (
                <div key={src}>
                  <Image
                    src={src}
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
        reviews.slice((page - 1) * 5, page * 5).map((r) => (
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
        total={reviews.length}
        onChange={setPage}
        hideOnSinglePage
        showSizeChanger={false}
      />
    </section>
  );
}
