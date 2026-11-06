import { useEffect, useState } from "react";
import { api } from "../../../shared/api";
import FlowerIcon from "./FlowerIcon";

// Loads a private history photo with the user's token and shows it via an object URL.
// Without a photo (or while it loads) a soft flower placeholder fills the same box.
export default function FlowerHistoryImage({ id, hasImage, alt, className, fit }) {
  const [state, setState] = useState({ id: null, url: "", failed: false });

  useEffect(() => {
    if (!hasImage) return;
    const controller = new AbortController();
    let url = "";
    api.flowers
      .historyImage(id, { signal: controller.signal })
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setState({ id, url, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ id, url: "", failed: true });
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, hasImage]);

  // Ignore a URL that belongs to a previous id while the new one loads.
  const current = state.id === id ? state : { url: "", failed: false };
  const loading = hasImage && !current.url && !current.failed;
  return (
    <span
      className={`fh-photo ${loading ? "is-loading" : ""} ${className || ""}`}
    >
      {current.url ? (
        <img src={current.url} alt={alt} style={fit ? { objectFit: fit } : undefined} />
      ) : (
        <FlowerIcon className="fh-photo-placeholder" aria-hidden="true" />
      )}
    </span>
  );
}
