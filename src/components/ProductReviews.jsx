import { useState } from "react";
import { Rate, Form, Input, Button, Empty, Alert, Pagination, App } from "antd";
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
    [page, setPage] = useState(1);
  const reviews = s.reviews.filter((r) => r.productId === productId),
    average = reviews.length
      ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
      : 0;
  function submit(values) {
    if (!s.user) return;
    const review = {
      id: crypto.randomUUID(),
      productId,
      owner: s.user.email,
      name: s.user.name,
      rating: values.rating,
      content: values.content.trim(),
      createdAt: new Date().toISOString(),
    };
    s.setReviews((old) => [review, ...old]);
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
          <Button type="primary" htmlType="submit">
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
