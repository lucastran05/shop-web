import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Alert, App, Button, Slider } from "antd";
import { CloseOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { api } from "../../../shared/api";
import { useShop } from "../../../shared/shop/useShop";
import { loadBouquetFlowers } from "../../../shared/utils/bouquetFlowers.js";
import { money } from "../../../shared/utils/format";
import { userError } from "../../../shared/utils/userError";
import QtyStepper from "../components/QtyStepper";
import { flyToCart } from "../components/flyToCart";
import { drawBouquet, loadStemImage } from "../components/bouquetCanvas";
import "./CustomBouquetPage.css";

const MAX_STEMS = 200;
const DRAFT_KEY = "bloomora-custom-bouquet";
const DEFAULT_STYLE = { wrap: "kraft", height: "medium" };
const DEFAULT_LENGTH = 50;
const SWATCHES = {
  Đỏ: "#b81f36",
  Hồng: "#e98aa9",
  "Hồng phấn": "#f5c6d3",
  Trắng: "#f7f4ec",
  Vàng: "#f1bf2c",
  Cam: "#ec8a3a",
  Tím: "#8a69c0",
  "Xanh dương": "#6f9fd8",
};

const keyOf = (productId, variantId) => `${productId}|${variantId}`;

// Bản nháp giữ lựa chọn của từng loại hoa ({stems, length}) và kiểu gói.
// Bản nháp cũ chỉ lưu số cành nên đọc được cả dạng đó.
function readDraft() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY)) || {};
    const saved = draft.picks || draft.counts || draft;
    const picks = {};
    for (const [key, value] of Object.entries(saved)) {
      const stems = typeof value === "number" ? value : value?.stems;
      if (stems > 0)
        picks[key] = { stems, length: value?.length || DEFAULT_LENGTH };
    }
    return { picks, style: { ...DEFAULT_STYLE, ...(draft.style || {}) } };
  } catch {
    return { picks: {}, style: DEFAULT_STYLE };
  }
}

async function loadOptions() {
  const { data } = await api.cart.bouquetOptions();
  return data;
}


function PhotoCredit({ photo }) {
  const { t } = useTranslation();
  if (!photo?.photographer) return null;
  return (
    <small className="bt-bq-credit">
      {t("Ảnh")}:{" "}
      <a href={photo.photographer_url} target="_blank" rel="noreferrer">
        {photo.photographer}
      </a>{" "}
      /{" "}
      <a href={photo.pexels_url} target="_blank" rel="noreferrer">
        Pexels
      </a>
    </small>
  );
}

function FlowerCard({ flower, picks, canAdd, onChange }) {
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState(
    () => (flower.options.find((o) => o.stock > 0) || flower.options[0])?.key,
  );
  const option =
    flower.options.find((o) => o.key === activeKey) || flower.options[0];
  const count = picks[option.key]?.stems || 0;
  const label = `${flower.name} ${t(option.color)}`.trim();

  return (
    <article className="bt-bq-card">
      <figure className="bt-bq-card-photo">
        <img src={option.thumb} alt={label} crossOrigin="anonymous" />
      </figure>
      <div className="bt-bq-card-body">
        <h2>{flower.name}</h2>
        {flower.description && (
          <p className="bt-bq-desc">{flower.description}</p>
        )}
        <div className="bt-bq-swatches" role="group" aria-label={t("Màu hoa")}>
          {flower.options.map((o) => (
            <button
              type="button"
              key={o.key}
              aria-pressed={o.key === option.key}
              title={t(o.color)}
              disabled={o.stock < 1}
              onClick={() => setActiveKey(o.key)}
            >
              <span style={{ background: SWATCHES[o.color] || "#cfd5c3" }} />
              {t(o.color)}
              {picks[o.key]?.stems > 0 && <b>{picks[o.key].stems}</b>}
            </button>
          ))}
        </div>
        <p className="bt-bq-price">
          {t("{{price}} / cành", { price: money(option.price) })}
          <small>
            {option.stock > 0
              ? t("Còn {{count}} cành", { count: option.stock })
              : t("Hết hàng")}
          </small>
        </p>
        <div className="bt-bq-actions">
          {count > 0 ? (
            <>
              <QtyStepper
                size="small"
                label={t("Số cành {{name}}", { name: label })}
                value={count}
                min={1}
                max={Math.min(option.stock, count + canAdd)}
                onChange={(value) => onChange(option.key, value)}
              />
              <button
                type="button"
                className="bt-bq-icon"
                aria-label={t("Bỏ {{name}} khỏi bó", { name: label })}
                onClick={() => onChange(option.key, 0)}
              >
                <DeleteOutlined />
              </button>
            </>
          ) : (
            <Button
              icon={<PlusOutlined />}
              disabled={option.stock < 1 || canAdd < 1}
              onClick={() => onChange(option.key, 1)}
            >
              {t("Thêm vào bó")}
            </Button>
          )}
        </div>
        <PhotoCredit photo={option.photo} />
      </div>
    </article>
  );
}

export default function CustomBouquetPage() {
  const { t } = useTranslation();
  const { user, addBouquet } = useShop();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [catalog, setCatalog] = useState({
    loading: true,
    error: null,
    flowers: [],
  });
  const [attempt, setAttempt] = useState(0);
  const [picks, setPicks] = useState(() => readDraft().picks);
  const [options, setOptions] = useState({
    wraps: [],
    heights: [],
    stem_length: { min: 40, max: 70, step: 5, default: 50 },
  });
  const [style, setStyle] = useState(() => readDraft().style);
  const [images, setImages] = useState(() => new Map());
  const [adding, setAdding] = useState(false);
  const canvasRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    let active = true;
    loadOptions()
      .then((data) => active && setOptions(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadBouquetFlowers(api.products)
      .then(
        (flowers) =>
          active && setCatalog({ loading: false, error: null, flowers }),
      )
      .catch(
        (error) => active && setCatalog({ loading: false, error, flowers: [] }),
      );
    return () => {
      active = false;
    };
  }, [attempt]);

  const selection = useMemo(
    () =>
      catalog.flowers
        .flatMap((flower) => flower.options)
        .map((option) => ({
          ...option,
          stems: Math.min(picks[option.key]?.stems || 0, option.stock),
          stem_length: picks[option.key]?.length || DEFAULT_LENGTH,
        }))
        .filter((option) => option.stems > 0),
    [catalog.flowers, picks],
  );
  const totalStems = selection.reduce((sum, item) => sum + item.stems, 0);
  const flowersPrice = selection.reduce(
    (sum, item) => sum + item.stems * item.price,
    0,
  );
  const wrap = options.wraps.find((item) => item.id === style.wrap);
  const height = options.heights.find((item) => item.id === style.height);
  const subtotal = flowersPrice + (wrap?.price || 0);
  const missing = selection.filter(
    (item) => !item.stemImage || images.get(item.stemImage) === null,
  );

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ picks, style }));
    } catch {
      /* bỏ qua khi trình duyệt chặn storage */
    }
  }, [picks, style]);

  useEffect(() => {
    let active = true;
    for (const url of new Set(selection.map((item) => item.stemImage))) {
      if (!url || images.has(url)) continue;
      loadStemImage(url).then((image) => {
        if (active) setImages((old) => new Map(old).set(url, image));
      });
    }
    return () => {
      active = false;
    };
  }, [selection, images]);

  useEffect(() => {
    if (canvasRef.current)
      drawBouquet(
        canvasRef.current,
        selection,
        images,
        (item) => item.stemImage,
        {
          ...style,
          scale: height?.scale,
          spread: height?.spread,
          lengthRange: options.stem_length,
        },
      );
  }, [selection, images, style, height, options.stem_length]);

  function setCount(key, value) {
    setPicks((old) => {
      const next = { ...old };
      if (value > 0)
        next[key] = {
          stems: value,
          length: old[key]?.length || DEFAULT_LENGTH,
        };
      else delete next[key];
      return next;
    });
  }

  function setLength(key, length) {
    setPicks((old) =>
      old[key] ? { ...old, [key]: { ...old[key], length } } : old,
    );
  }

  async function submit() {
    if (!user) {
      navigate("/login?next=" + encodeURIComponent("/custom-bouquet"));
      return;
    }
    setAdding(true);
    try {
      await addBouquet(
        selection.map(({ product_id, variant_id, stems, stem_length }) => ({
          product_id,
          variant_id,
          stems,
          stem_length,
        })),
        style,
      );
      flyToCart(listRef.current?.querySelector("img"));
      message.success(t("Đã thêm bó hoa vào giỏ"));
    } catch (error) {
      if (error?.status === 409) {
        message.error(
          t(
            "Một số loại hoa không còn đủ cành hoặc đã ngừng bán. Vui lòng giảm số cành.",
          ),
        );
        setAttempt((n) => n + 1);
      } else if ([400, 404].includes(error?.status)) {
        message.error(
          t("Bó hoa có loại hoa không còn bán. Vui lòng chọn lại."),
        );
        setAttempt((n) => n + 1);
      } else {
        message.error(t(userError(error)));
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="page bt-bq-page">
      <header className="bt-bq-head">
        <p className="bt-bq-eyebrow">{t("Hoa lẻ theo cành")}</p>
        <h1>{t("Tự tạo bó hoa")}</h1>
        <p>{t("Chọn từng cành, xem trước bó hoa và thêm vào giỏ.")}</p>
      </header>

      <div className="bt-bq-layout">
        <section aria-label={t("Chọn hoa theo cành")}>
          {catalog.loading ? (
            <p className="bt-state">{t("Đang tải danh sách hoa…")}</p>
          ) : catalog.error ? (
            <Alert
              type="error"
              showIcon
              title={t("Không thể tải danh sách hoa cành")}
              action={
                <Button
                  onClick={() => {
                    setCatalog((old) => ({ ...old, loading: true }));
                    setAttempt((n) => n + 1);
                  }}
                >
                  {t("Thử lại")}
                </Button>
              }
            />
          ) : catalog.flowers.length ? (
            <div className="bt-bq-grid">
              {catalog.flowers.map((flower) => (
                <FlowerCard
                  key={flower.id}
                  flower={flower}
                  picks={picks}
                  canAdd={MAX_STEMS - totalStems}
                  onChange={setCount}
                />
              ))}
            </div>
          ) : (
            <div className="bt-empty">
              <p>{t("Cửa hàng chưa có hoa bán theo cành.")}</p>
              <Link to="/">{t("Khám phá sản phẩm")}</Link>
            </div>
          )}
        </section>

        <aside className="bt-bq-summary" aria-label={t("Bó hoa của bạn")}>
          <h2>{t("Bó hoa của bạn")}</h2>
          <figure className="bt-bq-stage">
            <canvas
              ref={canvasRef}
              width={840}
              height={1040}
              role="img"
              aria-label={
                selection.length
                  ? t("Ảnh xem trước bó hoa gồm {{summary}}", {
                      summary: selection
                        .map((i) => `${i.stems} ${i.name} ${t(i.color)}`)
                        .join(", "),
                    })
                  : t("Bó hoa đang trống")
              }
            />
            {!selection.length && (
              <p className="bt-bq-placeholder">
                {t("Bó hoa đang trống. Chọn vài cành ở danh sách bên cạnh.")}
              </p>
            )}
            <figcaption>{t("Ảnh xem trước minh họa")}</figcaption>
          </figure>
          {missing.length > 0 && (
            <p className="bt-bq-warn" role="status">
              {t("Ảnh xem trước chưa đầy đủ: {{names}} chưa có ảnh tách nền.", {
                names: missing
                  .map((item) => `${item.name} ${t(item.color)}`.trim())
                  .join(", "),
              })}
            </p>
          )}

          <ul className="bt-bq-list" ref={listRef}>
            {selection.map((item) => (
              <li key={item.key}>
                <img src={item.thumb} alt="" crossOrigin="anonymous" />
                <span>
                  <strong>
                    {item.stems} × {item.name}
                  </strong>
                  <small>{t(item.color)}</small>
                </span>
                <em>{money(item.stems * item.price)}</em>
                <button
                  type="button"
                  className="bt-bq-icon is-small"
                  aria-label={t("Bỏ {{name}} khỏi bó", {
                    name: `${item.name} ${t(item.color)}`,
                  })}
                  onClick={() => setCount(item.key, 0)}
                >
                  <CloseOutlined />
                </button>
                <label className="bt-bq-length">
                  <span>
                    {t("Chiều dài cành")}
                    <b>{t("{{length}} cm", { length: item.stem_length })}</b>
                  </span>
                  <Slider
                    min={options.stem_length.min}
                    max={options.stem_length.max}
                    step={options.stem_length.step}
                    value={item.stem_length}
                    tooltip={{ open: false }}
                    aria-label={t("Chiều dài cành {{name}}", {
                      name: `${item.name} ${t(item.color)}`.trim(),
                    })}
                    onChange={(length) => setLength(item.key, length)}
                  />
                </label>
              </li>
            ))}
          </ul>

          {options.wraps.length > 0 && (
            <div className="bt-bq-style">
              <h3 className="bt-bq-subhead">{t("Giấy gói")}</h3>
              <div
                className="bt-bq-wraps"
                role="radiogroup"
                aria-label={t("Giấy gói")}
              >
                {options.wraps.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    role="radio"
                    aria-checked={item.id === style.wrap}
                    title={item.description}
                    onClick={() =>
                      setStyle((old) => ({ ...old, wrap: item.id }))
                    }
                  >
                    <span
                      className="bt-bq-wrap-chip"
                      style={{
                        background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})`,
                      }}
                    />
                    <b>{t(item.name)}</b>
                    <small>
                      {item.price > 0 ? "+" + money(item.price) : t("Miễn phí")}
                    </small>
                  </button>
                ))}
              </div>
              <h3 className="bt-bq-subhead">{t("Dáng bó")}</h3>
              <div
                className="bt-bq-heights"
                role="radiogroup"
                aria-label={t("Dáng bó")}
              >
                {options.heights.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    role="radio"
                    aria-checked={item.id === style.height}
                    onClick={() =>
                      setStyle((old) => ({ ...old, height: item.id }))
                    }
                  >
                    {t(item.name)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <dl className="bt-sum">
            <div>
              <dt>{t("Tiền hoa ({{count}} cành)", { count: totalStems })}</dt>
              <dd>{money(flowersPrice)}</dd>
            </div>
            <div>
              <dt>
                {t("Giấy gói")}
                {wrap ? ": " + t(wrap.name) : ""}
              </dt>
              <dd>{wrap?.price ? money(wrap.price) : t("Miễn phí")}</dd>
            </div>
            <div className="is-total">
              <dt>{t("Tạm tính")}</dt>
              <dd key={subtotal}>{money(subtotal)}</dd>
            </div>
          </dl>
          {totalStems >= MAX_STEMS && (
            <p className="bt-hint">
              {t("Một bó tối đa {{count}} cành", { count: MAX_STEMS })}
            </p>
          )}
          <Button
            block
            type="primary"
            size="large"
            loading={adding}
            disabled={!selection.length}
            onClick={submit}
          >
            {user ? t("Thêm vào giỏ") : t("Đăng nhập để thêm vào giỏ")}
          </Button>
          <p className="bt-hint">
            {t(
              "Giá cuối cùng do cửa hàng tính lại theo giá cành hiện tại khi thêm vào giỏ.",
            )}
          </p>
        </aside>
      </div>
    </div>
  );
}
