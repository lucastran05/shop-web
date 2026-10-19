import { useEffect, useRef } from "react";

export function usePolling(
  action,
  { enabled = true, intervalMs = 3000, onError } = {},
) {
  const actionRef = useRef(action);
  const errorRef = useRef(onError);
  useEffect(() => {
    actionRef.current = action;
    errorRef.current = onError;
  }, [action, onError]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let pending = false;
    const poll = async () => {
      if (!active || pending || document.hidden) return;
      pending = true;
      try {
        await actionRef.current();
      } catch (error) {
        if (active) errorRef.current?.(error);
      } finally {
        pending = false;
      }
    };
    poll();
    const timer = setInterval(poll, intervalMs);
    window.addEventListener("focus", poll);
    document.addEventListener("visibilitychange", poll);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", poll);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [enabled, intervalMs]);
}
