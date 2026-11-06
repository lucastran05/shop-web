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

export default function FlowerIdentifier() {
  const { t } = useTranslation();
  const { user } = useShop();
  if (!user)
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
        <Link
          className="flower-login-link"
          to="/login?next=%2F%3Fidentify%3Dflower"
        >
          <LockOutlined /> {t("Đăng nhập để nhận diện hoa")}
        </Link>
        <small>{t("Ảnh và kết quả được lưu riêng trong lịch sử tài khoản của bạn")}</small>
      </div>
    );
  return <FlowerTabs key={user.id} />;
}

// Identify and History share the popup. The identify tab stays mounted while hidden
// so the chosen photo and result survive a quick look at the history.
function FlowerTabs() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("identify");
  const leaveIdentify = useRef(null);
  return (
    <>
      <Segmented
        className="flower-tabs"
        value={tab}
        onChange={(next) => {
          if (next !== "identify") leaveIdentify.current?.();
          setTab(next);
        }}
        options={[
          { value: "identify", label: t("Nhận diện"), icon: <FlowerIcon /> },
          { value: "history", label: t("Lịch sử"), icon: <HistoryOutlined /> },
        ]}
      />
      <FlowerIdentifierContent
        active={tab === "identify"}
        onLeaveRef={leaveIdentify}
      />
      {tab === "history" && (
        <FlowerHistory onIdentify={() => setTab("identify")} />
      )}
    </>
  );
}

function FlowerIdentifierContent({ active, onLeaveRef }) {
  const { t, i18n } = useTranslation();
  const [savedId, setSavedId] = useState(null);
  const [file, setFile] = useState(null),
    [preview, setPreview] = useState("");
  const [camera, setCamera] = useState(false),
    [cameraLoading, setCameraLoading] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [candidates, setCandidates] = useState(null);
  const video = useRef(null),
    stream = useRef(null),
    cameraGeneration = useRef(0),
    request = useRef(null),
    input = useRef(null);

  function stopCamera() {
    cameraGeneration.current += 1;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(
    () => () => {
      stopCamera();
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (camera && video.current) video.current.srcObject = stream.current;
  }, [camera]);
  // The tab bar calls this before showing History, so the camera never runs hidden.
  useEffect(() => {
    onLeaveRef.current = () => {
      stopCamera();
      setCamera(false);
      setCameraLoading(false);
    };
  });
  function chooseFile(next) {
    request.current?.abort();
    setBusy(false);
    setCandidates(null);
    setSavedId(null);
    setError("");
    setFile(null);
    setPreview("");
    if (!next) return;
    if (
      !["image/jpeg", "image/png"].includes(next.type) ||
      !next.size ||
      next.size > 10 * 1024 * 1024
    ) {
      setError("Chọn ảnh JPEG/PNG từ 1 byte đến 10 MB");
      return;
    }
    stopCamera();
    setCamera(false);
    setCameraLoading(false);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }
  async function openCamera() {
    stopCamera();
    setCamera(false);
    setError("");
    setCameraLoading(true);
    const generation = cameraGeneration.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error();
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (cameraGeneration.current !== generation) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = next;
      setCamera(true);
    } catch {
      if (cameraGeneration.current === generation)
        setError(
          "Không mở được camera. Hãy cấp quyền camera, dùng HTTPS hoặc tải ảnh lên.",
        );
    } finally {
      if (cameraGeneration.current === generation) setCameraLoading(false);
    }
  }
  function capture() {
    const element = video.current;
    if (!element?.videoWidth) {
      setError("Camera chưa sẵn sàng, hãy thử lại");
      return;
    }
    const generation = cameraGeneration.current;
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    canvas.getContext("2d").drawImage(element, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (cameraGeneration.current !== generation) return;
        if (blob)
          chooseFile(new File([blob], "flower.jpg", { type: "image/jpeg" }));
        else setError("Không chụp được ảnh, hãy thử lại");
      },
      "image/jpeg",
      0.9,
    );
  }
  async function identify() {
    if (!file || busy || (request.current && !request.current.signal.aborted))
      return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setSavedId(null);
    setCandidates(null);
    try {
      const { data } = await api.flowers.identify(file, {
        signal: controller.signal,
        lang: i18n.resolvedLanguage === "en" ? "en" : "vi",
      });
      if (!controller.signal.aborted) {
        setSavedId(data.historyId || null);
        setCandidates(data.candidates);
      }
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err.kind === "http" && err.payload?.status === "error"
            ? err.message
            : userError(err),
        );
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }
  // Pl@ntNet results arrive sorted by score, so the first one is the best match.
  const top = candidates?.[0];
  return (
    <div className="flower-identifier" hidden={!active}>
      <div className="flower-workspace">
        <section className="flower-source" aria-label={t("Ảnh hoa của bạn")}>
          <div className="flower-section-heading">
            <h3>{t("Ảnh hoa của bạn")}</h3>
            <span>JPG, PNG · 10 MB</span>
          </div>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png"
            hidden
            onChange={(event) => {
              if (event.target.files?.[0]) chooseFile(event.target.files[0]);
              event.target.value = "";
            }}
          />
          {camera ? (
            <div className="flower-photo-stage">
              <video
                ref={video}
                autoPlay
                playsInline
                muted
                aria-label={t("Xem trước camera")}
              />
              <div className="flower-camera-actions">
                <Button
                  type="primary"
                  icon={<CameraOutlined />}
                  onClick={capture}
                >
                  {t("Chụp ảnh này")}
                </Button>
                <Button
                  onClick={() => {
                    stopCamera();
                    setCamera(false);
                  }}
                >
                  {t("Đóng camera")}
                </Button>
              </div>
            </div>
          ) : preview ? (
            <button
              type="button"
              className="flower-photo-stage is-clickable"
              onClick={() => input.current?.click()}
              title={t("Đổi ảnh")}
            >
              <img src={preview} alt={t("Ảnh hoa đã chọn")} />
              <span className="flower-file-name">{file.name}</span>
              <span className="flower-change-photo">
                <UploadOutlined /> {t("Đổi ảnh")}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="flower-upload-zone"
              onClick={() => input.current?.click()}
            >
              <span className="flower-hero-icon">
                <UploadOutlined />
              </span>
              <strong>{t("Thêm ảnh một bông hoa")}</strong>
              <span>{t("Chọn ảnh từ điện thoại hoặc máy tính")}</span>
              <span className="flower-upload-label">{t("Chọn ảnh")}</span>
            </button>
          )}
          <div className="flower-source-actions">
            <Tooltip title={t(file ? "Chụp lại" : "Chụp ảnh")}>
              <Button
                size="large"
                icon={<CameraOutlined />}
                aria-label={t(file ? "Chụp lại" : "Chụp ảnh")}
                onClick={openCamera}
                loading={cameraLoading}
                disabled={camera || busy}
              />
            </Tooltip>
            <Button
              block
              size="large"
              type="primary"
              icon={<FlowerIcon />}
              loading={busy}
              disabled={!file || camera || cameraLoading}
              onClick={identify}
            >
              {t(busy ? "Đang nhận diện…" : "Nhận diện hoa")}
            </Button>
          </div>
          {cameraLoading && (
            <Button
              type="link"
              onClick={() => {
                stopCamera();
                setCameraLoading(false);
              }}
            >
              {t("Hủy mở camera")}
            </Button>
          )}
        </section>
        <section className="flower-results" aria-live="polite" aria-busy={busy}>
          <div className="flower-section-heading">
            <h3>{t("Kết quả nhận diện")}</h3>
          </div>
          {error && <Alert type="error" showIcon title={t(error)} />}
          {busy ? (
            <div className="flower-result-placeholder">
              <Spin size="large" />
              <h4>{t("Đang tìm loài hoa phù hợp")}</h4>
              <p>{t("Kết quả sẽ xuất hiện ở đây trong giây lát.")}</p>
            </div>
          ) : candidates?.length === 0 ? (
            <div className="flower-result-placeholder">
              <ScanOutlined className="flower-placeholder-icon" />
              <h4>{t("Chưa tìm thấy loài hoa phù hợp")}</h4>
              <p>{t("Thử ảnh rõ hơn, chụp gần một bông hoa và đủ sáng.")}</p>
              <Button onClick={() => input.current?.click()}>
                {t("Chọn ảnh khác")}
              </Button>
            </div>
          ) : top ? (
            <>
              <FlowerMatch candidate={top} />
              {savedId && (
                <p className="flower-saved-note">
                  <CheckCircleOutlined /> {t("Đã lưu")}
                </p>
              )}
            </>
          ) : (
            <div className="flower-result-placeholder">
              <ScanOutlined className="flower-placeholder-icon" />
              <h4>{t("Bông hoa này tên gì?")}</h4>
              <p>
                {t(
                  "Thêm một bức ảnh rồi nhấn Nhận diện hoa. Bạn sẽ thấy tên hoa và các loài gần giống tại đây.",
                )}
              </p>
            </div>
          )}
        </section>
      </div>
      <div className="flower-privacy">
        <LockOutlined />
        <p>
          {t(
            "Ảnh được xử lí bởi.",
          )}{" "}
          <a href="https://my.plantnet.org/" target="_blank" rel="noreferrer">
            Pl@ntNet
          </a>
        </p>
      </div>
    </div>
  );
}
