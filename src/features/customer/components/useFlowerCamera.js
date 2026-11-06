import { useEffect, useRef, useState } from "react";

// Hook quản lý camera để chụp ảnh hoa.
//
// Vấn đề cần xử lý: mở camera là thao tác bất đồng bộ (chờ người dùng cấp quyền).
// Nếu trong lúc chờ người dùng đã bấm Hủy, đổi tab hay chọn ảnh khác, kết quả cũ
// trả về muộn không được bật lại camera. Cách làm: mỗi lần mở/đóng tăng "sessionRef";
// kết quả nào thuộc phiên cũ thì bỏ qua (và tắt luôn stream vừa xin được).
//
// onPhoto(file): gọi khi chụp xong, nhận File JPEG.
// onError(message): gọi khi không mở được camera hoặc chụp lỗi.
export function useFlowerCamera({ onPhoto, onError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const sessionRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false); // đang hiện khung camera
  const [isStarting, setIsStarting] = useState(false); // đang chờ quyền camera

  // Tắt stream hiện tại và làm mọi kết quả đang chờ trở thành "phiên cũ".
  function releaseStream() {
    sessionRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function close() {
    releaseStream();
    setIsOpen(false);
    setIsStarting(false);
  }

  async function open() {
    releaseStream();
    setIsOpen(false);
    setIsStarting(true);
    const session = sessionRef.current;
    const isCurrent = () => sessionRef.current === session;

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera API");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }, // ưu tiên camera sau trên điện thoại
        audio: false,
      });
      if (!isCurrent()) {
        // Người dùng đã hủy trong lúc chờ: trả lại camera ngay.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setIsOpen(true);
    } catch {
      if (isCurrent())
        onError("Không mở được camera. Hãy cấp quyền camera, dùng HTTPS hoặc tải ảnh lên.");
    } finally {
      if (isCurrent()) setIsStarting(false);
    }
  }

  // Chụp khung hình hiện tại của video thành ảnh JPEG.
  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      onError("Camera chưa sẵn sàng, hãy thử lại");
      return;
    }
    const session = sessionRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (sessionRef.current !== session) return; // camera đã bị đóng trong lúc nén ảnh
        if (blob) onPhoto(new File([blob], "flower.jpg", { type: "image/jpeg" }));
        else onError("Không chụp được ảnh, hãy thử lại");
      },
      "image/jpeg",
      0.9,
    );
  }

  // Thẻ <video> chỉ xuất hiện sau khi isOpen = true, lúc đó mới gắn stream vào được.
  useEffect(() => {
    if (isOpen && videoRef.current) videoRef.current.srcObject = streamRef.current;
  }, [isOpen]);

  // Rời trang hoặc đóng popup: luôn tắt camera.
  useEffect(() => () => releaseStream(), []);

  return { videoRef, isOpen, isStarting, open, close, capture };
}
