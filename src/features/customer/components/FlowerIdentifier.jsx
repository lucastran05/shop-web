import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, Segmented, Spin, Tooltip } from "antd";
import {
  CameraOutlined,
  UploadOutlined,
  ScanOutlined,
  LockOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import "./FlowerIdentifier.css";
import { useTranslation } from "react-i18next";
import { api } from "../../../shared/api";
import { useShop } from "../../../shared/shop/useShop";
import { userError } from "../../../shared/utils/userError";
import FlowerMatch from "./FlowerMatch";
import FlowerIcon from "./FlowerIcon";
import FlowerHistory from "./FlowerHistory";
import { useFlowerCamera } from "./useFlowerCamera";
import { mapProductSummary } from "../../../shared/adapters/productAdapter";
import { flowerDisplayName, scoreLevel } from "../../../shared/utils/flowerNames";
import { money } from "../../../shared/utils/format";
import "./flower-botanical.css";

// Nội dung popup "Nhận diện hoa".
//
// Cấu trúc:
//   FlowerIdentifier   chưa đăng nhập -> LoginPrompt, đã đăng nhập -> FlowerTabs
//   FlowerTabs         2 tab: Nhận diện (IdentifyPanel) và Lịch sử (FlowerHistory)
//   IdentifyPanel      giữ state: ảnh đã chọn, đang gửi, lỗi, kết quả
//     PhotoSource      cột trái: chọn ảnh / camera / ảnh xem trước + nút Nhận diện
//     ResultPanel      cột phải: hướng dẫn, đang tải, không tìm thấy hoặc kết quả

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB, cùng giới hạn với backend
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

// Trả về thông báo lỗi nếu ảnh không hợp lệ, chuỗi rỗng nếu hợp lệ.
function validatePhoto(file) {
  if (!ACCEPTED_TYPES.includes(file.type) || !file.size || file.size > MAX_PHOTO_SIZE)
    return "Chọn ảnh JPEG/PNG từ 1 byte đến 10 MB";
  return "";
}

export default function FlowerIdentifier() {
  const { user } = useShop();
  if (!user) return <LoginPrompt />;
  // key = user.id: đổi tài khoản thì toàn bộ state của popup được tạo mới.
  return <FlowerTabs key={user.id} />;
}

function LoginPrompt() {
  const { t } = useTranslation();
  return (
    <div className="flower-login">
      <span className="flower-hero-icon">
        <CameraOutlined />
      </span>
      <h3>{t("Tìm loài hoa qua một bức ảnh")}</h3>
      <p>
        {t(
          "Chụp hoặc tải ảnh để khám phá tên hoa và tìm sản phẩm phù hợp trong shop.",
        )}
      </p>
      {/* Đăng nhập xong quay lại trang chủ và tự mở lại popup */}
      <Link className="flower-login-link" to="/login?next=%2F%3Fidentify%3Dflower">
        <LockOutlined /> {t("Đăng nhập để nhận diện hoa")}
      </Link>
      <small>
        {t("Ảnh và kết quả được lưu riêng trong lịch sử tài khoản của bạn")}
      </small>
    </div>
  );
}

// Tab Nhận diện luôn được giữ lại (chỉ ẩn đi) khi xem Lịch sử,
// để quay lại vẫn còn ảnh và kết quả đang xem.
function FlowerTabs() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("identify");
  // IdentifyPanel gắn vào đây hàm tắt camera, gọi trước khi chuyển sang tab Lịch sử.
  const stopCameraRef = useRef(null);

  function changeTab(next) {
    if (next !== "identify") stopCameraRef.current?.();
    setTab(next);
  }

  return (
    <>
      <Segmented
        className="flower-tabs"
        value={tab}
        onChange={changeTab}
        options={[
          { value: "identify", label: t("Nhận diện"), icon: <FlowerIcon /> },
          { value: "history", label: t("Lịch sử"), icon: <HistoryOutlined /> },
        ]}
      />
      <IdentifyPanel visible={tab === "identify"} stopCameraRef={stopCameraRef} />
      {tab === "history" && <FlowerHistory onIdentify={() => setTab("identify")} />}
    </>
  );
}

function IdentifyPanel({ visible, stopCameraRef }) {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState(null); // ảnh sẽ gửi đi
  const [preview, setPreview] = useState(""); // object URL để hiện ảnh xem trước
  const [busy, setBusy] = useState(false); // đang chờ backend nhận diện
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState(null); // null = chưa nhận diện lần nào
  const [savedId, setSavedId] = useState(null); // id bản ghi lịch sử vừa lưu
  const inputRef = useRef(null); // <input type="file"> ẩn
  const requestRef = useRef(null); // AbortController của request đang chạy

  const camera = useFlowerCamera({ onPhoto: choosePhoto, onError: setError });
  const closeCamera = camera.close;

  // Cho FlowerTabs gọi được closeCamera() khi đổi tab.
  useEffect(() => {
    stopCameraRef.current = closeCamera;
  });

  // Giải phóng object URL cũ mỗi khi đổi ảnh, tránh rò bộ nhớ.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Đóng popup giữa chừng: hủy request đang gửi.
  useEffect(() => () => requestRef.current?.abort(), []);

  function openFilePicker() {
    inputRef.current?.click();
  }

  // Dán ảnh (Ctrl+V) khi đang mở tab Nhận diện
  useEffect(() => {
    if (!visible) return;
    function onPaste(event) {
      const image = [...(event.clipboardData?.files || [])].find((item) =>
        item.type.startsWith("image/"),
      );
      if (image) {
        event.preventDefault();
        choosePhoto(image);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  // Kéo thả ảnh vào khung
  const [dragging, setDragging] = useState(false);
  const dropProps = {
    onDragOver: (event) => {
      if ([...event.dataTransfer.types].includes("Files")) {
        event.preventDefault();
        setDragging(true);
      }
    },
    onDragLeave: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
    },
    onDrop: (event) => {
      event.preventDefault();
      setDragging(false);
      const image = event.dataTransfer.files?.[0];
      if (image) choosePhoto(image);
    },
  };

  // Chọn ảnh mới (từ máy hoặc từ camera): xóa kết quả cũ và hủy request đang chạy.
  function choosePhoto(next) {
    requestRef.current?.abort();
    setBusy(false);
    setCandidates(null);
    setSavedId(null);
    setError("");
    setFile(null);
    setPreview("");
    if (!next) return;

    const problem = validatePhoto(next);
    if (problem) {
      setError(problem);
      return;
    }
    closeCamera();
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  function openCamera() {
    setError("");
    camera.open();
  }

  async function identify() {
    const requestRunning = requestRef.current && !requestRef.current.signal.aborted;
    if (!file || busy || requestRunning) return;

    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError("");
    setSavedId(null);
    setCandidates(null);

    try {
      const { data } = await api.flowers.identify(file, {
        signal: controller.signal,
        lang: i18n.resolvedLanguage === "en" ? "en" : "vi",
      });
      if (controller.signal.aborted) return; // đã chọn ảnh khác trong lúc chờ
      setSavedId(data.historyId || null);
      setCandidates(data.candidates);
    } catch (err) {
      if (controller.signal.aborted) return;
      // Lỗi từ backend đã có thông báo tiếng Việt rõ ràng, dùng luôn.
      const fromBackend = err.kind === "http" && err.payload?.status === "error";
      setError(fromBackend ? err.message : userError(err));
    } finally {
      // Chỉ request mới nhất được tắt trạng thái busy.
      if (requestRef.current === controller) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <div className="flower-identifier" hidden={!visible}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        hidden
        onChange={(event) => {
          if (event.target.files?.[0]) choosePhoto(event.target.files[0]);
          event.target.value = ""; // cho phép chọn lại đúng file vừa chọn
        }}
      />
      <div className={"flower-workspace" + (dragging ? " is-dragging" : "")} {...dropProps}>
        <PhotoSource
          videoRef={camera.videoRef}
          cameraOpen={camera.isOpen}
          cameraStarting={camera.isStarting}
          onCapture={camera.capture}
          onCloseCamera={closeCamera}
          file={file}
          preview={preview}
          busy={busy}
          onPickFile={openFilePicker}
          onOpenCamera={openCamera}
          onIdentify={identify}
        />
        <ResultPanel
          busy={busy}
          error={error}
          candidates={candidates}
          saved={Boolean(savedId)}
          onPickFile={openFilePicker}
        />
      </div>
      <div className="flower-privacy">
        <LockOutlined />
        <p>
          {t("Ảnh được xử lí bởi.")}{" "}
          <a href="https://my.plantnet.org/" target="_blank" rel="noreferrer">
            Pl@ntNet
          </a>
        </p>
      </div>
    </div>
  );
}

// Cột trái: một trong ba trạng thái (camera đang mở / đã có ảnh / chưa có ảnh) + hàng nút.
function PhotoSource({
  videoRef,
  cameraOpen,
  cameraStarting,
  onCapture,
  onCloseCamera,
  file,
  preview,
  busy,
  onPickFile,
  onOpenCamera,
  onIdentify,
}) {
  const { t } = useTranslation();
  const cameraLabel = t(file ? "Chụp lại" : "Chụp ảnh");

  let stage;
  if (cameraOpen) {
    stage = (
      <div className="flower-photo-stage">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label={t("Xem trước camera")}
        />
        <div className="flower-camera-actions">
          <Button type="primary" icon={<CameraOutlined />} onClick={onCapture}>
            {t("Chụp ảnh này")}
          </Button>
          <Button onClick={onCloseCamera}>{t("Đóng camera")}</Button>
        </div>
      </div>
    );
  } else if (preview) {
    // Bấm vào ảnh xem trước để chọn ảnh khác.
    stage = (
      <button
        type="button"
        className="flower-photo-stage is-clickable"
        onClick={onPickFile}
        title={t("Đổi ảnh")}
      >
        <img src={preview} alt={t("Ảnh hoa đã chọn")} />
        {busy && <span className="flower-scan" aria-hidden="true" />}
        <span className="flower-file-name">{file.name}</span>
        <span className="flower-change-photo">
          <UploadOutlined /> {t("Đổi ảnh")}
        </span>
      </button>
    );
  } else {
    stage = (
      <button type="button" className="flower-upload-zone" onClick={onPickFile}>
        <span className="flower-hero-icon">
          <UploadOutlined />
        </span>
        <strong>{t("Thêm ảnh một bông hoa")}</strong>
        <span>{t("Chọn ảnh, kéo thả vào đây hoặc dán bằng Ctrl+V")}</span>
        <span className="flower-upload-label">{t("Chọn ảnh")}</span>
      </button>
    );
  }

  return (
    <section className="flower-source" aria-label={t("Ảnh hoa của bạn")}>
      <div className="flower-section-heading">
        <h3>{t("Ảnh hoa của bạn")}</h3>
        <span>JPG, PNG · 10 MB</span>
      </div>
      {stage}
      <div className="flower-source-actions">
        <Tooltip title={cameraLabel}>
          <Button
            size="large"
            icon={<CameraOutlined />}
            aria-label={cameraLabel}
            onClick={onOpenCamera}
            loading={cameraStarting}
            disabled={cameraOpen || busy}
          />
        </Tooltip>
        <Button
          block
          size="large"
          type="primary"
          icon={<FlowerIcon />}
          loading={busy}
          disabled={!file || cameraOpen || cameraStarting}
          onClick={onIdentify}
        >
          {t(busy ? "Đang nhận diện…" : "Nhận diện hoa")}
        </Button>
      </div>
      {cameraStarting && (
        <Button type="link" onClick={onCloseCamera}>
          {t("Hủy mở camera")}
        </Button>
      )}
    </section>
  );
}

// Cột phải. candidates: null = chưa nhận diện, [] = không tìm thấy, [...] = có kết quả.
function ResultPanel({ busy, error, candidates, saved, onPickFile }) {
  const { t } = useTranslation();
  // Kết quả đã sắp theo điểm giảm dần, phần tử đầu là loài phù hợp nhất.
  const best = candidates?.[0];

  let content;
  if (busy) {
    content = (
      <div className="flower-result-placeholder">
        <Spin size="large" />
        <h4>{t("Đang tìm loài hoa phù hợp")}</h4>
        <p>{t("Kết quả sẽ xuất hiện ở đây trong giây lát.")}</p>
      </div>
    );
  } else if (candidates?.length === 0) {
    content = (
      <div className="flower-result-placeholder">
        <ScanOutlined className="flower-placeholder-icon" />
        <h4>{t("Chưa tìm thấy loài hoa phù hợp")}</h4>
        <p>{t("Thử ảnh rõ hơn, chụp gần một bông hoa và đủ sáng.")}</p>
        <Button onClick={onPickFile}>{t("Chọn ảnh khác")}</Button>
      </div>
    );
  } else if (best) {
    content = (
      <>
        <FlowerMatch candidate={best} />
        <ShopMatches species={best.scientificName} />
        {candidates.length > 1 && <SimilarList candidates={candidates.slice(1, 4)} />}
        {saved && (
          <p className="flower-saved-note">
            <CheckCircleOutlined /> {t("Đã lưu")}
          </p>
        )}
      </>
    );
  } else {
    content = (
      <div className="flower-result-placeholder">
        <ScanOutlined className="flower-placeholder-icon" />
        <h4>{t("Bông hoa này tên gì?")}</h4>
        <p>
          {t(
            "Thêm một bức ảnh rồi nhấn Nhận diện hoa. Bạn sẽ thấy tên hoa và các loài gần giống tại đây.",
          )}
        </p>
      </div>
    );
  }

  return (
    <section className="flower-results" aria-live="polite" aria-busy={busy}>
      <div className="flower-section-heading">
        <h3>{t("Kết quả nhận diện")}</h3>
      </div>
      {error && <Alert type="error" showIcon title={t(error)} />}
      {content}
    </section>
  );
}

// Các loài gần giống khác từ cùng lần nhận diện
function SimilarList({ candidates }) {
  const { t, i18n } = useTranslation();
  return (
    <section className="flower-similar">
      <h4>{t("Các loài gần giống")}</h4>
      <ul>
        {candidates.map((item) => {
          const name = flowerDisplayName(item, i18n.resolvedLanguage);
          return (
            <li key={item.scientificName}>
              <span className="flower-similar-name">
                <strong>{name}</strong>
                {name !== item.scientificName && <i>{item.scientificName}</i>}
              </span>
              <span className={`flower-similar-bar is-${scoreLevel(item.score)}`} aria-hidden="true">
                <span style={{ width: `${Math.max(item.score * 100, 3)}%` }} />
              </span>
              <span className="flower-similar-score">{(item.score * 100).toFixed(1)}%</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Sản phẩm trong shop có gắn loài hoa vừa nhận diện
function ShopMatches({ species }) {
  const { t } = useTranslation();
  const { user } = useShop();
  const [state, setState] = useState({ species: "", items: [] });
  useEffect(() => {
    if (!species) return;
    const controller = new AbortController();
    api.products
      .list({ flower_species: species, limit: 4 }, { signal: controller.signal })
      .then(({ data }) =>
        setState({
          species,
          items: data
            .map(mapProductSummary)
            .filter((p) => p.visibility !== "hidden" && (p.visibility !== "private" || user)),
        }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setState({ species, items: [] });
      });
    return () => controller.abort();
  }, [species, user]);
  const items = state.species === species ? state.items : [];
  if (!items.length) return null;
  return (
    <section className="flower-shop">
      <h4>{t("Có trong cửa hàng")}</h4>
      <ul>
        {items.map((p) => (
          <li key={p.id}>
            <Link to={"/products/" + p.id}>
              <img src={p.image} alt="" />
              <span>
                <strong>{p.name}</strong>
                <small>{money(p.price)}</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
