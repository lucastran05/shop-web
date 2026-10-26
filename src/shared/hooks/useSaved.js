import { useState, useEffect } from "react";
import { shopConfig } from "../constants/shop";
export function useSaved(name, initial) {
  const key = `${shopConfig.storagePrefix}-${name}`;
  const [value, set] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed ?? initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Giữ state phiên hiện tại nếu storage bị chặn. */
    }
  }, [key, value]);
  return [value, set];
}
